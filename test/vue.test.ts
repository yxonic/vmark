import VMark from '../src'
import { App, createSSRApp, h } from 'vue'
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

it('should render lists', async () => {
  const app = createSSRApp({
    render: () =>
      h(VMark, {
        src: '* item 1\n* item 2',
      }),
  })
  const html = await renderToString(app)
  expect(html).toContain('<ul>')
  expect(html).toContain('<li>')
  expect(html).not.toMatch(/<li>\s*<p>/)
})

it('should render html tags', async () => {
  let app: App<Element>, html: string

  app = createSSRApp({
    render: () =>
      h(VMark, {
        src: '<br />',
      }),
  })
  html = await renderToString(app)
  expect(html).not.toContain('<br />')

  app = createSSRApp({
    render: () =>
      h(VMark, {
        src: '<div>test</div>',
        options: { html: true },
      }),
  })
  html = await renderToString(app)
  expect(html).toContain('<div>test</div>')
})
