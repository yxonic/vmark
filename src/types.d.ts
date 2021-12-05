declare module '*.md' {
  import { ComponentOptions, VNodeArrayChildren } from '@vue/runtime-core'
  const component: ComponentOptions
  export default component
  export const nodes: VNodeArrayChildren
  export const frontmatter: string | undefined
}
declare module '*.md?raw' {
  const str: string
  export default str
}
