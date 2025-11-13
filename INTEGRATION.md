# React Integration Guide

Complete guide for integrating Kit Proxy backend with React applications.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [API Client Setup](#api-client-setup)
- [TypeScript Types](#typescript-types)
- [React Hooks](#react-hooks)
- [Form Examples](#form-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Testing](#testing)

## Overview

Kit Proxy is a secure backend service that:
- Validates form submissions using JSON Schema
- Proxies requests to ConvertKit API without exposing API keys
- Provides type-safe schema definitions for frontend validation

### Architecture

```
React Frontend → Kit Proxy Backend → ConvertKit API
```

**Benefits:**
- ✅ API keys stay secure on the backend
- ✅ Schema-based validation before submission
- ✅ Type-safe integration with TypeScript
- ✅ Reduced network calls with schema caching

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- React 18+ (hooks-based examples)
- TypeScript (recommended)
- Kit Proxy backend running (local or deployed)

## Quick Start

### 1. Environment Variables

Create `.env` or `.env.local`:

```bash
# Local development
REACT_APP_API_URL=http://localhost:3000

# Production
REACT_APP_API_URL=https://your-kit-proxy.railway.app
```

### 2. Install Dependencies

```bash
npm install axios
# or
npm install @tanstack/react-query axios  # Recommended for production
```

### 3. Basic Form Example

```tsx
import React, { useState } from 'react';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/subscribe/newsletter-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Subscription failed');
      }

      setStatus('success');
      setEmail('');
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
      </button>
      {status === 'success' && <p>Successfully subscribed!</p>}
      {status === 'error' && <p>Subscription failed. Please try again.</p>}
    </form>
  );
}
```

## API Client Setup

### Basic Fetch Client

```typescript
// src/api/kitProxy.ts
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export class KitProxyClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  async getSchema(formId: string) {
    const response = await fetch(`${this.baseUrl}/api/schema/${formId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }

    return response.json();
  }

  async subscribe(formId: string, data: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/api/subscribe/${formId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Subscription failed');
    }

    return result;
  }

  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Singleton instance
export const kitProxy = new KitProxyClient();
```

### Axios Client (Alternative)

```typescript
// src/api/kitProxy.ts
import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class KitProxyClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = API_URL) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
  }

  async getSchema(formId: string) {
    const { data } = await this.client.get(`/api/schema/${formId}`);
    return data;
  }

  async subscribe(formId: string, formData: Record<string, unknown>) {
    const { data } = await this.client.post(`/api/subscribe/${formId}`, formData);
    return data;
  }

  async healthCheck() {
    const { data } = await this.client.get('/health');
    return data;
  }
}

export const kitProxy = new KitProxyClient();
```

## TypeScript Types

```typescript
// src/types/kitProxy.ts

