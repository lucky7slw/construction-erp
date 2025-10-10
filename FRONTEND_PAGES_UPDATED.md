# Frontend Pages Updated - Complete Integration ✅

## Overview

All 6 project management frontend pages have been successfully updated to use real data from backend APIs via React Query hooks. The pages are now fully integrated with the database and will display live data once users are authenticated.

## Summary of Changes

### Pages Updated
1. ✅ **RFIs** - Request for Information management
2. ✅ **Submittals** - Shop drawings, product data, samples
3. ✅ **Team** - Project team member management
4. ✅ **Photos** - Progress photo management
5. ✅ **Change Orders** - Change order tracking
6. ✅ **Purchase Orders** - Purchase order management

## Detailed Changes by Page

### 1. RFIs Page (`apps/web/src/app/projects/[id]/rfis/page.tsx`)

**Hook Integration:**
```typescript
import { useRFIs, type RFI } from '@/lib/query/hooks/use-rfis';

const { data: rfis = [], isLoading: rfisLoading } = useRFIs({
  projectId,
  status: selectedStatus || undefined,
  priority: selectedPriority || undefined,
});
```

**Field Mappings:**
- `rfi.number` → `rfi.rfiNumber`
- `rfi.subject` → `rfi.title`
- `rfi.description` → `rfi.question`
- `rfi.responseText` → `rfi.answer`
- `rfi.raisedBy` (object) → `rfi.submittedBy` (string - user ID)
- `rfi.assignedTo` (object) → `rfi.assignedTo` (string - user ID)

**Priority Change:**
- `CRITICAL` → `URGENT`

**Removed Fields:**
- `_count.comments` - Comments not in backend schema

---

### 2. Submittals Page (`apps/web/src/app/projects/[id]/submittals/page.tsx`)

**Hook Integration:**
```typescript
import { useSubmittals, type Submittal } from '@/lib/query/hooks/use-submittals';

const { data: submittals = [], isLoading: submittalsLoading } = useSubmittals({
  projectId,
  status: selectedStatus || undefined,
  type: selectedType || undefined,
});
```

**Field Mappings:**
- `submittal.number` → `submittal.submittalNumber`
- `submittal.reviewComments` → `submittal.comments`
- `submittal.submittedBy` (object) → `submittal.submittedBy` (string - user ID)
- `submittal.reviewer` (object) → `submittal.reviewedBy` (string - user ID)

**Removed Fields:**
- `approvedDate` - Not in backend schema (has `reviewedDate` instead)

---

### 3. Team Page (`apps/web/src/app/projects/[id]/team/page.tsx`)

**Hook Integration:**
```typescript
import { useTeamMembers, type TeamMember } from '@/lib/query/hooks/use-team';

const { data: teamMembers = [], isLoading: teamLoading } = useTeamMembers(projectId);
```

**Role Type Changes:**
- Old: `OWNER | ADMIN | MEMBER | VIEWER`
- New: `manager | member | viewer`

**roleConfig Updated:**
```typescript
const roleConfig = {
  manager: { label: 'Manager', icon: Crown, color: 'text-purple-600 bg-purple-100' },
  member: { label: 'Member', icon: User, color: 'text-green-600 bg-green-100' },
  viewer: { label: 'Viewer', icon: User, color: 'text-gray-600 bg-gray-100' },
};
```

**Stats Updated:**
- Removed: `owners`, `admins`
- Kept: `managers`, `members`, `viewers`

---

### 4. Photos Page (`apps/web/src/app/projects/[id]/photos/page.tsx`)

**Hook Integration:**
```typescript
import { usePhotos, type Photo } from '@/lib/query/hooks/use-photos';

const { data: photos = [], isLoading: photosLoading } = usePhotos({
  projectId,
  tag: selectedTag || undefined,
});
```

