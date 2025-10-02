import { describe, it, expect } from "vitest";
import { sanitizeInput } from "@/lib/validation/checkout";

describe("Security Tests", () => {
  describe("XSS Prevention", () => {
    it("should remove script tags from input", () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).toBe("Hello");
    });

    it("should remove inline javascript from input", () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain("onerror");
      expect(sanitized).not.toContain("<img");
    });

    it("should handle multiple script tags", () => {
      const malicious =
        '<script>evil()</script>Safe<script>moreEvil()</script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).toBe("Safe");
    });

    it("should handle script tags with attributes", () => {
      const malicious = '<script type="text/javascript">evil()</script>Test';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).toBe("Test");
    });

    it("should handle case-insensitive script tags", () => {
      const malicious = "<SCRIPT>alert(1)</SCRIPT>Text";
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).toBe("Text");
    });
  });

  describe("HTML Injection Prevention", () => {
    it("should remove all HTML tags", () => {
      const malicious = "<div><p>Test</p></div>";
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).toBe("Test");
    });

    it("should handle nested HTML tags", () => {
      const malicious = "<div><span><b>Bold</b></span></div>";
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).toBe("Bold");
    });

    it("should handle self-closing tags", () => {
      const malicious = "Text<br/>More";
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).toBe("TextMore");
    });
  });

  describe("Input Length Validation", () => {
    it("should trim whitespace", () => {
      const input = "  test  ";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe("test");
    });

    it("should handle empty strings", () => {
      const sanitized = sanitizeInput("");
      expect(sanitized).toBe("");
    });

    it("should handle whitespace-only strings", () => {
      const sanitized = sanitizeInput("   ");
      expect(sanitized).toBe("");
    });
  });

  describe("Special Character Handling", () => {
    it("should preserve valid special characters", () => {
      const input = "Test-Product_123";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe("Test-Product_123");
    });

    it("should handle unicode characters safely", () => {
      const input = "Café ☕ Test";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe("Café ☕ Test");
    });
  });
});
