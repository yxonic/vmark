import plugin from '../src/vite'

it('should export render function', () => {
  const { transform } = plugin()
  const r = transform('# heading\n', 'test.md')
  expect(r?.code).toContain('h1')
  expect(r?.code).toContain('"heading"')
})

it('should export render custom blocks', () => {
  const { transform } = plugin()
  const r = transform('@[video](test)\n', 'test.md')
  expect(r?.code).toContain(
    JSON.stringify({ class: 'block-video', 'data-info': 'test' }),
  )
})

it('should export frontmatter', () => {
  const { transform } = plugin()
  const r = transform('---\ntitle: test\n---\n\n# heading\n', 'test.md')
  expect(r?.code).toContain('export const frontmatter = {"title":"test"}')
})
