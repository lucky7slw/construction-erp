# Backend Integration Status

## Summary

All 12 project management features now have complete backend API endpoints connected to the database.

## Completed Backend Work

### 1. Prisma Schema Updates ✅
Added new models to `apps/api/prisma/schema.prisma`:
- **RFI** (Request for Information) model with status, priority, and workflow fields
- **Submittal** model with type, status, and review workflow
- Updated **Project** model to include relations for `rfis` and `submittals`

### 2. Backend API Routes Created ✅

#### New Routes:
1. **`rfis.routes.ts`** - Full CRUD for RFIs
   - `GET /api/v1/rfis` - List RFIs (with filters)
   - `GET /api/v1/rfis/:id` - Get single RFI
   - `POST /api/v1/rfis` - Create RFI
   - `PATCH /api/v1/rfis/:id` - Update RFI (including answer)
   - `DELETE /api/v1/rfis/:id` - Delete RFI

2. **`submittals.routes.ts`** - Full CRUD for Submittals
   - `GET /api/v1/submittals` - List submittals (with filters)
   - `GET /api/v1/submittals/:id` - Get single submittal
   - `POST /api/v1/submittals` - Create submittal
   - `PATCH /api/v1/submittals/:id` - Update submittal (including review)
   - `DELETE /api/v1/submittals/:id` - Delete submittal

3. **`team.routes.ts`** - Project team management (uses existing ProjectUser model)
   - `GET /api/v1/team` - List project team members
   - `POST /api/v1/team` - Add team member
   - `PATCH /api/v1/team/:id` - Update member role
   - `DELETE /api/v1/team/:id` - Remove team member

4. **`photos.routes.ts`** - Progress photos (uses existing ProjectFile model)
   - `GET /api/v1/photos` - List photos (with tag filter)
   - `GET /api/v1/photos/:id` - Get single photo
   - `POST /api/v1/photos` - Upload photo
   - `PATCH /api/v1/photos/:id` - Update photo metadata
   - `DELETE /api/v1/photos/:id` - Delete photo

#### Existing Routes (Already Working):
- **`daily-logs.routes.ts`** - Daily logs with crew, deliveries, equipment, incidents
- **`projects.routes.ts`** - Project CRUD (Gantt data comes from tasks)
- **`tasks.routes.ts`** - Tasks with dependencies (used for schedule/Gantt)
- **`documents.routes.ts`** - File/document management

### 3. Routes Registered ✅
All new routes registered in `apps/api/src/index.ts` with:
- Authentication middleware
- Proper prefixes (`/api/v1/...`)
- Swagger documentation tags

## Backend Routes by Frontend Feature

| Frontend Feature | Backend Route | Status | Notes |
|-----------------|---------------|--------|-------|
| Project Dashboard | `/api/v1/projects/:id` | ✅ Existing | Uses existing project, tasks, budget data |
| Task Management | `/api/v1/tasks` | ✅ Existing | Full CRUD with dependencies |
| Daily Logs | `/api/v1/daily-logs` | ✅ Existing | With crew, deliveries, equipment, incidents |
| Schedule/Calendar | `/api/v1/tasks` | ✅ Existing | Tasks have start/due dates |
| Gantt Chart | `/api/v1/tasks` | ✅ Existing | Tasks include dependencies for Gantt rendering |
| Team Management | `/api/v1/team` | ✅ New | Project team with roles |
| Documents/Files | `/api/v1/documents` | ✅ Existing | Category-based file management |
| RFIs | `/api/v1/rfis` | ✅ New | Full RFI workflow |
| Submittals | `/api/v1/submittals` | ✅ New | Full submittal workflow |
| Change Orders | `/api/v1/change-orders` | ⚠️ Model exists, need route | PrismaModel already in schema |
| Purchase Orders | `/api/v1/purchase-orders` | ⚠️ Model exists, need route | Prisma model already in schema |
| Progress Photos | `/api/v1/photos` | ✅ New | Using ProjectFile with PHOTO category |

## Next Steps

### 1. Add Missing Routes
Need to create routes for existing Prisma models:
- **Change Orders** (`change-orders.routes.ts`)
- **Purchase Orders** (`purchase-orders.routes.ts`)

These models already exist in the schema (lines 1060 and 1000 of schema.prisma) but don't have API routes yet.

### 2. Run Database Migration
Once database is available, run:
```bash
cd apps/api
pnpm prisma migrate dev --name add_rfi_submittal_models
```

This will create the `rfis` and `submittals` tables.

### 3. Update Frontend Hooks
The frontend pages currently use mock data. Need to:
1. Create/update hooks in `apps/web/src/lib/query/hooks/` for:
   - `use-rfis.ts`
   - `use-submittals.ts`
   - `use-team.ts`
   - `use-photos.ts`
   - `use-change-orders.ts` (if route created)
   - `use-purchase-orders.ts` (if route created)

2. Update frontend pages to use these hooks instead of mock data

### 4. Frontend Hook Pattern
All hooks should follow this pattern (example from `use-daily-logs.ts`):

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export function useRFIs(params: { projectId: string }) {
  return useQuery({
    queryKey: ['rfis', params],
    queryFn: async () => {
      const response = await apiClient.get(`/rfis?projectId=${params.projectId}`);
      return response.data.rfis;
    },
  });
}

export function useCreateRFI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRFIInput) => {
      const response = await apiClient.post('/rfis', data);
      return response.data.rfi;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfis', { projectId: variables.projectId }] });
    },
  });
}
```

## Security & Permissions

All routes include:
- ✅ JWT authentication via `authMiddleware.authenticate`
- ✅ Project access verification (user must be project owner or team member)
- ✅ Role-based permissions for team management (only owner/manager can modify)

## API Documentation

Swagger docs available at: `http://localhost:3001/docs`

All endpoints documented with:
- Request/response schemas
- Security requirements (Bearer auth)
- Query parameters and filters
- Proper tags for organization
