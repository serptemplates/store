/**
 * Article schema for blog posts
 * https://developers.google.com/search/docs/appearance/structured-data/article
 */

export interface ArticleSchemaOptions {
  headline: string;
  description?: string;
  image: string | string[];
  datePublished: string;
  dateModified?: string;
  author: {
    name: string;
    url?: string;
  };
  publisher?: {
    name: string;
    logo?: string;
  };
  url: string;
  wordCount?: number;
  keywords?: string[];
  articleSection?: string;
  articleBody?: string;
}

export function generateArticleSchema({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  author,
  publisher = { name: 'SERP Apps', logo: 'https://apps.serp.co/logo.png' },
  url,
  wordCount,
  keywords,
  articleSection,
  articleBody,
}: ArticleSchemaOptions) {
  const images = Array.isArray(image) ? image : [image];

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: headline,
    ...(description && { description }),
    image: images,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author.name,
      ...(author.url && { url: author.url }),
    },
    publisher: {
      '@type': 'Organization',
      name: publisher.name,
      ...(publisher.logo && {
        logo: {
          '@type': 'ImageObject',
          url: publisher.logo,
        },
      }),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(wordCount && { wordCount }),
    ...(keywords && keywords.length > 0 && { keywords: keywords.join(', ') }),
    ...(articleSection && { articleSection }),
    ...(articleBody && { articleBody }),
  };
}

/**
 * BlogPosting schema (subtype of Article with additional fields)
 */
export function generateBlogPostingSchema(options: ArticleSchemaOptions) {
  const articleSchema = generateArticleSchema(options);

  return {
    ...articleSchema,
    '@type': 'BlogPosting',
  };
}

/**
 * NewsArticle schema (for news/announcements)
 */
export function generateNewsArticleSchema(options: ArticleSchemaOptions & {
  dateline?: string;
  printEdition?: string;
  printSection?: string;
}) {
  const articleSchema = generateArticleSchema(options);

  return {
    ...articleSchema,
    '@type': 'NewsArticle',
    ...(options.dateline && { dateline: options.dateline }),
    ...(options.printEdition && { printEdition: options.printEdition }),
    ...(options.printSection && { printSection: options.printSection }),
  };
}

/**
 * TechArticle schema (for technical content)
 */
export function generateTechArticleSchema(options: ArticleSchemaOptions & {
  dependencies?: string[];
  proficiencyLevel?: 'Beginner' | 'Intermediate' | 'Expert';
}) {
  const articleSchema = generateArticleSchema(options);

  return {
    ...articleSchema,
    '@type': 'TechArticle',
    ...(options.dependencies && { dependencies: options.dependencies.join(', ') }),
    ...(options.proficiencyLevel && { proficiencyLevel: options.proficiencyLevel }),
  };
}