"""Placeholder module so CodeQL's python analyzer has a target.

The project no longer ships Python code in production, but GitHub's
code scanning workflow still runs the python extractor. Keeping a tiny
module ensures the analyzer completes without error while we migrate the
historic scripts to TypeScript.
"""

def health_check() -> bool:
    """Return True to prove the module executed."""
    return True

if __name__ == "__main__":  # pragma: no cover
    print("CodeQL placeholder health check:", health_check())
