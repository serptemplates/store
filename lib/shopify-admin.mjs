import process from "node:process";

const DEFAULT_ADMIN_VERSION = "2024-04";

function resolveEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

const storeDomain =
  resolveEnv("SHOPIFY_STORE_DOMAIN") ??
  resolveEnv("SHOPIFY_DOMAIN") ??
  resolveEnv("SHOPIFY_SHOP_DOMAIN");

const adminToken =
  resolveEnv("SHOPIFY_API_TOKEN") ??
  resolveEnv("SHOPIFY_ADMIN_API_TOKEN") ??
  resolveEnv("SHOPIFY_ACCESS_TOKEN");

const apiVersion = resolveEnv("SHOPIFY_ADMIN_API_VERSION") ?? DEFAULT_ADMIN_VERSION;

if (!storeDomain) {
  throw new Error(
    "Missing Shopify store domain. Set SHOPIFY_STORE_DOMAIN (e.g. serp-store.myshopify.com) in your environment.",
  );
}

if (!adminToken) {
  throw new Error(
    "Missing Shopify Admin API token. Set SHOPIFY_API_TOKEN (or SHOPIFY_ADMIN_API_TOKEN) in your environment.",
  );
}

const graphqlEndpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
const restBaseUrl = `https://${storeDomain}/admin/api/${apiVersion}`;

const ADMIN_ACCESS_OPTIONS = new Set([
  "PRIVATE",
  "PUBLIC_READ",
  "PUBLIC_READ_WRITE",
  "MERCHANT_READ",
  "MERCHANT_READ_WRITE",
]);

const STOREFRONT_ACCESS_OPTIONS = new Set(["PUBLIC_READ", "NONE"]);

function normalizeMetafieldAccess(access) {
  if (!access) {
    return undefined;
  }

  const normalized = {};

  if (access.admin !== undefined) {
    normalized.admin = normalizeAccessValue(access.admin, "admin");
  }

  if (access.storefront !== undefined) {
    normalized.storefront = normalizeAccessValue(access.storefront, "storefront");
  }

  if (normalized.storefront === "PUBLIC_READ") {
    if (!normalized.admin || !String(normalized.admin).startsWith("PUBLIC_")) {
      normalized.admin = "PUBLIC_READ_WRITE";
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeAccessValue(value, target) {
  if (value === true) {
    return target === "admin" ? "MERCHANT_READ_WRITE" : "PUBLIC_READ";
  }

  if (value === false) {
    return target === "admin" ? "PRIVATE" : "NONE";
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const upper = value.trim().toUpperCase();
    if (target === "admin" && ADMIN_ACCESS_OPTIONS.has(upper)) {
      return upper;
    }

    if (target === "storefront" && STOREFRONT_ACCESS_OPTIONS.has(upper)) {
      return upper;
    }
  }

  return value;
}

async function shopifyGraphql(query, variables = {}) {
  const response = await fetch(graphqlEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify GraphQL ${response.status} ${response.statusText}: ${body}`);
  }

  const payload = await response.json();
  if (payload.errors && payload.errors.length > 0) {
    const details = payload.errors.map((error) => error.message ?? JSON.stringify(error)).join("; ");
    throw new Error(`Shopify GraphQL errors: ${details}`);
  }

  return payload.data;
}

export async function getProductByHandle(handle) {
  const data = await shopifyGraphql(
    `query productByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        status
        descriptionHtml
        tags
        variants(first: 50) {
          edges {
            node {
              id
              sku
              price
              compareAtPrice
            }
          }
        }
        metafields(first: 50) {
          edges {
            node {
              id
              namespace
              key
              type
              value
            }
          }
        }
      }
    }`,
    { handle },
  );

  return data?.productByHandle ?? null;
}

export async function ensureCollection(title, { handle, descriptionHtml } = {}) {
  const collectionHandle = handle ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 255);

  const lookup = await shopifyGraphql(
    `query collectionByHandle($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        handle
        title
      }
    }`,
    { handle: collectionHandle },
  );

  if (lookup?.collectionByHandle) {
    return lookup.collectionByHandle;
  }

  const data = await shopifyGraphql(
    `mutation collectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
          handle
          title
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      input: {
        title,
        handle: collectionHandle,
        descriptionHtml,
      },
    },
  );

  const userErrors = data?.collectionCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    const messages = userErrors.map((error) => `${error.message}${error.field ? ` (${error.field.join(".")})` : ""}`).join(
      "; ",
    );
    throw new Error(`Shopify collectionCreate error(s): ${messages}`);
  }

  return data.collectionCreate?.collection ?? null;
}

