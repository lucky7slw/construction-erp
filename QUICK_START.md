# 🚀 Quick Start Guide - Construction ERP

## 🔐 **LOGIN CREDENTIALS (After Seeding)**

### **Recommended: Company Admin**
- **Email**: `admin@democonstruction.com`
- **Password**: `CompanyAdmin123!`
- **Access**: Full company management, all features

### **Manager Account**
- **Email**: `manager@democonstruction.com`
- **Password**: `Manager123!`
- **Access**: Project and team management

### **Employee Account**
- **Email**: `employee@democonstruction.com`
- **Password**: `Employee123!`
- **Access**: Time tracking, basic operations

---

## 📋 **Quick Setup Steps**

### **Option A: Use Existing Seed Data (RECOMMENDED)**

If you just seeded the database, everything is ready! Just:

```bash
# Make sure services are running
pnpm dev
```

Then open http://localhost:3000 and login with credentials above ☝️

### **Option B: Fresh Start**

#### Step 1: Start Docker Desktop
1. Open **Docker Desktop** on Windows
2. Wait for "Docker Desktop is running"

#### Step 2: Start Database Services
```bash
# Start PostgreSQL
docker run -d --name hhhomespm-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=erp_development -p 5432:5432 postgres:16

# Start Redis
docker run -d --name hhhomespm-redis -p 6379:6379 redis:7-alpine
```

#### Step 3: Seed the Database
```bash
pnpm --filter @hhhomespm/api prisma db seed
```

This creates:
- ✅ 4 test users with different roles
- ✅ 1 demo company
- ✅ 2 sample projects
- ✅ 2 customers, 1 supplier
- ✅ Sample time entries and expenses

#### Step 4: Start Everything
```bash
pnpm dev
```

This starts:
- 🌐 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:3001
- 📚 API Docs: http://localhost:3001/docs

#### Step 5: Login
Open http://localhost:3000 and use Company Admin credentials above!

## If Something Goes Wrong

### Docker Desktop not running
**Error**: `The system cannot find the file specified`
**Solution**: Start Docker Desktop and wait for it to fully start

### Port already in use
**Error**: `port is already allocated`
**Solution**: Stop the existing container:
```bash
docker stop hhhomespm-postgres
docker stop hhhomespm-redis
docker rm hhhomespm-postgres
docker rm hhhomespm-redis
```
Then start them again (Step 2)

### Can't connect to database
**Error**: `Can't reach database server`
**Solution**: Make sure PostgreSQL container is running:
```bash
docker ps | grep postgres
```

### Redis connection refused
**Error**: `Redis connection refused`
**Solution**: Make sure Redis container is running:
```bash
docker ps | grep redis
```

## Stop Everything

When you're done testing:

```bash
# Stop frontend (Ctrl+C in the terminal)
# Stop backend (Ctrl+C in the terminal)

# Stop Docker containers
docker stop hhhomespm-postgres hhhomespm-redis
```

## Start Again Later

Next time you want to start:

```bash
# Start existing containers
docker start hhhomespm-postgres hhhomespm-redis

# Start backend
cd apps/api && npm run dev

# Start frontend (in another terminal)
cd apps/web && npm run dev
```

---

## Summary

**Before anything:**
1. ✅ Start Docker Desktop

**First time setup:**
2. ✅ Run PostgreSQL container
3. ✅ Run Redis container
4. ✅ Run database migrations
5. ✅ Start backend
6. ✅ Start frontend
7. ✅ Test at http://localhost:3000/auth/register

**Every time after:**
- `docker start hhhomespm-postgres hhhomespm-redis`
- `cd apps/api && npm run dev`
- `cd apps/web && npm run dev` (in another terminal)
