# VMark

Markdown rendering as [Vue 3](https://v3.vuejs.org) component tree, with carefully selected Markdown features, human-friendly rendering options, and custom vue component support. It also provides a Vite plugin for this to happen at server-side.

## Usage

```bash
npm i @yxonic/vmark
```

Then in your `.vue` file:

```vue
<template>
  <v-mark src="# heading">
</template>
<script setup>
import VMark from '@yxonic/vmark'
</script>
```

### Vite plugin

You can also use VMark to import `.md` files as Vue components. In your `vite.config.js`:

```js
import vue from '@vitejs/plugin-vue'
import vmark from '@yxonic/vmark/vite'

export default {
  plugins: [vue(), vmark()]
}
```

### Configuration

VMark:
```ts
export interface MarkdownVueRendererOptions {
  html?: boolean
  containers?: Record<string, ComponentOptions | null>
  customRules?: RenderRules
  nodeRenderer?: NodeRenderer
}

export interface Node {
  tag: string | ComponentOptions | null
  attrs: Record<string, string>
  children: VNodeArrayChildren
}
export type TokenRenderRule = (
  token: Token,
  ctx: { nodeRenderer: NodeRenderer },
) => Node | string | null
export type RenderRules = Record<string, TokenRenderRule>
export type NodeRenderer = (node: Node | string) => VNodeChild
```

Vite plugin:
```ts
type ComponentResolver = (
  name: string,
  id: string,
) => string | { name: string; path: string } | null | undefined

interface VMarkVitePluginOption {
  rewriteBaseUrl?: boolean
  containers?: string[]
  defaultComponentDir?: string
  componentDirResolver?: (id: string) => string | null | undefined
  componentResolver?: ComponentResolver | ComponentResolver[]
}
```

## TODO

- [x] Support token renderer customization for each type.
- [ ] A handy collection of `markdown-it` plugins (anchor, attrs, KaTeX, etc.).
- [x] Feature-oriented options for `<v-mark>`.
- [x] Custom components.
- [ ] Dynamic options.
- [x] Vite plugin.
- [x] Export frontmatter and document structure.
- [ ] Error display.
- [ ] Documentation.

## `markdown-it` Plugins

### Community packages
- [x] [markdown-it-cjk-breaks](https://github.com/markdown-it/markdown-it-cjk-breaks)
- [ ] [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote)*
- [x] [markdown-it-abbr](https://github.com/markdown-it/markdown-it-abbr)
- [x] [markdown-it-deflist](https://github.com/markdown-it/markdown-it-deflist)
- [x] [markdown-it-container](https://github.com/markdown-it/markdown-it-container)*
- [ ] [markdown-it-task-lists](https://github.com/revin/markdown-it-task-lists)*
- [x] [markdown-it-front-matter](https://github.com/ParkSB/markdown-it-front-matter)
- [ ] [markdown-it-anchor](https://github.com/valeriangalliat/markdown-it-anchor)*
- [ ] [markdown-it-table-of-contents](https://github.com/cmaas/markdown-it-table-of-contents)
- [ ] [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs)*
- [ ] [markdown-it-multimd-table](https://github.com/RedBug312/markdown-it-multimd-table)

\* needs special care when rendering

### Manual

- [x] Link rewrite
- [ ] KaTeX
