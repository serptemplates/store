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
    __tcfapi?: (
      command: string,
      version: number,
      callback: (
        returnValue: Record<string, unknown> | null,
        success: boolean
      ) => void,
      parameter?: unknown
    ) => void;
  }
}
