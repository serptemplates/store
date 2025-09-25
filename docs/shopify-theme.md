# Shopify Theme Integration (SERP Store)

Follow these steps after syncing products into your dev store.

## 1. Register product metafields

Run the helper script to create every SERP metafield definition on the store:

```bash
pnpm setup:shopify:metafields
```

This provisions the following definitions under **Settings → Custom data → Products**:

| Namespace | Key | Type | Access | Purpose |
|-----------|-----|------|--------|---------|
| `serp` | `slug` | `single_line_text_field` | Admin only | Original SERP Apps slug identifier. |
| `serp` | `purchase_url` | `url` | Admin only | Legacy checkout fallback link. |
| `serp` | `product_page_url` | `url` | Admin only | Original SERP landing page URL. |
| `serp` | `ghl_config` | `json` | Admin only | Go High Level pipeline / workflow config. |
| `serp` | `stripe_config` | `json` | Admin only | Historical Stripe metadata for reference. |
| `serp` | `feature_list` | `list.single_line_text_field` | Storefront | Feature bullets rendered on the page. |
| `serp` | `testimonials` | `json` | Storefront | Testimonials array for the reviews section. |
| `serp` | `faqs` | `json` | Storefront | FAQ entries for accordion blocks. |
| `serp` | `pricing_label` | `single_line_text_field` | Storefront | Heading above the pricing card (e.g. “One-time payment”). |
| `serp` | `pricing_note` | `single_line_text_field` | Storefront | Subtext beneath the pricing card. |
| `serp` | `pricing_benefits` | `list.single_line_text_field` | Storefront | Pricing plan bullet points. |

The product sync script automatically populates these fields from the YAML catalog. You can confirm values on any product detail page inside Shopify Admin.

## 2. Add SERP product section (Dawn-based themes)

Create a new section (e.g. `sections/serp-product-details.liquid`) with the following starter layout:

```liquid
{% assign serp_meta = product.metafields.serp %}
{% assign features = serp_meta.feature_list.value %}
{% assign pricing_benefits = serp_meta.pricing_benefits.value %}
{% assign testimonials_raw = serp_meta.testimonials.value | default: '[]' %}
{% assign faqs_raw = serp_meta.faqs.value | default: '[]' %}
{% assign testimonials = testimonials_raw | parse_json %}
{% assign faqs = faqs_raw | parse_json %}

<section class="serp-product-details">
  <div class="page-width">
    <div class="grid grid--2-col gap">
      <div>
        <h2 class="serp-heading">Why people love {{ product.title }}</h2>
        {% if features and features.size > 0 %}
          <ul class="serp-feature-list">
            {% for feature in features %}
              <li>{{ feature }}</li>
            {% endfor %}
          </ul>
        {% endif %}

        {% if pricing_benefits and pricing_benefits.size > 0 %}
          <div class="serp-pricing-card">
            <h3>{{ serp_meta.pricing_label.value | default: 'What you get' }}</h3>
            <div class="serp-price">
              {{ product.price | money_with_currency }}
              {% if product.compare_at_price_max > product.price %}
                <span class="serp-compare">{{ product.compare_at_price_max | money_with_currency }}</span>
              {% endif %}
            </div>
            <ul>
              {% for item in pricing_benefits %}
                <li>{{ item }}</li>
              {% endfor %}
            </ul>
            <button class="button button--primary" type="button" onclick="document.querySelector('[name=add]').click()">
              {{ 'Add to cart' | t }}
            </button>
            {% if serp_meta.pricing_note.value %}
              <p class="serp-pricing-note">{{ serp_meta.pricing_note.value }}</p>
            {% endif %}
          </div>
        {% endif %}
      </div>

      <div>
        {% if testimonials.size > 0 %}
          <h3>Customer reviews</h3>
          <div class="serp-testimonials">
            {% for testimonial in testimonials %}
              <blockquote>
                <p>{{ testimonial.review }}</p>
                <cite>— {{ testimonial.name }}</cite>
              </blockquote>
            {% endfor %}
          </div>
        {% endif %}

        {% if faqs.size > 0 %}
          <details class="serp-faq" open>
            <summary>Frequently asked questions</summary>
            <div>
              {% for faq in faqs %}
                <details class="serp-faq-item">
                  <summary>{{ faq.question }}</summary>
                  <p>{{ faq.answer }}</p>
                </details>
              {% endfor %}
            </div>
          </details>
        {% endif %}
      </div>
    </div>
  </div>
</section>
```

Add CSS in your theme (e.g. `assets/base.css`) to style `.serp-*` classes or reuse Dawn utilities.

### Hook the section into the product template

1. In **Online Store → Themes → Customize**, open the product template you use for SERP products (usually `main-product`).
2. Add a new “Custom Liquid” block or the `serp-product-details` section after the main product block.
3. Remove or hide default blocks you no longer need (e.g. vendor text, standard tabs) if the SERP layout replaces them.
4. Save and preview – features, pricing highlights, testimonials, and FAQs should render using the synced metafields.

## 3. Additional recommendations

- Use Shopify’s built-in product recommendations or add a “Featured collection” section to surface related SERP tools.
- Set each SERP product to “Digital product or service” so checkout skips shipping.
- When you design the navigation, mirror the collections created by the sync script (`Course Platforms`, `Video Platforms`, etc.) to drive discovery.
- Keep Shopify Payments in **test mode** on the dev store; switch to live credentials when you migrate to `store-serp.myshopify.com`.

With metafields and sections in place, you can proceed to hook up Shopify webhooks → Go High Level (Task 4) and prepare the rollout plan (Task 5).

## Shopify collections

Products can declare explicit collections for synchronization by adding a `shopify_collections` array in their YAML definition:

```yaml
shopify_collections:
  - Downloaders
  - Artificial Intelligence
```

If the field is omitted, the sync script falls back to the existing `categories` array. Each unique entry becomes (or updates) a smart collection in Shopify and is also merged into the product tags for easier filtering.
