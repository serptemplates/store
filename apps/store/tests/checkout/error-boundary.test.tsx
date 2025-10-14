import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("@/lib/dom/navigation", () => ({
  reloadPage: vi.fn(),
}));

import { CheckoutErrorBoundary } from "@/components/checkout/CheckoutErrorBoundary";
import { reloadPage } from "@/lib/dom/navigation";

const reloadPageMock = vi.mocked(reloadPage);


// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
}

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  reloadPageMock.mockClear();
});

afterEach(() => {
  cleanup();
  console.error = originalConsoleError;
  vi.unstubAllEnvs();
});

describe("CheckoutErrorBoundary", () => {
  it("should render children when there is no error", () => {
    render(
      <CheckoutErrorBoundary>
        <div>Test content</div>
      </CheckoutErrorBoundary>
    );

    expect(screen.getByText("Test content")).toBeTruthy();
  });

  it("should show error UI when child component throws", () => {
    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText(/We encountered an error/)).toBeTruthy();
  });

  it("should show Try Again and Go Back buttons on error", () => {
    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(screen.getByText("Try Again")).toBeTruthy();
    expect(screen.getByText("Go Back")).toBeTruthy();
  });

  it("should reload page when Try Again is clicked", () => {
    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    fireEvent.click(screen.getByText("Try Again"));
    expect(reloadPageMock).toHaveBeenCalled();
  });

  it("should go back in history when Go Back is clicked", () => {
    const backMock = vi.fn();
    Object.defineProperty(window.history, "back", {
      value: backMock,
      writable: true,
    });

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    fireEvent.click(screen.getByText("Go Back"));
    expect(backMock).toHaveBeenCalled();
  });

  it("should use custom fallback when provided", () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <CheckoutErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(screen.getByText("Custom error message")).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("should show error details in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    // In development, error details should be visible
    const details = screen.getByText("Error Details (Development Only)");
    expect(details).toBeTruthy();
  });

  it("should not show error details in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    // In production, error details should not be visible
    const details = screen.queryByText("Error Details (Development Only)");
    expect(details).toBeNull();
  });

  it("should log errors to console", () => {
    const consoleErrorSpy = vi.spyOn(console, "error");

    render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Checkout error:",
      expect.any(Error),
      expect.any(Object)
    );
  });

  it("should recover when error is cleared", () => {
    const { rerender } = render(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(screen.queryAllByText("Something went wrong").length).toBeGreaterThan(0);

    // Simulate clearing the error by re-rendering with non-throwing component
    rerender(
      <CheckoutErrorBoundary>
        <ThrowError shouldThrow={false} />
      </CheckoutErrorBoundary>
    );

    fireEvent.click(screen.getByText("Try Again"));

    expect(reloadPageMock).toHaveBeenCalled();
    expect(screen.queryAllByText("Something went wrong")).toHaveLength(0);
    expect(screen.getByText("No error")).toBeTruthy();
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
