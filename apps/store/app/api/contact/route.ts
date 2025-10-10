import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInput } from '@/lib/contracts/validation.middleware';
import { z } from 'zod';

/**
 * Contact Form API endpoint
 * 
 * SECURITY NOTE: This demonstrates the proper layered security approach:
 * 1. Client-side validation (React Hook Form) - UX improvement
 * 2. Server-side sanitization (sanitizeInput) - XSS/injection prevention
 * 3. Server-side validation (Zod) - Type safety and business rules
 * 
 * Why all three layers?
 * - Client validation can be bypassed by direct API calls
 * - Zod validates types/format but doesn't remove malicious content
 * - Sanitization removes dangerous HTML/scripts before validation
 * 
 * See docs/SECURITY-VALIDATION.md for detailed explanation
 */

// Define validation schema
const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  message: z.string().min(10, 'Message too short').max(5000, 'Message too long'),
});

type ContactFormData = z.infer<typeof ContactSchema>;

export async function POST(request: NextRequest) {
  try {
    // Get raw data from request
    const rawData = await request.json();

    // Step 1: SANITIZE - Remove malicious content
    // This prevents XSS attacks even if someone bypasses our client-side form
    const sanitizedData = sanitizeInput(rawData, {
      stripHtml: true,           // Remove all HTML tags
      maxLength: 5000,            // Prevent DoS via huge inputs
      allowedFields: ['name', 'email', 'subject', 'message']  // Whitelist approach
    });

    // Step 2: VALIDATE - Check types and business rules with Zod
    const validatedData: ContactFormData = ContactSchema.parse(sanitizedData);

    // Step 3: SAFE TO USE - Data is now sanitized and validated
    
    // Example: Send email (if email service configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'Contact Form <noreply@apps.serp.co>',
          to: process.env.CONTACT_EMAIL || 'support@apps.serp.co',
          replyTo: validatedData.email,
          subject: `Contact Form: ${validatedData.subject}`,
          text: `
Name: ${validatedData.name}
Email: ${validatedData.email}
Subject: ${validatedData.subject}

Message:
${validatedData.message}
          `.trim(),
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Example: Store in database (if configured)
    if (process.env.POSTGRES_URL) {
      try {
        const { sql } = await import('@vercel/postgres');

        // Create table if it doesn't exist
        await sql`
          CREATE TABLE IF NOT EXISTS contact_submissions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            subject VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;

        // Insert submission (using parameterized query to prevent SQL injection)
        await sql`
          INSERT INTO contact_submissions (name, email, subject, message, ip_address, user_agent)
          VALUES (
            ${validatedData.name},
            ${validatedData.email},
            ${validatedData.subject},
            ${validatedData.message},
            ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')},
            ${request.headers.get('user-agent')}
          )
        `;
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Don't expose database errors to client
      }
    }

    // Track submission event
    const maybeWindow =
      typeof globalThis !== 'undefined' && 'window' in globalThis
        ? (globalThis as { window?: Window }).window
        : undefined;

    if (maybeWindow?.gtag) {
      maybeWindow.gtag('event', 'contact_form_submit', {
        event_category: 'engagement',
        event_label: validatedData.subject,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.',
    });

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle other errors
    console.error('Contact form error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process contact form. Please try again later.',
      },
      { status: 500 }
    );
  }
}
