import { ComponentOptions, h, VNodeArrayChildren } from '@vue/runtime-core'

import MarkdownIt from 'markdown-it'
// markdown-it plugins
import CJKBreak from 'markdown-it-cjk-breaks'
import Footnote from 'markdown-it-footnote'
import Abbr from 'markdown-it-abbr'
import DefList from 'markdown-it-deflist'
import Container from 'markdown-it-container'
import FrontMatter from 'markdown-it-front-matter'

import Token from 'markdown-it/lib/token'

import { assert } from './utils'

export interface MarkdownVueRendererOptions {
  html?: false
  base?: string
  containers?: string[]
  customComponents?: Record<string, ComponentOptions>
}

export class MarkdownVueRenderer {
  md: MarkdownIt
  private options?: MarkdownVueRendererOptions
  private frontmatter?: string

  constructor(md: MarkdownIt) {
    this.md = md
  }

  static fromOptions(options?: MarkdownVueRendererOptions) {
    const md = new MarkdownIt({
      html: options?.html ?? true,
      linkify: true,
      typographer: true,
    })
    const renderer = new MarkdownVueRenderer(md)
    renderer.options = options
    md.use(CJKBreak)
    md.use(Footnote)
    md.use(Abbr)
    md.use(DefList)
    Object.keys(options?.customComponents || {}).forEach((k) => {
      md.use(Container, k)
    })
    options?.containers?.forEach((k) => {
      md.use(Container, k)
    })
    md.use(FrontMatter, (fm) => {
      renderer.frontmatter = fm
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

  renderTokens(tokens: Token[]) {
    const result: VNodeArrayChildren = []
    const fragments: {
      children: VNodeArrayChildren
      attrs: [string, string][] | null
    }[] = [{ attrs: [], children: result }]
    const components = this.options?.customComponents || {}
    for (const token of tokens) {
      if (token.nesting === 1) {
        // nesting level +1
        fragments.push({ children: [], attrs: token.attrs })
      } else if (token.nesting === -1) {
        // nesting level -1
        const fragment = fragments.pop()
        assert(fragment !== undefined)
        const { attrs, children } = fragment
        const attr = (attrs && Object.fromEntries(attrs)) ?? {}
        let tag = token.tag || 'div'
        if (token.type.startsWith('container')) {
          const name = token.type.split('_')[1]
          if (components[name]) {
            tag = components[name] as never
          } else {
            if (attr.class) {
              attr.class += ` container-${name}`
            } else {
              attr.class = `container-${name}`
            }
          }
        }
        fragments[fragments.length - 1].children.push(
          h(tag, attr, { default: () => children }),
        )
      } else {
        // normal node
        const fragment = fragments[fragments.length - 1]
        // TODO: switch token type
        if (token.type === 'inline') {
          assert(token.children !== null)
          fragment.children.push(this.renderTokens(token.children))
        } else if (token.type === 'fence') {
          fragment.children.push(h('pre', token.content))
        } else if (token.type === 'image') {
          const attrs = Object.fromEntries(token.attrs ?? [])
          if (!attrs.alt) attrs.alt = token.content
          fragment.children.push(h('img', attrs))
        } else if (token.type === 'text') {
          fragment.children.push(token.content)
        } else if (token.type === 'softbreak') {
          fragment.children.push('\n')
        } else if (token.type === 'html_inline') {
          fragment.children.push(token.content)
        } else {
          fragment.children.push(h(token.tag || 'div', token.content))
        }
      }
    }
    return result
  }
}
