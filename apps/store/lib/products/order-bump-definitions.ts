import manifest from "@/data/order-bumps/manifest.json";
import { z } from "zod";

const stripeConfigSchema = z
  .object({
    price_id: z.string().trim(),
    test_price_id: z.string().trim().optional(),
    mode: z.enum(["payment", "subscription"]).optional(),
  })
  .optional();

export const orderBumpDefinitionSchema = z.object({
  product_slug: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional().default(true),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  price: z.string().trim().optional(),
  features: z.array(z.string().trim()).optional().default([]),
  image: z.string().trim().url().optional(),
  default_selected: z.boolean().optional().default(false),
  stripe: stripeConfigSchema,
});

export type OrderBumpDefinition = z.infer<typeof orderBumpDefinitionSchema> & {
  slug: string;
};

const manifestSchema = z.record(orderBumpDefinitionSchema);
const parsedManifest = manifestSchema.parse(manifest);

const definitionEntries: OrderBumpDefinition[] = Object.entries(parsedManifest).map(
  ([slug, definition]) => ({
    slug,
    ...definition,
  }),
);
const definitionMap = new Map(definitionEntries.map((entry) => [entry.slug, entry]));

export function getOrderBumpDefinitions(): OrderBumpDefinition[] {
  return definitionEntries;
}

export function getOrderBumpDefinition(slug: string): OrderBumpDefinition | undefined {
  return definitionMap.get(slug);
}

export function clearOrderBumpDefinitionCache(): void {
  // no-op kept for API compatibility
}
