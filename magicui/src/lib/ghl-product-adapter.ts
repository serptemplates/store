import { Product } from '../../../schema';
import { ghlAPI, Product as GHLProduct } from './ghl-api';

/**
 * Adapter to transform GHL products to our Product schema format
 */
export class GHLProductAdapter {
  /**
   * Transform a GHL product to our Product schema
   */
  static transformProduct(ghlProduct: GHLProduct): Product {
    return {
      id: parseInt(ghlProduct.id) || Date.now(),
      created_at: new Date().toISOString(),
      name: ghlProduct.name,
      tagline: ghlProduct.description.split('.')[0] || ghlProduct.name, // First sentence as tagline
      description: ghlProduct.description,
      
      // SEO
      seo_title: `${ghlProduct.name} - Professional SaaS Solution`,
      seo_description: ghlProduct.description.substring(0, 160),
      
      // URLs
      product_page_url: `/product/${ghlProduct.slug}`,
      purchase_url: ghlProduct.paymentLink || ghlProduct.orderFormUrl,
      
      // Store IDs - IMPORTANT: This is your Stripe Product ID from GHL
      store_product_id: ghlProduct.stripeProductId ? parseInt(ghlProduct.stripeProductId) : undefined,
      
      // Media
      featured_image: ghlProduct.image,
      
      // Features
      features: ghlProduct.features || [],
      
      // Default content (can be overridden per product)
      installation_instructions: `1. Purchase ${ghlProduct.name}
2. Check your email for access credentials
3. Follow the setup guide in your dashboard`,
      
      usage_instructions: [
        "Access your dashboard with provided credentials",
        "Complete the initial setup wizard",
        "Explore features and documentation",
        "Contact support if you need assistance"
      ],
      
      troubleshooting_instructions: [
        "Check your spam folder for access emails",
        "Ensure you're using the correct login URL",
        "Clear browser cache if experiencing issues"
      ],
      
      faqs: [
        {
          question: "How do I get started?",
          answer: "After purchase, you'll receive an email with login credentials and setup instructions."
        },
        {
          question: "What payment methods are accepted?",
          answer: "We accept all major credit cards, debit cards, and digital wallets through Stripe."
        },
        {
          question: "Is there a refund policy?",
          answer: "Yes, we offer a 30-day money-back guarantee if you're not satisfied."
        }
      ],
      
      // Metadata
      status: "live",
      version_number: 1.0,
      updated_at: new Date().toISOString(),
      
      // Optional fields
      categories: ["SaaS", "Business Tools"],
      keywords: [ghlProduct.name.toLowerCase(), "saas", "business", "tool"],
    };
  }

  /**
   * Get all products from GHL and transform them
   */
  static async getAllProducts(): Promise<Product[]> {
    const ghlProducts = await ghlAPI.getProducts();
    return ghlProducts.map(this.transformProduct);
  }

  /**
   * Get a single product by ID or slug
   */
  static async getProduct(idOrSlug: string): Promise<Product | null> {
    // Try to get by ID first
    let ghlProduct = await ghlAPI.getProduct(idOrSlug);
    
    // If not found by ID, try to find by slug
    if (!ghlProduct) {
      const allProducts = await ghlAPI.getProducts();
      ghlProduct = allProducts.find(p => p.slug === idOrSlug) || null;
    }
    
    if (!ghlProduct) return null;
    
    return this.transformProduct(ghlProduct);
  }

  /**
   * Get product with enriched data (you can add custom data per product here)
   */
  static async getEnrichedProduct(idOrSlug: string): Promise<Product | null> {
    const baseProduct = await this.getProduct(idOrSlug);
    if (!baseProduct) return null;

    // Add product-specific enrichments based on slug/id
    const enrichments: Record<string, Partial<Product>> = {
      'pro-app-suite': {
        tagline: "Complete suite of professional tools for scaling businesses",
        product_video: [
          "https://www.youtube.com/watch?v=demo1",
          "https://www.youtube.com/watch?v=demo2",
        ],
        technologies: ["React", "Node.js", "PostgreSQL", "Redis"],
        github_repo_url: "https://github.com/yourcompany/pro-app-suite",
      },
      'starter-pack': {
        tagline: "Perfect starting point for new entrepreneurs",
        product_video: [
          "https://www.youtube.com/watch?v=starter-demo",
        ],
        technologies: ["Next.js", "Tailwind CSS", "Supabase"],
      },
      'enterprise-solution': {
        tagline: "Enterprise-grade solution with unlimited scalability",
        supported_operating_systems: ["windows", "macos", "linux"],
        technologies: ["Kubernetes", "Docker", "AWS", "Terraform"],
      }
    };

    const enrichment = enrichments[baseProduct.name.toLowerCase().replace(/\s+/g, '-')];
    
    if (enrichment) {
      return { ...baseProduct, ...enrichment };
    }

    return baseProduct;
  }
}