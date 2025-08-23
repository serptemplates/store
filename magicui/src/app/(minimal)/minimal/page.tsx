'use client';

import { Product } from '../../../../../schema';
import { useState } from 'react';

const minimalProduct: Product = {
  id: 1,
  created_at: new Date().toISOString(),
  name: "DataFlow Pro",
  tagline: "Transform your data pipeline management with a modern, intuitive platform.",
  description: "DataFlow Pro is a comprehensive data pipeline management platform that simplifies the process of building, deploying, and monitoring complex data workflows. Perfect for data engineers and teams looking to streamline their ETL processes.",
  seo_title: "DataFlow Pro - Data Pipeline Management",
  seo_description: "Streamline your data workflows with DataFlow Pro.",
  featured_image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop",
  features: [
    "Visual pipeline builder with drag-and-drop interface",
    "Real-time monitoring and alerting",
    "Auto-scaling infrastructure",
    "50+ pre-built connectors",
    "Advanced error handling and retry logic",
    "Comprehensive audit logging",
    "Team collaboration tools",
    "REST API for custom integrations"
  ],
  product_video: [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  ],
  related_videos: [
    "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
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
      question: "What data sources are supported?",
      answer: "DataFlow Pro supports 50+ data sources including all major databases, cloud storage providers, and streaming platforms like PostgreSQL, MySQL, MongoDB, S3, Kafka, Snowflake, BigQuery, and more."
    },
    {
      question: "Can I deploy on-premise?",
      answer: "Yes, DataFlow Pro can be deployed both on-premise and in the cloud with Docker and Kubernetes support. We provide comprehensive deployment guides for both options."
    },
    {
      question: "Is there a free trial?",
      answer: "We offer a 14-day free trial with full access to all features. No credit card required to start your trial."
    },
    {
      question: "What kind of support is included?",
      answer: "All plans include email support, with premium plans offering priority support and dedicated account management. We also have extensive documentation and an active community forum."
    }
  ],
  status: "live",
  version_number: 2.5,
  updated_at: new Date().toISOString(),
  store_product_id: 1001,
  github_repo_url: "https://github.com/yourcompany/dataflow-pro",
  technologies: ["Node.js", "React", "Docker", "PostgreSQL", "Redis"],
  supported_operating_systems: ["windows", "macos", "linux"]
};

