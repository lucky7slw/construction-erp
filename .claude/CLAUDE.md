# CLAUDE.md

> Think carefully and implement the most concise solution that changes as little code as possible.

## USE SUB-AGENTS FOR CONTEXT OPTIMIZATION

### 1. Always use the file-analyzer sub-agent when asked to read files.
The file-analyzer agent is an expert in extracting and summarizing critical information from files, particularly log files and verbose outputs. It provides concise, actionable summaries that preserve essential information while dramatically reducing context usage.

### 2. Always use the code-analyzer sub-agent when asked to search code, analyze code, research bugs, or trace logic flow.

The code-analyzer agent is an expert in code analysis, logic tracing, and vulnerability detection. It provides concise, actionable summaries that preserve essential information while dramatically reducing context usage.

### 3. Always use the test-runner sub-agent to run tests and analyze the test results.

Using the test-runner agent ensures:

- Full test output is captured for debugging
- Main conversation stays clean and focused
- Context usage is optimized
- All issues are properly surfaced
- No approval dialogs interrupt the workflow

## Philosophy

### Error Handling

- **Fail fast** for critical configuration (missing text model)
- **Log and continue** for optional features (extraction model)
- **Graceful degradation** when external services unavailable
- **User-friendly messages** through resilience layer

### Testing

- Always use the test-runner agent to execute tests.
- Do not use mock services for anything ever.
- Do not move on to the next test until the current test is complete.
- If the test fails, consider checking if the test is structured correctly before deciding we need to refactor the codebase.
- Tests to be verbose so we can use them for debugging.


## Tone and Behavior

- Criticism is welcome. Please tell me when I am wrong or mistaken, or even when you think I might be wrong or mistaken.
- Please tell me if there is a better approach than the one I am taking.
- Please tell me if there is a relevant standard or convention that I appear to be unaware of.
- Be skeptical.
- Be concise.
- Short summaries are OK, but don't give an extended breakdown unless we are working through the details of a plan.
- Do not flatter, and do not give compliments unless I am specifically asking for your judgement.
- Occasional pleasantries are fine.
- Feel free to ask many questions. If you are in doubt of my intent, don't guess. Ask.

## ABSOLUTE RULES:

- NO PARTIAL IMPLEMENTATION
- NO SIMPLIFICATION : no "//This is simplified stuff for now, complete implementation would blablabla"
- NO CODE DUPLICATION : check existing codebase to reuse functions and constants Read files before writing new functions. Use common sense function name to find them easily.
- NO DEAD CODE : either use or delete from codebase completely
- IMPLEMENT TEST FOR EVERY FUNCTIONS
- NO CHEATER TESTS : test must be accurate, reflect real usage and be designed to reveal flaws. No useless tests! Design tests to be verbose so we can use them for debuging.
- NO INCONSISTENT NAMING - read existing codebase naming patterns.
- NO OVER-ENGINEERING - Don't add unnecessary abstractions, factory patterns, or middleware when simple functions would work. Don't think "enterprise" when you need "working"
- NO MIXED CONCERNS - Don't put validation logic inside API handlers, database queries inside UI components, etc. instead of proper separation
- NO RESOURCE LEAKS - Don't forget to close database connections, clear timeouts, remove event listeners, or clean up file handles

## WebSocket Development Learnings

### Socket.io with Fastify Integration
When integrating Socket.io with Fastify:
- Create a separate HTTP server: `const httpServer = createServer(server.server)`
- Socket.io attaches to the HTTP server, not Fastify directly
- Use `httpServer.listen()` instead of `server.listen()`
- Both Fastify and Socket.io run on the same port
- Graceful shutdown must close both Socket.io and Fastify

### Redis Adapter Setup
For horizontal scaling with Socket.io:
- Use `@socket.io/redis-adapter` package (not deprecated `socket.io-redis`)
- Create two Redis client instances: one for pub, one for sub
- Call `.connect()` on both before creating adapter
- Redis must be running for WebSocket tests to pass
- Adapter enables multi-server deployments with shared state

### Testing WebSocket Services
Key testing patterns discovered:
- Use real Prisma and Redis instances (no mocks per project guidelines)
- Random ports prevent test conflicts: `3002 + Math.floor(Math.random() * 1000)`
- Track test users in array, cleanup in `afterEach`
- Use `setTimeout()` fallbacks for async events to prevent hanging tests
- Socket.io client connection is asynchronous - always await `connect` event
- Memory leak testing: compare heap before/after, expect <50MB increase

