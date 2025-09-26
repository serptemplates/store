import fs from 'fs'
import path from 'path'
import yaml from 'yaml'

export interface Product {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  price: string
  originalPrice?: string
  featuredImage: string
  featuredImageGif?: string
  images: string[]
  category: string
  platform?: string
  seoTitle?: string
  seoDescription?: string
  githubRepoUrl?: string
  stripePriceId?: string
  benefits?: string[]
  features?: Record<string, string | number | boolean>
  inStock: boolean
  rating?: number
  reviewCount?: number
}

// Load products from YAML files
export async function getProducts(): Promise<Product[]> {
  const productsDir = path.join(process.cwd(), '../../apps/store/data/products')
  const files = await fs.promises.readdir(productsDir)
  const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))

  const products: Product[] = []

  for (const file of yamlFiles) {
    const content = await fs.promises.readFile(path.join(productsDir, file), 'utf-8')
    const data = yaml.parse(content)

    // Determine category based on product type
    let category = 'Downloaders' // Default to Downloaders since most are downloaders
    const slug = data.slug?.toLowerCase() || ''
    const name = data.name?.toLowerCase() || ''

    // Check for Adult content first (priority)
    if (slug.includes('onlyfans') || slug.includes('fansly') ||
        slug.includes('chaturbate') || slug.includes('bongacams') ||
        slug.includes('stripchat') || slug.includes('camsoda') ||
        slug.includes('myfreecams') || slug.includes('livejasmin') ||
        slug.includes('pornhub') || slug.includes('xvideos') ||
        slug.includes('xhamster') || slug.includes('xnxx') ||
        slug.includes('redtube') || slug.includes('youporn') ||
        slug.includes('spankbang') || slug.includes('eporner') ||
        slug.includes('beeg') || slug.includes('tnaflix') ||
        slug.includes('erome') || slug.includes('erothots') ||
        slug.includes('redgifs')) {
      category = 'Adult'
    }
    // Check for Learning Platforms
    else if (slug.includes('udemy') || slug.includes('coursera') ||
             slug.includes('skillshare') || slug.includes('linkedin-learning') ||
             slug.includes('learndash') || slug.includes('teachable') ||
             slug.includes('thinkific') || slug.includes('kajabi') ||
             slug.includes('podia') || slug.includes('learnworlds') ||
             slug.includes('moodle') || slug.includes('khan-academy') ||
             slug.includes('circle') || slug.includes('skool') ||
             slug.includes('whop') || slug.includes('clientclub') ||
             slug.includes('gohighlevel')) {
      category = 'Learning Platforms'
    }
    // Check for Streaming
    else if (slug.includes('netflix') || slug.includes('hulu') ||
             slug.includes('amazon-video') || slug.includes('tubi') ||
             slug.includes('twitch') || slug.includes('dailymotion') ||
             slug.includes('123movies') || slug.includes('bilibili') ||
             slug.includes('nicovideo') || slug.includes('kick-clip') ||
             slug.includes('loom') || slug.includes('wistia') ||
             slug.includes('sprout-video') || slug.includes('stream-downloader')) {
      category = 'Streaming'
    }
    // Check for Audio Hosting
    else if (slug.includes('soundcloud') || slug.includes('soundgasm')) {
      category = 'Audio Hosting'
    }
    // Check for AI tools
    else if (slug.includes('ai-voice') || slug.includes('ai-') ||
             name.includes('ai ') || name.includes('artificial')) {
      category = 'Artificial Intelligence'
    }
    // Social media platforms (still downloaders but could be separated)
    else if (slug.includes('facebook') || slug.includes('instagram') ||
             slug.includes('tiktok') || slug.includes('twitter') ||
             slug.includes('snapchat') || slug.includes('pinterest') ||
             slug.includes('tumblr') || slug.includes('telegram') ||
             slug.includes('patreon') || slug.includes('youtube')) {
      category = 'Downloaders' // Keep as downloaders
    }
    // Stock/Creative content (still downloaders)
    else if (slug.includes('stock') || slug.includes('getty') ||
             slug.includes('adobe') || slug.includes('shutterstock') ||
             slug.includes('depositphotos') || slug.includes('123rf') ||
             slug.includes('alamy') || slug.includes('creative-market') ||
             slug.includes('canva') || slug.includes('deviantart') ||
             slug.includes('dreamstime') || slug.includes('flickr') ||
             slug.includes('freepik') || slug.includes('giphy') ||
             slug.includes('istock') || slug.includes('pexels') ||
             slug.includes('pixabay') || slug.includes('rawpixel') ||
             slug.includes('storyblocks') || slug.includes('unsplash') ||
             slug.includes('vectorstock') || slug.includes('stocksy') ||
             slug.includes('stockvault')) {
      category = 'Downloaders' // Keep as downloaders
    }
    // Document/File downloaders
    else if (slug.includes('pdf') || slug.includes('scribd') ||
             slug.includes('internet-archive') || slug.includes('terabox') ||
             slug.includes('gokollab')) {
      category = 'Downloaders'
    }
    // Everything else defaults to Downloaders

    const product: Product = {
      id: data.slug,
      name: data.name,
      slug: data.slug,
      tagline: data.tagline || '',
      description: data.seo_description || data.tagline || '',
      price: data.pricing?.price || '$0',
      originalPrice: data.pricing?.original_price,
      featuredImage: data.featured_image || '/placeholder.jpg',
      featuredImageGif: data.featured_image_gif,
      images: [
        data.featured_image,
        data.featured_image_gif
      ].filter(Boolean),
      category,
      platform: data.platform,
      seoTitle: data.seo_title,
      seoDescription: data.seo_description,
      githubRepoUrl: data.github_repo_url,
      stripePriceId: data.stripe?.price_id,
      benefits: data.pricing?.benefits,
      features: data.features,
      inStock: true,
      rating: 4.5 + Math.random() * 0.5, // Mock rating between 4.5-5
      reviewCount: Math.floor(Math.random() * 100) + 20 // Mock review count
    }

    products.push(product)
  }

  return products
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const products = await getProducts()
  return products.find(p => p.slug === slug) || null
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const products = await getProducts()
  if (category === 'All Products') return products
  return products.filter(p => p.category === category)
}

export async function getCategories(): Promise<string[]> {
  const products = await getProducts()
  const categories = new Set(products.map(p => p.category))
  return ['All Products', ...Array.from(categories).filter(c => c !== 'All Products')]
}

export function formatPrice(price: string): string {
  // Price already formatted from YAML as "$XX"
  return price
}