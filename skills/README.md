# Engineering Standard Skill Files

One file per stack, derived from the v2.0 coding standards. These are the subset an
AI coding agent must obey while generating code — the non-negotiables, the patterns
to copy, and a pre-output checklist. They are **not** a replacement for the standards,
which carry the reasoning, the full rule set and the tool configurations.

## Files

| File | Stack |
|---|---|
| `angular-standard.md`     | Angular 17+ |
| `nextjs-standard.md`      | React / Next.js App Router |
| `node-standard.md`        | Node.js — Express and NestJS |
| `python-standard.md`      | Python — FastAPI, SQLModel, Pydantic v2 |
| `springboot-standard.md`  | Spring Boot — Java 21, PostgreSQL |
| `mobile-standard.md`      | Flutter / Dart |
| `solidity-standard.md`    | Solidity / EVM |

## Installing

**Claude Code / Claude skills** — place the file in the skills directory as
`<skill-name>/SKILL.md`, keeping the YAML frontmatter. The `description` field is
what decides when the skill is used; do not remove it.

**Cursor, Codex, and most other agent tooling** — copy the file into the repository
root as `AGENTS.md`. The frontmatter is harmless; everything below it is read as
instructions.

**Any other agent** — paste the body into the project's system or rules file.

One file per repository. A repository using two stacks takes both, concatenated.

## Keeping them current

A skill file is a derivative. When a v2.0 standard changes, the skill file changes
with it, and the standard is the source of truth where they disagree.

## What these do not do

A skill file makes generated code conform to the standard. It does not make the
developer accountable for that code — **the person raising the PR understands every
line in it and can explain it in review.** An AI review does not replace a human
review, and an unverified AI result is never presented as a tested one.
