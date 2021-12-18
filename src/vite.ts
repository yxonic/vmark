import * as fs from 'fs'
import * as crypto from 'crypto'
import { camelize, capitalize } from '@vue/shared'
import { MarkdownVueRenderer } from '.'

const mdRegex = /\.md$/

type ComponentDirResolver = (id: string) => string

interface VMarkVitePluginOption {
  defaultComponentDir?: string
  componentDirResolver?: ComponentDirResolver
}
interface ViteConfig {
  base?: string
}

export default function plugin(option?: VMarkVitePluginOption) {
  let config: ViteConfig
  return {
    name: 'transform-markdown',
    configResolved(resolvedConfig: ViteConfig) {
      // store the resolved config
      config = resolvedConfig
    },
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
      const base = config?.base || '/'

      const dynamicImportScripts = new Set<string>()

      const md = MarkdownVueRenderer.fromOptions({
        html: true,
        nodeRenderer(node) {
          if (typeof node === 'string') return JSON.stringify(node)

          let tag = node.tag
          const { attrs, children } = node

          if (!tag) {
            return `[\n${children.join(',\n')},\n]`
          }

          if (tag === 'a' && attrs.href && attrs.href.startsWith('/')) {
            // prepend base url
            attrs.href = base + attrs.href.slice(1)
          }

          let attrSrc = ''
          if (tag === 'img' && attrs.src) {
            const hash = crypto
              .createHash('md5')
              .update(attrs.src)
              .digest('hex')
            const src = `Image${hash}`
            dynamicImportScripts.add(`import ${src} from '${attrs.src}'`)
            attrs.src = src
            attrSrc = `, src: ${src}`
          }

          if (tag.startsWith('block_') || tag.startsWith('container_')) {
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
              dynamicImportScripts.add(
                `import ${name} from '${dir}/${filename}.vue'`,
              )
            } else {
              tag = type === 'block' ? '"span"' : '"div"'
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
          } else {
            tag = `"${tag}"`
          }

          if (children.length === 0) {
            return `h(\n${tag},\n{ ...${JSON.stringify(attrs)}${attrSrc} })`
          }

          return `h(\n${tag},\n{ ...${JSON.stringify(
            attrs,
          )}${attrSrc} },\n[\n${children.join(',\n')},\n])`
        },
      })
      const { nodes, frontmatter } = md.render(src)

      const importScript = `import { h } from '@vue/runtime-core'`
      const renderScript = `export default { render() {\nreturn [\n${nodes.join(
        ',\n',
      )},\n]\n}\n}`
      const frontmatterScript = `export const frontmatter = ${JSON.stringify(
        frontmatter,
      )}`

      return {
        code: `${importScript}\n${Array.from(
          dynamicImportScripts.values(),
        ).join('\n')}\n\n${renderScript}\n\n${frontmatterScript}\n`,
      }
    },
  }
}
