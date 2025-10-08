# Issue 59 – GHL Purchase Metadata Enhancements

- [ ] Audit current GHL sync inputs and identify where purchase metadata should be injected (Stripe webhook, PayPal capture/webhook, helpers)
- [ ] Extend `syncOrderWithGhl` context and helpers to accept provider, purchase metadata JSON, and license payloads without disturbing existing fields
- [ ] Build utility functions that format `contact.purchase_metadata` and `contact.license_keys_v2` payloads as JSON strings for GHL custom fields
- [ ] Thread the new context data through Stripe and PayPal flows, ensuring metadata includes product/page/provider/license info
- [ ] Wire the JSON outputs into configurable GHL custom fields (environment variables or product config) and document the setup requirements
- [ ] Update unit/integration tests to cover the new metadata fields and verify `syncOrderWithGhl` is called with them
- [ ] Run API/unit suites plus Playwright checkout smoke with console/network logging to confirm no regressions
- [ ] Review docs/config files for references to the new custom fields and add guidance as needed
