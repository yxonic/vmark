// code comes from https://github.com/posva/markdown-it-custom-block

import MarkdownIt from 'markdown-it'

const embedRE = /@\[([\w-]+)\]\((.*)\)/im

export default function plugin(md: MarkdownIt) {
  md.block.ruler.before(
    'fence',
    'custom',
    function customEmbed(state, startLine, endLine, silent) {
      const startPos = state.bMarks[startLine] + state.tShift[startLine]
      const maxPos = state.eMarks[startLine]
      const block = state.src.slice(startPos, maxPos)
      const pointer = { line: startLine, pos: startPos }

      // XXX wtf
      if (startLine !== 0) {
        const prevLineStartPos =
          state.bMarks[startLine - 1] + state.tShift[startLine - 1]
        const prevLineMaxPos = state.eMarks[startLine - 1]
        if (prevLineMaxPos > prevLineStartPos) return false
      }

      // Check if it's @[tag](arg)
      if (
        state.src.charCodeAt(pointer.pos) !== 0x40 /* @ */ ||
        state.src.charCodeAt(pointer.pos + 1) !== 0x5b /* [ */
      ) {
        return false
      }

      const match = embedRE.exec(block)

      if (!match || match.length < 3) {
        return false
      }

      const [all, tag, arg] = match

      pointer.pos += all.length

      // Block embed must be at end of input or the next line must be blank.
      // TODO something can be done here to make it work without blank lines
      if (endLine !== pointer.line + 1) {
        const nextLineStartPos =
          state.bMarks[pointer.line + 1] + state.tShift[pointer.line + 1]
        const nextLineMaxPos = state.eMarks[pointer.line + 1]
        if (nextLineMaxPos > nextLineStartPos) return false
      }

      if (pointer.line >= endLine) return false

      if (!silent) {
        const token = state.push('custom', 'div', 0)
        token.markup = state.src.slice(startPos, pointer.pos)
        token.tag = `block_${tag}`
        token.info = arg
        token.block = true
        token.map = [startLine, pointer.line + 1]
        state.line = pointer.line + 1
      }

      return true
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] },
  )
}