### Authentication Patterns
WebSocket authentication best practices:
- Pass JWT in `auth` option during connection: `socket.io('url', { auth: { token } })`
- Validate token in middleware before connection completes
- Attach user payload to socket: `(socket as any).user = payload`
- Reject connection early if invalid token (cleaner than post-connection errors)
- Reuse existing `AuthService.validateAccessToken()` - no duplicate logic

### Event Organization
Effective WebSocket event structure:
- Use namespaced events: `project:updated`, `expense:approved`, `user:online`
- Separate room types: `user_${userId}` for personal, `company_${companyId}` for shared
- Broadcast to rooms, not individual sockets (scales better)
- Track multiple sockets per user (multiple devices/tabs)
- User goes offline only when last socket disconnects

### Conflict Resolution Implementation
Version-based conflict detection:
- Store document/resource versions in memory: `Map<string, { version, data, timestamp }>`
- Detect conflict: incoming version === stored version (concurrent edit)
- Resolve with timestamp comparison (last-write-wins)
- Emit conflict event to client with original, incoming, and resolved values
- Increment version on successful update
- Simple and effective for most ERP use cases

### Offline Message Queue
Redis-based message queuing:
- Queue key: `ws:queue:${userId}`
- Store as JSON string with event name, data, and timestamp
- Set 24-hour TTL on queue: `redis.expire(key, 86400)`
- Deliver all queued messages on reconnect
- Clear queue after successful delivery
- Use `redis.rpush()` for FIFO order

### Presence Tracking
Simple Redis-based presence:
- Presence key: `ws:presence:${userId}`
- Set with TTL on connect: `redis.setex(key, 300, timestamp)`
- Delete on disconnect: `redis.del(key)`
- Check presence: `redis.exists(key)`
- 5-minute TTL handles crashed connections gracefully
- Emit `user:online`/`user:offline` events to all

### Type Safety with WebSockets
TypeScript patterns for WebSocket events:
- Define event map interface with all event types
- Use Zod schemas for event payloads
- Separate client and server event types
- Type-safe emit: `socket.emit<K extends keyof EventMap>(event, data)`
- Export types for frontend use
- Validate incoming data with Zod at runtime boundaries

### Production Considerations Learned
Critical items for production WebSocket deployment:
- SSL/TLS required (`wss://` not `ws://`)
- Sticky sessions OR Redis adapter (we implemented Redis adapter)
- Health check endpoint for monitoring
- Graceful shutdown to prevent message loss
- Rate limiting per IP/connection
- Memory monitoring (connections are long-lived)
- CORS configuration must match frontend origins
- Heartbeat prevents dead connections (ping/pong)

### Common Pitfalls Avoided
Issues to watch out for:
- Don't create new PrismaClient in tests - reuse existing instance
- Don't call `redis.quit()` on shared instance in tests
- Don't forget to close clients in test cleanup
- Don't use `socket.rooms` directly - use `socket.join(room)`
- Don't emit to socket that sent event - use `socket.broadcast`
- Don't block event loop - offload heavy processing
- Don't store large data in memory - use Redis
- Don't forget to handle reconnection on client side

### Documentation Importance
What to document for WebSocket systems:
- Client integration guide with code examples
- Event catalog with payloads and use cases
- Connection setup (auth, reconnection, error handling)
- Performance characteristics and limitations
- Security considerations and best practices
- Troubleshooting guide for common issues
- Production deployment checklist
- Monitoring metrics to track

## Prisma Migration Learnings

### Failed Migration Recovery
When Prisma migrations fail or database is in inconsistent state:
- **Don't try to fix migrations piecemeal** - leads to more issues
- **Check migration status first**: `pnpm prisma migrate status`
- **Mark failed migrations as rolled back**: `pnpm prisma migrate resolve --rolled-back <migration_name>`
- **If enums/tables partially exist**: Database reset is cleanest approach
- **Use PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION env var** for reset operations

### Database Reset Strategy
For development databases in corrupted migration state:
1. Confirm it's a development database (check database name)
2. Delete all migration files: `rm -rf prisma/migrations && mkdir migrations`
3. Reset database: `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" pnpm prisma migrate reset --force`
4. Generate Prisma client: `pnpm prisma generate`
5. Create fresh initial migration: `pnpm prisma migrate dev --name initial_schema`

### Windows File Lock Issues
When Prisma client generation fails with EPERM errors:
- Kill all Node.js processes before regenerating client
- Ensure API server is stopped before running migrations
- Windows locks `.dll.node` files that are in use
- Use `taskkill` or shutdown gracefully before Prisma operations

