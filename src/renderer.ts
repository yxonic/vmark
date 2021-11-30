import { h, VNodeArrayChildren } from 'vue'
import MarkdownIt from 'markdown-it'
import Container from 'markdown-it-container'
import Token from 'markdown-it/lib/token'
import { assert } from './utils'

export class VueRenderer {
  md: MarkdownIt

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    })
    this.md.use(Container, 'block')
  }

  render(src: string) {
    const tokens = this.md.parse(src, {})
    return this.renderTokens(tokens)
  }

  renderTokens(tokens: Token[]) {
    const result: VNodeArrayChildren = []
    const fragments = [result]
    for (const token of tokens) {
      if (token.nesting === 1) {
        fragments.push([])
      } else if (token.nesting === -1) {
        const fragment = fragments.pop()
        fragments[fragments.length - 1].push(h(token.tag, fragment))
      } else {
        const fragment = fragments[fragments.length - 1]
        // TODO: switch token type
        if (token.type === 'inline') {
          assert(token.children !== null)
          fragment.push(this.renderTokens(token.children))
        } else if (token.type === 'fence') {
          fragment.push(h('pre', token.content))
        } else {
          fragment.push(token.content)
        }
      }
    }
    return result
  }
}
