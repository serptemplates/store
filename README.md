# App Store with GoHighLevel Integration

A modern e-commerce store for selling digital products with GoHighLevel (GHL) integration for payment processing and customer management.

## Features

- 🛍️ **Product Catalog** - Display all your products in a beautiful grid layout
- 🎨 **Product Landing Pages** - Dynamic landing pages for each product using MagicUI templates
- 💳 **Dual Payment Options**:
  - **Stripe Checkout** - Clean, minimal checkout experience (recommended)
  - **GHL Payment Links** - Direct integration with GoHighLevel payment links
- 🔄 **Automatic GHL Sync** - Purchases via Stripe automatically sync to GoHighLevel
- 📱 **Responsive Design** - Works perfectly on all devices
- ⚡ **Fast Performance** - Built with Next.js 15 and Turbopack

## Setup

### 1. Install Dependencies

```bash
cd magicui
npm install
```

### 2. Configure GoHighLevel

Create a `.env.local` file in the `magicui` directory with your GHL credentials:

```env
# GoHighLevel API Configuration
GHL_API_KEY=your_api_key_here
GHL_LOCATION_ID=your_location_id_here
GHL_API_BASE_URL=https://services.leadconnectorhq.com

# Optional: For opportunity tracking
GHL_PIPELINE_ID=your_pipeline_id_here
GHL_STAGE_ID=your_stage_id_here

# Stripe Configuration (get these from your Stripe dashboard)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Choose Your Payment Method

#### Option A: Use Stripe Checkout (Recommended)
- Provides a clean, minimal checkout experience
- No duplicate product information
- Automatically syncs purchases to GoHighLevel
- Set up your Stripe keys in `.env.local`

#### Option B: Use GoHighLevel Payment Links
- Uses your existing GHL payment links
- Customers are redirected to GHL for checkout
- Add `paymentLink` URL to your products in GHL

### 4. Set Up Products in GoHighLevel

In your GoHighLevel account:

1. Create products with pricing
2. Set up payment links or order forms for each product
3. Configure Stripe or PayPal integration in GHL
4. The API will fetch these products and display them in your store

### 4. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your store.

## Project Structure

```
magicui/
├── src/
│   ├── app/
│   │   ├── products/          # Products listing page
│   │   ├── products/[slug]/   # Dynamic product landing pages
│   │   └── api/
│   │       ├── products/      # API for fetching products
│   │       └── purchase/      # API for processing purchases
│   ├── components/
│   │   └── sections/          # Reusable UI sections
│   └── lib/
│       ├── ghl-api.ts        # GoHighLevel API integration
│       └── config.tsx        # Site configuration
```

## How It Works

### Product Data Flow

1. **Product Fetching**: The store fetches product data from GoHighLevel via the API
2. **Display**: Products are displayed on the `/products` page with pricing and features
3. **Landing Pages**: Each product has a dedicated landing page at `/products/[slug]`
4. **Checkout**: Buy buttons link directly to GHL payment links or order forms

### Payment Processing

When a user clicks "Buy Now":
- They are redirected to the GoHighLevel payment link or order form
- GHL handles the entire checkout process (Stripe/PayPal)
- Customer data is automatically created/updated in GHL
- Purchases can trigger automations in your GHL workflows

### Customer Management

The integration automatically:
- Creates contacts in GHL when purchases are made
- Tags customers with their purchased products
- Creates opportunities for tracking sales
- Enables follow-up automations and email campaigns

## Customization

### Adding Products

Products can be added in two ways:

1. **Via GoHighLevel**: Add products in your GHL account - they'll automatically appear
2. **Mock Data**: Edit the `getMockProducts()` function in `src/lib/ghl-api.ts` for development

### Styling

The store uses:
- Tailwind CSS for styling
- MagicUI components for animations and effects
- Fully customizable via the config file

### Configuration

Edit `src/lib/config.tsx` to customize:
- Site title and description
- Navigation links
- Hero section content
- Company logos
- Social media links

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your preferred platform (Vercel, Netlify, etc.)

3. Set environment variables in your hosting platform

4. Update your domain settings

## API Endpoints

- `GET /api/products` - Fetch all products
- `GET /api/products/[id]` - Fetch single product
- `POST /api/purchase` - Process purchase (creates contact/opportunity in GHL)

## Support

For GoHighLevel API documentation, visit:
- [HighLevel API Docs](https://highlevel.stoplight.io/docs/integrations)
- [HighLevel Support Portal](https://help.gohighlevel.com)

## License

This project is configured for commercial use with GoHighLevel integration.
