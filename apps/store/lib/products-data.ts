import fs from 'fs'
import path from 'path'
import yaml from 'yaml'

export interface Product {
  id: string
  title: string
  handle: string
  description?: string
  thumbnail?: string
  images?: Array<{ url: string }>
  coming_soon?: boolean
  new_release?: boolean
  popular?: boolean
  variants: Array<{
    id: string
    title: string
    prices: Array<{
      amount: number
      currency_code: string
    }>
    inventory_quantity?: number
  }>
  metadata?: Record<string, any>
  collection?: string
}

// Load products from YAML files
export async function getProducts(): Promise<Product[]> {
  const productsDir = path.join(process.cwd(), 'data/products')
  const files = await fs.promises.readdir(productsDir)
  const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))

  const products: Product[] = []

  for (const file of yamlFiles) {
    const content = await fs.promises.readFile(path.join(productsDir, file), 'utf-8')
    const data = yaml.parse(content)

    // Determine collection based on product type
    let collection = 'all'
    const slug = data.slug?.toLowerCase() || ''
    if (slug.includes('video') || slug.includes('downloader')) {
      collection = 'video-downloaders'
    } else if (slug.includes('udemy') || slug.includes('teachable') || slug.includes('learning') || slug.includes('course')) {
      collection = 'learning-tools'
    } else if (slug.includes('stock') || slug.includes('rawpixel') || slug.includes('adobe') || slug.includes('flickr')) {
      collection = 'stock-assets'
    }

    const product: Product = {
      id: data.slug,
      title: data.name,
      handle: data.slug,
      description: data.tagline,
      thumbnail: data.featured_image,
      images: data.featured_image_gif ? [
        { url: data.featured_image },
        { url: data.featured_image_gif }
      ] : data.featured_image ? [
        { url: data.featured_image }
      ] : [],
      collection,
      coming_soon: Boolean(data.coming_soon),
      new_release: Boolean(data.new_release),
      popular: Boolean(data.popular),
      variants: [{
        id: `${data.slug}-default`,
        title: 'Default',
        prices: [{
          amount: parsePrice(data.pricing?.price),
          currency_code: 'USD'
        }],
        inventory_quantity: 999
      }],
      metadata: {
        platform: data.platform,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        github_repo_url: data.github_repo_url,
        stripe_price_id: data.stripe?.price_id,
        original_price: data.pricing?.original_price,
        benefits: data.pricing?.benefits,
        features: data.features
      }
    }

    const activeBadges = [
      product.coming_soon && 'coming_soon',
      product.new_release && 'new_release',
      product.popular && 'popular'
    ].filter(Boolean) as string[]

    if (activeBadges.length > 1) {
      console.warn(
        `[products-data] Product "${product.handle}" has multiple badge flags enabled: ${activeBadges.join(', ')}`
      )
    }

    products.push(product)
  }

  return products
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const products = await getProducts()
  return products.find(p => p.handle === handle) || null
}

export async function getProductsByCollection(collection: string): Promise<Product[]> {
  const products = await getProducts()
  if (collection === 'all') return products
  return products.filter(p => p.collection === collection)
}

function parsePrice(priceString?: string): number {
  if (!priceString) return 0
  const price = parseFloat(priceString.replace(/[$,]/g, ''))
  return Math.round(price * 100)
}

export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount / 100)
}
