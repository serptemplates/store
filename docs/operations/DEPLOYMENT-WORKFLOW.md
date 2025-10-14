# Deployment Workflow & Branch Protection

## Branch Protection Rules ✅

The `main` branch now has the following protection rules enabled:

- **Pull Requests Required**: All changes must go through a pull request
- **No Direct Pushes**: Cannot push directly to main
- **Dismiss Stale Reviews**: Old PR reviews are dismissed when new commits are pushed
- **No Force Pushes**: Cannot force push to main
- **No Deletions**: Cannot delete the main branch

## Development Workflow

### 1. Create a Feature Branch
```bash
# Create a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Your Changes
```bash
# Make your code changes

# Keep the compiled app running while you work
pnpm dev

# Run the verification stack before opening a PR
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:smoke

# Optional: build the production bundle when debugging Vercel-only issues
pnpm --filter @apps/store build
```

### 3. Commit and Push
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature-name
```

### 4. Create Pull Request
```bash
# Using GitHub CLI
gh pr create --title "Add new feature" --body "Description of changes"

# Or go to GitHub and click "Compare & pull request"
```

**PR checklist**

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] `pnpm test:smoke`
- [ ] Linked issue / context updated (docs, plan checkboxes, etc.)

### 5. Preview Deployment
- **Automatic**: When you create a PR, Vercel automatically creates a preview deployment
- **Preview URL**: Will be commented on the PR by Vercel bot
- **Format**: `https://store-pr-[number]-serpcompany.vercel.app`

### 6. Merge to Main
- Once preview looks good, merge the PR
- This triggers automatic production deployment to https://apps.serp.co

## Vercel Preview Deployments

### How It Works
1. **Pull Request Created** → Vercel builds preview
2. **New Commits Pushed** → Vercel updates preview
3. **PR Merged** → Deploys to production
4. **PR Closed** → Preview deployment removed

### Preview URLs
- Each PR gets a unique preview URL
- Preview URLs are temporary and deleted after PR is closed
- Share preview URLs for testing before production

## Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

## Quick Commands

### Create PR from CLI
```bash
gh pr create
```

### Check PR Status
```bash
gh pr status
```

### View Preview Deployment
```bash
gh pr view --web
# Look for Vercel bot comment with preview URL
```

### Merge PR (after approval)
```bash
gh pr merge
```

## Emergency Procedures

### If You Need to Push Directly to Main
1. You'll need admin access
2. Temporarily disable branch protection:
   ```bash
   gh api repos/serptemplates/store/branches/main/protection -X DELETE
   ```
3. Make your emergency fix
4. Re-enable protection (see branch-protection.json)

### Rollback Production
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

## Benefits of This Workflow

1. **No Accidental Breaks**: Can't accidentally break production
2. **Preview Everything**: See changes before they go live
3. **Automatic Deployments**: No manual deployment needed
4. **Easy Rollbacks**: Can quickly revert if issues arise
5. **Clean History**: All changes documented in PRs

## Current Status

- ✅ Branch protection enabled on `main`
- ✅ Vercel connected for automatic deployments
- ✅ Preview deployments configured
- ✅ Production deploys from `main` only
