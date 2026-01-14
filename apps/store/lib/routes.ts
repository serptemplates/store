const ACCOUNT_ROOT = "/account";
const BLOG_ROOT = "/blog";
const CATEGORIES_ROOT = "/categories";
const CHECKOUT_ROOT = "/checkout";
const VIDEOS_ROOT = "/videos";

export const ROUTES = {
  account: ACCOUNT_ROOT,
  accountVerify: `${ACCOUNT_ROOT}/verify`,
  blog: BLOG_ROOT,
  blogPost: (slug: string) => `${BLOG_ROOT}/${slug}`,
  categories: CATEGORIES_ROOT,
  category: (slug: string) => `${CATEGORIES_ROOT}/${slug}`,
  checkoutRoot: CHECKOUT_ROOT,
  checkout: (slug: string) => `${CHECKOUT_ROOT}/${slug}`,
  checkoutSuccess: `${CHECKOUT_ROOT}/success`,
  videos: VIDEOS_ROOT,
} as const;
