# Kit Proxy

A ConvertKit proxy backend with JSON Schema validation. This service provides a secure API for managing form schemas without exposing API keys to the frontend.

## Features

- **JSON Schema API**: Retrieve form validation schemas by form ID
- **File-based Repository**: Store schemas as JSON files with dependency injection pattern
- **100% Test Coverage**: Comprehensive Chicago-style integration tests
- **TypeScript**: Fully typed with strict mode enabled
- **Security**: API keys are kept server-side, never exposed to frontend

## Architecture

### Dependency Injection
The application uses dependency injection for the schema repository, making it easy to swap implementations:

```typescript
interface SchemaRepository {
  getSchemaByFormId(formId: string): Promise<JSONSchema | null>;
}
```

### File-based Repository
Schemas are stored in the `data/` directory as `{formId}.schema.json` files.

## API Endpoints

### GET /api/schema/:formId

Retrieve a JSON Schema for a specific form.

**Parameters:**
- `formId` (string): The form identifier

**Response:**
- `200 OK`: Returns the JSON Schema
- `400 Bad Request`: Invalid or empty formId
- `404 Not Found`: Schema not found for the given formId
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/schema/contact-form
```

**Response:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    },
    "firstName": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": ["email", "firstName"]
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Setup

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
PORT=3000
CONVERTKIT_API_KEY=your_api_key_here
NODE_ENV=development
DATA_DIR=./data
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Testing

Run tests with coverage:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Schema Files

Add schema files to the `data/` directory:

**Example: `data/contact-form.schema.json`**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "description": "Email address"
    },
    "firstName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "First name"
    }
  },
  "required": ["email", "firstName"],
  "additionalProperties": false
}
```

## Project Structure

```
kit-proxy/
├── data/                      # Schema files
│   ├── contact-form.schema.json
│   └── newsletter-signup.schema.json
├── src/
│   ├── repositories/          # Data access layer
│   │   └── FileSchemaRepository.ts
│   ├── routes/                # API routes
│   │   └── schemaRoutes.ts
│   ├── middleware/            # Express middleware
│   │   └── errorHandler.ts
│   ├── types/                 # TypeScript types
│   │   └── schema.ts
│   ├── app.ts                 # Express app factory
│   └── index.ts               # Server entry point
└── tests/                     # Integration tests
```

## Development Notes

- **Chicago-style Testing**: Tests use real dependencies rather than extensive mocking
- **100% Coverage**: All code paths are tested
- **Type Safety**: Full TypeScript strict mode
- **Security**: ConvertKit API key stays on server, never sent to frontend
