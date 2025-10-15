'use client';

import { GoogleTagManager } from '@next/third-parties/google';

export function DelayedGTM({ gtmId }: { gtmId: string }) {
  return <GoogleTagManager gtmId={gtmId} />;
}