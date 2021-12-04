import { default as App, frontmatter, nodes } from './example.md'
console.log(frontmatter)
console.log(nodes)

import markdown from './example.md?raw'
import VMark from '../src'

import { createApp, h } from 'vue'

const app = createApp({
  render: () => [
    h('div', h(App)),
    h('div', h(VMark, { src: markdown, options: { containers: ['warning'] } })),
  ],
})

app.mount('#app')
