# Configuration Best Practices

This document explains configuration management in pullapod-cli and best practices for handling API credentials.

## Overview

The project supports two methods for configuration:
1. **.env files** (Recommended for development and production)
2. **Direct environment variables** (Useful for CI/CD and containers)

## Why .env Files?

Using `.env` files is considered a best practice because:

### ✅ **Security Benefits**
- **Never committed to git** - `.env` is in `.gitignore`
- **No accidental exposure** - Credentials stay on your machine
- **Easy to rotate** - Update credentials in one place
- **Environment isolation** - Different credentials per environment

### ✅ **Developer Experience**
- **Easy setup** - Copy `.env.example`, fill in credentials
- **Team onboarding** - New developers see what variables are needed
- **No shell configuration** - Works across terminals and sessions
- **IDE integration** - Many IDEs recognize and validate `.env` files

### ✅ **Production Ready**
- **12-Factor App compliant** - Separates config from code
- **Container friendly** - Works with Docker, Kubernetes secrets
- **CI/CD compatible** - Can be injected by deployment pipelines
- **Multiple environments** - `.env.development`, `.env.production`, etc.

## Setup Methods

### Method 1: Using .env Files (Recommended)

**Step 1: Create your .env file**
```bash
cp .env.example .env
```

**Step 2: Add your credentials**
```bash
# .env
PODCAST_INDEX_API_KEY=your-actual-api-key
PODCAST_INDEX_API_SECRET=your-actual-api-secret
```

**Step 3: Load in code**
```typescript
import { loadEnvFile, loadPodcastIndexConfig } from './config';

// Load .env file
loadEnvFile();

// Now environment variables are available
const config = loadPodcastIndexConfig();
```

**Important:** Never commit your `.env` file! It's in `.gitignore` for safety.

### Method 2: Direct Environment Variables

Useful for CI/CD, Docker, or system-wide configuration:

```bash
export PODCAST_INDEX_API_KEY="your-key"
export PODCAST_INDEX_API_SECRET="your-secret"
```

Then in code:
```typescript
import { loadPodcastIndexConfig } from './config';

// No need to call loadEnvFile()
const config = loadPodcastIndexConfig();
```

## Multiple Environments

You can maintain different `.env` files for different environments:

```bash
.env.development    # Local development
.env.staging        # Staging environment
.env.production     # Production (never commit!)
.env.test          # Testing with test credentials
```

Load the appropriate file:
```typescript
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

loadEnvFile(envFile);
```

## Docker & Containers

For Docker, you have two options:

**Option 1: Docker secrets (Recommended)**
```dockerfile
# docker-compose.yml
services:
  app:
    image: pullapod
    environment:
      - PODCAST_INDEX_API_KEY=${PODCAST_INDEX_API_KEY}
      - PODCAST_INDEX_API_SECRET=${PODCAST_INDEX_API_SECRET}
```

**Option 2: Env file in Docker**
```dockerfile
# docker-compose.yml
services:
  app:
    image: pullapod
    env_file:
      - .env
```

## CI/CD Pipelines

### GitHub Actions
```yaml
- name: Run tests
  env:
    PODCAST_INDEX_API_KEY: ${{ secrets.PODCAST_INDEX_API_KEY }}
    PODCAST_INDEX_API_SECRET: ${{ secrets.PODCAST_INDEX_API_SECRET }}
  run: npm test
```

### GitLab CI
```yaml
test:
  script:
    - npm test
  variables:
    PODCAST_INDEX_API_KEY: $PODCAST_INDEX_API_KEY
    PODCAST_INDEX_API_SECRET: $PODCAST_INDEX_API_SECRET
```

## Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] Never hardcode credentials in source code
- [ ] Never commit `.env` files
- [ ] Use `.env.example` to document required variables
- [ ] Rotate credentials if accidentally exposed
- [ ] Use different credentials per environment
- [ ] Limit credential permissions to minimum required
- [ ] Store production credentials in secure vault

## Available Configuration

### Podcast Index API

**Required:**
- `PODCAST_INDEX_API_KEY` - Your API key
- `PODCAST_INDEX_API_SECRET` - Your API secret

**Optional:**
- `PODCAST_INDEX_BASE_URL` - Override base URL (default: `https://api.podcastindex.org/api/1.0`)

## Error Handling

The configuration system will throw helpful errors:

```typescript
try {
  const config = loadPodcastIndexConfig();
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message);
    // Example: "Missing required environment variable: PODCAST_INDEX_API_KEY"
  }
}
```

## Testing

For tests, you can mock environment variables:

```typescript
describe('My Feature', () => {
  beforeEach(() => {
    process.env.PODCAST_INDEX_API_KEY = 'test-key';
    process.env.PODCAST_INDEX_API_SECRET = 'test-secret';
  });

  it('should work', () => {
    const config = loadPodcastIndexConfig();
    expect(config.apiKey).toBe('test-key');
  });
});
```

Or create a `.env.test` file:
```typescript
loadEnvFile('.env.test');
```

## Further Reading

- [The Twelve-Factor App - Config](https://12factor.net/config)
- [dotenv documentation](https://github.com/motdotla/dotenv)
- [Node.js Best Practices - Environment Variables](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)

## Summary

**Use .env files for:**
- Local development
- Team collaboration
- Multiple environments
- Easy credential management

**Use direct environment variables for:**
- CI/CD pipelines
- Production deployments
- Container orchestration
- System-wide configuration

Both methods are supported and work seamlessly together!
