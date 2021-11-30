import { h, VNodeArrayChildren } from 'vue'

import MarkdownIt from 'markdown-it'
// markdown-it plugins
import CJKBreak from 'markdown-it-cjk-breaks'
import Footnote from 'markdown-it-footnote'
import Abbr from 'markdown-it-abbr'
import DefList from 'markdown-it-deflist'
import Container from 'markdown-it-container'

import Token from 'markdown-it/lib/token'

import { assert } from './utils'

export interface MarkdownVueRendererOptions {
  html?: false
  base?: string
}

export class MarkdownVueRenderer {
  md: MarkdownIt

  constructor(md: MarkdownIt) {
    this.md = md
  }

  static fromOptions(option?: MarkdownVueRendererOptions) {
    const md = new MarkdownIt({
      html: option?.html ?? true,
      linkify: true,
      typographer: true,
    })
    md.use(CJKBreak)
    md.use(Footnote)
    md.use(Abbr)
    md.use(DefList)
    md.use(Container, 'warning')
    return new MarkdownVueRenderer(md)
  }

  render(src: string) {
    const tokens = this.md.parse(src, {})
    return this.renderTokens(tokens)
  }

  renderTokens(tokens: Token[]) {
    const result: VNodeArrayChildren = []
    const fragments: {
      children: VNodeArrayChildren
      attrs: [string, string][] | null
    }[] = [{ attrs: [], children: result }]
    for (const token of tokens) {
      if (token.nesting === 1) {
        // nesting level +1
        fragments.push({ children: [], attrs: token.attrs })
      } else if (token.nesting === -1) {
        // nesting level -1
        const fragment = fragments.pop()
        assert(fragment !== undefined)
        const { attrs, children } = fragment
        fragments[fragments.length - 1].children.push(
          h(token.tag || 'div', attrs && Object.fromEntries(attrs), children),
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
