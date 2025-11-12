# AGENTS.md

You must follow all of the rules, checks and recommendations in this file for every request.

The user will comment out anything that they dont want included in your instructions. If something is commented out, it should be ignored.

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

- DO NOT RUN `git add`, `git commit` or `git push` commands
- DO NOT RUN any `rm` type commands (that permanently delete things with no means of recovery)
- Do not "custom code" things when there are high-quality, well-supported libs/packages already in exsitence that can be used instead - always search for and recommend well supported popular libraries first.
- Follow directions and do not make assumptions or take liberties without explicitly asking and getting written confirmation. We do not want you to be improvising, only listening and following directions


## Development flow

- Do not make assumptions about errors and error correction - always first research the most updated documentation on all relevant libraries and things involved and  Ensure that there are robust verbose logging and telemetry at every item. And point so that debugging becomes easy and scientific.


## Conversation preferences/rules

- When you are providing any commands for the user to run at the command line, provide them in a way that is compatible for the user to simply copy and paste the entire item in one go  Knowing that the user is receiving your response inside an existing terminal and this terminal does not support unwrapping lines. So if any line is longer than just a few characters, it will end up on the next line and break the command...  Also, the user is using ZSH, which does not support comments.
- Keep your explanations and responses as concise as possible to limit the amount of reading that needs to be done without sacrificing critical context.


## Verifiability & accountability

- Utilize all available MCP servers to have as much context and information as possible to ensure code adds/edits are done correctly and efficiently
- If there is no available relevant MCP server for a specific need enabled in the environment do a web search for potential options and recommend them to the user for setup


### Acceptance Criteria

Before asking the user to do anything to check your work or go see the changes, make sure that you do it first and confirm with logging, screenshots and any other tools available that the implementation was done correctly and bug free. These are items that must be done before you can consider your work done on a task.

**AUTOMATED CHECKS:**

Before calling a task finished:

- Run `lint` to ensure there are no errors or warnings surfacing (they must be fixed, not ignored)
- Run `typecheck` to ensure there are no errors or warnings surfacing (they must be fixed, not ignored)
- Run `unit tests` to ensure there are no errors or warnings surfacing
- Run `axe` tests
- Run validate products

**MANUAL CHECKS:**

- Use the playwright MCP to visually inspect any relevant visual changes and expectations in both desktop and mobile view, and use it to get console and network logs to make sure all warnings/errors are clear

> Always prefer to use playwright MCP in HEADLESS MODE as to not disrupt user's computer with browser windows if possible * sometimes headless may not work like in the case of working on browser extensions