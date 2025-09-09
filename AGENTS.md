# Repository Guidelines

This document streamlines contributions to Cherry Studio. It summarizes how the project is laid out, how to run it locally, and the expectations for code, tests, and pull requests.

## Project Structure & Module Organization

- App code lives under `src/`:
  - `src/main` (Electron main process), `src/preload`, `src/renderer` (React + TS UI).
  - Shared assets/styles in `src/renderer/src/assets`.
- Workspace packages in `packages/` (e.g. `@cherrystudio/ai-core`).
- Tests in `tests/` (setup, e2e) and `**/__tests__/**` across `src` and `packages`.
- Build artifacts/config: `build/`, `electron-builder.yml`, `electron.vite.config.ts`, `resources/`.

## Build, Test, and Development Commands

- Prereqs: Node `>=22`, Yarn `4.x`. Copy env: `cp .env.example .env`.
- Install: `yarn install`
- Dev app: `yarn dev` (Electron + Vite in watch mode)
- Preview: `yarn start`
- Typecheck: `yarn typecheck`
- Lint/format: `yarn lint`, `yarn format:check` (or `yarn format` to write)
- Unit tests: `yarn test`, coverage: `yarn test:coverage`
- E2E: `yarn test:e2e`
- Package build: `yarn build`; platform targets: `yarn build:mac|win|linux`

## Coding Style & Naming Conventions

- Language: TypeScript (ES modules). Enforced by ESLint + Prettier.
- Formatting (Prettier): 120 cols, single quotes, no semicolons, trailing comma none.
- Lint rules: import sorting (`simple-import-sort`), no unused imports, no `console` in `src` (use LoggerService; see `docs/technical/how-to-use-logger-en.md`).
- Naming: React components and files in UI use PascalCase; tests use `*.test.ts`/`*.test.tsx` within `__tests__`.

## Testing Guidelines

- Framework: Vitest; React Testing Library for UI; Playwright for e2e.
- Place unit/integration tests next to code in `__tests__` or under `tests/`.
- Use snapshots sparingly for stable UI; prefer explicit assertions.
- Run `yarn test` and `yarn test:coverage` locally; keep meaningful coverage for changed areas.

## Commit & Pull Request Guidelines

- Conventional commits: `feat(scope): message`, `fix(scope): message`, `refactor`, `ci`, `style`, etc.
- Sign-off required: `git commit -s -m "..."`.
- Before opening a PR: `yarn build:check` (lint + tests) must pass.
- PRs should include: clear description, linked issues (`Fixes #123`), screenshots for UI changes, and notes on testing/impact.

## Security & Configuration Tips

- Never commit secrets. Use `.env` (see `.env.example`).
- Prefer environment variables over hardcoding. Review `electron-builder.yml` when adding native deps.

## Agent-Specific Notes (for automation)

- Keep patches focused; do not modify unrelated files.
- Always run `yarn lint` and relevant tests after changes.
- Use LoggerService instead of `console` in `src/*`.

