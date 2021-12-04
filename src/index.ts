import { defineComponent } from '@vue/runtime-core'
import { MarkdownVueRenderer } from './renderer'
import type { PropType } from '@vue/runtime-core'
import type { MarkdownVueRendererOptions } from './renderer'

export default defineComponent({
  name: 'VMark',
  props: {
    src: {
      type: String,
      required: true,
    },
    options: {
      type: Object as PropType<MarkdownVueRendererOptions>,
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      const renderer = MarkdownVueRenderer.fromOptions(props.options)
      return renderer.render(props.src).nodes
    }
  },
})
