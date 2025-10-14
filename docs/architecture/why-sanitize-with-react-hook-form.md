# Answer to: "Why do we need to sanitize when using React Hook Form?"

## Short Answer

**React Hook Form (and similar libraries) only validate on the client side, which can be completely bypassed by attackers.** Server-side sanitization is **mandatory** for security because:

1. ❌ **Attackers don't use your form** - They make direct API calls bypassing all client-side code
2. ❌ **Form libraries don't remove malicious content** - They validate types/formats but accept dangerous strings like `<script>alert('XSS')</script>`
3. ✅ **Only server-side sanitization can't be bypassed** - It's your last line of defense

## Example Attack

```bash
# Your React Hook Form is completely bypassed:
curl -X POST https://yourapi.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"message":"<script>steal_cookies()</script>"}'
```

Without server-side sanitization, this malicious script gets stored in your database and executed when displayed.

## The Complete Security Stack

You need **all three layers**:

### 1. Client-Side Validation (React Hook Form)
- **Purpose**: Better user experience
- **Security**: ❌ None - Can be bypassed

### 2. Server-Side Sanitization (`sanitizeInput`)
- **Purpose**: Remove malicious content (XSS prevention)
- **Security**: ✅ Cannot be bypassed

### 3. Server-Side Validation (Zod)
- **Purpose**: Type safety and business rules
- **Security**: ✅ Cannot be bypassed

## What Each Tool Does

| Tool | Example Input | Output |
|------|---------------|--------|
| **React Hook Form** | `"<script>alert('xss')</script>"` | ✅ Valid (it's a string) |
| **Zod** | `"<script>alert('xss')</script>"` | ✅ Valid (it's a string) |
| **sanitizeInput** | `"<script>alert('xss')</script>"` | ❌ → `"alert('xss')"` (HTML stripped) |

**Only sanitizeInput removes the dangerous content!**

## Real-World Implementation

```typescript
// API route (apps/store/app/api/contact/route.ts)
export async function POST(request: NextRequest) {
  const rawData = await request.json();
  
  // Step 1: SANITIZE - Remove XSS/HTML
  const sanitized = sanitizeInput(rawData, {
    stripHtml: true,
    maxLength: 5000,
    allowedFields: ['name', 'email', 'message']
  });
  
  // Step 2: VALIDATE - Check types
  const validated = schema.parse(sanitized);
  
  // Step 3: NOW SAFE to store/use
  await saveToDatabase(validated);
}
```

## Key Takeaway

**Never trust client-side code for security.** Client-side validation improves UX, but server-side sanitization and validation are **mandatory** for security.

## Learn More

- See `docs/SECURITY-VALIDATION.md` for comprehensive security guide
- See `apps/store/app/api/contact/README.md` for detailed examples
- See `apps/store/lib/contracts/validation.middleware.ts` for `sanitizeInput` implementation
