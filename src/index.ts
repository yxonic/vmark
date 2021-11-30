import { defineComponent } from '@vue/runtime-core'
import { MarkdownVueRenderer } from './renderer'

export default defineComponent({
  name: 'VMark',
  props: {
    src: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const renderer = MarkdownVueRenderer.fromOptions()
    return () => renderer.render(props.src)
  },
})
