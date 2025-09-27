/**
 * Schema.org structured data for SEO and Google Shopping
 * Centralized schema exports for all rich result types
 */

export {
  generateProductSchemaLD,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  type ProductSchemaLDOptions,
} from './product-schema-ld';

export {
  generateEducationQASchema,
  generateLearningResourceSchema,
  generateCourseSchema,
  type EducationQAOptions,
} from './education-qa-schema';

export {
  generateArticleSchema,
  generateBlogPostingSchema,
  generateNewsArticleSchema,
  generateTechArticleSchema,
  type ArticleSchemaOptions,
} from './article-schema';

export {
  generateSoftwareApplicationSchema,
  generateWebApplicationSchema,
  generateMobileApplicationSchema,
  generateVideoGameSchema,
  type SoftwareApplicationOptions,
} from './software-app-schema';

export {
  ProductStructuredData,
} from './structured-data-components';

// Re-export schema types
export * from './types';