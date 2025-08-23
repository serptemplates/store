export interface FAQ {
  question: string;
  answer: string;
}

export interface Product {
  id: number;
  created_at: string;
  name: string;
  tagline: string;
  description: string;
  seo_title: string;
  seo_description: string;
  featured_image: string;
  features: string[];
  product_video?: string[];
  related_videos?: string[];
  installation_instructions: string;
  usage_instructions?: string[];
  troubleshooting_instructions?: string[];
  faqs?: FAQ[];
  status: 'live' | 'coming_soon' | 'deprecated';
  version_number: number;
  updated_at: string;
  github_repo_url?: string;
  technologies?: string[];
  supported_operating_systems?: ('windows' | 'macos' | 'linux')[];
}