import * as fs from 'fs'
import * as crypto from 'crypto'
import { camelize, capitalize, hyphenate } from '@vue/shared'
import { MarkdownVueRenderer } from '.'
import { RenderRules } from './renderer'

const mdRegex = /\.md$/

type ComponentResolver = (
  name: string,
  id: string,
) => string | { name: string; path: string } | null | undefined

interface VMarkVitePluginOption {
  rewriteBaseUrl?: boolean
  customRules?: RenderRules
  containers?: string[]
  defaultComponentDir?: string
  componentDirResolver?: (id: string) => string | null | undefined
  componentResolver?: ComponentResolver | ComponentResolver[]
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

      const resolvers =
        option?.componentResolver === undefined
          ? []
          : typeof option.componentResolver === 'function'
          ? [option.componentResolver]
          : option.componentResolver
      const dir =
        (option?.componentDirResolver && option.componentDirResolver(id)) ||
        option?.defaultComponentDir

      const componentFileSet = new Set(dir ? fs.readdirSync(dir) : [])
      const base = config?.base || '/'

      const dynamicImportScripts = new Set<string>()

      const md = MarkdownVueRenderer.fromOptions({
        html: true,
        customRules: option?.customRules,
        containers: Object.fromEntries(
          (
            option?.containers ||
            Array.from(componentFileSet.values()).map((f) =>
              hyphenate(f.split('.')[0]),
            ) ||
            []
          ).map((c) => [c, null]),
        ),
        nodeRenderer(node) {
          if (typeof node === 'string') return JSON.stringify(node)

          let tag = node.tag as string | null
          const { attrs, children } = node

          if (!tag) {
            return `[\n${children.join(',\n')},\n]`
          }

          if (
            tag === 'a' &&
            option?.rewriteBaseUrl !== false &&
            attrs.href &&
            attrs.href.startsWith('/')
          ) {
            // prepend base url
            attrs.href = base + attrs.href.slice(1)
          }

          let attrSrc = ''
          if (tag === 'img' && attrs.src && !attrs.src.startsWith('http')) {
            const hash = crypto
              .createHash('md5')
              .update(attrs.src)
              .digest('hex')
            const src = `Image${hash}`
            dynamicImportScripts.add(`import ${src} from '${attrs.src}'`)
            attrs.src = src
            attrSrc = `, src: ${src}`
          }

          // try custom resolvers
          let resolvedComponent: { name: string; path: string } | undefined
          for (let i = 0; i < resolvers.length; i++) {
            const r = resolvers[i](tag, id)
            if (r) {
              resolvedComponent = {
                name:
                  typeof r === 'string' ? capitalize(camelize(tag)) : r.name,
                path: typeof r === 'string' ? r : r.path,
              }
              break
            }
          }

          if (resolvedComponent) {
            tag = resolvedComponent.name
            dynamicImportScripts.add(
              `import ${tag} from '${resolvedComponent.path}'`,
            )
          } else if (tag.startsWith('container_')) {
            // resolve from dir
            const name = tag.split('_')[1]
            let filename
            if (componentFileSet.has(`${name}.vue`)) {
              filename = name
            } else if (componentFileSet.has(`${camelize(name)}.vue`)) {
              filename = camelize(name)
            } else if (
              componentFileSet.has(`${capitalize(camelize(name))}.vue`)
            ) {
              filename = capitalize(camelize(name))
            }

            if (filename) {
              tag = capitalize(camelize(name))
              dynamicImportScripts.add(
                `import ${tag} from '${dir}/${filename}.vue'`,
              )
            } else {
              tag = '"div"'
              if (attrs.class) {
                attrs.class = `${attrs.class} container-${name}`
              } else {
                attrs.class = `container-${name}`
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
      const dynamicImportScript = `${Array.from(
        dynamicImportScripts.values(),
      ).join('\n')}`
      const nodeScript = `export const nodes = [\n${nodes.join(',\n')},\n]`
      const renderScript = `export default { render() {\nreturn nodes\n}\n}`
      const frontmatterScript = `export const frontmatter = ${JSON.stringify(
        frontmatter,
      )}`

      return {
        code: `${importScript}\n${dynamicImportScript}\n\n${nodeScript}\n\n${renderScript}\n\n${frontmatterScript}\n`,
      }
    },
  }
}
