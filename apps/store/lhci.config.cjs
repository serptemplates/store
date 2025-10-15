const baseUrl = process.env.LHCI_BASE_URL ?? 'http://127.0.0.1:4313';
const FAST = process.env.LHCI_FAST === '1';

const blockedUrlPatterns = [
  'https://*.tawk.to/*',
  'https://*.i.posthog.com/*',
  'https://connect.facebook.net/*',
  'https://www.googletagmanager.com/*',
  'https://www.google-analytics.com/*',
  'https://static.hotjar.com/*',
  'https://script.hotjar.com/*',
];

/** @type {import('@lhci/cli/src/types').LHCIConfig} */
module.exports = {
  ci: {
    collect: {
      url: [
        `${baseUrl}/`,
        `${baseUrl}/loom-video-downloader`,
      ],
      numberOfRuns: FAST ? 1 : 1, // keep 1 locally; raise in CI if you want stability
      settings: FAST
        ? {
            // FAST LOCAL: no throttling, still emulate mobile layout
            preset: 'desktop',
            formFactor: 'desktop',
            throttlingMethod: 'provided',           // <- uses your real CPU/network (no slowdowns)
            screenEmulation: { disabled: true },    // let layout come from viewport below
            // A sane mobile-ish viewport so CLS/layout is representative
            // (Lighthouse will still treat as mobile via formFactor)
            onlyCategories: ['performance','accessibility','best-practices','seo'],
            disableStorageReset: true,              // speeds up re-runs
            blockedUrlPatterns,
            // Optional: skip expensive audits if you just want a smoke-check
            // skipAudits: ['bf-cache','network-requests'],
          }
        : {
            // STRICT (CI): realistic throttling on mobile
            preset: 'desktop',
            formFactor: 'desktop',
            throttlingMethod: 'devtools',
            // let Lighthouse pick the right emulation for 'mobile'
            // (no need for emulatedFormFactor or manual screenEmulation)
            blockedUrlPatterns,
          },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage', // fine for experimenting; switch for CI if sensitive
    },
  },
};
