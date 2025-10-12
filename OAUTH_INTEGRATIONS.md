# OAuth Integrations Implementation

## Overview
Completed Google Workspace and QuickBooks OAuth integrations for the Construction ERP system.

## Backend Implementation

### Services Created
1. **Google Integration Service** (`/services/integrations/google.service.ts`)
   - OAuth 2.0 authentication flow
   - Calendar API: Create events with attendees
   - Drive API: Upload files to Google Drive
   - Gmail API: Send emails programmatically

2. **QuickBooks Integration Service** (`/services/integrations/quickbooks.service.ts`)
   - OAuth 2.0 with token refresh
   - Customer management
   - Invoice creation
   - Expense tracking
   - Automatic expense sync from ERP to QuickBooks

### API Routes (`/routes/integrations.routes.ts`)
- `GET /api/v1/integrations/me` - List user's connected integrations
- `GET /api/v1/integrations/google/auth` - Get Google OAuth URL
- `GET /api/v1/integrations/google/callback` - Handle Google OAuth callback
- `GET /api/v1/integrations/quickbooks/auth` - Get QuickBooks OAuth URL
- `GET /api/v1/integrations/quickbooks/callback` - Handle QuickBooks OAuth callback
- `POST /api/v1/integrations/google/calendar/event` - Create calendar event
- `POST /api/v1/integrations/google/drive/upload` - Upload file to Drive
- `POST /api/v1/integrations/google/gmail/send` - Send email via Gmail
- `POST /api/v1/integrations/quickbooks/customers` - Create QuickBooks customer
- `POST /api/v1/integrations/quickbooks/invoices` - Create QuickBooks invoice
- `POST /api/v1/integrations/quickbooks/expenses` - Create QuickBooks expense
- `POST /api/v1/integrations/quickbooks/sync-expenses` - Sync ERP expenses to QuickBooks
- `DELETE /api/v1/integrations/:provider` - Disconnect integration

### Database Schema
```prisma
model Integration {
  id           String              @id @default(cuid())
  userId       String
  provider     IntegrationProvider // GOOGLE | QUICKBOOKS
  accessToken  String
  refreshToken String?
  expiresAt    DateTime?
  metadata     Json?               // Store provider-specific data (e.g., realmId)
  isActive     Boolean             @default(true)
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@index([userId])
}
```

## Frontend Implementation

### Integrations Settings Page (`/app/settings/integrations/page.tsx`)
- View connected integrations
- Connect/disconnect Google Workspace
- Connect/disconnect QuickBooks
- Visual status badges for active connections

## Environment Variables Required

### Google OAuth
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/integrations/google/callback
```

### QuickBooks OAuth
```env
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3001/api/v1/integrations/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd apps/api
npm install googleapis intuit-oauth axios
```

### 2. Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs: Calendar API, Drive API, Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/v1/integrations/google/callback`
6. Copy Client ID and Client Secret to `.env`

### 3. Configure QuickBooks OAuth
1. Go to [QuickBooks Developer Portal](https://developer.intuit.com/)
2. Create a new app
3. Add redirect URI: `http://localhost:3001/api/v1/integrations/quickbooks/callback`
4. Copy Client ID and Client Secret to `.env`
5. Set environment to `sandbox` for testing

### 4. Run Database Migration
```bash
cd apps/api
npx prisma migrate dev
```

## Usage Examples

### Google Calendar Integration
```typescript
// Create a calendar event
const event = await fetch('/api/v1/integrations/google/calendar/event', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    summary: 'Project Meeting',
    description: 'Discuss project timeline',
    start: new Date('2025-10-15T10:00:00'),
    end: new Date('2025-10-15T11:00:00'),
    attendees: ['client@example.com', 'contractor@example.com'],
  }),
});
```

### QuickBooks Invoice Creation
```typescript
// Create an invoice
const invoice = await fetch('/api/v1/integrations/quickbooks/invoices', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerId: '123',
    lineItems: [
      { description: 'Labor', amount: 1000, quantity: 40 },
      { description: 'Materials', amount: 5000, quantity: 1 },
    ],
    dueDate: new Date('2025-11-01'),
  }),
});
```

### Sync Expenses to QuickBooks
```typescript
// Sync all unsynced expenses
const result = await fetch('/api/v1/integrations/quickbooks/sync-expenses', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
});
// Returns: { synced: 15, total: 15 }
```

## Features

### Google Workspace
- ✅ OAuth 2.0 authentication with offline access
- ✅ Create calendar events with attendees
- ✅ Upload files to Google Drive
- ✅ Send emails via Gmail
- ✅ Automatic token refresh

### QuickBooks
- ✅ OAuth 2.0 authentication with token refresh
- ✅ Create customers
- ✅ Create invoices with line items
- ✅ Create expenses
- ✅ Bulk sync expenses from ERP
- ✅ Sandbox and production environment support

## Security Considerations
- Access tokens encrypted in database
- Refresh tokens stored securely
- Token expiration handling with automatic refresh
- User-specific OAuth flows with state parameter
- HTTPS required in production

## Next Steps
1. Add more Google APIs (Sheets, Docs)
2. Add QuickBooks reports and queries
3. Implement webhook listeners for real-time sync
4. Add integration activity logs
5. Create automation workflows (e.g., auto-create invoice when project completes)
