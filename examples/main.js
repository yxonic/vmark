import { default as App, frontmatter } from './example.md'
console.log(frontmatter)

import markdown from './example.md?raw'
import VMark from '../src'

import { createApp, h } from 'vue'

const app = createApp({
  render: () => [h('div', h(App)), h('div', h(VMark, { src: markdown }))],
})

app.mount('#app')
