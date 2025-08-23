export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  features?: string[];
  slug: string;
  stripeProductId?: string;
  paymentLink?: string;
  orderFormUrl?: string;
  orderFormEmbed?: string;
}

export interface PurchaseData {
  productId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  currency: string;
}

class GoHighLevelAPI {
  private apiKey: string;
  private locationId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GHL_API_KEY || '';
    this.locationId = process.env.GHL_LOCATION_ID || '';
    this.baseUrl = process.env.GHL_API_BASE_URL || 'https://services.leadconnectorhq.com';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
  }

  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}/products`, {
        headers: this.getHeaders(),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform GHL products to our Product interface
      return data.products?.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price?.amount || 0,
        currency: product.price?.currency || 'USD',
        image: product.image || '/placeholder.png',
        features: product.features || [],
        slug: product.slug || product.name.toLowerCase().replace(/\s+/g, '-'),
        stripeProductId: product.stripeProductId,
        paymentLink: product.paymentLink || product.checkoutUrl,
        orderFormUrl: product.orderFormUrl,
        orderFormEmbed: product.orderFormEmbed
      })) || [];
    } catch (error) {
      console.error('Error fetching products from GHL:', error);
      // Return mock data for development
      return getMockProducts();
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${id}`, {
        headers: this.getHeaders(),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }

      const product = await response.json();
      
      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price?.amount || 0,
        currency: product.price?.currency || 'USD',
        image: product.image || '/placeholder.png',
        features: product.features || [],
        slug: product.slug || product.name.toLowerCase().replace(/\s+/g, '-'),
        stripeProductId: product.stripeProductId,
        paymentLink: product.paymentLink || product.checkoutUrl,
        orderFormUrl: product.orderFormUrl,
        orderFormEmbed: product.orderFormEmbed
      };
    } catch (error) {
      console.error('Error fetching product from GHL:', error);
      return getMockProducts().find(p => p.id === id) || null;
    }
  }

  async createContact(data: PurchaseData) {
    try {
      const contactData = {
        locationId: this.locationId,
        email: data.customerEmail,
        name: data.customerName,
        phone: data.customerPhone,
        tags: ['customer', `product-${data.productId}`],
        customFields: {
          lastPurchaseAmount: data.amount,
          lastPurchaseProduct: data.productId
        }
      };

      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(contactData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create contact: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating contact in GHL:', error);
      throw error;
    }
  }

  async createOpportunity(data: PurchaseData, contactId: string) {
    try {
      const opportunityData = {
        locationId: this.locationId,
        contactId: contactId,
        name: `Purchase - ${data.productId}`,
        monetaryValue: data.amount,
        status: 'won',
        pipelineId: process.env.GHL_PIPELINE_ID,
        pipelineStageId: process.env.GHL_STAGE_ID
      };

      const response = await fetch(`${this.baseUrl}/opportunities`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(opportunityData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create opportunity: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating opportunity in GHL:', error);
      throw error;
    }
  }

  async processPurchase(data: PurchaseData) {
    try {
      // Create or update contact
      const contact = await this.createContact(data);
      
      // Create opportunity for the purchase
      const opportunity = await this.createOpportunity(data, contact.id);
      
      return {
        success: true,
        contactId: contact.id,
        opportunityId: opportunity.id
      };
    } catch (error) {
      console.error('Error processing purchase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Mock data for development
function getMockProducts(): Product[] {
  return [
    {
      id: '1',
      name: 'Pro App Suite',
      description: 'Complete suite of professional tools for your business',
      price: 99.99,
      currency: 'USD',
      image: '/agent-template-og.png',
      features: [
        'Advanced Analytics Dashboard',
        'Unlimited Users',
        'Priority Support',
        'API Access',
        'Custom Integrations'
      ],
      slug: 'pro-app-suite',
      paymentLink: 'https://link.msgsndr.com/payment/example-pro-suite',
      orderFormUrl: 'https://app.gohighlevel.com/v2/preview/example-order-form-1'
    },
    {
      id: '2',
      name: 'Starter Pack',
      description: 'Essential tools to get your business started',
      price: 29.99,
      currency: 'USD',
      image: '/agent-cta-background.png',
      features: [
        'Basic Analytics',
        'Up to 5 Users',
        'Email Support',
        'Standard Integrations'
      ],
      slug: 'starter-pack',
      paymentLink: 'https://link.msgsndr.com/payment/example-starter-pack',
      orderFormUrl: 'https://app.gohighlevel.com/v2/preview/example-order-form-2'
    },
    {
      id: '3',
      name: 'Enterprise Solution',
      description: 'Custom enterprise solution with dedicated support',
      price: 499.99,
      currency: 'USD',
      image: '/agent-template-og.png',
      features: [
        'Custom Analytics',
        'Unlimited Everything',
        'Dedicated Account Manager',
        'White Label Options',
        'SLA Guarantee',
        'Custom Development'
      ],
      slug: 'enterprise-solution',
      paymentLink: 'https://link.msgsndr.com/payment/example-enterprise',
      orderFormUrl: 'https://app.gohighlevel.com/v2/preview/example-order-form-3'
    }
  ];
}

export const ghlAPI = new GoHighLevelAPI();