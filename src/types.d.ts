declare module '*.md' {
  import { Component, VNodeArrayChildren } from '@vue/runtime-core'
  const component: Component
  export default component
  export const nodes: VNodeArrayChildren
  export const frontmatter: Record<string, unknown> | undefined
}
