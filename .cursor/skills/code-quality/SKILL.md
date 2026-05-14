---
name: code-quality
description: Apply linting, formatting, DRY, KISS, functional programming, and clean-code principles to generated or edited code. Use for conforming to project lint/format config, avoiding duplication, and writing maintainable code. Triggers on code review, refactoring, or quality requirements.
---

# Code quality

Generated or edited code must follow the project's **linting and formatting**, **DRY**, **KISS**, **functional programming** principles, and **clean-code** practices.

## Linting and formatting

- Conform to the **lint and format config already in the repo** (e.g. ESLint, Prettier).
- Do not introduce lint or style violations. Run the project's linter and formatter and fix any issues before considering the change complete.

## DRY (Don't Repeat Yourself) — required

- Do not copy-paste blocks of logic or styles.
- Extract repeated values into constants, variables, tokens, mixins, or shared utilities.
- Reuse existing components, services, and helpers instead of duplicating behavior.

## KISS (Keep It Simple, Stupid) — required

- Prefer the **simplest solution** that solves the problem; avoid over-engineering.
- Avoid unnecessary abstractions, layers, or indirection until they are justified by reuse or clarity.
- Prefer clear, readable code over clever or "elegant" code when they conflict.

## Functional programming principles — required

- Prefer **pure functions** where possible: same inputs → same outputs, no side effects.
- Avoid **mutable state**; prefer immutable data and updates (e.g. new objects/arrays instead of mutating in place).
- Use **declarative** patterns: `map`, `filter`, `reduce`, and composition over imperative loops when they improve readability.
- Keep **side effects** (I/O, DOM, subscriptions) at the edges; isolate them in services or explicit effect boundaries.

## Clean code — required

- Use full, descriptive names; avoid unnecessary abbreviations (unless a well-known project or domain term).
- Keep units of code focused and single-purpose; prefer small, reusable pieces.
- Avoid deep nesting and tangles; code should be easy to change without breaking unrelated behavior.
- Add brief comments or JSDoc for non-obvious behavior and document _why_ when intent is not clear from the code alone.

## Code style (Angular / TypeScript)

- **Max ~30 lines per method** — extract private helpers for anything longer.
- **Max 3 parameters** — use an options/config object beyond that.
- **Use `private`** on internal methods and fields.
- **Single responsibility** — one function does one thing.
- **No business logic in components** — delegate to stores/services.

## TypeScript guidelines

- Prefer type inference where obvious; annotate return types on public methods and service APIs.
- Avoid `any` — use `unknown` and type-narrow.
- Define clear interfaces and types for component state, service responses, and data models. Co-locate in the feature folder or a shared `models/` directory.
- No magic numbers/strings — extract to named constants or enums.
- No `console.log` in production code — use `console.warn` for caught errors only.
