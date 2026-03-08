import { describe, expect, it } from 'vitest';

import {
  BUNDLE_PRODUCT_IDS,
  resolveDownloaderCrossSellTarget,
} from '@/lib/payments/stripe-cross-sell-config';

describe('stripe cross-sell config', () => {
  it('does not default downloader cross-sells to the bundle in live mode', () => {
    const target = resolveDownloaderCrossSellTarget({
      env: {},
      accountAlias: 'primary',
      mode: 'live',
    });

    expect(target).toBeUndefined();
  });

  it('does not default downloader cross-sells to the bundle in test mode', () => {
    const target = resolveDownloaderCrossSellTarget({
      env: {},
      accountAlias: 'primary',
      mode: 'test',
    });

    expect(target).toBeUndefined();
  });

  it('rejects bundle product ids even when provided via environment variables', () => {
    const target = resolveDownloaderCrossSellTarget({
      env: {
        STRIPE_CROSS_SELL_DOWNLOADERS_PRODUCT_ID_LIVE: BUNDLE_PRODUCT_IDS[0],
      },
      accountAlias: 'primary',
      mode: 'live',
    });

    expect(target).toBeUndefined();
  });

  it('allows a non-bundle cross-sell target from environment variables', () => {
    const target = resolveDownloaderCrossSellTarget({
      env: {
        STRIPE_CROSS_SELL_DOWNLOADERS_PRODUCT_ID_LIVE: 'prod_test_non_bundle',
      },
      accountAlias: 'primary',
      mode: 'live',
    });

    expect(target).toBe('prod_test_non_bundle');
  });
});
