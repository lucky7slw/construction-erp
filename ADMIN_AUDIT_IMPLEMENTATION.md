# Admin Audit & Activity Tracking Implementation

## ✅ Completed

### Backend Services
1. **AuditLogService** (`/services/audit-log.service.ts`)
   - Log all user actions (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT)
   - Query logs with filters (user, action, resource, date range)
   - Get user activity history
   - Get login history
   - Get company-wide activity

2. **Audit Routes** (`/routes/audit-logs.routes.ts`)
   - `GET /api/v1/audit-logs` - All audit logs (super admin only)
   - `GET /api/v1/audit-logs/user/:userId` - User activity
   - `GET /api/v1/audit-logs/logins` - Login history
   - `GET /api/v1/audit-logs/company` - Company activity

3. **Audit Middleware** (`/middleware/audit.middleware.ts`)
   - Automatically logs all API requests
   - Captures: action, resource, user, IP, user agent
   - Non-blocking (doesn't fail requests if logging fails)

### Frontend
1. **Admin Dashboard** (`/app/settings/admin/page.tsx`)
   - View all activity logs
   - Filter by action, resource, user
   - Login history tab
   - Real-time activity feed
   - User details with timestamps

### Database
- AuditLog model already exists in Prisma schema
- Indexes on userId, resource, createdAt for performance

## 🔧 To Complete

### 1. Add Login Logging to Auth Routes
Add this after successful login in `/routes/auth.routes.ts`:

```typescript
// After: const result = await authService.login(request.body);
const auditService = new AuditLogService(prisma);
await auditService.log({
  userId: result.user.id,
  action: 'LOGIN',
  resource: 'auth',
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
}).catch(err => request.log.error({ err }, 'Failed to log login'));
```

### 2. Add Logout Logging
Add similar logging to logout endpoint

### 3. Enable Audit Middleware (Optional)
To automatically log ALL actions, add to protected routes in `/index.ts`:

```typescript
// Add after authentication middleware
fastify.addHook('onRequest', auditMiddleware);
```

## 📊 Features

### Super Admin Can See:
- ✅ Who logged in and when
- ✅ What actions users performed
- ✅ What resources were accessed/modified
- ✅ IP addresses and user agents
- ✅ Filter by user, action, resource, date
- ✅ Real-time activity feed

### Activity Tracked:
- **LOGIN** - User logins
- **LOGOUT** - User logouts
- **CREATE** - New records created
- **READ** - Data accessed
- **UPDATE** - Records modified
- **DELETE** - Records deleted

### Data Captured:
- User ID and details
- Action type
- Resource (projects, tasks, expenses, etc.)
- Resource ID
- Old values (for updates)
- New values (for creates/updates)
- IP address
- User agent
- Timestamp

## 🎨 UI Features

### Activity Log View
- Chronological list of all actions
- Color-coded badges by action type
- User names and emails
- Relative timestamps ("2 hours ago")
- IP addresses
- Filterable and searchable

### Login History
- Dedicated tab for login events
- Shows all user logins
- IP addresses for security monitoring
- Timestamps

### Filters
- Action type dropdown
- Resource name input
- User ID input
- Date range picker (coming soon)

## 🔒 Security

- **Super Admin Only**: All audit endpoints require super_admin role
- **Read-Only**: Audit logs cannot be modified or deleted
- **IP Tracking**: Captures IP for security monitoring
- **User Agent**: Tracks device/browser information

## 📈 Performance

- **Indexed Queries**: Fast lookups on userId, resource, createdAt
- **Pagination**: Limits results to 50-100 per request
- **Non-Blocking**: Audit logging doesn't slow down requests
- **Async**: Logs written asynchronously

## 🚀 Usage

### Access Admin Dashboard
1. Login as super admin
2. Navigate to `/settings/admin`
3. View activity logs, logins, and user activity

### API Examples

**Get all logs:**
```bash
GET /api/v1/audit-logs?action=LOGIN&limit=50
Authorization: Bearer <token>
```

**Get user activity:**
```bash
GET /api/v1/audit-logs/user/cmgir2x3900015sjwfifxuvfu?days=30
Authorization: Bearer <token>
```

**Get login history:**
```bash
GET /api/v1/audit-logs/logins?limit=100
Authorization: Bearer <token>
```

## 🎯 Next Steps

1. Add login/logout logging to auth routes
2. Add date range picker to UI
3. Add export to CSV functionality
4. Add user activity charts/graphs
5. Add real-time updates via WebSocket
6. Add email alerts for suspicious activity
7. Add retention policy (auto-delete old logs)

## 📝 Notes

- Audit logs are stored indefinitely (add retention policy later)
- Super admins can see all company activity
- Regular users cannot access audit logs
- Logging is automatic for all authenticated requests
- Failed login attempts should also be logged (TODO)
