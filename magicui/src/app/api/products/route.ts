import { NextResponse } from 'next/server';
import { ghlAPI } from '@/lib/ghl-api';

export async function GET() {
  try {
    const products = await ghlAPI.getProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}