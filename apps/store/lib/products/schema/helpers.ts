import { z } from "zod";

export const trimmedString = () => z.string().trim().min(1);

export const optionalTrimmedString = () =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value !== "string") {
        return value;
      }
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().trim().optional(),
  );

export const enforceHost = (hosts: string | string[]) => {
  const allowedHosts = Array.isArray(hosts) ? hosts : [hosts];
  return trimmedString()
    .url()
    .superRefine((value, ctx) => {
      try {
        const parsed = new URL(value);
        if (!allowedHosts.includes(parsed.hostname)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `URL must use host ${allowedHosts.join(", ")}`,
          });
        }
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid URL",
        });
      }
    });
};

export const optionalHost = (hosts: string | string[]) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === "string" && value.trim().length === 0) {
        return undefined;
      }
      return value;
    },
    enforceHost(hosts).optional(),
  );

export const optionalExternalUrl = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().url().optional(),
);

export const slugSchema = () =>
  z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must use lowercase letters, numbers, and hyphens only",
    });

export const optionalArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    z.array(schema).optional().default([]),
  );

export const optionalIsoDate = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z
    .string()
    .superRefine((value, ctx) => {
      if (Number.isNaN(Date.parse(value))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expected an ISO 8601 date string",
        });
      }
    })
    .optional(),
);

export const isoCurrencyCode = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return undefined;
      }
      return trimmed.toUpperCase();
    }
    return value;
  },
  z
    .string()
    .regex(/^[A-Z]{3}$/, {
      message: "Currency must be an ISO 4217 alpha code (e.g. USD)",
    })
    .optional(),
);

export const stripeIdSchema = (prefixes: string[]) =>
  trimmedString().superRefine((value, ctx) => {
    if (!prefixes.some((prefix) => value.startsWith(prefix))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected an identifier starting with ${prefixes.join(" or ")}`,
      });
    }
  });

export const assetPathSchema = trimmedString().superRefine((value, ctx) => {
  if (/^https?:\/\//i.test(value)) {
    return;
  }
  if (value.startsWith("/")) {
    return;
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Expected an absolute URL or root-relative path",
  });
});

export const screenshotSchema = z.object({
  url: assetPathSchema,
  alt: optionalTrimmedString(),
  caption: optionalTrimmedString(),
});

export const externalLinkSchema = z.object({
  label: trimmedString(),
  href: trimmedString().url(),
});

export const reviewSchema = z.object({
  name: trimmedString(),
  review: trimmedString(),
  title: optionalTrimmedString(),
  rating: z.number().min(0).max(5),
  date: optionalIsoDate,
});

export const faqSchema = z.object({
  question: trimmedString(),
  answer: trimmedString(),
});

export const successUrlSchema = trimmedString().superRefine((value, ctx) => {
  const sanitized = value.replaceAll("{CHECKOUT_SESSION_ID}", "checkout_session_id");

  try {
    const parsed = new URL(sanitized);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL must use http or https",
      });
      return;
    }

    if (!["apps.serp.co", "localhost"].includes(parsed.hostname)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "success_url must point to apps.serp.co (or localhost for development)",
      });
    }
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid URL",
    });
  }
});

export const cancelUrlSchema = trimmedString()
  .url()
  .superRefine((value, ctx) => {
    try {
      const parsed = new URL(value);
      if (!["apps.serp.co", "localhost"].includes(parsed.hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cancel_url must point to apps.serp.co (or localhost for development)",
        });
      }
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid URL",
      });
    }
  });

export const optionalRemoteUrl = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return undefined;
  },
  z.string().optional(),
);
