import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { productSchema } from "@/lib/products/product-schema";

const schemaPath = path.resolve(__dirname, "../../data/product.schema.json");
const jsonSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as {
  properties: Record<string, unknown>;
  required?: string[];
};

const zodShape = productSchema.shape as Record<string, z.ZodTypeAny>;

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (!schema) return schema;
  const typeName = schema._def?.typeName;

  if (
    typeName === z.ZodFirstPartyTypeKind.ZodOptional ||
    typeName === z.ZodFirstPartyTypeKind.ZodNullable ||
    typeName === z.ZodFirstPartyTypeKind.ZodDefault
  ) {
    const inner = (schema._def as { innerType?: z.ZodTypeAny; schema?: z.ZodTypeAny }).innerType
      ?? (schema._def as { schema?: z.ZodTypeAny }).schema;
    return inner ? unwrap(inner) : schema;
  }

  if (typeName === z.ZodFirstPartyTypeKind.ZodEffects) {
    return unwrap(schema._def.schema);
  }

  return schema;
}

function isOptional(schema: z.ZodTypeAny): boolean {
  if (!schema) return false;
  const typeName = schema._def?.typeName;

  if (
    typeName === z.ZodFirstPartyTypeKind.ZodOptional ||
    typeName === z.ZodFirstPartyTypeKind.ZodNullable ||
    typeName === z.ZodFirstPartyTypeKind.ZodDefault
  ) {
    return true;
  }

  if (typeName === z.ZodFirstPartyTypeKind.ZodEffects) {
    return isOptional((schema._def as { schema: z.ZodTypeAny }).schema);
  }

  return false;
}

describe("product schema alignment", () => {
  it("keeps Zod and JSON schema properties in sync", () => {
    const zodKeys = Object.keys(zodShape).sort();
    const jsonKeys = Object.keys(jsonSchema.properties).sort();

    expect(zodKeys).toEqual(jsonKeys);

    const requiredKeys = Array.isArray(jsonSchema.required) ? jsonSchema.required : [];

    for (const key of requiredKeys) {
      const shapeEntry = zodShape[key];
      expect(shapeEntry, `Missing Zod definition for required key "${key}"`).toBeDefined();

      const optional = isOptional(shapeEntry);
      expect(optional).toBe(false);

      const unwrapped = unwrap(shapeEntry);
      expect(unwrapped, `Unable to unwrap schema for key "${key}"`).toBeDefined();
    }
  });
});
