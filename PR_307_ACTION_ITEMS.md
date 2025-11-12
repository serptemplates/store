# PR #307 Action Items Checklist

## 🚨 Critical - Block Production Deploy

- [ ] **Fix Incorrect Legal FAQs**
  - [ ] Audit all product JSON files for "Is this legal?" FAQ
  - [ ] Remove generic downloader FAQ from:
    - [ ] Browser extensions (e.g., restore-closed-tabs-extension)
    - [ ] UI component libraries (e.g., serp-blocks)
    - [ ] AI generators (e.g., ai-bulk-image-generator)  
    - [ ] Any other non-downloader products
  - [ ] Create product-type-specific FAQ templates:
    - [ ] Downloader FAQ (current generic one)
    - [ ] Browser extension FAQ
    - [ ] Component library FAQ
    - [ ] AI generator FAQ
    - [ ] Other categories as needed
  - [ ] Reapply correct FAQs to each product type
  - [ ] Run validation: `pnpm validate:products`

- [ ] **Legal Counsel Review**
  - [ ] Send `/legal/terms` page to SoCal IP Law Group LLP
  - [ ] Send `/legal/dmca` page to SoCal IP Law Group LLP
  - [ ] Address any feedback from counsel
  - [ ] Get written approval before production deploy

- [ ] **DMCA Agent Verification**
  - [ ] Verify registration at https://dmca.copyright.gov/osp/
  - [ ] If not registered, complete registration
  - [ ] Confirm email dmca@serp.co is monitored

## ⚠️ High Priority - Before Production

- [ ] **Trademark Review**
  - [ ] Send trademark disclaimer text to trademark counsel
  - [ ] Verify FTC nominative fair use compliance
  - [ ] Test disclaimer visibility on multiple products

- [ ] **Component Cleanup**
  - [ ] Search codebase for `ProductMediaGallery` imports
  - [ ] Remove any remaining imports or restore component if needed
  - [ ] Test product pages display images correctly

- [ ] **Legal Policy Links**
  - [ ] Add /legal link to footer
  - [ ] Add /legal/terms link to checkout flow
  - [ ] Verify all links work

## 📋 Medium Priority - Before Scaling

- [ ] **Axe Pre-Push Hook**
  - [ ] Test hook reliability on developer machines
  - [ ] Add port availability check
  - [ ] Increase timeout to 60 seconds
  - [ ] Document bypass: `git push --no-verify`
  - [ ] Consider moving to CI instead of pre-push

- [ ] **GitHub Workflow Security**
  - [ ] Add `permissions: {}` to `.github/workflows/broken-link-checker.placeholder.yml`
  - [ ] Re-run security scan to clear alert

- [ ] **Product Data Quality**
  - [ ] Run full product audit script
  - [ ] Check for inconsistent trademark_metadata
  - [ ] Verify no deprecated fields remain
  - [ ] Spot-check 20-30 products manually

## ✅ Testing Checklist

### Automated Tests
- [ ] `pnpm lint` - passes
- [ ] `pnpm typecheck` - passes  
- [ ] `pnpm test:unit` - passes
- [ ] `pnpm test:axe` - passes
- [ ] `pnpm validate:products` - passes

### Manual Testing

**Checkout Flow:**
- [ ] Test checkout WITHOUT optional items (regular flow)
- [ ] Test checkout WITH optional items configured
- [ ] Verify optional item appears in Stripe checkout
- [ ] Complete test purchase with optional item added
- [ ] Complete test purchase without optional item
- [ ] Verify webhooks process both line items correctly
- [ ] Check order records in database
- [ ] Verify licenses generated for both products

**Product Pages (Test 5-10 Products):**
- [ ] Downloader product - verify FAQ is appropriate
- [ ] Browser extension - verify FAQ is appropriate  
- [ ] Component library - verify FAQ is appropriate
- [ ] AI generator - verify FAQ is appropriate
- [ ] Product with trademark - verify disclaimer displays
- [ ] Product without trademark - verify no disclaimer
- [ ] All images display correctly
- [ ] Sticky bar works on mobile
- [ ] Sticky bar works on desktop

**Legal Pages:**
- [ ] Visit /legal - links work
- [ ] Visit /legal/terms - content displays
- [ ] Visit /legal/dmca - content displays
- [ ] Breadcrumbs work on all pages
- [ ] SEO metadata correct

**Footer:**
- [ ] Footer displays on homepage
- [ ] Footer displays on product pages
- [ ] Footer displays on blog pages
- [ ] Footer displays on category pages
- [ ] Footer displays on checkout success
- [ ] Footer displays on account page
- [ ] Footer displays on legal pages
- [ ] Site name normalized correctly (no "Apps Apps")
- [ ] Site URL correct

**Structured Data:**
- [ ] Test with Google Rich Results Test
- [ ] Verify product schema uses SEO names
- [ ] Check breadcrumb schema
- [ ] Verify no trademark names in inappropriate places

## 📊 Validation Commands

```bash
# Run from repo root

# Validate product data
pnpm validate:products

# Run all checks
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:axe

# Search for ProductMediaGallery imports
grep -r "ProductMediaGallery" apps/store --include="*.tsx" --include="*.ts"

# Find products with "download speeds" in FAQ (should be downloaders only)
grep -r "download speeds" apps/store/data/products --include="*.json"

# Find products with trademark_metadata
grep -r "trademark_metadata" apps/store/data/products --include="*.json" | wc -l

# Check for deprecated fields that should be removed
grep -r "serply_link\|store_serp_co_product_page_url" apps/store/data/products --include="*.json"
```

## 🎯 Go/No-Go Decision Matrix

### ✅ SAFE TO MERGE when:
- [x] All critical items complete
- [x] Legal counsel approval received
- [x] DMCA registration verified
- [x] All automated tests pass
- [x] Manual testing complete
- [x] Trademark review complete

### ❌ DO NOT MERGE until:
- [ ] Incorrect FAQs fixed (BLOCKING)
- [ ] Legal counsel review complete (BLOCKING)
- [ ] DMCA verification complete (BLOCKING)

## ⏱️ Estimated Time

- **Critical fixes:** 2-4 hours (FAQ corrections)
- **Legal review:** 1-2 business days
- **Testing:** 2-3 hours
- **Total:** 3-5 business days

## 📞 Contacts

- **Legal Review:** SoCal IP Law Group LLP
- **DMCA Agent:** dmca@serp.co
- **Technical Questions:** Reference PR_307_REVIEW.md

## 📝 Notes

- Review documents created: `PR_307_REVIEW.md` and `PR_307_EXECUTIVE_SUMMARY.md`
- All Copilot review comments were accurate and should be addressed
- This PR contains excellent work but needs critical fixes before production
- Safe to merge to staging environment for testing after FAQ fixes

---

**Last Updated:** 2025-11-12  
**Status:** Awaiting critical fixes before production deployment
