import { NextResponse } from 'next/server';
import { ghlAPI } from '@/lib/ghl-api';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await ghlAPI.getProduct(params.id);
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}