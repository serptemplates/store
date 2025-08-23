import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductLandingTemplate from '@/components/product-landing/template';
import { GHLProductAdapter } from '@/lib/ghl-product-adapter';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await GHLProductAdapter.getEnrichedProduct(params.slug);
  
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

export default async function GHLProductPage({ params }: { params: { slug: string } }) {
  const product = await GHLProductAdapter.getEnrichedProduct(params.slug);
  
  if (!product) {
    notFound();
  }

  // Get Stripe key from environment
  const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <ProductLandingTemplate 
      product={product} 
      stripePublicKey={stripePublicKey}
    />
  );
}