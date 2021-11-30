import { defineComponent } from 'vue'
import { VueRenderer } from './renderer'

export default defineComponent({
  name: 'VMark',
  props: {
    src: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const renderer = new VueRenderer()
    return () => {
      renderer.render(props.src)
    }
  },
})