### Migration Patterns
Best practices discovered:
- **One clean migration better than many partial ones**
- **Test endpoints after migration** to verify schema changes applied
- **Document what each migration adds** for future reference
- **Include all related models in one migration** (e.g., RFI + Submittal together)
- **Use descriptive migration names**: `add_rfi_submittal_models` not just `update_schema`

### Auto-Generated Identifiers Pattern
Implemented consistent pattern across all project management features:
```typescript
const count = await prisma.model.count({
  where: { projectId: request.body.projectId },
});
const identifier = `PREFIX-${String(count + 1).padStart(4, '0')}`;
// Results: RFI-0001, CO-0001, PO-0001, etc.
```

### Project Access Verification Pattern
Standard pattern for all project-related routes:
```typescript
const project = await prisma.project.findFirst({
  where: {
    id: projectId,
    OR: [
      { createdById: request.user.id },
      { users: { some: { userId: request.user.id } } },
    ],
  },
});

if (!project) {
  return reply.code(404).send({ error: 'Project not found' });
}
```

### React Query Hook Patterns
Consistent patterns for all data fetching hooks:
- **Query key includes params**: `['rfis', { projectId, status }]`
- **Invalidate on mutation success**: `queryClient.invalidateQueries({ queryKey: ['rfis', { projectId }] })`
- **Convert dates to ISO**: `dueDate: data.dueDate?.toISOString()`
- **Type all responses**: `return response.data.rfi as RFI`

### React Query Cache Invalidation Issues
**UNRESOLVED ISSUE**: Lead creation successful but UI shows "no lead found" after creation.

**Symptoms**:
- Backend successfully creates lead (POST /api/v1/crm/leads returns 201)
- No errors in server logs or frontend console
- UI displays "no lead found" message despite data existing

**Attempted fix**:
- Changed `useCreateLead` mutation from specific invalidation `queryClient.invalidateQueries({ queryKey: ['leads', { companyId: variables.companyId }] })` to broad invalidation `queryClient.invalidateQueries({ queryKey: ['leads'] })`
- Issue persists despite invalidation pattern matching `useUpdateLead`

**Possible causes to investigate**:
1. React Query cache not properly invalidating (verify with React Query DevTools)
2. Query parameters mismatch between mutation and query (status: undefined not matching)
3. Timing issue - UI rendering before cache invalidation completes
4. Empty state logic incorrectly showing despite data present
5. Authorization issue preventing GET /api/v1/crm/leads from returning data

**Files involved**:
- `apps/web/src/hooks/useCRM.ts` - useCreateLead mutation (line 202-215)
- `apps/web/src/app/(dashboard)/leads/page.tsx` - Leads list component (line 45-48, 167-174)

**Next debugging steps**:
- Add React Query DevTools to inspect cache state
- Add console.log to mutation onSuccess to verify it fires
- Check network tab to confirm GET request fires after POST
- Verify GET request includes proper companyId and auth headers

### Project Detail Pages - Missing UI Interactions
**CRITICAL ISSUE**: All project detail pages have non-functional CTAs (Call-To-Action buttons).

**Current State**:
- Backend API routes exist and work (Budget, Team, RFIs, Submittals, Change Orders, etc.)
- React Query hooks exist for data fetching and mutations
- Frontend pages display data correctly using hooks
- **ALL action buttons are placeholders without functionality**

**Missing Components & Functionality**:

Each project detail page needs the following implemented:

1. **Dialog/Modal Components** for forms:
   - Create/Add dialogs
   - Edit dialogs
   - Delete confirmation dialogs
   - File upload dialogs

2. **Form Components** with:
   - Zod validation schemas
   - React Hook Form integration
   - Error handling
   - Loading states

3. **Button onClick Handlers** to:
   - Open dialogs
   - Trigger mutations
   - Handle success/error states

4. **Integration** with existing React Query hooks:
   - Call mutation hooks from forms
   - Invalidate queries on success
   - Show toast notifications

**Examples of Non-Functional Buttons**:
- `apps/web/src/app/projects/[id]/budget/page.tsx` line 187-190: "Add Line Item" button
- `apps/web/src/app/projects/[id]/budget/page.tsx` line 304-307: "Export Report" button
- `apps/web/src/app/projects/[id]/team/page.tsx` line 113-116: "Invite Member" button
- `apps/web/src/app/projects/[id]/team/page.tsx` line 281-291: Edit, Delete buttons
- Similar issues across ALL project detail pages

