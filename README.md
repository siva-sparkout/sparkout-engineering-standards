# Sparkout Engineering Standards

Coding standards for every stack we build on, the AI-agent skill files derived from
them, and the tool configurations that enforce them.

**Private repository.** These documents name our infrastructure, our authentication
model and our assessed security posture. Do not make this repository public, and do
not copy its contents into a client repository without checking the engagement terms.

## Layout

| Path | What it holds |
|---|---|
| `standards/<stack>/` | The coding standard — markdown source and the built PDF |
| `skills/<stack>/SKILL.md` | The agent skill file for that stack |
| `config/<stack>/` | Linter and analysis configurations, ready to copy |

The **markdown is the source of truth.** The PDF is built from it in CI — never edit
the PDF directly, and never let the two disagree.

## For developers

1. Copy `skills/<your-stack>/SKILL.md` into your project.
   - Claude: place it at `.claude/skills/<name>/SKILL.md`, frontmatter intact.
   - Cursor, Codex and most other tooling: copy it to the repository root as `AGENTS.md`.
   - **Do not edit the `description` line.** It is what decides when the skill loads;
     trimming it silently stops the skill from being used.
2. Read your stack's standard. If you read nothing else, read the error handling,
   security and money sections.

A repository using two stacks takes both skill files, concatenated.

## For leads

You own your stack's folder — see `CODEOWNERS`. Changes go through a pull request
and get reviewed, the same discipline the standards themselves require.

`config/<stack>/` is what you drop into a repository to make the enforceable rules
real. Baseline the existing violations rather than fixing them all at once: suppress
what exists today, fail the build on new violations only, and work the backlog down
deliberately.

## Changing a standard

1. Edit the markdown in `standards/<stack>/`.
2. Open a PR. CI rebuilds the PDF.
3. A second lead reviews — a cross-stack rule needs agreement from the stacks it affects.
4. Update `skills/<stack>/SKILL.md` if the change touches something an agent must obey.
   **The skill file is a derivative.** Where the two disagree, the standard wins.
5. Material changes bump the version in the document header and get a release tag.

## Versions

`v2.0` — current. Supersedes the v1.0 documents authored by each lead, which are
archived outside this repository as the record of their origin.

## Scope

Standards are portable across projects. Repository-specific material — an analysis
baseline, deployed contract addresses, a project's enforcement phase, open findings —
lives in that repository's own `docs/`, not here.
