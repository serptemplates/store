/**
 * TypeScript types for Schema.org structured data
 */

// Product Schema Types
export interface ProductSchema {
  '@context': string;
  '@type': string | string[];
  name: string;
  description?: string;
  image?: string | string[];
  url?: string;
  sku?: string;
  mpn?: string;
  gtin13?: string;
  brand?: BrandSchema;
  offers?: OfferSchema | AggregateOfferSchema;
  aggregateRating?: AggregateRatingSchema;
  review?: ReviewSchema[];
  category?: string;
  keywords?: string;
  additionalProperty?: PropertyValueSchema[];
}

export interface BrandSchema {
  '@type': 'Brand';
  name: string;
}

export interface OfferSchema {
  '@type': 'Offer';
  url?: string;
  priceCurrency: string;
  price: string | number;
  priceValidUntil?: string;
  availability: string;
  seller?: OrganizationSchema;
  itemCondition?: string;
  hasMerchantReturnPolicy?: MerchantReturnPolicySchema;
  shippingDetails?: OfferShippingDetailsSchema;
}

export interface AggregateOfferSchema extends Omit<OfferSchema, '@type'> {
  '@type': 'AggregateOffer';
  lowPrice: string | number;
  highPrice: string | number;
  offerCount: number;
}

export interface MerchantReturnPolicySchema {
  '@type': 'MerchantReturnPolicy';
  applicableCountry: string;
  returnPolicyCategory: string;
  merchantReturnDays: number;
  returnMethod: string;
  returnFees: string;
}

export interface OfferShippingDetailsSchema {
  '@type': 'OfferShippingDetails';
  shippingRate: MonetaryAmountSchema;
  shippingDestination: DefinedRegionSchema;
  deliveryTime?: ShippingDeliveryTimeSchema;
}

export interface MonetaryAmountSchema {
  '@type': 'MonetaryAmount';
  value: number;
  currency: string;
}

export interface DefinedRegionSchema {
  '@type': 'DefinedRegion';
  addressCountry: string;
}

export interface ShippingDeliveryTimeSchema {
  '@type': 'ShippingDeliveryTime';
  handlingTime?: QuantitativeValueSchema;
  transitTime?: QuantitativeValueSchema;
}

export interface QuantitativeValueSchema {
  '@type': 'QuantitativeValue';
  minValue: number;
  maxValue: number;
  unitCode: string;
}

