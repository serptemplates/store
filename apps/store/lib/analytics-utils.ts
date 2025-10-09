/**
 * Analytics utility functions for consistent data parsing and tracking
 */

/**
 * Safely parse a price string to a number
 * @param priceStr - Price string like "$97.00" or "97"
 * @returns Parsed price as number, or 0 if invalid
 */
export function parsePriceString(priceStr: string | number | undefined | null): number {
  if (!priceStr) return 0;
  
  const str = String(priceStr).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(str);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safely parse cookies into an object
 * Handles encoded values with = signs correctly
 */
export function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  
  const cookies: Record<string, string> = {};
  
  document.cookie.split('; ').forEach(cookie => {
    const indexOfEquals = cookie.indexOf('=');
    if (indexOfEquals === -1) return;
    
    const key = cookie.substring(0, indexOfEquals);
    const value = cookie.substring(indexOfEquals + 1);
    
    cookies[key] = decodeURIComponent(value);
  });
  
  return cookies;
}

/**
 * Clear tracking cookies
 */
export function clearTrackingCookies(): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = 'ghl_checkout=; Max-Age=0; path=/';
  document.cookie = 'ghl_product=; Max-Age=0; path=/';
  document.cookie = 'ghl_price=; Max-Age=0; path=/';
}
