# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kit Proxy - A ConvertKit proxy backend service that provides JSON Schema validation endpoints without exposing API keys to the frontend.

### Architecture

- **TypeScript** with strict mode enabled
- **Express.js** REST API
- **Dependency Injection** pattern for repository layer
- **File-based storage** for schemas (data/ directory)
- **Chicago-style testing** (integration tests with real dependencies)

## Branching Strategy

### Branch Naming Convention

All Claude Code branches MUST follow this format:
```
claude/{descriptive-name}-{session-id}
```

Example: `claude/schema-api-backend-011CV2v9By8NdD63B5Us8wU6`

### Branch Requirements

- Always develop on feature branches, never directly on main
- Branch names must start with `claude/` prefix
- Use descriptive names that explain the feature/fix
- Include the session ID suffix for tracking

## Testing Requirements

### 100% Code Coverage - MANDATORY

This project requires **100% test coverage** at all times. Do NOT push any branch that fails this requirement.

#### Coverage Thresholds

```javascript
{
  branches: 100,
  functions: 100,
  lines: 100,
  statements: 100
}
```

#### Running Tests

```bash
# Run tests with coverage report
npm test

# Watch mode during development
npm run test:watch
```

#### Testing Philosophy

- **Chicago-style testing**: Use real dependencies, minimal mocking
- **Integration tests**: Test actual behavior with real file system
- **Test all branches**: Every code path must be tested
- **Edge cases**: Empty strings, whitespace, invalid input, file errors

#### Test Structure

```
src/
├── app.test.ts
├── repositories/
│   └── FileSchemaRepository.test.ts
├── routes/
│   └── schemaRoutes.test.ts
└── middleware/
    └── errorHandler.test.ts
```

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development server (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Production start
npm start

# Run tests with coverage
npm test

# Lint code
npm run lint
```

## Project Structure

```
kit-proxy/
├── data/                       # Schema JSON files ({formId}.schema.json)
├── src/
│   ├── repositories/          # Data access layer (injected)
│   ├── routes/                # Express routes
│   ├── middleware/            # Express middleware
│   ├── types/                 # TypeScript interfaces
│   ├── app.ts                 # Express app factory
│   └── index.ts               # Server entry point
├── package.json
├── tsconfig.json              # Strict TypeScript config
└── jest.config.js             # 100% coverage enforced
```

## Key Modules and Responsibilities

### Repository Layer (`src/repositories/`)

- **Interface**: `SchemaRepository` - Abstraction for data access
- **Implementation**: `FileSchemaRepository` - File-based storage
- **Pattern**: Dependency injection for easy testing and swapping

### Routes Layer (`src/routes/`)

- **schemaRoutes.ts**: REST endpoints for schema retrieval
- **Factory pattern**: Routes accept injected repository
- **Error handling**: Comprehensive validation and error responses

### API Endpoints

- `GET /api/schema/:formId` - Retrieve JSON Schema by form ID
- `GET /health` - Health check endpoint

## Development Workflow

### Before Committing

1. **Run tests**: `npm test` - Must show 100% coverage
2. **Check TypeScript**: `npm run build` - Must compile without errors
3. **Lint code**: `npm run lint` - Must pass linting rules

### When Adding New Code

1. **Write tests first** or alongside implementation
2. **Ensure all branches are covered**
3. **Test error conditions** and edge cases
4. **Verify 100% coverage** before committing

### Schema Files

Add new schemas to `data/` directory:
- Filename format: `{formId}.schema.json`
- Must be valid JSON
- Should follow JSON Schema draft-07 specification
- Include `$schema`, `type`, `properties`, and `required` fields

## Security Considerations

- **API keys**: Store in `.env`, never commit to repository
- **Backend only**: ConvertKit API key never exposed to frontend
- **Input validation**: All user inputs are validated before processing
- **Error messages**: Generic errors to avoid information leakage

## Code Style

- **TypeScript strict mode**: All type errors must be resolved
- **Async/await**: Preferred over raw promises
- **Early returns**: Use guard clauses for validation
- **Explicit return statements**: Always return from route handlers
- **No any types**: Avoid `any`, use proper typing

## Common Patterns

### Dependency Injection
```typescript
// Repository interface
interface SchemaRepository {
  getSchemaByFormId(formId: string): Promise<JSONSchema | null>;
}

// Factory accepts injected dependency
export function createSchemaRouter(schemaRepository: SchemaRepository): Router {
  // ...
}
```

### Error Handling
```typescript
try {
  // Validate input
  if (!formId || formId.trim() === '') {
    return res.status(400).json({ error: 'Invalid formId parameter' });
  }

  // Process request
  const result = await repository.getSchemaByFormId(formId);

  // Handle not found
  if (!result) {
    return res.status(404).json({ error: 'Schema not found' });
  }

  return res.status(200).json(result);
} catch (error) {
  return res.status(500).json({ error: 'Internal server error' });
}
```

## Remember

- **100% test coverage is non-negotiable**
- **Never push branches with failing tests**
- **Use Chicago-style testing (real dependencies)**
- **Always use dependency injection**
- **Keep API keys server-side only**
