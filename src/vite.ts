import * as fs from 'fs'
import { VNodeChild, VNodeArrayChildren, isVNode } from '@vue/runtime-core'
import { capitalize } from '@vue/shared'
import { MarkdownVueRenderer } from './renderer'

const mdRegex = /\.md$/
const containerRegex = /container-([a-zA-Z_\-]+)/

type ComponentDirResolver = (id: string) => string

interface VMarkVitePluginOption {
  componentDir?: string | ComponentDirResolver
}

export default function plugin(option?: VMarkVitePluginOption) {
  const md = MarkdownVueRenderer.fromOptions()
  return {
    name: 'transform-file',
    transform(src: string, id: string) {
      if (mdRegex.test(id)) {
        const dir =
          option?.componentDir &&
          (typeof option.componentDir === 'function'
            ? option.componentDir(id)
            : option.componentDir)
        const { nodes, frontmatter } = md.render(src)
        const { importScript, fragmentScript } = generateFragmentScript(
          nodes,
          dir,
        )
        const fmScript = `export const frontmatter = ${JSON.stringify(
          frontmatter,
        )}`
        return {
          code: `${importScript}\n${fragmentScript}\n${fmScript}\nexport default { render() { return fragment } }\n`,
        }
      }
    },
  }
}

function generateFragmentScript(nodes: VNodeArrayChildren, dir?: string) {
  const componentFiles = dir === undefined ? [] : fs.readdirSync(dir)
  const [fragment, set] = generateChildren(nodes, componentFiles)
  return {
    importScript: `import { h } from '@vue/runtime-core'\n${Array.from(
      set.values(),
    ).map((c) => `import ${c} from '${dir}/${c}.vue'`)}`,
    fragmentScript: `export const fragment = ${fragment}`,
  }
}

function generateChildren(
  nodes: VNodeArrayChildren,
  componentFiles: string[],
): [string, Set<string>] {
  const set = new Set<string>()
  if (typeof nodes === 'string') {
    return [JSON.stringify(nodes), set]
  }
  return [
    `[${nodes
      .map((n) => {
        const [script, s] = generateNode(n, componentFiles)
        s.forEach((v) => set.add(v))
        return script
      })
      .join(',')}]`,
    set,
  ]
}

function generateNode(
  node: VNodeChild,
  componentFiles: string[],
): [string, Set<string>] {
  if (node instanceof Array) {
    return generateChildren(node, componentFiles)
  }
  const set = new Set<string>()
  if (isVNode(node)) {
    let tag = `'${node.type.toString()}'`
    if (node.props?.class) {
      const componentName = containerRegex.exec(node.props.class)
      if (componentName) {
        const t = capitalize(componentName[1])
        if (componentFiles.includes(`${t}.vue`)) {
          tag = t
          set.add(t)
        }
      }
    }
    const [children, s] = generateChildren(
      (node.children || []) as never,
      componentFiles,
    )
    s.forEach((v) => set.add(v))
    return [
      `h(${tag},${JSON.stringify(node.props)}, { default: () => ${children} })`,
      set,
    ]
  }
  return [JSON.stringify((node ?? '').toString()), set]
}