// Rating and Review Types
export interface AggregateRatingSchema {
  '@type': 'AggregateRating';
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface ReviewSchema {
  '@type': 'Review';
  reviewRating: RatingSchema;
  author: PersonSchema | OrganizationSchema;
  datePublished?: string;
  reviewBody?: string;
}

export interface RatingSchema {
  '@type': 'Rating';
  ratingValue: number;
  bestRating?: number;
  worstRating?: number;
}

export interface PersonSchema {
  '@type': 'Person';
  name: string;
}

// Organization Schema Types
export interface OrganizationSchema {
  '@type': 'Organization';
  name: string;
  url?: string;
  logo?: string | ImageObjectSchema;
  description?: string;
  sameAs?: string[];
  contactPoint?: ContactPointSchema;
  address?: PostalAddressSchema;
}

export interface ContactPointSchema {
  '@type': 'ContactPoint';
  contactType: string;
  telephone?: string;
  email?: string;
  url?: string;
  availableLanguage?: string | string[];
}

export interface PostalAddressSchema {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
}

// Breadcrumb Schema Types
export interface BreadcrumbListSchema {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: ListItemSchema[];
}

export interface ListItemSchema {
  '@type': 'ListItem';
  position: number;
  name: string;
  item?: string;
}

// FAQ Schema Types
export interface FAQPageSchema {
  '@context': string;
  '@type': 'FAQPage';
  mainEntity: QuestionSchema[];
}

export interface QuestionSchema {
  '@type': 'Question';
  name: string;
  acceptedAnswer: AnswerSchema;
  suggestedAnswer?: AnswerSchema[];
  answerCount?: number;
  upvoteCount?: number;
  dateCreated?: string;
  author?: PersonSchema;
}

export interface AnswerSchema {
  '@type': 'Answer';
  text: string;
  upvoteCount?: number;
  dateCreated?: string;
  url?: string;
  author?: PersonSchema;
}

// Education Q&A Schema Types
export interface QAPageSchema {
  '@context': string;
  '@type': 'QAPage';
  name: string;
  url: string;
  dateCreated?: string;
  keywords?: string;
  mainEntity: QuestionSchema;
}

// Learning Resource Schema Types
export interface LearningResourceSchema {
  '@context': string;
  '@type': 'LearningResource';
  name: string;
  description: string;
  url: string;
  educationalLevel?: string;
  learningResourceType?: string;
  teaches?: DefinedTermSchema[];
  timeRequired?: string;
  educationalAlignment?: AlignmentObjectSchema[];
  author: OrganizationSchema | PersonSchema;
  datePublished: string;
  publisher: OrganizationSchema;
}

export interface DefinedTermSchema {
  '@type': 'DefinedTerm';
  name: string;
}

export interface AlignmentObjectSchema {
  '@type': 'AlignmentObject';
  alignmentType: string;
  targetName: string;
}

// Course Schema Types
export interface CourseSchema {
  '@context': string;
  '@type': 'Course';
  name: string;
  description: string;
  url: string;
  courseCode?: string;
  coursePrerequisites?: string;
  educationalCredentialAwarded?: string;
  provider: OrganizationSchema;
  hasCourseInstance?: CourseInstanceSchema;
}

export interface CourseInstanceSchema {
  '@type': 'CourseInstance';
  startDate: string;
  endDate: string;
  location?: PlaceSchema;
  instructor?: PersonSchema;
}

export interface PlaceSchema {
  '@type': 'Place';
  name: string;
}

// Video Schema Types
export interface VideoObjectSchema {
  '@context': string;
  '@type': 'VideoObject';
  name: string;
  description: string;
  thumbnailUrl: string | string[];
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
  publisher?: OrganizationSchema;
}

// WebSite Schema Types
export interface WebSiteSchema {
  '@context': string;
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction?: SearchActionSchema;
}

export interface SearchActionSchema {
  '@type': 'SearchAction';
  target: EntryPointSchema;
  'query-input': string;
}

export interface EntryPointSchema {
  '@type': 'EntryPoint';
  urlTemplate: string;
}

// Image Schema Types
export interface ImageObjectSchema {
  '@type': 'ImageObject';
  url: string;
  caption?: string;
  width?: string;
  height?: string;
}

// Additional Property Types
export interface PropertyValueSchema {
  '@type': 'PropertyValue';
  name: string;
  value: string | number | boolean;
}

// Collection Page Schema
export interface CollectionPageSchema {
  '@context': string;
  '@type': 'CollectionPage';
  name: string;
  description: string;
  url: string;
  mainEntity?: ItemListSchema;
}

export interface ItemListSchema {
  '@type': 'ItemList';
  numberOfItems?: number;
  itemListElement: any[];
}

// HowTo Schema Types
export interface HowToSchema {
  '@context': string;
  '@type': 'HowTo';
  name: string;
  description: string;
  image?: string | string[];
  totalTime?: string;
  step: HowToStepSchema[];
}

export interface HowToStepSchema {
  '@type': 'HowToStep';
  position: number;
  name: string;
  text: string;
  image?: string;
}

// LocalBusiness Schema Types
export interface LocalBusinessSchema extends Omit<OrganizationSchema, '@type'> {
  '@type': 'LocalBusiness';
  telephone?: string;
  priceRange?: string;
  address?: PostalAddressSchema;
  geo?: GeoCoordinatesSchema;
  openingHoursSpecification?: OpeningHoursSpecificationSchema;
}

export interface GeoCoordinatesSchema {
  '@type': 'GeoCoordinates';
  latitude: number;
  longitude: number;
}

export interface OpeningHoursSpecificationSchema {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string | string[];
  opens: string;
  closes: string;
}