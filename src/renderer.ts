// for vue vnode
import {
  createVNode,
  ComponentOptions,
  VNodeChild,
  VNodeArrayChildren,
} from '@vue/runtime-core'

// markdown-it and plugins
import MarkdownIt from 'markdown-it'
import Token from 'markdown-it/lib/token'
import CJKBreak from 'markdown-it-cjk-breaks'
import Footnote from 'markdown-it-footnote'
import Abbr from 'markdown-it-abbr'
import DefList from 'markdown-it-deflist'
import Container from 'markdown-it-container'
import FrontMatter from 'markdown-it-front-matter'
import CustomBlock from './customBlockPlugin'

// for parsing frontmatter
import * as yaml from 'yaml'

// for processing raw html
import { parse, HTMLElement, TextNode, NodeType } from 'node-html-parser'

// utilities
import { assert } from './utils'

export interface MarkdownVueRendererOptions {
  html?: boolean
  base?: string
  containers?: string[]
  customComponents?: Record<string, ComponentOptions>
  customRules?: RenderRules
  nodeRenderer?: NodeRenderer
}

export interface Node {
  tag: string | null
  attrs: Record<string, string>
  children: VNodeArrayChildren
}
export type TokenRenderRule = (token: Token) => Node | string | null
export type RenderRules = Record<string, TokenRenderRule>
export type NodeRenderer = (node: Node) => VNodeChild

export const defaultRenderRules: RenderRules = {
  text(token) {
    return token.content
  },
  softbreak() {
    return '\n'
  },
  image(token) {
    const attrs = Object.fromEntries(token.attrs ?? [])
    if (!attrs.alt) attrs.alt = token.content
    return { tag: 'img', attrs, children: [] }
  },
  fence(token) {
    return { tag: 'pre', attrs: {}, children: [token.content] }
  },
  custom(token) {
    const info = token.info
    return {
      tag: token.tag,
      attrs: { info },
      children: [],
    }
  },
}

export function defaultNodeRenderer(node: Node) {
  const { tag, attrs, children } = node
  if (!tag) return children
  return createVNode(
    tag,
    attrs,
    // unwrap unnecessary fragments
    children.length === 1 ? children[0] : children,
  )
}

export class MarkdownVueRenderer {
  md: MarkdownIt
  private rules: RenderRules
  private nodeRenderer: NodeRenderer
  private frontmatter?: string

  constructor(md: MarkdownIt) {
    this.md = md
    this.rules = Object.assign({}, defaultRenderRules)
    this.nodeRenderer = defaultNodeRenderer
  }

  static fromOptions(options?: MarkdownVueRendererOptions) {
    const md = new MarkdownIt({
      html: options?.html ?? false,
      linkify: true,
      typographer: true,
    })
    const renderer = new MarkdownVueRenderer(md)

    Object.assign(renderer.rules, options?.customRules)

    if (options?.nodeRenderer) {
      renderer.nodeRenderer = options.nodeRenderer
    } else {
      const components = options?.customComponents || {}
      renderer.nodeRenderer = (node) => {
        let tag = node.tag
        const { attrs, children } = node
        if (
          typeof tag === 'string' &&
          (tag.startsWith('block') || tag.startsWith('container'))
        ) {
          const name = tag.split('_')[1]
          if (components[name]) {
            tag = components[name] as never // simplify typing
          } else {
            tag = tag.startsWith('block') ? 'span' : 'div'
            if (attrs.info) {
              attrs['data-info'] = attrs.info
              delete attrs.info
            }
          }
        }
        return defaultNodeRenderer({ tag, attrs, children })
      }
    }

    // parsing plugins
    md.use(CJKBreak)
    md.use(Footnote)
    md.use(Abbr)
    md.use(DefList)

    // record frontmatter inside renderer
    md.use(FrontMatter, (fm) => {
      renderer.frontmatter = yaml.parse(fm)
    })

    // custom components
    md.use(CustomBlock)
    if (options?.containers) {
      options.containers.forEach((k) => {
        md.use(Container, k)
      })
    } else {
      Object.keys(options?.customComponents || {}).forEach((k) => {
        md.use(Container, k)
      })
    }

    return renderer
  }

  render(src: string) {
    const tokens = this.md.parse(src, {})
    const nodes = this.renderTokens(tokens)
    return {
      nodes,
      frontmatter: this.frontmatter,
    }
  }

  private renderTokens(tokens: Token[]): VNodeArrayChildren {
    const result: VNodeArrayChildren = []

    const nodeStack: Node[] = [{ tag: 'div', attrs: {}, children: result }]

    for (const token of tokens) {
      if (token.type === 'html_block' || token.type === 'html_inline') {
        // TODO
      }

      const nesting = token.nesting
      if (nesting === 1) {
        // nesting level +1
        let tag = token.tag || 'div'
        const attrs = (token.attrs && Object.fromEntries(token.attrs)) ?? {}
        if (token.type.startsWith('container')) {
          tag = token.type
          attrs.info = token.info as string
        }
        nodeStack.push({ tag, attrs, children: [] })
        continue
      }

      if (nesting === -1) {
        // nesting level -1
        const currentNode = nodeStack.pop()
        assert(currentNode !== undefined)
        assert(nodeStack.length > 0)

        const parent = nodeStack[nodeStack.length - 1]

        if (token.hidden) {
          // element is hidden, push a fragment
          parent.children.push(currentNode.children)
        } else {
          // push a new vnode
          parent.children.push(this.nodeRenderer(currentNode))
        }
        continue
      }

      // normal node
      const children = nodeStack[nodeStack.length - 1].children
      if (token.type === 'inline') {
        assert(token.children !== null)
        // render inline tokens as fragment
        children.push(this.renderTokens(token.children))
      } else if (token.hidden) {
        // TODO: make sure this is appropriate
        children.push(token.content)
      } else if (token.type === 'html_block') {
        // parse and render as-is, *before* applying custom rules
        const el = parse(token.content)
        el.childNodes.forEach((n) => {
          if (n.nodeType === NodeType.TEXT_NODE) {
            const node = n as TextNode
            children.push(node.text)
            return
          }
          if (n.nodeType === NodeType.COMMENT_NODE) {
            // ignore comments
            return
          }
          const node = n as HTMLElement
          children.push(
            this.nodeRenderer({
              tag: node.rawTagName,
              attrs: { ...node.attributes, innerHTML: node.innerHTML },
              children: [],
            }),
          )
        })
      } else if (this.rules[token.type]) {
        const node = this.rules[token.type](token)
        if (node === null) {
          continue
        }
        if (typeof node === 'string') {
          children.push(node)
          continue
        }
        children.push(this.nodeRenderer(node))
      } else if (!token.tag) {
        children.push(token.content)
        continue
      } else {
        children.push(
          this.nodeRenderer({
            tag: token.tag,
            attrs: {},
            children: [token.content],
          }),
        )
      }
    }
    return result
  }
}
