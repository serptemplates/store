export {};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (eventName: string, payload?: Record<string, unknown>) => void;
    };
    twq?: (...args: unknown[]) => void;
    pintrk?: (...args: unknown[]) => void;
  }
}
