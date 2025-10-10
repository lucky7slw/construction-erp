# Issue #9: Comprehensive Project Management System - Implementation Plan

**Date**: 2025-09-30
**Reference**: BuildXact PM software (screenshot analysis)
**Goal**: Create the most intuitive, informative, helpful, and functional PM software

---

## Vision: Industry-Leading Construction PM Software

Based on BuildXact reference and construction industry best practices, we're building a system that goes far beyond basic Gantt charts. This will be a **complete project lifecycle management platform** for construction companies.

---

## Architecture Overview

### Three-Tier Navigation Structure

```
Project
├── Planning (Pre-Construction)
│   ├── Estimates & Budgeting
│   ├── Takeoffs & Material Lists
│   ├── Floor Plans & Drawings
│   ├── Mood Boards & Design
│   ├── Selection Boards
│   ├── Selections Tracker
│   └── Bid Management
│
├── Management (During Construction)
│   ├── Interactive Gantt / Schedule
│   ├── Tasks & Checklists
│   ├── Files & Photos
│   ├── Client Dashboard
│   ├── Daily Logs & Reports
│   ├── Time & Expenses
│   └── Resource Management
│
└── Finance (Ongoing)
    ├── Invoices & Payments
    ├── Purchase Orders
    ├── Change Orders
    ├── Retainers & Credits
    ├── Budget Tracking
    └── Financial Overview
```

---

## Phase 1: Planning Module (NEW - Not in original Issue #9)

### 1.1 Estimates & Budgeting
**Purpose**: Create detailed project estimates before work begins

**Features**:
- Line-item cost estimating with categories
- Material cost databases (integrate with suppliers)
- Labor cost calculation by trade
- Equipment rental estimates
- Overhead and profit margin settings
- Multiple estimate versions (low/medium/high)
- Export to PDF for client presentation
- Convert approved estimate to project budget

**Database Schema**:
```typescript
model Estimate {
  id            String @id @default(cuid())
  projectId     String
  version       Int
  status        EstimateStatus // DRAFT, PENDING, APPROVED, REJECTED
  lineItems     EstimateLineItem[]
  subtotal      Decimal
  taxRate       Decimal
  taxAmount     Decimal
  total         Decimal
  validUntil    DateTime
  notes         String?
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model EstimateLineItem {
  id          String @id @default(cuid())
  estimateId  String
  category    String // Materials, Labor, Equipment, Subcontractors
  description String
  quantity    Decimal
  unit        String // sqft, hours, each, etc.
  unitCost    Decimal
  totalCost   Decimal
  markup      Decimal // profit margin %
  vendor      String?
  notes       String?
  sortOrder   Int
}
```

