# Vite + React Template for AI Agents

Starter kit for AI agents that need a Vite 5 + React 18 + TypeScript with TailwindCSS styling.

## Template Scope

- Frontend: React Router v7 with TailwindCSS utility classes. React Router uses the Data API, specifically RouterProvider and createBrowserRouter.
- Quality gates: ESLint 9 + TypeScript strict mode. Run `pnpm run typecheck` and `pnpm run lint` to validate changes.
- Use pnpm to manage packages, for example `pnpm add react`
- Using icons from 'lucide-react' requires explicit import declaration, for example, `import { ArrowRight } from 'lucide-react'`.

## Project Initialization Structure

```
.
├── src/
│   ├── pages/                # One folder per route; each exposes index.tsx as default export
│   │   ├── Home/
│   │   │   └── index.tsx     # HomePage example
│   │   └── NotFound/
│   │       └── index.tsx     # 404 fallback example
│   ├── routes/               # Browser router configuration; register all routes here
│   └── main.tsx              # React entry point mounting to #root & RouterProvider
├── vite.config.ts            # Vite config with @ alias and HMR tweaks
├── tsconfig*.json            # TypeScript project/build configs
├── tailwind.config.ts        # Tailwind configuration
├── postcss.config.js         # PostCSS pipeline setup
├── package.json              # Project metadata and scripts
└── pnpm-lock.yaml            # Locked dependency graph
```

## References

- React Router: https://reactrouter.com/
- TailwindCSS: https://tailwindcss.com/docs