export interface JSONSchemaProperty {
  type: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  description?: string;
  items?: JSONSchemaProperty;
  enum?: string[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  [key: string]: unknown;
}

export interface JSONSchema {
  $schema?: string;
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchemaProperty;
  description?: string;
  title?: string;
  [key: string]: unknown;
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  subscriberId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  details?: ValidationError[];
}

export interface HealthCheckResponse {
  status: 'ok';
}
```

## React Hooks

### useSchema Hook

```typescript
// src/hooks/useSchema.ts
import { useState, useEffect } from 'react';
import { kitProxy } from '../api/kitProxy';
import { JSONSchema } from '../types/kitProxy';

export function useSchema(formId: string) {
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSchema() {
      try {
        setLoading(true);
        const data = await kitProxy.getSchema(formId);

        if (!cancelled) {
          setSchema(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch schema'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSchema();

    return () => {
      cancelled = true;
    };
  }, [formId]);

  return { schema, loading, error };
}
```

### useSubscribe Hook

```typescript
// src/hooks/useSubscribe.ts
import { useState } from 'react';
import { kitProxy } from '../api/kitProxy';
import { SubscribeResponse, ErrorResponse } from '../types/kitProxy';

export function useSubscribe(formId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [data, setData] = useState<SubscribeResponse | null>(null);

  const subscribe = async (formData: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);

      const result = await kitProxy.subscribe(formId, formData);
      setData(result);

      return result;
    } catch (err) {
      const errorResponse: ErrorResponse = {
        error: err instanceof Error ? err.message : 'Subscription failed',
      };
      setError(errorResponse);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setData(null);
  };

  return { subscribe, loading, error, data, reset };
}
```

### React Query Integration (Recommended)

```typescript
// src/hooks/useKitProxyQuery.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { kitProxy } from '../api/kitProxy';

export function useSchemaQuery(formId: string) {
  return useQuery({
    queryKey: ['schema', formId],
    queryFn: () => kitProxy.getSchema(formId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useSubscribeMutation(formId: string) {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      kitProxy.subscribe(formId, data),
  });
}
```

## Form Examples

### Newsletter Signup Form

```typescript
// src/components/NewsletterForm.tsx
import React, { useState } from 'react';
import { useSubscribe } from '../hooks/useSubscribe';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const { subscribe, loading, error, data } = useSubscribe('newsletter-signup');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await subscribe({ email });
      setEmail(''); // Clear form on success
    } catch (err) {
      // Error is handled by the hook
    }
  };

  if (data) {
    return (
      <div className="success-message">
        <h3>Thank you for subscribing!</h3>
        <p>Check your email to confirm your subscription.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="error-message">
          {error.error}
          {error.details && (
            <ul>
              {error.details.map((detail, i) => (
                <li key={i}>{detail.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Subscribing...' : 'Subscribe'}
      </button>
    </form>
  );
}
```

### Contact Form with Schema Validation

```typescript
// src/components/ContactForm.tsx
import React, { useState } from 'react';
import { useSchema } from '../hooks/useSchema';
import { useSubscribe } from '../hooks/useSubscribe';

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
}

export function ContactForm() {
  const formId = 'contact-form';
  const { schema, loading: schemaLoading } = useSchema(formId);
  const { subscribe, loading, error, data } = useSubscribe(formId);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await subscribe(formData);
      // Reset form on success
      setFormData({ email: '', firstName: '', lastName: '' });
    } catch (err) {
      // Error handled by hook
    }
  };

  if (schemaLoading) {
    return <div>Loading form...</div>;
  }

  if (data) {
    return (
      <div className="success-message">
        <h3>Message Sent!</h3>
        <p>We'll get back to you soon.</p>
      </div>
    );
  }

  const required = schema?.required || [];

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">
          Email {required.includes('email') && '*'}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required={required.includes('email')}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="firstName">
          First Name {required.includes('firstName') && '*'}
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          value={formData.firstName}
          onChange={handleChange}
          required={required.includes('firstName')}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="lastName">
          Last Name {required.includes('lastName') && '*'}
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          value={formData.lastName}
          onChange={handleChange}
          required={required.includes('lastName')}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="error-message">
          <p>{error.error}</p>
          {error.details && (
            <ul>
              {error.details.map((detail, i) => (
                <li key={i}>
                  {detail.field}: {detail.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

### React Query Example

```typescript
// src/components/NewsletterFormQuery.tsx
import React, { useState } from 'react';
import { useSchemaQuery, useSubscribeMutation } from '../hooks/useKitProxyQuery';

export function NewsletterFormQuery() {
  const [email, setEmail] = useState('');
  const formId = 'newsletter-signup';

  const { data: schema } = useSchemaQuery(formId);
  const mutation = useSubscribeMutation(formId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    mutation.mutate({ email }, {
      onSuccess: () => {
        setEmail('');
      },
    });
  };

  if (mutation.isSuccess) {
    return <div>Successfully subscribed!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        disabled={mutation.isPending}
      />

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Subscribing...' : 'Subscribe'}
      </button>

      {mutation.isError && (
        <div className="error">
          {mutation.error instanceof Error
            ? mutation.error.message
            : 'Subscription failed'}
        </div>
      )}
    </form>
  );
}
```

## Error Handling

### Error Types

```typescript
// src/utils/errorHandler.ts
export class KitProxyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'KitProxyError';
  }
}

export function handleApiError(error: unknown): KitProxyError {
  if (error instanceof KitProxyError) {
    return error;
  }

  if (error instanceof Error) {
    return new KitProxyError(error.message);
  }

  return new KitProxyError('An unexpected error occurred');
}
```

### Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Form error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please refresh the page and try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary>
      <ContactForm />
    </ErrorBoundary>
  );
}
```

## Best Practices

### 1. Schema Caching

Cache schemas to reduce API calls:

```typescript
// src/utils/schemaCache.ts
const schemaCache = new Map<string, { schema: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedSchema(
  formId: string,
  fetcher: () => Promise<unknown>
) {
  const cached = schemaCache.get(formId);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.schema;
  }

  const schema = await fetcher();
  schemaCache.set(formId, { schema, timestamp: Date.now() });

  return schema;
}
```

### 2. Loading States

Always show loading states for better UX:

```typescript
{loading && <Spinner />}
{!loading && <FormContent />}
```

### 3. Request Debouncing

For real-time validation, debounce API calls:

```typescript
import { useCallback } from 'react';
import debounce from 'lodash.debounce';

const debouncedValidate = useCallback(
  debounce(async (value: string) => {
    // Validate against API
  }, 500),
  []
);
```

### 4. CORS Configuration

The backend automatically handles CORS with flexible configuration:

**Backend Configuration (already implemented in src/app.ts):**
- Supports specific origins: `https://myapp.vercel.app`
- Supports wildcards for PR previews: `https://*.vercel.app`, `https://*.railway.app`
- Allows all origins when `ALLOWED_ORIGINS` is not set (development mode)
- Always allows requests with no origin (Postman, mobile apps)

**Environment Variable Setup:**

```bash
# .env (Backend)

# Development - Allow all origins
# (Leave ALLOWED_ORIGINS empty or omit it)

# Production - Specific origins
ALLOWED_ORIGINS=https://myapp.vercel.app,https://myapp.railway.app

# Production with PR previews - Wildcards
ALLOWED_ORIGINS=http://localhost:3000,https://myapp.vercel.app,https://*.vercel.app,https://*.railway.app

# Local + Vercel + Railway (recommended)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://myapp.vercel.app,https://*.vercel.app,https://myapp.railway.app,https://*.railway.app
```

**How it works:**
- Comma-separated list of allowed origins
- Wildcard `*` matches any subdomain (perfect for PR previews)
- Automatically trims whitespace from origins
- Enables credentials for authenticated requests

### 5. Environment-Specific URLs

Use different API URLs per environment:

```bash
# .env.development
REACT_APP_API_URL=http://localhost:3000

# .env.production
REACT_APP_API_URL=https://kit-proxy.railway.app
```

### 6. Request Retry Logic

Implement retry for transient failures:

```typescript
async function fetchWithRetry(
  fn: () => Promise<Response>,
  retries = 3
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(fn, retries - 1);
    }
    throw error;
  }
}
```

## Testing

### Unit Tests with Jest

```typescript
// src/api/kitProxy.test.ts
import { kitProxy } from './kitProxy';

describe('KitProxyClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should fetch schema', async () => {
    const mockSchema = { type: 'object', properties: {} };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSchema,
    });

    const schema = await kitProxy.getSchema('test-form');
    expect(schema).toEqual(mockSchema);
  });

  it('should handle subscription', async () => {
    const mockResponse = { success: true, subscriberId: '123' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await kitProxy.subscribe('test-form', { email: 'test@example.com' });
    expect(result).toEqual(mockResponse);
  });
});
```

### Component Tests with React Testing Library

```typescript
// src/components/NewsletterForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewsletterForm } from './NewsletterForm';
import { kitProxy } from '../api/kitProxy';

jest.mock('../api/kitProxy');

describe('NewsletterForm', () => {
  it('should submit form successfully', async () => {
    const mockSubscribe = jest.fn().mockResolvedValue({
      success: true,
      message: 'Subscribed',
    });

    (kitProxy.subscribe as jest.Mock) = mockSubscribe;

    render(<NewsletterForm />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const submitButton = screen.getByText(/subscribe/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('newsletter-signup', {
        email: 'test@example.com',
      });
    });
  });
});
```

### E2E Tests with Playwright

```typescript
// e2e/newsletter.spec.ts
import { test, expect } from '@playwright/test';

test('newsletter subscription flow', async ({ page }) => {
  await page.goto('http://localhost:3000');

  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button:has-text("Subscribe")');

  await expect(page.locator('.success-message')).toBeVisible();
  await expect(page.locator('.success-message')).toContainText('subscribed');
});
```

## Troubleshooting

### CORS Errors

**Problem:** CORS policy blocking requests

**Solution:**

1. **Check Backend Environment Variables:**
   ```bash
   # Make sure ALLOWED_ORIGINS is set correctly in backend .env
   # For local development, you can leave it empty
   ALLOWED_ORIGINS=

   # For production with PR previews
   ALLOWED_ORIGINS=https://myapp.vercel.app,https://*.vercel.app,https://*.railway.app
   ```

2. **Common CORS Issues:**
   - **Frontend running on localhost:3000**: Add `http://localhost:3000` to `ALLOWED_ORIGINS`
   - **Vercel PR preview**: Use wildcard pattern `https://*.vercel.app`
   - **Railway PR preview**: Use wildcard pattern `https://*.railway.app`
   - **Mixed content**: Make sure both frontend and backend use HTTPS in production

3. **Debugging Steps:**
   ```javascript
   // Check browser console for CORS error details
   // Verify your frontend origin matches ALLOWED_ORIGINS
   console.log('Current origin:', window.location.origin);

   // Test backend health endpoint with curl
   curl -H "Origin: https://myapp.vercel.app" https://your-backend.railway.app/health -v
   ```

4. **Verify REACT_APP_API_URL:**
   ```bash
   # Frontend .env should point to backend
   REACT_APP_API_URL=https://your-backend.railway.app
   ```

### Network Timeout

**Problem:** Requests timing out

**Solution:**
```typescript
// Increase timeout in fetch/axios config
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

fetch(url, { signal: controller.signal });
```

### Schema Not Found

**Problem:** 404 errors for schema endpoint

**Solution:**
```typescript
// Verify formId matches schema filename in data/ directory
// Example: 'contact-form' → data/contact-form.schema.json
```

## Additional Resources

- [Kit Proxy Backend Documentation](./README.md)
- [OpenAPI Specification](./openapi.yaml)
- [JSON Schema Documentation](https://json-schema.org/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [ConvertKit API Reference](https://developers.convertkit.com/)

## Support

For issues or questions:
1. Check backend logs: `npm run dev` (backend)
2. Check browser console for errors
3. Verify environment variables are set
4. Test backend health: `GET /health`

## Version Compatibility

| Kit Proxy | React | TypeScript | Node.js |
|-----------|-------|------------|---------|
| 1.0.0     | 18+   | 5.0+       | 18+     |
