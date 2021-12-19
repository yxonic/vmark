import { camelize, capitalize } from '@vue/runtime-core'
import plugin from '../src/vite'

it('should export render function', () => {
  const { transform } = plugin()
  const r = transform('# heading\n', 'test.md')
  expect(r?.code).toContain('h1')
  expect(r?.code).toContain('"heading"')
})

it('should support component resolver', () => {
  const { transform } = plugin({
    containers: ['warning'],
    componentResolver: [
      (name) => {
        if (name.startsWith('i-')) {
          const parts = name.split('-').slice(1)
          return {
            name: `Icon${capitalize(camelize(parts.join('-')))}`,
            path: `~icons/${parts[0]}/${parts[1]}`,
          }
        }
      },
      (name, id) => {
        if (name.startsWith('container_')) {
          return {
            name: capitalize(name.split('_')[1]),
            path:
              id
                .split('/')
                .slice(0, id.split('/').lastIndexOf('pages'))
                .join('/') +
              '/components/' +
              name.split('_')[1] +
              '.vue',
          }
        }
      },
    ],
  })
  const r = transform(
    '<i-mi-attachment />\n\n:::warning\ntext\n:::\n',
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
