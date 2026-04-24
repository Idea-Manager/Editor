# Contributing to IdeaEditor

Thank you for your interest in improving IdeaEditor. This document describes how we work together and what we expect from pull requests.

Please read the **[Code of Conduct](CODE_OF_CONDUCT.md)** before participating.

## Ways to contribute

- **Issues** — Bug reports, small fixes, and feature ideas: use [GitHub Issues](https://github.com/Idea-Manager/Editor/issues). Include steps to reproduce for bugs and, when helpful, screenshots or short recordings for UI behavior.
- **Documentation** — The public docs site lives in `website/` (Docusaurus). Install its dependencies once with `cd website && npm ci`, then from the repo root run `npm run docs:dev`.
- **Code** — Follow the workflow and standards below.

## Before you start coding

- Search existing issues and pull requests to avoid duplicate work.
- For larger changes, opening an issue first helps align on direction and scope.
- Keep changes **focused**: one logical concern per pull request makes review faster and safer to merge.

## Development setup

From the repository root:

1. Install dependencies: `npm ci` (root project).
2. Run the app: `npm run dev`.
3. Run tests: `npm test`.

For documentation only:

```bash
cd website && npm ci && npm start
```

(or from root, after `website` dependencies are installed: `npm run docs:dev`).

## Pull requests

1. **Fork** the repository and create a **branch** from the default branch (e.g. `fix-block-selection` or `docs-license-typo`).
2. **Commit** with clear messages that explain *what* changed; reference issues when relevant (`Fixes #42`).
3. **Open a PR** with a short description of the change and *why* it is needed. Link related issues.
4. **Iterate** on review feedback. Maintainers may request tests, naming tweaks, or smaller follow-up PRs.

### What we look for in review

- **Tests** — Behavioral changes should include new or updated tests (`jest`); fix any failures before requesting review.
- **TypeScript** — The project uses strict TypeScript; avoid `any` unless there is a strong, documented reason.
- **Scope** — Avoid unrelated refactors or drive-by formatting in the same PR as a feature fix.
- **UI changes** — When behavior or visuals change, a brief note or screenshot in the PR helps reviewers.

## Coding standards

These rules reflect how the codebase is structured today. When in doubt, match surrounding code.

### TypeScript and structure

- Prefer **small, explicit** functions and types; reuse existing modules and naming patterns.
- Respect path aliases (`@core/*`, `@text-editor/*`, `@graphic-editor/*`, `@ui/*`, `@shared/*`) as defined in `tsconfig.json`.

### Tests

- Use **Jest** with the existing config (`jest.config.js`).
- Prefer tests that lock in behavior users depend on (commands, block logic, selection, etc.).

### Styles (SCSS)

- Use the **shared design tokens** from `src/styles/_variables.scss` (or the package-local equivalent): avoid hard-coded hex colors, ad hoc font stacks, or one-off spacing that should be a variable.
- The UI follows a **monochrome** palette with limited exceptions for status or validation. New colors should extend the variable system, not bypass it.

### Internationalization

- **User-visible strings** should go through the project’s i18n layer; add keys and translations when you introduce new copy.

### Architecture direction

- Core features should remain compatible with a future where **multi-editing** and **CRDT-based** collaboration may be added with a separate backend. Avoid designs that tightly couple the editor to a single-user-only assumption when a small abstraction would keep options open.

### Security and dependencies

- Do not commit secrets or credentials.
- New dependencies should be justified (size, maintenance, license) and kept minimal.

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project: the **MIT License** (see [LICENSE](LICENSE)).
