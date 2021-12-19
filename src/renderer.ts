// for vue vnode
import {
  h,
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

// for parsing frontmatter
import * as yaml from 'yaml'

// for processing raw html
import { parse, HTMLElement, TextNode, NodeType } from 'node-html-parser'

// utilities
import { assert } from './utils'

export interface MarkdownVueRendererOptions {
  html?: boolean
  base?: string
  containers?: Record<string, ComponentOptions | null>
  customRules?: RenderRules
  nodeRenderer?: NodeRenderer
}

export interface Node {
  tag: string | ComponentOptions | null
  attrs: Record<string, string>
  children: VNodeArrayChildren
}
export type TokenRenderRule = (
  token: Token,
  ctx: { nodeRenderer: NodeRenderer },
) => Node | string | null
export type RenderRules = Record<string, TokenRenderRule>
export type NodeRenderer = (node: Node | string) => VNodeChild

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
  fence(token, ctx) {
    return {
      tag: 'pre',
      attrs: {},
      children: [ctx.nodeRenderer(token.content)],
    }
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

export function defaultNodeRenderer(node: Node | string) {
  if (typeof node === 'string') return node
  const { tag, attrs, children } = node
  if (!tag) return children
  return h(tag, attrs, children)
}

const htmlTagRegex = /^\s*<\/?([a-zA-Z]+)([^>]*)>\s*$/
// http://xahlee.info/js/html5_non-closing_tag.html
const selfClosingTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

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
      const components = options?.containers || {}
      renderer.nodeRenderer = (node) => {
        if (typeof node === 'string') return node
        let tag = node.tag
        const { attrs, children } = node
        if (!tag) {
          return children
        }
        if (typeof tag === 'string' && tag.startsWith('container_')) {
          const name = tag.split('_')[1]
          const component = components[name]
          if (component) {
            tag = component
          } else {
            tag = 'div'
            if (attrs.class) {
              attrs.class = `${attrs.class} container-${name}`
            } else {
              attrs.class = `container-${name}`
            }
            if (attrs.info) {
              attrs['data-info'] = attrs.info
              delete attrs.info
            }
          }
        }
        if (children.length === 0) return h(tag, attrs)
        return h(tag, attrs, children)
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
    Object.keys(options?.containers || {}).forEach((k) => {
      md.use(Container, k)
    })

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
      let nesting = token.nesting

      if (token.type === 'html_block' || token.type === 'html_inline') {
        const matches = htmlTagRegex.exec(token.content)
        if (matches) {
          if (token.content.startsWith('</')) {
            // closing tag
            if (nodeStack[nodeStack.length - 1].tag !== matches[1]) {
              // ignore mismatched closing tag
              continue
            }
            nesting = -1
          } else {
            // opening tag
            const el = parse(token.content.trim())
            assert(el.childNodes.length === 1)
            const node = el.firstChild as HTMLElement
            if (
              token.content.trimEnd().endsWith('/>') ||
              selfClosingTags.has(node.rawTagName)
            ) {
              // self-closing
              nodeStack[nodeStack.length - 1].children.push(
                this.nodeRenderer({
                  tag: node.rawTagName,
                  attrs: node.attributes,
                  children: [],
                }),
              )
            } else {
              nodeStack.push({
                tag: node.rawTagName,
                attrs: node.attributes,
                children: [],
              })
            }
            continue
          }
        }
      }

      if (nesting === 1) {
        // nesting level +1
        let tag = token.tag || 'div'
        const attrs = (token.attrs && Object.fromEntries(token.attrs)) ?? {}
        if (token.type.startsWith('container_')) {
          const name = token.type.split('_')
          tag = name.slice(0, name.length - 1).join('_')
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
          parent.children = parent.children.concat(currentNode.children)
        } else {
          // push a new vnode
          parent.children.push(this.nodeRenderer(currentNode))
        }
        continue
      }

      // normal node
      const parent = nodeStack[nodeStack.length - 1]
      if (token.type === 'inline') {
        assert(token.children !== null)
        // render inline tokens as fragment
        parent.children = parent.children.concat(
          this.renderTokens(token.children),
        )
      } else if (token.hidden) {
        continue
      } else if (token.type === 'html_block') {
        // parse and render as-is, *before* applying custom rules
        const el = parse(token.content)
        el.childNodes.forEach((n) => {
          if (n.nodeType === NodeType.TEXT_NODE) {
            const node = n as TextNode
            parent.children.push(this.nodeRenderer(node.text))
            return
          }
          if (n.nodeType === NodeType.COMMENT_NODE) {
            // ignore comments
            return
          }
          const node = n as HTMLElement
          parent.children.push(
            this.nodeRenderer({
              tag: node.rawTagName,
              attrs: { ...node.attributes, innerHTML: node.innerHTML },
              children: [],
            }),
          )
        })
      } else if (this.rules[token.type]) {
        const node = this.rules[token.type](token, {
          nodeRenderer: this.nodeRenderer,
        })
        if (node === null) {
          continue
        }
        parent.children.push(this.nodeRenderer(node))
      } else if (!token.tag) {
        parent.children.push(this.nodeRenderer(token.content))
        continue
      } else {
        parent.children.push(
          this.nodeRenderer({
            tag: token.tag,
            attrs: {},
            children: [this.nodeRenderer(token.content)],
          }),
        )
      }
    }
    return result
  }
}
