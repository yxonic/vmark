import VMark from '../src'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

it('should render markdown as vue component', async () => {
  const app = createSSRApp({
    render: () =>
      h(VMark, {
        src: '# *heading*\n```ts{1,3}\ntest\nfn\nread\n```\n::: block\n:::',
      }),
  })
  const html = await renderToString(app)
  expect(html).toContain('<h1>')
  expect(html).toContain('<pre>')
})
