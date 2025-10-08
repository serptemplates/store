import { NextResponse } from "next/server";
import { getProductData } from "@/lib/products/product";

export function GET() {
  const product = getProductData();
  return NextResponse.json(product);
}
