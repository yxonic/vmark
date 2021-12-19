import { camelize, capitalize } from '@vue/runtime-core'
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

it('should support component resolver', () => {
  const { transform } = plugin({
    componentResolver: [
      (_, name, info) => {
        if (name === 'icon' && info)
          return {
            name: `Icon${capitalize(camelize(info.split('/').join('-')))}`,
            path: `~icons/${info}`,
          }
      },
      (id, name) =>
        id.split('/').slice(0, id.split('/').lastIndexOf('pages')).join('/') +
        '/components/' +
        name +
        '.vue',
    ],
  })
  const r = transform(
    '@[icon](mi/attachment)\n\n@[warning](test)\n',
    '/path/to/pages/test.md',
  )
  expect(r?.code).toContain(
    "import IconMiAttachment from '~icons/mi/attachment'",
  )
  expect(r?.code).toContain(
    "import Warning from '/path/to/components/warning.vue'",
  )
})

it('should export frontmatter', () => {
  const { transform } = plugin()
  const r = transform('---\ntitle: test\n---\n\n# heading\n', 'test.md')
  expect(r?.code).toContain('export const frontmatter = {"title":"test"}')
})
