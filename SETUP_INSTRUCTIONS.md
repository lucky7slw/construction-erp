# Setup Instructions for Testing

## Issues Fixed ✅

1. **Backend Logger**: Removed pino-pretty dependency
2. **Frontend Toast**: Added 'use client' directive to toast component

## Prerequisites

Before running the application, you need to start the required services:

### 1. PostgreSQL Database

**Option A: Using Docker** (Recommended)
```bash
docker run -d \
  --name hhhomespm-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=erp_development \
  -p 5432:5432 \
  postgres:16
```

**Option B: Local PostgreSQL**
- Ensure PostgreSQL is running on `localhost:5432`
- Database: `erp_development`
- User: `postgres`
- Password: `postgres`

### 2. Redis (Required for WebSocket and caching)

**Option A: Using Docker** (Recommended)
```bash
docker run -d \
  --name hhhomespm-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Option B: Local Redis**
- Ensure Redis is running on `localhost:6379`

### 3. Run Database Migrations

```bash
cd apps/api
npx prisma migrate deploy
```

## Starting the Application

### Terminal 1: Backend API
```bash
cd apps/api
npm run dev
```

**Expected Output**:
```
🚀 Construction ERP API server listening on http://0.0.0.0:3001
📚 API Documentation available at http://0.0.0.0:3001/docs
🏥 Health check available at http://0.0.0.0:3001/health
🔌 WebSocket server ready for connections
```

### Terminal 2: Frontend Web App
```bash
cd apps/web
npm run dev
```

**Expected Output**:
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
✓ Ready in 2.6s
```

## Testing the Authentication Flow

### 1. Registration
- Open http://localhost:3000/auth/register
- Fill in the form:
  - First Name: Test
  - Last Name: User
  - Email: test@example.com
  - Company Name: Test Company
  - Password: password123
  - Confirm Password: password123
- Click "Create account"
- Should redirect to http://localhost:3000/dashboard
- Check browser localStorage - should see auth tokens

### 2. Login
- Navigate to http://localhost:3000/auth/login
- Enter credentials:
  - Email: test@example.com
  - Password: password123
- Click "Sign in"
- Should redirect to dashboard
- Tokens should be in localStorage

### 3. Verify Token Persistence
- Refresh the page
- Should remain logged in
- Auth state restored from localStorage

### 4. Logout (when implemented)
- Click logout button
- Tokens cleared
- Redirected to login page

## Troubleshooting

### Backend won't start
**Error**: `Can't reach database server`
- **Solution**: Start PostgreSQL (see Prerequisites)

**Error**: `Redis connection refused`
- **Solution**: Start Redis (see Prerequisites)

### Frontend errors on /auth/register or /auth/login
**Error**: `Network error` or `Failed to fetch`
- **Solution**: Ensure backend is running on http://localhost:3001
- **Check**: Visit http://localhost:3001/health should return `{"status":"ok"}`

### "useState only works in Client Components"
- **Solution**: Already fixed - toast.tsx has 'use client' directive

### CORS errors
- **Solution**: Backend already configured to allow localhost:3000 in development

## Quick Start (All-in-One)

If you have Docker installed:

```bash
# Terminal 1: Start services
docker run -d --name hhhomespm-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=erp_development -p 5432:5432 postgres:16
docker run -d --name hhhomespm-redis -p 6379:6379 redis:7-alpine

# Terminal 2: Run migrations and start backend
cd apps/api
npx prisma migrate deploy
npm run dev

# Terminal 3: Start frontend
cd apps/web
npm run dev
```

Then visit:
- Frontend: http://localhost:3000
- Backend API Docs: http://localhost:3001/docs
- Health Check: http://localhost:3001/health

## Environment Variables

### Backend (.env)
Already configured in the repository root:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/erp_development
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (apps/web/.env.local)
Already created:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:3001/docs
- Interactive API documentation
- Test endpoints directly from browser

## Database Management

### View Database with Prisma Studio
```bash
cd apps/api
npx prisma studio
```
Opens http://localhost:5555 with database GUI

### Reset Database (Warning: Deletes all data)
```bash
cd apps/api
npx prisma migrate reset
```

## Next Steps After Testing

1. **Create Dashboard Page** - Replace placeholder with actual dashboard
2. **Add Protected Route Middleware** - Redirect unauthenticated users
3. **Implement Logout Button** - Add to header/sidebar
4. **Create Additional Features**:
   - Time Tracking UI
   - Projects List
   - Estimates Module

## Support

If you encounter issues:
1. Check backend logs in Terminal 1
2. Check frontend logs in Terminal 2
3. Check browser console for errors
4. Verify PostgreSQL and Redis are running
5. Check http://localhost:3001/health returns OK

---

**Status**: Ready for testing once PostgreSQL and Redis are running
**Frontend**: http://localhost:3000
**Backend**: http://localhost:3001
**API Docs**: http://localhost:3001/docs
