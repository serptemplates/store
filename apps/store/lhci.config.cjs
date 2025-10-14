const baseUrl = process.env.LHCI_BASE_URL ?? 'http://127.0.0.1:3000';

/** @type {import('@lhci/cli/src/types').LHCIConfig} */
module.exports = {
  ci: {
    collect: {
      url: [
        `${baseUrl}/`,
        `${baseUrl}/loom-video-downloader`,
      ],
      numberOfRuns: 1,
      settings: {
        formFactor: 'mobile',
        emulatedFormFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2.625,
          disabled: false,
        },
        throttlingMethod: 'devtools',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
