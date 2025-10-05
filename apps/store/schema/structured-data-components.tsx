import Script from "next/script";
import type { ProductData } from "@/lib/product-schema";

interface StructuredDataProps {
  product: ProductData;
  url: string;
}

export function ProductStructuredData({ product, url }: StructuredDataProps) {
  // Product Schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.featured_image || product.screenshots?.[0]?.url,
    url: url,
    sku: product.slug,
    brand: {
      "@type": "Brand",
      name: product.categories?.[0] || "Digital Product"
    },
    offers: {
      "@type": "Offer",
      url: url,
      priceCurrency: "USD",
      price: product.pricing?.price?.replace(/[^0-9.]/g, '') || "0",
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Store"
      }
    },
    aggregateRating: product.reviews && product.reviews.length > 0 ? {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: product.reviews.length,
      bestRating: "5",
      worstRating: "1"
    } : undefined,
    review: product.reviews?.map(review => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5"
      },
      author: {
        "@type": "Person",
        name: review.name
      },
      reviewBody: review.review
    }))
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: typeof window !== 'undefined' ? window.location.origin : "https://store.com"
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.name,
        item: url
      }
    ]
  };

  // VideoObject Schema for product videos
  const videoSchemas = product.product_videos?.map((videoUrl, index) => {
    // Extract video ID from YouTube URL
    const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];

    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `${product.name} - Demo Video ${index + 1}`,
      description: `Product demonstration video for ${product.name}`,
      thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : product.featured_image,
      uploadDate: new Date().toISOString(),
      contentUrl: videoUrl,
      embedUrl: videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/'),
      duration: "PT5M", // Default 5 minutes, adjust as needed
      publisher: {
        "@type": "Organization",
        name: "Store",
        logo: {
          "@type": "ImageObject",
          url: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : "https://store.com/logo.png"
        }
      }
    };
  });

  // SoftwareApplication Schema (if applicable)
  const softwareSchema = product.github_repo_url ? {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: product.pricing?.price?.replace(/[^0-9.]/g, '') || "0",
      priceCurrency: "USD"
    },
    author: {
      "@type": "Organization",
      name: "Store"
    },
    downloadUrl: product.purchase_url,
    featureList: product.features?.join(", "),
    screenshot: product.screenshots?.map(s => s.url)
  } : null;

  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Store",
    url: typeof window !== 'undefined' ? window.location.origin : "https://store.com",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : "https://store.com/logo.png",
    sameAs: [
      "https://twitter.com/store",
      "https://facebook.com/store",
      "https://linkedin.com/company/store"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-555-555-5555",
      contactType: "customer service",
      availableLanguage: "English"
    }
  };

  // WebSite Schema with SearchAction
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Store",
    url: typeof window !== 'undefined' ? window.location.origin : "https://store.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: (typeof window !== 'undefined' ? window.location.origin : "https://store.com") + "/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      {/* Product Schema */}
      <Script
        id="product-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema)
        }}
      />

      {/* Breadcrumb Schema */}
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema)
        }}
      />

      {/* Video Schemas */}
      {videoSchemas?.map((schema, index) => (
        <Script
          key={`video-schema-${index}`}
          id={`video-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema)
          }}
        />
      ))}

      {/* Software Schema (if applicable) */}
      {softwareSchema && (
        <Script
          id="software-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareSchema)
          }}
        />
      )}

      {/* Organization Schema */}
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema)
        }}
      />

      {/* WebSite Schema */}
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema)
        }}
      />
    </>
  );
}
