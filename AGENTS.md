# AGENTS.md

## Pre-work

Confirm all of these items are present before starting work on a task:

- Eslint is configured and active (for javascrpt based projects)
- Eslint rules include no explicit or implicit any
- There is a pnpm lint script to run typescript across all of the project
- There is a precommit hook for running lint
- There is a precommit hook for running typechecks
- There is a precommit hook for running unit test suite
- There is a precommit hook for running smoke test suite


## Work rules

- use playwright MCP server to see browser console and network logs, and correct your errors and fix items
- DO NOT RUN `git add`, `git commit` or `git push` commands

### Acceptance criteria

Items that must be done before you can consider your work done on a task:

1. Run lint and typechecks to ensure items are running fine before submitting a task as complete
2. Run the unit test suite