**Pattern to Implement**:
```typescript
// Example for Budget page "Add Line Item" button
const [addDialogOpen, setAddDialogOpen] = useState(false);
const createLineItem = useCreateBudgetLineItem();

// In JSX:
<Button onClick={() => setAddDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Add Line Item
</Button>

<Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
  <DialogContent>
    <BudgetLineItemForm
      onSubmit={async (data) => {
        await createLineItem.mutateAsync(data);
        setAddDialogOpen(false);
      }}
    />
  </DialogContent>
</Dialog>
```

**Scope of Work**:
All project detail pages need this treatment:
- `/projects/[id]/budget` - Add/Edit line items
- `/projects/[id]/team` - Invite/Edit/Remove members
- `/projects/[id]/tasks` - Create/Edit/Delete tasks
- `/projects/[id]/files` - Upload/Delete files
- `/projects/[id]/rfis` - Create/Edit RFIs
- `/projects/[id]/submittals` - Create/Edit submittals
- `/projects/[id]/change-orders` - Create/Edit change orders
- `/projects/[id]/purchase-orders` - Create/Edit POs
- `/projects/[id]/invoices` - Create/Edit invoices
- `/projects/[id]/bids` - Create/Edit bids
- `/projects/[id]/estimates` - Create/Edit estimates
- `/projects/[id]/takeoffs` - Create/Edit takeoffs
- `/projects/[id]/selections-tracker` - Create/Edit selections
- `/projects/[id]/mood-boards` - Create/Edit mood boards
- `/projects/[id]/floor-plans` - Upload/Delete floor plans
- `/projects/[id]/photos` - Upload/Delete photos
- `/projects/[id]/documents` - Upload/Delete documents
- `/projects/[id]/time-expenses` - Log time/expenses
- `/projects/[id]/daily-logs` - Create daily logs

**Priority**: HIGH - This blocks all project management functionality

### Route Registration Pattern
All routes registered in `apps/api/src/index.ts`:
```typescript
await fastify.register(routeHandler, {
  prefix: '/endpoint',
  prisma
});
```

### Testing Endpoints Without Auth
Quick verification pattern using curl:
```bash
curl -X GET "http://localhost:3001/api/v1/endpoint?param=value" 2>&1 | grep -o '"error":"Unauthorized"'
```
- If returns 401 Unauthorized: ✅ Route registered and auth middleware working
- If returns 404: ❌ Route not registered
- If returns 500: ❌ Server error, check logs

### Prisma Relations and Data Completeness
**CRITICAL**: Always include relations when fetching data to avoid missing information issues.

**Issue encountered**: Lead data was missing company information because queries didn't include the relation.

**Pattern to follow**:
```typescript
// ❌ WRONG - Missing relations
const leads = await prisma.lead.findMany({
  where: { companyId },
  orderBy: { createdAt: 'desc' },
});
// Result: Leads have companyId but no company details

// ✅ CORRECT - Include necessary relations
const leads = await prisma.lead.findMany({
  where: { companyId },
  orderBy: { createdAt: 'desc' },
  include: {
    company: {
      select: { id: true, name: true },
    },
    assignedTo: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  },
});
// Result: Leads include full company and user information
```

**Frontend TypeScript types must match**:
```typescript
export interface Lead {
  id: string;
  companyId: string;
  // ... other fields
  company?: {  // Optional because included via Prisma relation
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
```

**Key learnings**:
- Always review schema relations when implementing new features
- Include relations that will be displayed in the UI
- Use `select` to limit fields and avoid over-fetching
- Make relation fields optional in TypeScript types (`?`)
- Test with actual data to verify all information displays correctly

### Prisma Custom Client Path
**CRITICAL**: When using custom Prisma client output path, all imports must use the correct path.

**Issue encountered**: "Cannot convert undefined or null to object" error when using Zod with Prisma enums because enums were imported from wrong path.

**The setup**:
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"  // Custom path!
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  // ...
}
```

**Wrong import** (causes "cannot convert undefined or null to object"):
```typescript
import { LeadStatus, LeadSource } from '@prisma/client';  // ❌ WRONG

const schema = z.object({
  status: z.nativeEnum(LeadStatus),  // LeadStatus is undefined!
});
```

**Correct import**:
```typescript
import { LeadStatus, LeadSource } from '../generated/prisma';  // ✅ CORRECT

const schema = z.object({
  status: z.nativeEnum(LeadStatus),  // LeadStatus is properly imported
});
```

**Key points**:
- If Prisma client has custom `output` path, NEVER use `@prisma/client`
- Always import from the custom path (e.g., `../generated/prisma`)
- Error "cannot convert undefined or null to object" in Zod enum = wrong Prisma import
- Check ALL files that import Prisma types when changing client path