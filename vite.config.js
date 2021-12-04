import Vue from '@vitejs/plugin-vue'
import VMark from './src/vite'

export default {
  define: {
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: false,
  },
  plugins: [
    Vue(),
    VMark({
      componentDirResolver: (f) => {
        return f.slice(0, f.lastIndexOf('/')) + '/components'
      },
    }),
  ],
}
