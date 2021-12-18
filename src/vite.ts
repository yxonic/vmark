import * as fs from 'fs'
import { camelize, capitalize } from '@vue/shared'
import { MarkdownVueRenderer } from '.'

const mdRegex = /\.md$/

type ComponentDirResolver = (id: string) => string

interface VMarkVitePluginOption {
  defaultComponentDir?: string
  componentDirResolver?: ComponentDirResolver
}

export default function plugin(option?: VMarkVitePluginOption) {
  return {
    name: 'transform-file',
    transform(src: string, id: string) {
      if (!mdRegex.test(id)) {
        return
      }

      const dir =
        (option?.componentDirResolver && option.componentDirResolver(id)) ||
        option?.defaultComponentDir
      const componentFileSet = new Set(
        dir === undefined ? [] : fs.readdirSync(dir),
      )

      const componentImportScripts = new Set<string>()

      const md = MarkdownVueRenderer.fromOptions({
        nodeRenderer(node) {
          if (typeof node === 'string') return JSON.stringify(node)

          let tag = node.tag
          const { attrs, children } = node

          if (tag === null) {
            return `[\n${children.join(',\n')},\n]`
          }

          if (tag.startsWith('block') || tag.startsWith('container')) {
            const fields = tag.split('_')
            const type = fields[0]
            const name = fields[1]

            let filename = undefined
            if (componentFileSet.has(`${name}.vue`)) {
              filename = name
            }
            if (componentFileSet.has(`${camelize(name)}.vue`)) {
              filename = camelize(name)
            }
            if (componentFileSet.has(`${capitalize(camelize(name))}.vue`)) {
              filename = capitalize(camelize(name))
            }

            if (filename) {
              tag = name
              componentImportScripts.add(
                `import ${name} from '${dir}/${filename}.vue'`,
              )
            } else {
              tag = type === 'block' ? 'span' : 'div'
              if (attrs.class) {
                attrs.class = `${attrs.class} ${type}-${name}`
              } else {
                attrs.class = `${type}-${name}`
              }
              if (attrs.info) {
                attrs['data-info'] = attrs.info
                delete attrs.info
              }
            }
          }

          return `h(\n'${tag}',\n${JSON.stringify(attrs)},\n[\n${children.join(
            ',\n',
          )},\n])`
        },
      })
      const { nodes, frontmatter } = md.render(src)

      const importScript = `import { h } from '@vue/runtime-core'`
      const renderScript = `export function render() {\nreturn [\n${nodes.join(
        ',\n',
      )},\n]\n}`
      const frontmatterScript = `export const frontmatter = ${JSON.stringify(
        frontmatter,
      )}`

      return {
        code: `${importScript}\n${Array.from(
          componentImportScripts.values(),
        ).join('\n')}\n\n${renderScript}\n\n${frontmatterScript}\n`,
      }
    },
  }
}
