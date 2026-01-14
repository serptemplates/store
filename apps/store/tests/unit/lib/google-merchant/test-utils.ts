import { LEGAL_FAQ_TEMPLATE, productSchema, type ProductData } from "@/lib/products/product-schema";

const LEGAL_FAQ_NORMALIZED_QUESTION = LEGAL_FAQ_TEMPLATE.question.trim().toLowerCase();

function ensureLegalFaqEntries(faqs: ProductData["faqs"]): ProductData["faqs"] {
  const list = Array.isArray(faqs) ? faqs.slice() : [];
  const index = list.findIndex((faq) => {
    const question = typeof faq?.question === "string" ? faq.question.trim().toLowerCase() : "";
    return question === LEGAL_FAQ_NORMALIZED_QUESTION;
  });

  if (index === -1) {
    list.push({ ...LEGAL_FAQ_TEMPLATE });
    return list;
  }

  const current = list[index] ?? {};
  if (current.question === LEGAL_FAQ_TEMPLATE.question && current.answer === LEGAL_FAQ_TEMPLATE.answer) {
    return list;
  }

  list[index] = {
    ...current,
    question: LEGAL_FAQ_TEMPLATE.question,
    answer: LEGAL_FAQ_TEMPLATE.answer,
  };

  return list;
}

type PricingOverrides = Partial<NonNullable<ProductData["pricing"]>>;
type ProductOverrides = Partial<Omit<ProductData, "pricing" | "categories" | "screenshots">> & {
  pricing?: PricingOverrides;
  categories?: ProductData["categories"];
  screenshots?: ProductData["screenshots"];
};

export function createTestProduct(overrides: ProductOverrides = {}): ProductData {
  const { pricing: pricingOverrides, categories, screenshots, ...rest } = overrides;

  const input: Record<string, unknown> = {
    slug: "demo-product",
    trademark_metadata: {
      uses_trademarked_brand: false,
    },
    platform: "Web",
    seo_title: "Demo Product Title",
    seo_description: "Demo SEO description",
    product_page_url: "https://apps.serp.co/demo-product",
    serp_co_product_page_url: "https://serp.co/products/demo-product/",
    serply_link: "https://serp.ly/demo-product",
    name: "Demo Product",
    tagline: "Instant productivity boost",
    description: "The definitive toolkit for creators.",
    pricing: {
      price: "$19",
      cta_href: "https://apps.serp.co/checkout/demo-product",
      ...pricingOverrides,
    },
    benefits: [],
    faqs: [{ ...LEGAL_FAQ_TEMPLATE }],
    cancel_url: "https://apps.serp.co/checkout?product=demo-product",
    categories: categories ?? ["AI Tools"],
    screenshots:
      screenshots ??
      [
        { url: "https://cdn.serp.co/demo-product-1.png" },
        { url: "https://cdn.serp.co/demo-product-2.png" },
      ],
    ...rest,
  };

  input.faqs = ensureLegalFaqEntries(input.faqs as ProductData["faqs"]);

  if (pricingOverrides) {
    const pricing = input.pricing as Record<string, unknown>;
    const removableKeys: Array<keyof PricingOverrides> = ["price"];
    for (const key of removableKeys) {
      if (Object.prototype.hasOwnProperty.call(pricingOverrides, key) && pricingOverrides[key] === undefined) {
        delete pricing[key as string];
      }
    }
  }

  // Add price_id for live products
  const mutableInput = input as { payment?: ProductData["payment"] };
  const payment = mutableInput.payment;
  if (input.status === "live" && !payment?.stripe?.price_id) {
    const nextPayment = (payment ?? {}) as NonNullable<ProductData["payment"]>;
    if (!nextPayment.provider) {
      nextPayment.provider = "stripe";
    }
    const stripe =
      (nextPayment.stripe ?? { metadata: {} }) as NonNullable<NonNullable<ProductData["payment"]>["stripe"]>;
    stripe.price_id = "price_1DEMO1234567890";
    nextPayment.stripe = stripe;
    mutableInput.payment = nextPayment;
  }

  return productSchema.parse(input);
}
