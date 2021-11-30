import { h } from 'vue'
import MarkdownIt from 'markdown-it'
export class VueRenderer {
  md: MarkdownIt
  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    })
  }
  render(src: string) {
    return h('div', { innerHTML: this.md.render(src) })
  }
}
