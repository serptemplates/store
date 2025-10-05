import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInput } from '@/lib/contracts/validation.middleware';

/**
 * Waitlist API endpoint for coming soon products
 * Stores waitlist entries and optionally integrates with GHL or email service
 * 
 * Security: Uses server-side sanitization to prevent XSS and injection attacks.
 * Client-side validation alone is insufficient as attackers can bypass it.
 */

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    
    // Sanitize input to prevent XSS and other injection attacks
    // This is critical even if using client-side form validation
    const body = sanitizeInput(rawBody, {
      stripHtml: true,
      maxLength: 500,
      allowedFields: ['email', 'product', 'name', 'source']
    });
    
    const { email, product, name, source } = body;

    // Validate required fields
    if (!email || !product) {
      return NextResponse.json(
        { error: 'Email and product are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // If GHL is configured, add to GHL
    if (process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID) {
      try {
        const ghlResponse = await fetch(
          `https://rest.gohighlevel.com/v1/contacts/`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              name: name || email.split('@')[0],
              tags: ['waitlist', `waitlist-${product}`],
              customField: {
                waitlist_product: product,
                waitlist_date: new Date().toISOString(),
                waitlist_source: source || 'website',
              },
              locationId: process.env.GHL_LOCATION_ID,
            }),
          }
        );

        if (!ghlResponse.ok) {
          console.error('GHL API error:', await ghlResponse.text());
        }
      } catch (error) {
        console.error('Failed to add to GHL:', error);
        // Continue even if GHL fails
      }
    }

    // Store in database if configured
    if (process.env.POSTGRES_URL) {
      try {
        const { sql } = await import('@vercel/postgres');

        // Create table if it doesn't exist
        await sql`
          CREATE TABLE IF NOT EXISTS waitlist (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            product VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            source VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(email, product)
          )
        `;

        // Insert waitlist entry
        await sql`
          INSERT INTO waitlist (email, product, name, source)
          VALUES (${email}, ${product}, ${name || null}, ${source || 'website'})
          ON CONFLICT (email, product) DO UPDATE
          SET updated_at = CURRENT_TIMESTAMP
        `;
      } catch (error) {
        console.error('Database error:', error);
        // Continue even if database fails
      }
    }

    // Send confirmation email if email service is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'SERP Apps <noreply@apps.serp.co>',
          to: email,
          subject: `You're on the waitlist for ${product}!`,
          html: `
            <h2>Welcome to the waitlist!</h2>
            <p>Hi${name ? ' ' + name : ''},</p>
            <p>You've been successfully added to the waitlist for <strong>${product}</strong>.</p>
            <p>We'll notify you as soon as it's available with an exclusive early-bird discount!</p>
            <br>
            <p>Best regards,<br>The SERP Apps Team</p>
          `,
        });
      } catch (error) {
        console.error('Email send error:', error);
        // Continue even if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added to waitlist',
      data: {
        email,
        product,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check waitlist status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const product = searchParams.get('product');

  if (!email || !product) {
    return NextResponse.json(
      { error: 'Email and product are required' },
      { status: 400 }
    );
  }

  try {
    if (process.env.POSTGRES_URL) {
      const { sql } = await import('@vercel/postgres');

      const result = await sql`
        SELECT * FROM waitlist
        WHERE email = ${email} AND product = ${product}
        LIMIT 1
      `;

      if (result.rows.length > 0) {
        return NextResponse.json({
          exists: true,
          data: result.rows[0],
        });
      }
    }

    return NextResponse.json({
      exists: false,
    });

  } catch (error) {
    console.error('Waitlist check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}