export default function MinimalPage() {
  const [activeVideo, setActiveVideo] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const allVideos = [
    ...(minimalProduct.product_video || []),
    ...(minimalProduct.related_videos || [])
  ];

  const getVideoEmbed = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('watch?v=') 
        ? url.split('watch?v=')[1] 
        : url.split('youtu.be/')[1];
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    return url;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(minimalProduct.installation_instructions);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Hero Section */}
      <section style={{ 
        padding: '120px 20px', 
        background: 'linear-gradient(to bottom, #fafafa, #fff)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center' }}>
            <div>
              {minimalProduct.status === 'coming_soon' && (
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '16px'
                }}>
                  Coming Soon
                </span>
              )}
              <h1 style={{ fontSize: '48px', fontWeight: '700', marginBottom: '24px', lineHeight: '1.1' }}>
                {minimalProduct.name}
              </h1>
              <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.5' }}>
                {minimalProduct.tagline}
              </p>
              <p style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '40px', lineHeight: '1.6' }}>
                {minimalProduct.description}
              </p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button style={{
                  padding: '12px 24px',
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}>
                  Get Started
                </button>
                {minimalProduct.github_repo_url && (
                  <a href={minimalProduct.github_repo_url} target="_blank" rel="noopener noreferrer" style={{
                    padding: '12px 24px',
                    background: '#fff',
                    color: '#000',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    View on GitHub
                  </a>
                )}
              </div>

              {minimalProduct.technologies && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '32px' }}>
                  {minimalProduct.technologies.map((tech, i) => (
                    <span key={i} style={{
                      padding: '4px 12px',
                      background: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      color: '#4b5563'
                    }}>
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              {minimalProduct.featured_image && (
                <img 
                  src={minimalProduct.featured_image} 
                  alt={minimalProduct.name}
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      {allVideos.length > 0 && (
        <section style={{ padding: '80px 20px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '48px' }}>
              See it in action
            </h2>
            
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ 
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: '8px',
                background: '#f3f4f6',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}>
                {allVideos.map((video, index) => (
                  <iframe
                    key={index}
                    src={getVideoEmbed(video)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: activeVideo === index ? 'block' : 'none'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ))}
              </div>

              {allVideos.length > 1 && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                  {allVideos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveVideo(index)}
                      style={{
                        padding: '8px 16px',
                        background: activeVideo === index ? '#000' : '#fff',
                        color: activeVideo === index ? '#fff' : '#000',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {index === 0 ? 'Main Demo' : `Video ${index + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section style={{ padding: '80px 20px', background: '#fafafa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '48px' }}>
            Everything you need
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {minimalProduct.features.map((feature, index) => (
              <div key={index} style={{ 
                padding: '24px',
                background: '#fff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                gap: '16px'
              }}>
                <svg style={{ width: '24px', height: '24px', color: '#10b981', flexShrink: 0, marginTop: '2px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Section */}
      {minimalProduct.installation_instructions && (
        <section style={{ padding: '80px 20px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '48px' }}>
              Quick Installation
            </h2>
            
            <div style={{ 
              position: 'relative',
              background: '#1e293b',
              borderRadius: '8px',
              padding: '24px',
              fontFamily: 'monospace'
            }}>
              <button
                onClick={copyToClipboard}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  padding: '8px 16px',
                  background: copiedCode ? '#10b981' : '#475569',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
              <pre style={{ 
                color: '#e2e8f0',
                margin: 0,
                fontSize: '14px',
                lineHeight: '1.6',
                overflow: 'auto'
              }}>
                {minimalProduct.installation_instructions}
              </pre>
            </div>

            {minimalProduct.supported_operating_systems && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>Supported platforms:</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {minimalProduct.supported_operating_systems.map((os) => (
                    <span key={os} style={{
                      padding: '4px 12px',
                      background: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      textTransform: 'capitalize'
                    }}>
                      {os}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Usage Instructions */}
      {minimalProduct.usage_instructions && minimalProduct.usage_instructions.length > 0 && (
        <section style={{ padding: '80px 20px', background: '#fafafa' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '48px' }}>
              How to Use
            </h2>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {minimalProduct.usage_instructions.map((instruction, index) => (
                <div key={index} style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#000',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>
                  <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', margin: 0 }}>
                    {instruction}
                  </p>
                </div>
              ))}
            </div>

            {minimalProduct.troubleshooting_instructions && minimalProduct.troubleshooting_instructions.length > 0 && (
              <div style={{
                marginTop: '32px',
                padding: '20px',
                background: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #fde68a'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#92400e' }}>
                  ⚠️ Troubleshooting Tips
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {minimalProduct.troubleshooting_instructions.map((tip, index) => (
                    <li key={index} style={{ color: '#92400e', marginBottom: '8px' }}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section style={{ padding: '80px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px' }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: '18px', color: '#6b7280' }}>
              Get lifetime access with a one-time purchase
            </p>
          </div>
          
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ 
              border: '2px solid #000',
              borderRadius: '12px', 
              padding: '40px',
              background: '#fff',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#000',
                color: '#fff',
                padding: '4px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                BEST VALUE
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>
                {minimalProduct.name}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '32px', textAlign: 'center' }}>
                {minimalProduct.tagline}
              </p>
              
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '700' }}>$49</span>
                <span style={{ color: '#6b7280', marginLeft: '8px' }}>/lifetime</span>
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Lifetime access
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All future updates
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Commercial license
                </li>
                {minimalProduct.github_repo_url && (
                  <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Source code access
                  </li>
                )}
              </ul>
              
              <button style={{
                width: '100%',
                padding: '14px',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: minimalProduct.status === 'live' ? 'pointer' : 'not-allowed',
                opacity: minimalProduct.status === 'live' ? 1 : 0.5,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => {
                if (minimalProduct.status === 'live') {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              disabled={minimalProduct.status !== 'live'}
              >
                {minimalProduct.status === 'live' ? 'Get Instant Access' : 'Coming Soon'}
              </button>

              <p style={{ 
                textAlign: 'center',
                marginTop: '16px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                Secure payment via Stripe
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {minimalProduct.faqs && minimalProduct.faqs.length > 0 && (
        <section style={{ padding: '80px 20px', background: '#fafafa' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '48px' }}>
              Frequently asked questions
            </h2>
            
            <div>
              {minimalProduct.faqs.map((faq, index) => (
                <div key={index} style={{ 
                  marginBottom: '16px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    style={{
                      width: '100%',
                      padding: '20px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '16px',
                      fontWeight: '500'
                    }}
                  >
                    {faq.question}
                    <svg 
                      style={{ 
                        width: '20px', 
                        height: '20px',
                        transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s'
                      }} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div style={{ 
                      padding: '0 20px 20px',
                      color: '#6b7280',
                      fontSize: '16px',
                      lineHeight: '1.6'
                    }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section style={{ 
        padding: '100px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '40px', fontWeight: '700', color: '#fff', marginBottom: '24px' }}>
            Ready to transform your workflow?
          </h2>
          <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', marginBottom: '40px' }}>
            Join thousands of users who are already using {minimalProduct.name} to boost their productivity
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={{
              padding: '14px 32px',
              background: '#fff',
              color: '#764ba2',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}>
              Get Started Now
            </button>
            {minimalProduct.github_repo_url && (
              <a href={minimalProduct.github_repo_url} target="_blank" rel="noopener noreferrer" style={{
                padding: '14px 32px',
                background: 'transparent',
                color: '#fff',
                border: '2px solid #fff',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block'
              }}>
                View Source Code
              </a>
            )}
          </div>
          {minimalProduct.version_number && (
            <p style={{ marginTop: '32px', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
              Current Version: v{minimalProduct.version_number.toFixed(1)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}