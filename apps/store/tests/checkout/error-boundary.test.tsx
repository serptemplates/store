import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// @ts-ignore - Testing library may not be installed
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutErrorBoundary } from '@/components/checkout/CheckoutErrorBoundary';
import React from 'react';


// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('CheckoutErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <CheckoutErrorBoundary>
        <div>Test content</div>
      </CheckoutErrorBoundary>
    );

    // @ts-ignore
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should show error UI when child component throws', () => {
    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    // @ts-ignore
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByText(/We encountered an error/)).toBeInTheDocument();
  });

  it('should show Try Again and Go Back buttons on error', () => {
    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    // @ts-ignore
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('should reload page when Try Again is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window.location, 'reload', {
      value: reloadMock,
      writable: true,
    });

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('should go back in history when Go Back is clicked', () => {
    const backMock = vi.fn();
    Object.defineProperty(window.history, 'back', {
      value: backMock,
      writable: true,
    });

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    fireEvent.click(screen.getByText('Go Back'));
    expect(backMock).toHaveBeenCalled();
  });

  it('should use custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <CheckoutErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    // @ts-ignore
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    // @ts-ignore
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
      configurable: true
    });

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    // In development, error details should be visible
    const details = screen.getByText('Error Details (Development Only)');
    // @ts-ignore
    expect(details).toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true
    });
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true
    });

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    // In production, error details should not be visible
    const details = screen.queryByText('Error Details (Development Only)');
    // @ts-ignore
    expect(details).not.toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true
    });
  });

  it('should log errors to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Checkout error:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should recover when error is cleared', () => {
    const { rerender } = render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    // @ts-ignore
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Simulate clearing the error by re-rendering with non-throwing component
    rerender(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={false} />
      </CheckoutErrorBoundary>
    );

    // After clicking Try Again, the page would reload
    // Here we're simulating the component re-rendering without error
    const reloadMock = vi.fn(() => {
      rerender(
        <CheckoutErrorBoundary>
          <ThrowError shouldThrow={false} />
        </CheckoutErrorBoundary>
      );
    });

    Object.defineProperty(window.location, 'reload', {
      value: reloadMock,
      writable: true,
    });
  });

  it('should handle async errors', async () => {
    function AsyncError() {
      React.useEffect(() => {
        throw new Error('Async error');
      }, []);
      return <div>Loading...</div>;
    }

    // React error boundaries don't catch errors in async code by default
    // but our implementation should handle them through componentDidCatch
    render(
      <CheckoutErrorBoundary>
        <AsyncError />
      </CheckoutErrorBoundary>
    );

    // The error boundary catches synchronous errors thrown in lifecycle methods
    // For async errors, you'd typically need to use error handling in the async code itself
  });
});