import { NextResponse } from "next/server";
import { getProductData } from "@/lib/product";

export function GET() {
  const product = getProductData();
  return NextResponse.json(product);
}
