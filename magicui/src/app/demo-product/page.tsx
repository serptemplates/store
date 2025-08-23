import ProductLandingTemplate from '@/components/product-landing/template';
import { Product } from '../../../../schema';

// Demo product data
const demoProduct: Product = {
  id: 1,
  created_at: new Date().toISOString(),
  name: "DataFlow Pro",
  tagline: "Transform Your Data Pipeline Management",
  description: "DataFlow Pro is a comprehensive data pipeline management platform that simplifies the process of building, deploying, and monitoring complex data workflows. Perfect for data engineers and teams looking to streamline their ETL processes.",
  seo_title: "DataFlow Pro - Advanced Data Pipeline Management Tool",
  seo_description: "Streamline your data workflows with DataFlow Pro. Build, monitor, and optimize data pipelines with ease.",
  featured_image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop",
  features: [
    "Visual Pipeline Builder",
    "Real-time Data Monitoring",
    "Auto-scaling Infrastructure",
    "50+ Pre-built Connectors",
    "Advanced Error Handling",
    "Comprehensive Logging",
    "Team Collaboration Tools",
    "API Integration Support"
  ],
  product_video: [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual demo videos
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ],
  related_videos: [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ],
  installation_instructions: `npm install -g dataflow-pro
dataflow init
dataflow start

# Or using Docker:
docker pull dataflow/pro:latest
docker run -d -p 8080:8080 dataflow/pro`,
  usage_instructions: [
    "Run 'dataflow init' to create a new project in your current directory",
    "Navigate to http://localhost:8080 to access the visual pipeline builder",
    "Configure data sources and destinations through the intuitive connectors menu",
    "Design your pipeline using drag-and-drop components",
    "Test your pipeline with sample data before deployment",
    "Deploy to production with 'dataflow deploy production'",
    "Monitor pipeline health and performance in real-time dashboard"
  ],
  troubleshooting_instructions: [
    "Ensure Docker is installed and running before starting",
    "Check network connectivity if connectors fail to initialize",
    "Verify API credentials are correctly configured in settings"
  ],
  faqs: [
    {
      question: "What data sources does DataFlow Pro support?",
      answer: "DataFlow Pro supports 50+ data sources including PostgreSQL, MySQL, MongoDB, S3, Kafka, and all major cloud providers."
    },
    {
      question: "Can I run DataFlow Pro on-premise?",
      answer: "Yes, DataFlow Pro can be deployed both on-premise and in the cloud. We provide Docker images and Kubernetes manifests for easy deployment."
    },
    {
      question: "Is there a free trial available?",
      answer: "Yes, we offer a 14-day free trial with full access to all features. No credit card required."
    },
    {
      question: "How does pricing work?",
      answer: "We offer flexible pricing starting at $49/month for individual developers, with team and enterprise plans available."
    }
  ],
  supported_operating_systems: ["windows", "macos", "linux"],
  status: "live",
  technologies: ["Node.js", "React", "Docker", "PostgreSQL", "Redis"],
  version_number: 2.5,
  updated_at: new Date().toISOString(),
  store_product_id: 1001, // This will be your GHL/Stripe product ID
  github_repo_url: "https://github.com/yourcompany/dataflow-pro",
};

export default function DemoProductPage() {
  // Get Stripe key from environment
  const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <ProductLandingTemplate 
      product={demoProduct} 
      stripePublicKey={stripePublicKey}
    />
  );
}