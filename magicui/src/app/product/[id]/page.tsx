import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductLandingTemplate from '@/components/product-landing/template';
import { Product, ProductSchema } from '../../../../../schema';

// This would typically come from your database or API
async function getProduct(id: string): Promise<Product | null> {
  try {
    // For now, using a static import. Replace with your API call
    const products = await import('@/data/products.json');
    const product = products.default.find((p: Product) => p.id.toString() === id);
    
    if (!product) return null;
    
    // Validate against schema
    const validatedProduct = ProductSchema.parse(product);
    return validatedProduct;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await getProduct(params.id);
  
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    };
  }

  return {
    title: product.seo_title || `${product.name} - ${product.tagline}`,
    description: product.seo_description || product.description,
    openGraph: {
      title: product.seo_title || product.name,
      description: product.seo_description || product.description,
      images: product.featured_image ? [product.featured_image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.seo_title || product.name,
      description: product.seo_description || product.description,
      images: product.featured_image ? [product.featured_image] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  
  if (!product) {
    notFound();
  }

  // Get these from environment variables
  const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  return (
    <ProductLandingTemplate 
      product={product} 
      stripePublicKey={stripePublicKey}
      paypalClientId={paypalClientId}
    />
  );
}