export function getStoreDomain() {
  return storeDomain;
}

export function getAdminApiVersion() {
  return apiVersion;
}

async function restRequest(method, path, payload) {
  const response = await fetch(`${restBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Shopify REST ${method} ${path} → ${response.status} ${response.statusText}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function createProductRest(productPayload) {
  const data = await restRequest("POST", "/products.json", { product: productPayload });
  return data?.product ?? null;
}

export async function updateProductRest(productId, productPayload) {
  const data = await restRequest("PUT", `/products/${productId}.json`, {
    product: { id: Number(productId), ...productPayload },
  });
  return data?.product ?? null;
}

export async function updateVariantRest(variantId, variantPayload) {
  const data = await restRequest("PUT", `/variants/${variantId}.json`, {
    variant: { id: Number(variantId), ...variantPayload },
  });
  return data?.variant ?? null;
}

export async function setProductMetafields(ownerId, metafields) {
  if (!ownerId || !Array.isArray(metafields) || metafields.length === 0) {
    return;
  }

  const inputs = metafields
    .filter((field) => field && field.value !== undefined && field.value !== null)
    .map((field) => ({
      ownerId,
      namespace: field.namespace,
      key: field.key,
      type: field.type,
      value: String(field.value),
    }));

  if (inputs.length === 0) {
    return;
  }

  const data = await shopifyGraphql(
    `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { metafields: inputs },
  );

  const userErrors = data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length > 0) {
    const messages = userErrors.map((error) => `${error.message}${error.field ? ` (${error.field.join(".")})` : ""}`).join(
      "; ",
    );
    throw new Error(`Shopify metafieldsSet error(s): ${messages}`);
  }

  return data?.metafieldsSet?.metafields ?? [];
}

export async function ensureMetafieldDefinition(definitionInput) {
  const { namespace, key } = definitionInput;
  if (!namespace || !key) {
    throw new Error("Metafield definition requires namespace and key");
  }

  const ownerType = definitionInput.ownerType ?? "PRODUCT";

  const existingData = await shopifyGraphql(
    `query metafieldDefinitions($ownerType: MetafieldOwnerType!, $namespace: String!, $key: String!) {
      metafieldDefinitions(first: 1, ownerType: $ownerType, namespace: $namespace, key: $key) {
        edges {
          node {
            id
            name
            namespace
            key
            ownerType
            type {
              name
            }
          }
        }
      }
    }`,
    { ownerType, namespace, key },
  );

  const existing = existingData?.metafieldDefinitions?.edges?.[0]?.node ?? null;
  if (existing) {
    return { created: false, definition: existing };
  }

  const createInput = {
    name: definitionInput.name,
    namespace,
    key,
    type: definitionInput.type,
    description: definitionInput.description,
    ownerType,
    access: normalizeMetafieldAccess(definitionInput.access),
  };

  const data = await shopifyGraphql(
    `mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
          namespace
          key
          ownerType
          type {
            name
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { definition: createInput },
  );

  const userErrors = data?.metafieldDefinitionCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    const messages = userErrors
      .map((error) => `${error.message}${error.field ? ` (${error.field.join(".")})` : ""}`)
      .join("; ");
    throw new Error(`Shopify metafieldDefinitionCreate error(s): ${messages}`);
  }

  return {
    created: true,
    definition: data?.metafieldDefinitionCreate?.createdDefinition ?? null,
  };
}

export async function replaceProductImages(productId, images) {
  if (!productId) {
    throw new Error("replaceProductImages requires a productId");
  }

  const list = await restRequest("GET", `/products/${productId}/images.json`);
  const existingImages = list?.images ?? [];

  for (const existing of existingImages) {
    await restRequest("DELETE", `/products/${productId}/images/${existing.id}.json`);
  }

  for (const image of images) {
    if (!image?.src) continue;

    const payload = {
      image: {
        product_id: Number(productId),
        src: image.src,
        alt: image.alt,
      },
    };

    await restRequest("POST", `/products/${productId}/images.json`, payload);
  }
}
