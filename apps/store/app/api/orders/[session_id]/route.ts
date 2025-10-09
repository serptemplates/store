import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  try {
    const { session_id } = await params;

    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if database is configured
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Query the database for order details
    // Note: The actual schema may vary - adjust the query accordingly
    const result = await query`
      SELECT 
        id,
        offer_id,
        customer_email,
        metadata,
        created_at
      FROM orders
      WHERE metadata->>'session_id' = ${session_id}
      OR id = ${session_id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!result || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = result.rows[0];
    
    // Parse metadata if it's a string
    let metadata = order.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        // If parsing fails, use as is
      }
    }

    // Extract order details
    const orderData = {
      orderId: order.id,
      offerId: order.offer_id,
      value: metadata?.amount || metadata?.value || 0,
      currency: metadata?.currency || 'USD',
      items: metadata?.items || [
        {
          id: order.offer_id || 'unknown',
          name: metadata?.product_name || metadata?.offer_name || 'Product',
          price: metadata?.amount || metadata?.value || 0,
          quantity: 1,
        },
      ],
      paymentProvider: metadata?.payment_provider || metadata?.provider || 'unknown',
      customerEmail: order.customer_email,
      createdAt: order.created_at,
    };

    return NextResponse.json(orderData);
  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
