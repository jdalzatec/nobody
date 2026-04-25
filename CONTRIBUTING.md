## Project Structure

```
nobody/
├── skills/
│   ├── research/
│   ├── plan/
│   ├── annotate/
│   ├── review/
│   ├── add-todos/
│   └── implement/
├── webapp/              # React annotation viewer
│   ├── src/
│   │   ├── components/  # MarkdownViewer, AnnotationSidebar, etc.
│   │   ├── hooks/       # useAnnotations, useAnnotationLayout
│   │   └── lib/         # api, dom-highlight, remark/rehype plugins
│   ├── server/          # Node.js file read/write API
│   └── Dockerfile
└── lefthook.yml         # Git hooks (lint, typecheck, test)
```

## Webapp

The annotation viewer is a React + TypeScript app served via Docker.

**Key capabilities:**

- Renders GitHub Flavored Markdown and Mermaid diagrams
- Select any text to create an inline annotation
- Annotations are shown in a sidebar with SVG connectors to the highlighted text
- Saves annotations back to the source file as CriticMarkup (`{==text==}{>>comment<<}`)

**Development:**

```bash
cd webapp
npm install
npm run dev
npm run dev:api
```

## Quality Gates

Git hooks run automatically via [Lefthook](https://github.com/evilmartians/lefthook):

- **pre-commit**: ESLint, Prettier, Stylelint
- **pre-push**: TypeScript type check, Vitest tests

CI (GitHub Actions) runs the same checks on every push and PR to `main`, and publishes a multi-arch Docker image (
`linux/amd64`, `linux/arm64`) on merge.