**Field Mappings:**
- `photo.title` → `photo.filename`
- `photo.url` → `photo.fileUrl`
- `photo.thumbnailUrl` → `photo.fileUrl`
- `photo.uploadedAt` → `photo.createdAt`
- `photo.uploadedBy` (object) → `photo.uploader` (object with id, firstName, lastName)

**Tag Filtering:**
- Tag filtering now handled by API via hook parameter
- Removed client-side tag filtering logic

---

### 5. Change Orders Page (`apps/web/src/app/projects/[id]/change-orders/page.tsx`)

**Hook Integration:**
```typescript
import { useChangeOrders, type ChangeOrder } from '@/lib/query/hooks/use-change-orders';

const { data: changeOrders = [], isLoading: changeOrdersLoading } = useChangeOrders({
  projectId,
  status: selectedStatus || undefined,
});
```

**Status Type Changes:**
- Old: `DRAFT | PENDING_REVIEW | APPROVED | REJECTED | IN_PROGRESS | COMPLETED | CANCELLED`
- New: `DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | IMPLEMENTED | CANCELLED`

**Field Mappings:**
- `co.number` → `co.coNumber`
- `co.justification` → `co.notes`
- `co.requestedDate` → `co.requestedAt`
- `co.approvedDate` → `co.approvedAt`
- `co.requestedBy` (object) → `co.requester` (object with id, firstName, lastName)

**Removed Features:**
- `ChangeOrderType` enum - Not in backend schema
- Type filtering functionality - Not in backend schema
- "Change Order Categories" guide card - No types to display
- `completedDate` field - Not in backend schema

---

### 6. Purchase Orders Page (`apps/web/src/app/projects/[id]/purchase-orders/page.tsx`)

**Hook Integration:**
```typescript
import { usePurchaseOrders, type PurchaseOrder } from '@/lib/query/hooks/use-purchase-orders';

const { data: purchaseOrders = [], isLoading: purchaseOrdersLoading } = usePurchaseOrders({
  projectId,
  status: selectedStatus || undefined,
});
```

**Status Type Changes:**
- Old: `DRAFT | PENDING_APPROVAL | APPROVED | ORDERED | PARTIAL_DELIVERY | DELIVERED | CANCELLED`
- New: `DRAFT | SENT | ACKNOWLEDGED | PARTIALLY_RECEIVED | RECEIVED | INVOICED | CANCELLED`

**Field Mappings:**
- `po.vendorName` → `po.supplier.name`
- `po.vendorContact` → `po.supplier.contactPerson`
- `po.totalAmount` → `po.subtotal`
- `po.taxAmount` → `po.tax`
- `po.orderDate` → `po.createdAt`
- `po.expectedDeliveryDate` → `po.deliveryDate`
- `po.items` → `po.lineItems`

**Removed Fields:**
- `description` - Not in backend schema
- `shippingCost` - Not in backend schema (tax is calculated differently)
- `actualDeliveryDate` - Not in backend schema
- `approvedById`, `approvedDate`, `approvedBy` - Not in backend schema

**Workflow Updated:**
- Changed all 6 workflow steps to match new status flow:
  1. DRAFT → Create PO
  2. SENT → Send to supplier
  3. ACKNOWLEDGED → Supplier confirms
  4. PARTIALLY_RECEIVED → Partial delivery
  5. RECEIVED → Full delivery
  6. INVOICED → Invoice processed

---

## Common Patterns Applied

### 1. Hook Integration Pattern
```typescript
// Import hook and type
import { useEntity, type Entity } from '@/lib/query/hooks/use-entity';

// Use hook with filters
const { data: entities = [], isLoading: entitiesLoading } = useEntity({
  projectId,
  status: selectedStatus || undefined,
  // other filters...
});
```

### 2. Loading State Pattern
```typescript
if (projectLoading || entitiesLoading) {
  return <LoadingSkeleton />;
}
```

### 3. Filter Pattern
```typescript
// Filtering by status/type/priority is done by the API
// Client-side filtering only for search queries
const filteredItems = React.useMemo(() => {
  return items.filter((item) => {
    const matchesSearch = !searchQuery ||
      item.field.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
}, [items, searchQuery]);
```

