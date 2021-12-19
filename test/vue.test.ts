import VMark from '../src'
import { App, createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

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

it('should render custom blocks and containers', async () => {
  const app = createSSRApp({
    render: () =>
      h(VMark, {
        src: ':::note {args}\ntest\n:::',
        options: {
          containerComponents: { note: null },
        },
      }),
  })
  const html = await renderToString(app)
  expect(html).toContain('<div class="container-note" data-info="note {args}">')
})

it('should render raw html tags', async () => {
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
        src: '<div class="test-class">test</div>',
        options: { html: true },
      }),
  })
  html = await renderToString(app)
  expect(html).toContain('<div class="test-class">test</div>')

  app = createSSRApp({
    render: () =>
      h(VMark, {
        src: '<div class="test-class">div</div>*test* &amp;<span>span</span>',
        options: { html: true },
      }),
  })
  html = await renderToString(app)
  expect(html).toContain(
    '<div class="test-class">div</div>*test* &amp;<span>span</span>',
  )

  app = createSSRApp({
    render: () =>
      h(VMark, {
        src: '# heading\n\n<!--comment test-->\n\n<div><!--comment test--></div>',
        options: { html: true },
      }),
  })
  html = await renderToString(app)
  expect(html).toContain('<h1>heading</h1>\n<div></div>')

  app = createSSRApp({
    render: () =>
      h(VMark, {
        src: '<div class="border">\n\n# heading\n\n</div>',
        options: { html: true },
      }),
  })
  html = await renderToString(app)
  expect(html).toContain('<div class="border"><h1>heading</h1></div>')

  app = createSSRApp({
    render: () =>
      h(VMark, {
        src: 'inline <span style="color: red">red</span> text with <br> and <br />',
        options: { html: true },
      }),
  })
  html = await renderToString(app)
  expect(html).toContain(
    // slash omitted for self-closing tags
    '<p>inline <span style="color: red">red</span> text with <br> and <br></p>',
  )
})
