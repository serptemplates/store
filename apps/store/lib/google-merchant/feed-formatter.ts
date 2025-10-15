import type { MerchantProduct } from "./merchant-product";

type XmlChannelInfo = {
  title?: string;
  link?: string;
  description?: string;
};

const CSV_HEADERS = [
  "id",
  "title",
  "description",
  "link",
  "mobile_link",
  "image_link",
  "additional_image_link",
  "availability",
  "price",
  "sale_price",
  "content_language",
  "target_country",
  "brand",
  "condition",
  "google_product_category",
  "product_type",
  "identifier_exists",
  "shipping",
  "adult",
  "mpn",
  "custom_label_0",
] as const;

function formatMoney(value?: { value: string; currency: string } | null): string {
  if (!value) {
    return "";
  }
  return `${value.value} ${value.currency}`;
}

function formatProductType(productTypes?: string[]): string {
  if (!productTypes || productTypes.length === 0) {
    return "";
  }
  return productTypes.join(" > ");
}

function formatAdditionalImages(images?: string[]): string {
  if (!images || images.length === 0) {
    return "";
  }
  return images.join(", ");
}

function formatShipping(product: MerchantProduct): string {
  if (!product.shipping.length) {
    return "";
  }
  const entry = product.shipping[0];
  return `${entry.country}:::${entry.price.value} ${entry.price.currency}`;
}

function csvEscape(value: string): string {
  const sanitized = value.replace(/\r?\n|\r/g, " ").trim();
  return `"${sanitized.replace(/"/g, '""')}"`;
}

export function serializeMerchantProductsToCsv(products: MerchantProduct[]): string {
  const rows = products.map((product) => {
    const record: Record<(typeof CSV_HEADERS)[number], string> = {
      id: product.offerId,
      title: product.title,
      description: product.description,
      link: product.link,
      mobile_link: product.mobileLink ?? "",
      image_link: product.imageLink ?? "",
      additional_image_link: formatAdditionalImages(product.additionalImageLinks),
      availability: product.availability,
      price: formatMoney(product.price),
      sale_price: formatMoney(product.salePrice ?? null),
      content_language: product.contentLanguage,
      target_country: product.targetCountry,
      brand: product.brand,
      condition: product.condition,
      google_product_category: product.googleProductCategory ?? "",
      product_type: formatProductType(product.productTypes),
      identifier_exists: product.identifierExists ? "TRUE" : "FALSE",
      shipping: formatShipping(product),
      adult: product.adult ? "TRUE" : "FALSE",
      mpn: product.mpn ?? "",
      custom_label_0: product.customLabel0 ?? "",
    };

    return CSV_HEADERS.map((header) => csvEscape(record[header])).join(",");
  });

  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderXmlItem(product: MerchantProduct): string {
  const lines: string[] = [
    "    <item>",
    `      <g:id>${xmlEscape(product.offerId)}</g:id>`,
    `      <g:title>${xmlEscape(product.title)}</g:title>`,
    `      <g:description>${xmlEscape(product.description)}</g:description>`,
    `      <g:link>${xmlEscape(product.link)}</g:link>`,
  ];

  if (product.mobileLink) {
    lines.push(`      <g:mobile_link>${xmlEscape(product.mobileLink)}</g:mobile_link>`);
  }

  if (product.imageLink) {
    lines.push(`      <g:image_link>${xmlEscape(product.imageLink)}</g:image_link>`);
  }

  for (const image of product.additionalImageLinks ?? []) {
    lines.push(`      <g:additional_image_link>${xmlEscape(image)}</g:additional_image_link>`);
  }

  lines.push(`      <g:availability>${xmlEscape(product.availability)}</g:availability>`);
  lines.push(`      <g:price>${xmlEscape(formatMoney(product.price))}</g:price>`);

  if (product.salePrice) {
    lines.push(`      <g:sale_price>${xmlEscape(formatMoney(product.salePrice))}</g:sale_price>`);
  }

  lines.push(`      <g:content_language>${xmlEscape(product.contentLanguage)}</g:content_language>`);
  lines.push(`      <g:target_country>${xmlEscape(product.targetCountry)}</g:target_country>`);
  lines.push(`      <g:brand>${xmlEscape(product.brand)}</g:brand>`);
  lines.push(`      <g:condition>${xmlEscape(product.condition)}</g:condition>`);

  if (product.googleProductCategory) {
    lines.push(`      <g:google_product_category>${xmlEscape(product.googleProductCategory)}</g:google_product_category>`);
  }

  if (product.productTypes?.length) {
    lines.push(`      <g:product_type>${xmlEscape(formatProductType(product.productTypes))}</g:product_type>`);
  }

  lines.push(`      <g:identifier_exists>${product.identifierExists ? "TRUE" : "FALSE"}</g:identifier_exists>`);

  for (const shipping of product.shipping) {
    lines.push("      <g:shipping>");
    lines.push(`        <g:country>${xmlEscape(shipping.country)}</g:country>`);
    lines.push(`        <g:price>${xmlEscape(formatMoney(shipping.price))}</g:price>`);
    lines.push("      </g:shipping>");
  }

  lines.push(`      <g:adult>${product.adult ? "TRUE" : "FALSE"}</g:adult>`);

  if (product.mpn) {
    lines.push(`      <g:mpn>${xmlEscape(product.mpn)}</g:mpn>`);
  }

  if (product.customLabel0) {
    lines.push(`      <g:custom_label_0>${xmlEscape(product.customLabel0)}</g:custom_label_0>`);
  }

  lines.push("    </item>");

  return lines.join("\n");
}

export function serializeMerchantProductsToXml(
  products: MerchantProduct[],
  channelInfo: XmlChannelInfo = {},
): string {
  const title = channelInfo.title ?? "Store Product Feed";
  const link = channelInfo.link ?? "";
  const description = channelInfo.description ?? "Product feed for Google Merchant Center";

  const channelLines: string[] = ["  <channel>", `    <title>${xmlEscape(title)}</title>`];

  if (link) {
    channelLines.push(`    <link>${xmlEscape(link)}</link>`);
  }

  channelLines.push(`    <description>${xmlEscape(description)}</description>`);

  const items = products.map((product) => renderXmlItem(product)).join("\n");

  const channel = [...channelLines, items, "  </channel>"].join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    channel,
    "</rss>",
  ].join("\n");
}
