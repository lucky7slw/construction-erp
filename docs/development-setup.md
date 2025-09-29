# Development Setup Guide

This guide will help you set up your local development environment for the Construction AI-ERP system.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js 20+ LTS** - [Download here](https://nodejs.org/)
- **pnpm 8+** - [Install guide](https://pnpm.io/installation)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download here](https://git-scm.com/)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hhhomespm
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   cp docker/development/.env.example docker/development/.env
   ```

4. **Start development services**
   ```bash
   pnpm docker:dev
   ```

5. **Wait for services to be healthy**
   ```bash
   # Check service status
   pnpm docker:dev:logs
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

Your applications will be available at:
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **MailHog (Email)**: http://localhost:8025
- **MinIO (File Storage)**: http://localhost:9091

## Project Structure

```
hhhomespm/
├── apps/
│   ├── api/          # Backend API service (Node.js/Express)
│   ├── web/          # Frontend web application (Next.js)
│   └── mobile/       # Mobile application (future)
├── packages/
│   ├── shared/       # Shared utilities and types
│   ├── database/     # Database schemas and migrations
│   └── ui/           # Shared UI components
├── tools/
│   ├── eslint-config/      # Shared ESLint configuration
│   └── typescript-config/  # Shared TypeScript configuration
├── docker/
│   ├── development/  # Development Docker configuration
│   └── production/   # Production Docker configuration
└── docs/             # Documentation
```

## Development Workflow

### 1. Starting Development

```bash
# Start all services (database, redis, etc.)
pnpm docker:dev

# Start development servers with hot reload
pnpm dev
```

### 2. Code Quality

The project enforces strict code quality standards:

```bash
# Run linting
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Check TypeScript types
pnpm type-check

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### 3. Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for specific package
pnpm test --filter @hhhomespm/shared
```

### 4. Building

```bash
# Build all applications
pnpm build

# Build specific application
pnpm build --filter @hhhomespm/api
```

## Environment Configuration

### Development Environment

The development environment uses Docker Compose to run supporting services:

- **PostgreSQL** (port 5432) - Main database
- **Redis** (port 6379) - Caching and sessions
- **MinIO** (ports 9000/9001) - S3-compatible file storage
- **MailHog** (ports 1025/8025) - Email testing

Default credentials are configured in `docker/development/.env.example`.

### Environment Variables

Key environment variables you should be aware of:

```bash
# Database
DATABASE_URL=postgresql://erp_user:erp_password@localhost:5432/erp_development
REDIS_URL=redis://:redis_password@localhost:6379

# Application
API_PORT=3001
WEB_PORT=3000
JWT_SECRET=dev-jwt-secret-change-in-production
ENCRYPTION_KEY=dev-encryption-key-32-chars-long

# External Services
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@erpdev.local
```

## Git Workflow

### Commit Message Format

We use conventional commits. Format: `type(scope): description`

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

Examples:
```bash
git commit -m "feat(api): add user authentication endpoints"
git commit -m "fix(web): resolve login form validation"
git commit -m "docs: update development setup guide"
```

### Pre-commit Hooks

The project uses Husky to run quality checks before commits:

- **Lint-staged**: Formats and lints changed files
- **Type checking**: Validates TypeScript types
- **Commit message**: Validates commit message format

If any check fails, the commit will be rejected.

## Package Management

We use pnpm workspaces for monorepo management:

```bash
# Install dependencies for all packages
pnpm install

# Add dependency to specific package
pnpm add --filter @hhhomespm/api express

# Add dev dependency to root
pnpm add -wD typescript

# Run script in specific package
pnpm --filter @hhhomespm/web dev
```

## Database Development

### Migrations

```bash
# Generate new migration
pnpm --filter @hhhomespm/database migration:generate

# Run migrations
pnpm --filter @hhhomespm/database migration:run

# Rollback migration
pnpm --filter @hhhomespm/database migration:rollback
```

### Seeds

```bash
# Run database seeds
pnpm --filter @hhhomespm/database seed:run
```

## Docker Commands

```bash
# Start development services
pnpm docker:dev

# Stop development services
pnpm docker:dev:down

# View service logs
pnpm docker:dev:logs

# Rebuild services
pnpm docker:dev:down && pnpm docker:dev
```

## Debugging

### API Debugging

The API includes development-friendly features:

- **Detailed error messages** in development mode
- **Request/response logging** with Winston
- **Health check endpoint**: http://localhost:3001/health

### Database Debugging

- **pgAdmin**: Access database via Docker if needed
- **Query logging**: Enabled in development mode
- **Database health check**: Monitor via Docker health checks

## IDE Setup

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint"
  ]
}
```

### Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.workingDirectories": ["apps/*", "packages/*"],
  "typescript.preferences.typescript.suggest.autoImports": "on"
}
```

## Troubleshooting

### Common Issues

1. **Docker services not starting**
   ```bash
   # Reset Docker environment
   pnpm docker:dev:down
   docker system prune -f
   pnpm docker:dev
   ```

2. **pnpm install fails**
   ```bash
   # Clear pnpm cache
   pnpm store prune
   rm -rf node_modules
   pnpm install
   ```

3. **TypeScript errors after dependency changes**
   ```bash
   # Restart TypeScript server in VS Code
   # Or run type check manually
   pnpm type-check
   ```

4. **Database connection issues**
   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres

   # Check logs
   pnpm docker:dev:logs postgres
   ```

### Performance Tips

- Use `pnpm dev` instead of starting services individually
- Keep Docker Desktop running for faster service startup
- Use `--filter` flag for package-specific operations
- Enable TypeScript incremental compilation

## Getting Help

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Create GitHub issues for bugs or feature requests
- **Code Review**: All changes require peer review before merging

## Next Steps

After completing the setup:

1. **Explore the codebase**: Start with `apps/api/src/index.ts` and `apps/web/pages/index.tsx`
2. **Run the test suite**: Ensure everything works with `pnpm test`
3. **Make a test change**: Try modifying a component and see hot reload in action
4. **Check code quality**: Run `pnpm lint` and `pnpm type-check`

Welcome to the team! 🚀