import { NextResponse } from "next/server";
import { resolveProductPrice } from "@/lib/pricing/price-manifest";
import { getAllProducts } from "@/lib/products/product";
import { getSiteBaseUrl } from "@/lib/urls";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const products = getAllProducts();
  const siteUrl = getSiteBaseUrl();

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Store Product Feed</title>
    <link>${siteUrl}</link>
    <description>Digital products and tools for creators and businesses</description>
    ${products.map(product => {
      const priceDetails = resolveProductPrice(product);
      const price = (priceDetails.amount ?? 0).toFixed(2);
      const imageUrl = product.featured_image?.startsWith('http')
        ? product.featured_image
        : `${siteUrl}${product.featured_image}`;

      return `
    <item>
      <g:id>${escapeXml(product.slug)}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(product.description || product.tagline || '')}</g:description>
      <g:link>${siteUrl}/${product.slug}</g:link>
      ${imageUrl ? `<g:image_link>${escapeXml(imageUrl)}</g:image_link>` : ''}
      <g:availability>in stock</g:availability>
      <g:price>${price} ${priceDetails.currency}</g:price>
      <g:brand>${escapeXml(product.brand || 'SERP Apps')}</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Software > Computer Software</g:google_product_category>
      <g:product_type>Digital Products > ${escapeXml(product.categories?.[0] || 'Software')}</g:product_type>
      ${product.sku ? `<g:mpn>${escapeXml(product.sku)}</g:mpn>` : `<g:mpn>${escapeXml(product.slug)}</g:mpn>`}

      <!-- Additional recommended fields -->
      <g:identifier_exists>no</g:identifier_exists>
      <g:adult>no</g:adult>
      <g:age_group>all ages</g:age_group>
      <g:gender>unisex</g:gender>

      <!-- Digital product specific -->
      <g:is_bundle>no</g:is_bundle>
      <g:multipack>1</g:multipack>

      <!-- Custom labels for campaign management -->
      <g:custom_label_0>landing</g:custom_label_0>
      <g:custom_label_1>${product.categories?.[0] || 'general'}</g:custom_label_1>
      ${product.featured ? '<g:custom_label_2>featured</g:custom_label_2>' : ''}
    </item>`;
    }).join('')}
  </channel>
</rss>`;

  return new NextResponse(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

// Also create a JSON version for easier debugging
export async function POST() {
  const products = getAllProducts();
  const siteUrl = getSiteBaseUrl();

  const productList = products.map(product => {
    if (!product) return null;

    const priceDetails = resolveProductPrice(product);
    const price = (priceDetails.amount ?? 0).toFixed(2);

    return {
      id: product.slug,
      title: product.name,
      description: product.description || product.tagline,
      link: `${siteUrl}/${product.slug}`,
      image_link: product.featured_image,
      availability: 'in stock',
      price: `${price} ${priceDetails.currency}`,
      brand: product.brand || 'SERP Apps',
      condition: 'new',
      google_product_category: 'Software > Computer Software',
      product_type: `Digital Products > ${product.categories?.[0] || 'Software'}`,
      mpn: product.sku || product.slug,
    };
  }).filter(Boolean);

  return NextResponse.json({
    products: productList,
    count: productList.length,
    generated_at: new Date().toISOString(),
  });
}
