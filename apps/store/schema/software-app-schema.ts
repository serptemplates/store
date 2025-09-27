/**
 * SoftwareApplication schema for apps/software products
 * https://developers.google.com/search/docs/appearance/structured-data/software-app
 */

export interface SoftwareApplicationOptions {
  name: string;
  description: string;
  applicationCategory:
    | 'GameApplication'
    | 'SocialNetworkingApplication'
    | 'TravelApplication'
    | 'ShoppingApplication'
    | 'SportsApplication'
    | 'LifestyleApplication'
    | 'BusinessApplication'
    | 'DesignApplication'
    | 'DeveloperApplication'
    | 'DriverApplication'
    | 'EducationalApplication'
    | 'HealthApplication'
    | 'FinanceApplication'
    | 'SecurityApplication'
    | 'BrowserApplication'
    | 'CommunicationApplication'
    | 'DesktopEnhancementApplication'
    | 'EntertainmentApplication'
    | 'MultimediaApplication'
    | 'HomeApplication'
    | 'UtilitiesApplication'
    | 'ReferenceApplication';
  operatingSystem: string | string[];
  offers: {
    price: string | number;
    priceCurrency: string;
  };
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  screenshot?: string | string[];
  softwareVersion?: string;
  fileSize?: string;
  softwareRequirements?: string;
  url?: string;
  downloadUrl?: string;
  installUrl?: string;
  author?: {
    name: string;
    url?: string;
  };
  datePublished?: string;
  dateModified?: string;
  permissions?: string[];
  softwareHelp?: string;
  featureList?: string[];
  releaseNotes?: string;
  applicationSubCategory?: string;
  countriesSupported?: string[];
  device?: string;
  availableOnDevice?: string;
  memoryRequirements?: string;
  storageRequirements?: string;
  processorRequirements?: string;
}

export function generateSoftwareApplicationSchema({
  name,
  description,
  applicationCategory,
  operatingSystem,
  offers,
  aggregateRating,
  screenshot,
  softwareVersion,
  fileSize,
  softwareRequirements,
  url,
  downloadUrl,
  installUrl,
  author,
  datePublished,
  dateModified,
  permissions,
  softwareHelp,
  featureList,
  releaseNotes,
  applicationSubCategory,
  countriesSupported,
  device,
  availableOnDevice,
  memoryRequirements,
  storageRequirements,
  processorRequirements,
}: SoftwareApplicationOptions) {
  const screenshots = screenshot
    ? (Array.isArray(screenshot) ? screenshot : [screenshot])
    : [];

  const operatingSystems = Array.isArray(operatingSystem)
    ? operatingSystem
    : [operatingSystem];

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    applicationCategory,
    operatingSystem: operatingSystems.join(', '),
    offers: {
      '@type': 'Offer',
      price: offers.price,
      priceCurrency: offers.priceCurrency,
    },
    ...(aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue,
        ratingCount: aggregateRating.ratingCount,
        ...(aggregateRating.bestRating && { bestRating: aggregateRating.bestRating }),
        ...(aggregateRating.worstRating && { worstRating: aggregateRating.worstRating }),
      },
    }),
    ...(screenshots.length > 0 && {
      screenshot: screenshots.map(url => ({
        '@type': 'ImageObject',
        url: url,
      })),
    }),
    ...(softwareVersion && { softwareVersion }),
    ...(fileSize && { fileSize }),
    ...(softwareRequirements && { softwareRequirements }),
    ...(url && { url }),
    ...(downloadUrl && { downloadUrl }),
    ...(installUrl && { installUrl }),
    ...(author && {
      author: {
        '@type': author.url ? 'Organization' : 'Person',
        name: author.name,
        ...(author.url && { url: author.url }),
      },
    }),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    ...(permissions && permissions.length > 0 && { permissions: permissions.join(', ') }),
    ...(softwareHelp && { softwareHelp }),
    ...(featureList && featureList.length > 0 && { featureList: featureList.join(', ') }),
    ...(releaseNotes && { releaseNotes }),
    ...(applicationSubCategory && { applicationSubCategory }),
    ...(countriesSupported && countriesSupported.length > 0 && {
      countriesSupported: countriesSupported.join(', '),
    }),
    ...(device && { device }),
    ...(availableOnDevice && { availableOnDevice }),
    ...(memoryRequirements && { memoryRequirements }),
    ...(storageRequirements && { storageRequirements }),
    ...(processorRequirements && { processorRequirements }),
  };
}

/**
 * WebApplication schema (for web-based apps)
 */
export function generateWebApplicationSchema(
  options: SoftwareApplicationOptions & {
    browserRequirements?: string;
    url: string;
  }
) {
  const schema = generateSoftwareApplicationSchema(options);

  return {
    ...schema,
    '@type': 'WebApplication',
    ...(options.browserRequirements && { browserRequirements: options.browserRequirements }),
  };
}

/**
 * MobileApplication schema (for mobile apps)
 */
export function generateMobileApplicationSchema(
  options: SoftwareApplicationOptions & {
    carrierRequirements?: string;
  }
) {
  const schema = generateSoftwareApplicationSchema(options);

  return {
    ...schema,
    '@type': 'MobileApplication',
    ...(options.carrierRequirements && { carrierRequirements: options.carrierRequirements }),
  };
}

/**
 * VideoGame schema (for game applications)
 */
export function generateVideoGameSchema(
  options: SoftwareApplicationOptions & {
    gamePlatform?: string | string[];
    playMode?: 'SinglePlayer' | 'MultiPlayer' | 'CoOp' | string;
    genre?: string | string[];
  }
) {
  const schema = generateSoftwareApplicationSchema({
    ...options,
    applicationCategory: 'GameApplication',
  });

  const gamePlatforms = options.gamePlatform
    ? (Array.isArray(options.gamePlatform) ? options.gamePlatform : [options.gamePlatform])
    : [];

  const genres = options.genre
    ? (Array.isArray(options.genre) ? options.genre : [options.genre])
    : [];

  return {
    ...schema,
    '@type': 'VideoGame',
    ...(gamePlatforms.length > 0 && { gamePlatform: gamePlatforms.join(', ') }),
    ...(options.playMode && { playMode: options.playMode }),
    ...(genres.length > 0 && { genre: genres.join(', ') }),
  };
}