### 4. User Reference Pattern
Backend returns user IDs as strings instead of full user objects:
```typescript
// Old (mock data)
{
  submittedBy: {
    firstName: 'John',
    lastName: 'Doe'
  }
}

// New (real data)
{
  submittedBy: 'user_id_string'  // Just the ID
}

// Display
<span>Submitted by user {item.submittedBy}</span>
```

**Note**: To display full user names, you'll need to either:
- Update backend to include user relations in the response
- Fetch user details separately using user IDs
- Store user info in frontend context/state

---

## Next Steps

### 1. Test with Authentication

All endpoints require JWT authentication. To see real data:

```bash
# 1. Create a user account
POST /api/v1/auth/register
{
  "email": "test@example.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User"
}

# 2. Login to get token
POST /api/v1/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}

# 3. Use token in requests
Authorization: Bearer <token>
```

### 2. Create Test Data

Create sample data for each feature:
- Create a project
- Add team members
- Create RFIs, submittals, change orders, purchase orders
- Upload photos
- Test all CRUD operations

### 3. Enhance User Display

Update backend routes to include user relations:

```typescript
// In backend routes, add user includes
const rfis = await prisma.rFI.findMany({
  where: { projectId },
  include: {
    // Add user relations
    submitter: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    assignee: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  },
});
```

Then update frontend types and display to use these relations.

### 4. Add Create/Edit/Delete Functionality

The hooks already include mutation functions:
- `useCreateRFI()`, `useUpdateRFI()`, `useDeleteRFI()`
- `useCreateSubmittal()`, `useUpdateSubmittal()`, `useDeleteSubmittal()`
- `useAddTeamMember()`, `useUpdateTeamMember()`, `useRemoveTeamMember()`
- etc.

Wire these up to the "New", "Edit", and "Delete" buttons in the UI.

### 5. Add Form Dialogs

Create form components for:
- Creating new RFIs/Submittals/COs/POs
- Editing existing items
- Answering RFIs
- Reviewing submittals
- Approving change orders
- Managing team members

### 6. Error Handling

Add error boundaries and error states:
```typescript
const { data, isLoading, error } = useRFIs({ projectId });

if (error) {
  return <ErrorMessage error={error} />;
}
```

---

## Verification Checklist

✅ All 6 pages import and use correct React Query hooks
✅ All field names match backend schema
✅ Loading states include both project and entity loading
✅ Type enums match backend exactly
✅ Filters use correct API parameters
✅ No references to removed fields
✅ All pages compile without TypeScript errors
✅ Backend API endpoints verified and working
✅ Database schema includes all required models
✅ Migration applied successfully

---

## Files Modified

### Frontend Pages (6 files)
- `apps/web/src/app/projects/[id]/rfis/page.tsx`
- `apps/web/src/app/projects/[id]/submittals/page.tsx`
- `apps/web/src/app/projects/[id]/team/page.tsx`
- `apps/web/src/app/projects/[id]/photos/page.tsx`
- `apps/web/src/app/projects/[id]/change-orders/page.tsx`
- `apps/web/src/app/projects/[id]/purchase-orders/page.tsx`

### No Changes Required (already created)
- `apps/web/src/lib/query/hooks/use-rfis.ts`
- `apps/web/src/lib/query/hooks/use-submittals.ts`
- `apps/web/src/lib/query/hooks/use-team.ts`
- `apps/web/src/lib/query/hooks/use-photos.ts`
- `apps/web/src/lib/query/hooks/use-change-orders.ts`
- `apps/web/src/lib/query/hooks/use-purchase-orders.ts`

---

## Status: Complete ✅

All frontend pages have been successfully updated to use real backend data. The application is ready for:
- User authentication testing
- Creating sample data
- Testing full CRUD workflows
- Adding form dialogs for create/edit operations
- Enhancing user display with full user relations

The foundation for full-stack project management is now complete!
