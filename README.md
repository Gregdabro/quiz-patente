# Quiz Patente

Quiz Patente is a React 19 + Vite web application (PWA) designed for Italian driving license (patente) exam preparation. It's built with a mobile-first approach, ensuring seamless performance even on legacy devices like the iPad mini 2 (iOS 12+ compatibility).

## Features
- **Practice:** 7,144 real exam questions divided across 25 topics.
- **Dictionary:** 140+ traffic terminology entries, categorized by priority and logic.
- **Error Tracking:** Built-in error accumulation and focused practice for mistakes.
- **Immersion Mode:** Staged learning flow (Study → Practice → Test) for rapid vocabulary acquisition.
- **Offline Capable:** Data loaded client-side via optimized JSON chunks.

## Project Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Documentation Architecture

This project maintains a clean, minimalist documentation structure to reduce cognitive load and provide a single source of truth for AI assistants and developers:

- `SKILL.md` — **👑 Single Source of Truth**. Contains the core architectural rules, design system, routing, and component guidelines. Always consult this file first.
- `CLAUDE.md` — AI instructions, CLI commands, and quick reference for Claude/AI tools.
- `docs/` — Directory for specific domain and architecture deep-dives.
  - `docs/architecture/dictionary.md` — Dictionary module architecture (data schema, logic).
  - `docs/architecture/dictionary_scaling.md` — Workflow for scaling dictionary data.
  - `docs/TODO.md` — Backlog of identified data fixes and UX improvements.

*Note: Legacy plans and refactoring reports have been archived or removed to keep the workspace clean. All architectural decisions are merged into the files above.*

## Development Rules
- Read `SKILL.md` before making any structural changes.
- Ensure iOS 12 compatibility (no `gap` in flexbox, use CSS variables, avoid complex modern API without polyfills).
- Follow BEM naming for CSS classes.
