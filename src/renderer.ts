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
    return this.md.render(src)
  }
}
