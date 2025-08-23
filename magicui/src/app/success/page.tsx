'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <main className="flex flex-col min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md text-center"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Purchase Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for your purchase. You'll receive a confirmation email shortly with all the details.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/products">
            <Button variant="outline">
              Continue Shopping
            </Button>
          </Link>
          <Link href="/">
            <Button>
              Go to Home
            </Button>
          </Link>
        </div>

        {sessionId && (
          <p className="text-sm text-muted-foreground mt-8">
            Order ID: {sessionId}
          </p>
        )}
      </motion.div>
    </main>
  );
}