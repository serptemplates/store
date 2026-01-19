# Staging CI workflow file issue

If the Staging QA workflow fails immediately with a "workflow file issue" and no jobs/logs, check the YAML indentation in `.github/workflows/staging-ci.yml`. A common cause is a mis-indented matrix entry (e.g., `- check: lighthouse` sitting outside the `matrix.include` list). Fix by indenting the entry under `include` so the workflow parses.
