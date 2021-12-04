import * as fs from 'fs'
import * as path from 'path'
import { hyphenate } from '@vue/shared'

const mdRegex = /\.md$/

type ComponentDirResolver = (id: string) => string

interface VMarkVitePluginOption {
  defaultComponentDir?: string
  componentDirResolver?: ComponentDirResolver
}

export default function plugin(option?: VMarkVitePluginOption) {
  return {
    name: 'transform-file',
    transform(_: string, id: string) {
      if (mdRegex.test(id)) {
        const rawImportScript = `import markdownRaw from '${id}?raw'\nconst markdown = markdownRaw.replace(/\\\\\`/g, '\`')`

        const dir =
          (option?.componentDirResolver && option.componentDirResolver(id)) ||
          option?.defaultComponentDir
        const componentFiles = dir === undefined ? [] : fs.readdirSync(dir)
        const componentImportScript = componentFiles
          .map((f) => `import ${f.slice(0, f.length - 4)} from '${dir}/${f}'`)
          .join('\n')

        const rendererImportScript = `import { MarkdownVueRenderer } from '${path.join(
          __dirname,
          'renderer',
        )}'`

        const optionScript = JSON.stringify({ html: true, ...option })
        const componentOptionScript = `{ ${componentFiles
          .map(
            (f) =>
              `${hyphenate(f.slice(0, f.length - 4))}: ${f.slice(
                0,
                f.length - 4,
              )}`,
          )
          .join(', ')} }`
        const rendererScript = `const md = MarkdownVueRenderer.fromOptions({ ...${optionScript}, customComponents: ${componentOptionScript} })`

        return {
          code: `${rawImportScript}
${componentImportScript}
${rendererImportScript}
${rendererScript}
export const { nodes, frontmatter } = md.render(markdown)
export default { render() { return nodes } }
`,
        }
      }
    },
  }
}
