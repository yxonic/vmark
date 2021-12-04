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

You can also register VMark as global component. It's up to you.

## TODO

- [ ] Support token renderer customization for each type.
- [ ] A handy collection of `markdown-it` plugins.
- [ ] Feature-oriented options for `<v-mark>`.
- [x] Custom components.
- [ ] Dynamic options.
- [x] Vite plugin.
- [x] Export frontmatter and document structure.
- [ ] Documentation.

## `markdown-it` Plugins

### Community packages
- [x] [markdown-it-cjk-breaks](https://github.com/markdown-it/markdown-it-cjk-breaks)
- [ ] [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote)*
- [x] [markdown-it-abbr](https://github.com/markdown-it/markdown-it-abbr)
- [x] [markdown-it-deflist](https://github.com/markdown-it/markdown-it-deflist)
- [x] [markdown-it-custom-block](https://github.com/posva/markdown-it-custom-block)*
- [x] [markdown-it-container](https://github.com/markdown-it/markdown-it-container)*
- [ ] [markdown-it-task-lists](https://github.com/revin/markdown-it-task-lists)*
- [x] [markdown-it-front-matter](https://github.com/ParkSB/markdown-it-front-matter)
- [ ] [markdown-it-anchor](https://github.com/valeriangalliat/markdown-it-anchor)*
- [ ] [markdown-it-table-of-contents](https://github.com/cmaas/markdown-it-table-of-contents)
- [ ] [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs)*
- [ ] [markdown-it-multimd-table](https://github.com/RedBug312/markdown-it-multimd-table)

\* needs special care when rendering

### Manual

- [ ] Link rewrite
- [ ] KaTeX