**Integration**:
- Link to Quote system (Issue #10) for client-facing quotes
- Convert estimate to purchase orders
- Track estimated vs actual costs

### 1.2 Takeoffs & Material Lists
**Purpose**: Calculate exact material quantities from drawings

**Features**:
- PDF/drawing upload and annotation
- Measurement tools (linear, area, count)
- Material library with standard quantities
- Waste factor calculations
- Export to material orders
- Integration with supplier catalogs
- Version tracking for drawing changes

**Database Schema**:
```typescript
model Takeoff {
  id          String @id @default(cuid())
  projectId   String
  name        String
  drawingUrl  String // File in MinIO
  items       TakeoffItem[]
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TakeoffItem {
  id          String @id @default(cuid())
  takeoffId   String
  material    String
  measurement Decimal
  unit        String
  wasteFactor Decimal @default(10) // percentage
  quantity    Decimal // measurement * (1 + wasteFactor/100)
  location    Json // coordinates on drawing
  notes       String?
}
```

### 1.3 Floor Plans & Drawings
**Purpose**: Centralized document management for project plans

**Features**:
- Upload PDFs, CAD files, images
- Version control with revision history
- Drawing viewer with zoom/pan
- Annotation and markup tools
- Share with clients and subcontractors
- Download in multiple formats
- Link drawings to specific tasks

**Database Schema**:
```typescript
model Drawing {
  id            String @id @default(cuid())
  projectId     String
  title         String
  category      DrawingCategory // ARCHITECTURAL, STRUCTURAL, MEP, SITE
  fileUrl       String
  version       Int
  status        DrawingStatus // DRAFT, APPROVED, SUPERSEDED
  uploadedById  String
  annotations   DrawingAnnotation[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model DrawingAnnotation {
  id         String @id @default(cuid())
  drawingId  String
  type       String // note, measurement, issue
  content    String
  position   Json // x, y coordinates
  createdBy  String
  createdAt  DateTime @default(now())
}
```

### 1.4 Mood Boards & Design Selection
**Purpose**: Visual design planning and client collaboration

**Features**:
- Create mood boards with images
- Color palette selection
- Material samples (flooring, countertops, tiles)
- Fixture selections (lights, plumbing, hardware)
- Client feedback and approval
- Link to selections tracker
- Export presentation PDFs

**Database Schema**:
```typescript
model MoodBoard {
  id          String @id @default(cuid())
  projectId   String
  room        String // Kitchen, Bathroom, Living Room, etc.
  images      MoodBoardImage[]
  colors      String[] // hex color codes
  status      SelectionStatus // DRAFT, PENDING_APPROVAL, APPROVED
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model MoodBoardImage {
  id           String @id @default(cuid())
  moodBoardId  String
  imageUrl     String
  category     String // flooring, countertop, lighting, etc.
  product      String?
  supplier     String?
  cost         Decimal?
  notes        String?
  sortOrder    Int
}
```

### 1.5 Selections Tracker
**Purpose**: Track all client selections and decisions

**Features**:
- Selection checklist by room/category
- Pending, approved, ordered status tracking
- Link to suppliers and SKUs
- Cost tracking vs budget
- Decision deadlines and reminders
- Client portal access for selections
- Change order trigger for late changes

**Database Schema**:
```typescript
model Selection {
  id              String @id @default(cuid())
  projectId       String
  room            String
  category        String // Flooring, Cabinets, Countertops, Fixtures
  item            String
  description     String
  supplier        String?
  sku             String?
  cost            Decimal?
  quantity        Int?
  status          SelectionStatus // PENDING, APPROVED, ORDERED, INSTALLED
  dueDate         DateTime?
  approvedAt      DateTime?
  approvedById    String?
  notes           String?
  attachments     String[] // images, spec sheets
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum SelectionStatus {
  PENDING
  APPROVED
  ORDERED
  RECEIVED
  INSTALLED
}
```

### 1.6 Bid Management
**Purpose**: Request and compare subcontractor/supplier bids

**Features**:
- Create RFQ (Request for Quote) packages
- Distribute to multiple bidders
- Bid comparison matrix
- Award tracking
- Contract generation
- Integration with purchase orders
- Bid bond and insurance tracking

**Database Schema**:
```typescript
model BidPackage {
  id          String @id @default(cuid())
  projectId   String
  title       String // "HVAC Installation", "Electrical Rough-In"
  scope       String
  dueDate     DateTime
  status      BidStatus // OPEN, CLOSED, AWARDED
  bids        Bid[]
  awardedBid  String? // Bid ID
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Bid {
  id            String @id @default(cuid())
  bidPackageId  String
  supplierId    String // Link to Supplier model
  amount        Decimal
  timeline      String
  terms         String?
  attachments   String[] // proposal PDFs
  notes         String?
  status        String // SUBMITTED, ACCEPTED, REJECTED
  submittedAt   DateTime
  createdAt     DateTime @default(now())
}

enum BidStatus {
  DRAFT
  OPEN
  CLOSED
  AWARDED
  CANCELLED
}
```

---

## Phase 2: Management Module (Original Issue #9 + Enhancements)

### 2.1 Interactive Gantt / Schedule
**Already Implemented**: `apps/api/src/services/gantt.service.ts`

**Enhancements Needed**:
- ✅ Critical Path Method (CPM) - Already implemented
- ⏳ Drag-and-drop rescheduling (frontend)
- ⏳ Resource allocation visualization
- ⏳ Progress tracking with % complete
- ⏳ Baseline vs actual comparison
- ⏳ Weather delay tracking
- ⏳ Real-time WebSocket updates

### 2.2 Tasks & Checklists
**Purpose**: Granular task management within project phases

**Features**:
- Hierarchical task structure (phases → tasks → subtasks)
- Checklist templates (permit checklist, inspection checklist)
- Assignment to team members or subcontractors
- Priority levels (low, medium, high, urgent)
- Due dates with calendar integration
- Photo/document attachments per task
- Comments and @mentions
- Mobile-friendly for field workers

**Database Schema** (Already exists but enhance):
```typescript
// Extend existing Task model
model Task {
  // ... existing fields
  checklist     TaskChecklistItem[]
  priority      TaskPriority
  tags          String[]
  location      String? // on-site location
  parentTaskId  String? // for subtasks
}

model TaskChecklistItem {
  id        String @id @default(cuid())
  taskId    String
  content   String
  completed Boolean @default(false)
  completedAt DateTime?
  completedBy String?
  sortOrder Int
}
```

### 2.3 Files & Photos
**Purpose**: Centralized project document management

**Features**:
- Organized by category (Contracts, Permits, Photos, Invoices)
- Progress photos with auto-tagging by date
- Before/after photo comparison
- Share with clients via portal
- Version control for documents
- Search and filter
- Bulk upload from mobile
- GPS tagging for site photos

**Database Schema**:
```typescript
model ProjectFile {
  id          String @id @default(cuid())
  projectId   String
  category    FileCategory // CONTRACT, PERMIT, PHOTO, INVOICE, DRAWING, OTHER
  filename    String
  fileUrl     String // MinIO path
  mimeType    String
  size        Int
  tags        String[]
  location    String? // GPS coordinates
  takenAt     DateTime?
  uploadedBy  String
  description String?
  createdAt   DateTime @default(now())
}

enum FileCategory {
  CONTRACT
  PERMIT
  PHOTO
  INVOICE
  DRAWING
  REPORT
  OTHER
}
```

### 2.4 Client Dashboard
**Purpose**: Client-facing project portal

**Features**:
- Project timeline overview
- Budget summary (high-level, not detailed)
- Upcoming milestones
- Selection approval pending list
- Photo gallery (curated progress photos)
- Change order requests and approvals
- Payment schedule
- Message center with project team

**Implementation**:
- Separate React component tree for client view
- Limited permissions (read-only mostly)
- Beautiful, simple UI (not overwhelming)
- Email notifications for updates
- Mobile-responsive

### 2.5 Daily Logs & Reports
**Purpose**: Track daily site activity and conditions

**Features**:
- Daily log entry form (mobile-friendly)
- Weather conditions logging
- Crew attendance tracking
- Work completed summary
- Material deliveries received
- Equipment used
- Safety incidents/near-misses
- Photos from the day
- Automatic PDF generation
- Email to stakeholders

**Database Schema**:
```typescript
model DailyLog {
  id            String @id @default(cuid())
  projectId     String
  date          DateTime
  weather       Json // temp, conditions, rain, etc.
  crewPresent   CrewAttendance[]
  workCompleted String
  deliveries    Delivery[]
  equipment     EquipmentUsage[]
  incidents     SafetyIncident[]
  photos        String[] // file URLs
  notes         String?
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model CrewAttendance {
  id         String @id @default(cuid())
  dailyLogId String
  workerId   String // Could be employee or subcontractor
  hoursWorked Decimal
  trade      String
  notes      String?
}

model SafetyIncident {
  id          String @id @default(cuid())
  dailyLogId  String
  type        IncidentType // INJURY, NEAR_MISS, PROPERTY_DAMAGE
  severity    String // MINOR, MODERATE, SERIOUS
  description String
  personInvolved String?
  actionTaken String
  photos      String[]
  reportedTo  String?
}
```

### 2.6 Time & Expenses
**Already in original Issue #9**

**Enhancements**:
- GPS-based clock in/out (mobile app)
- Geofencing alerts if clocking in away from site
- Expense photo capture (receipts)
- AI categorization (from Issue #7)
- Per diem tracking for travel
- Equipment rental time tracking
- Billable vs non-billable hours
- Integration with payroll

---

## Phase 3: Finance Module (Partially in Issue #10, expand here)

### 3.1 Invoices & Payments
**Integration with existing Invoice model**

**Enhancements**:
- Progress billing (based on % complete)
- Lien waiver tracking
- Payment application (AIA G702/G703 format)
- Retainage calculation
- Client payment portal
- Automatic payment reminders
- Integration with accounting (QuickBooks, Xero)

### 3.2 Purchase Orders
**Purpose**: Track all project purchases

**Features**:
- Create POs from estimates or material lists
- Approval workflow (manager approval over $X)
- Email PO to supplier
- Track delivery status
- Receive against PO
- Match invoices to POs
- Budget impact tracking

**Database Schema**:
```typescript
model PurchaseOrder {
  id          String @id @default(cuid())
  poNumber    String @unique
  projectId   String
  supplierId  String
  status      POStatus // DRAFT, SENT, ACKNOWLEDGED, PARTIALLY_RECEIVED, RECEIVED, INVOICED
  lineItems   PurchaseOrderItem[]
  subtotal    Decimal
  tax         Decimal
  total       Decimal
  deliveryDate DateTime?
  deliveryAddress String
  notes       String?
  approvedBy  String?
  approvedAt  DateTime?
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PurchaseOrderItem {
  id              String @id @default(cuid())
  poId            String
  description     String
  quantity        Decimal
  unit            String
  unitPrice       Decimal
  total           Decimal
  receivedQty     Decimal @default(0)
  estimateLineId  String? // Link back to original estimate
  taskId          String? // Which task needs this
}

enum POStatus {
  DRAFT
  SENT
  ACKNOWLEDGED
  PARTIALLY_RECEIVED
  RECEIVED
  INVOICED
  CANCELLED
}
```

### 3.3 Change Orders
**Purpose**: Manage scope changes and cost adjustments

**Features**:
- Change request form (client or internal)
- Cost and schedule impact analysis
- Client approval workflow
- Automatic budget adjustment after approval
- Change order log/register
- Link to tasks affected
- PDF generation for client signature

**Database Schema**:
```typescript
model ChangeOrder {
  id              String @id @default(cuid())
  coNumber        String @unique
  projectId       String
  title           String
  description     String
  reason          String // Client request, unforeseen condition, design change
  costImpact      Decimal
  timeImpact      Int // days
  status          ChangeOrderStatus // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, IMPLEMENTED
  requestedBy     String
  requestedAt     DateTime
  approvedBy      String?
  approvedAt      DateTime?
  lineItems       ChangeOrderItem[]
  attachments     String[]
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ChangeOrderItem {
  id          String @id @default(cuid())
  coId        String
  description String
  quantity    Decimal
  unit        String
  unitCost    Decimal
  total       Decimal
}

enum ChangeOrderStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  IMPLEMENTED
  CANCELLED
}
```

### 3.4 Retainers & Credits
**Purpose**: Manage upfront payments and client credits

**Features**:
- Retainer/deposit invoicing
- Retainer balance tracking
- Apply retainer to progress invoices
- Credit memo generation
- Refund processing
- Retainer release conditions

**Database Schema**:
```typescript
model Retainer {
  id          String @id @default(cuid())
  projectId   String
  amount      Decimal
  paidAmount  Decimal @default(0)
  appliedAmount Decimal @default(0)
  balance     Decimal // amount - appliedAmount
  invoiceId   String?
  status      RetainerStatus // PENDING, PAID, PARTIALLY_APPLIED, FULLY_APPLIED, REFUNDED
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CreditMemo {
  id          String @id @default(cuid())
  projectId   String
  amount      Decimal
  reason      String
  appliedTo   String? // Invoice ID
  status      CreditStatus // OPEN, APPLIED, EXPIRED
  expiresAt   DateTime?
  createdById String
  createdAt   DateTime @default(now())
}
```

### 3.5 Budget Tracking
**Purpose**: Real-time budget vs actual monitoring

**Features**:
- Budget categories aligned with estimates
- Committed costs (POs not yet invoiced)
- Actual costs (invoiced/paid)
- Forecasted final cost
- Variance analysis (over/under budget by category)
- Budget alerts (threshold warnings)
- Cash flow projection
- Earned value management (EVM) metrics

**Implementation**:
- Aggregate data from estimates, POs, expenses, invoices
- Real-time calculations via WebSocket updates
- Dashboard visualizations (charts, gauges)

### 3.6 Financial Overview
**Purpose**: Executive-level project financial dashboard

**Features**:
- Project profitability summary
- Revenue vs costs chart
- Payment status (invoiced vs received)
- Outstanding AR
- Budget health score
- Key financial KPIs
- Trend analysis (monthly costs)
- Export to PDF/Excel

---

## Implementation Strategy

### Phase 1: Database Schema & Backend (Weeks 1-2)
1. Create all new Prisma models
2. Generate migrations
3. Build service layer for each module
4. Implement API endpoints (Fastify routes)
5. Write comprehensive tests (NO MOCKS)

### Phase 2: Core Management Features (Weeks 3-4)
1. Enhance existing Gantt service
2. Implement Tasks & Checklists
3. Build Daily Logs system
4. Implement Files & Photos with MinIO
5. WebSocket integration for real-time updates

### Phase 3: Planning Module (Weeks 5-6)
1. Estimates & Budgeting
2. Takeoffs (basic version)
3. Selections Tracker
4. Bid Management
5. Mood Boards (MVP)

### Phase 4: Finance Module (Weeks 7-8)
1. Purchase Orders
2. Change Orders
3. Enhanced Invoicing
4. Budget Tracking
5. Financial Overview Dashboard

### Phase 5: Frontend & Polish (Weeks 9-10)
1. React components for all features
2. Client Dashboard portal
3. Mobile-responsive layouts
4. Testing and bug fixes
5. Documentation

---

## Success Metrics

### User Experience
- Project creation to first schedule: < 30 minutes
- Mobile daily log entry: < 2 minutes
- Client approval turnaround: 50% faster
- Document retrieval: < 10 seconds

### Business Impact
- 30% reduction in budget overruns
- 20% improvement in project timeline accuracy
- 50% reduction in administrative time
- 90% client satisfaction with transparency

### Technical Performance
- Page load times: < 2 seconds
- Real-time sync: < 1 second
- Gantt chart rendering: < 500ms for 500 tasks
- Mobile offline mode: Full functionality

---

## Next Steps

1. **Review & Approve** this plan
2. **Prioritize modules** (which to build first?)
3. **Database schema design** (extend Prisma schema)
4. **Begin Phase 1** implementation

**Recommendation**: Start with **Phase 2** (Management Module) since we already have Gantt service. Then add Planning Module (most differentiation), then Finance.

---

**Question for you**: Does this comprehensive plan align with your vision? Should we start implementing the Management Module enhancements first, or would you prefer to tackle Planning or Finance first?
