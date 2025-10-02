# Security: Client-Side vs Server-Side Validation & Sanitization

## Why Do We Need Server-Side Sanitization?

A common misconception is that form validation libraries like React Hook Form, Formik, or Zod eliminate the need for server-side sanitization. **This is incorrect and dangerous.**

### The Critical Difference

#### Client-Side Validation (React Hook Form, Formik, etc.)
- ✅ Improves user experience with instant feedback
- ✅ Validates data types, formats, and constraints
- ❌ **Can be bypassed by attackers**
- ❌ **Does NOT sanitize malicious content**
- ❌ **Only runs in the user's browser**

**Attack Vector Example:**
```bash
# Attacker bypasses your React form entirely
curl -X POST https://yourapi.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"email":"attacker@evil.com","message":"<script>steal_cookies()</script>"}'
```

#### Server-Side Sanitization (Required!)
- ✅ **Cannot be bypassed**
- ✅ Removes malicious content (XSS attacks)
- ✅ Prevents injection attacks (SQL, NoSQL, etc.)
- ✅ Enforces business rules and data integrity
- ✅ Protects against direct API calls

## Security Threats That Form Libraries Don't Prevent

### 1. Cross-Site Scripting (XSS)
Form libraries validate that a field is a string, but they don't remove dangerous HTML/JavaScript:

```javascript
// React Hook Form says: ✓ Valid string
// But contains: ✗ Malicious script
const userInput = '<img src=x onerror="alert(document.cookie)">';
```

### 2. HTML Injection
```javascript
// Valid according to form schema
const comment = '<iframe src="http://evil.com/phishing"></iframe>';
```

### 3. SQL Injection (if not using parameterized queries)
```javascript
// Looks like a valid email to form validators
const email = "admin@site.com'; DROP TABLE users; --";
```

### 4. NoSQL Injection
```javascript
// Valid JSON according to form library
const searchTerm = { "$ne": null };
```

### 5. Server-Side Request Forgery (SSRF)
```javascript
// Valid URL format to form validators
const webhookUrl = "http://169.254.169.254/latest/meta-data/";
```

## Best Practices: Defense in Depth

### ✅ Correct Approach (Layered Security)

```typescript
// CLIENT-SIDE: React Hook Form validation
const { register, handleSubmit } = useForm({
  resolver: zodResolver(contactSchema)
});

// Form validation runs here (user experience)
const onSubmit = async (data) => {
  await fetch('/api/contact', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// SERVER-SIDE: API route with sanitization
import { sanitizeInput } from '@/lib/contracts/validation.middleware';

export async function POST(request: NextRequest) {
  const rawData = await request.json();
  
  // CRITICAL: Sanitize before processing
  const sanitizedData = sanitizeInput(rawData, {
    stripHtml: true,
    maxLength: 1000,
    allowedFields: ['name', 'email', 'subject', 'message']
  });
  
  // Now safe to use
  await saveToDatabase(sanitizedData);
}
```

### ❌ Incorrect Approach (Client-Side Only)

```typescript
// DANGEROUS: Only validates on client
const { register, handleSubmit } = useForm();

export async function POST(request: NextRequest) {
  const data = await request.json();
  // ⚠️ No sanitization! Vulnerable to attacks
  await saveToDatabase(data);
}
```

## What Our `sanitizeInput` Function Does

Located in: `apps/store/lib/contracts/validation.middleware.ts`

```typescript
export function sanitizeInput<T>(data: T, options?: {
  stripHtml?: boolean;      // Removes <script>, <iframe>, etc.
  maxLength?: number;        // Prevents buffer overflow attacks
  allowedFields?: string[];  // Whitelist approach - only allow expected fields
}): T
```

### Protection Layers:

1. **HTML/Script Removal**: Strips all HTML tags to prevent XSS
2. **Length Enforcement**: Prevents DoS via extremely large inputs
3. **Field Whitelisting**: Removes unexpected fields (prevents mass assignment)
4. **Recursive Sanitization**: Handles nested objects and arrays
5. **Type Preservation**: Sanitizes strings, passes through numbers/booleans

## Real-World Example: Contact Form

### The Problem
Contact forms are a prime target for attackers:
- Spam injection
- XSS attacks stored in your database
- Email header injection
- Content injection for SEO spam

### The Solution

```typescript
// apps/store/app/api/contact/route.ts
import { sanitizeInput } from '@/lib/contracts/validation.middleware';
import { z } from 'zod';

// Define schema for validation
const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000)
});

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    
    // Step 1: Sanitize (remove malicious content)
    const sanitizedData = sanitizeInput(rawData, {
      stripHtml: true,
      maxLength: 5000,
      allowedFields: ['name', 'email', 'subject', 'message']
    });
    
    // Step 2: Validate (check types and constraints)
    const validatedData = contactSchema.parse(sanitizedData);
    
    // Step 3: Safe to use
    await sendEmail({
      to: 'support@example.com',
      from: validatedData.email,
      subject: validatedData.subject,
      body: validatedData.message
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
```

## When to Use Each Tool

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **React Hook Form** | User experience | Client-side form validation |
| **Zod** | Type safety | Both client and server schema validation |
| **sanitizeInput** | Security | **Always on server before storing/using data** |

## Common Questions

### Q: "Doesn't Zod sanitize data?"
**A:** No. Zod validates types and constraints, but doesn't remove malicious content. Zod will accept `"<script>alert('xss')</script>"` as a valid string.

### Q: "Can't I just trust my form library?"
**A:** No. Attackers don't use your forms—they make direct API calls bypassing all client-side code.

### Q: "What about using dangerouslySetInnerHTML safely?"
**A:** Even with sanitization, avoid `dangerouslySetInnerHTML`. Use plain text rendering whenever possible.

### Q: "Is sanitizeInput enough for SQL injection?"
**A:** No. Always use parameterized queries/prepared statements. `sanitizeInput` is for XSS/content safety, not SQL injection.

## Summary: The Security Checklist

For every API endpoint that accepts user input:

- [ ] ✅ Use client-side validation (UX) - React Hook Form, etc.
- [ ] ✅ Use server-side sanitization (Security) - `sanitizeInput`
- [ ] ✅ Use server-side validation (Type safety) - Zod schemas
- [ ] ✅ Use parameterized queries (SQL safety) - ORM/prepared statements
- [ ] ✅ Rate limit the endpoint (DoS prevention)
- [ ] ✅ Log suspicious inputs (Monitoring)

**Remember**: Security is about layers. Never rely on a single defense mechanism.
