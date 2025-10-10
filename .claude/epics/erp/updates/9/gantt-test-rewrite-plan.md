# Gantt Service Test Rewrite Plan

## Current Status
- **Implementation**: ✅ Complete (gantt.service.ts)
- **Tests**: ⚠️ 13/16 passing (using mocks - violates project philosophy)
- **Issue**: Tests use `vi.fn()` mocks for Prisma and WebSocket

## Why Rewrite Needed
Project's absolute rule: **"Do not use mock services for anything ever."**

Current test file uses:
```typescript
mockPrisma = {
  task: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  taskDependency: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
  project: { findUnique: vi.fn() },
};
```

This violates TDD principles and doesn't test real behavior.

## Rewrite Approach

### 1. Use Real Services (Following WebSocket Testing Patterns)
From `.claude/CLAUDE.md`:
- Use real Prisma and Redis instances (no mocks per project guidelines)
- Random ports prevent test conflicts
- Track test data in arrays, cleanup in `afterEach`
- Use `setTimeout()` fallbacks for async events

### 2. Test Structure
```typescript
describe('GanttService (Real Services)', () => {
  let prisma: PrismaClient;
  let ganttService: GanttService;
  let webSocketService: WebSocketService;
  let testCompany: Company;
  let testProject: Project;
  let testUser: User;

  beforeAll(async () => {
    // Initialize real Prisma client
    prisma = new PrismaClient();

    // Create real WebSocket service (if needed for broadcast tests)
    webSocketService = new WebSocketService(prisma, redisClient);
  });

  beforeEach(async () => {
    // Create test data using real Prisma
    testCompany = await prisma.company.create({ data: {...} });
    testUser = await prisma.user.create({ data: {...} });
    testProject = await prisma.project.create({ data: {...} });

    ganttService = new GanttService(prisma, webSocketService);
  });

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    await prisma.taskDependency.deleteMany({ where: { ... } });
    await prisma.task.deleteMany({ where: { projectId: testProject.id } });
    await prisma.project.delete({ where: { id: testProject.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.company.delete({ where: { id: testCompany.id } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

### 3. Test Cases to Rewrite

#### Critical Path Calculation Tests
```typescript
it('should calculate critical path for linear dependencies', async () => {
  // Create real tasks in DB
  const task1 = await prisma.task.create({
    data: {
      title: 'Foundation',
      projectId: testProject.id,
      startDate: new Date('2024-01-01'),
      dueDate: new Date('2024-01-05'),
      estimatedHours: 32,
      assigneeId: testUser.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Framing',
      projectId: testProject.id,
      startDate: new Date('2024-01-06'),
      dueDate: new Date('2024-01-12'),
      estimatedHours: 48,
      assigneeId: testUser.id,
    },
  });

  // Create real dependency
  await prisma.taskDependency.create({
    data: {
      predecessorId: task1.id,
      dependentId: task2.id,
      type: 'FS',
      lagDays: 0,
    },
  });

  // Test with real data
  const result = await ganttService.calculateGanttData(testProject.id);

  expect(result.success).toBe(true);
  expect(result.data!.tasks.length).toBe(2);
  expect(result.data!.criticalPath.length).toBe(2);

  // Verify critical path tasks have zero slack
  const task1Data = result.data!.tasks.find(t => t.id === task1.id);
  expect(task1Data?.slack).toBe(0);
});
```

#### Schedule Validation Tests
```typescript
it('should detect schedule conflicts with real dependencies', async () => {
  const predecessor = await prisma.task.create({
    data: {
      title: 'Predecessor',
      projectId: testProject.id,
      dueDate: new Date('2024-01-08'),
      startDate: new Date('2024-01-01'),
    },
  });

  await prisma.taskDependency.create({
    data: {
      predecessorId: predecessor.id,
      dependentId: 'future-task-id', // Will be replaced in test
      type: 'FS',
      lagDays: 0,
    },
  });

  const result = await ganttService.validateTaskSchedule(
    { startDate: new Date('2024-01-05'), dueDate: new Date('2024-01-10') },
    [predecessor.id]
  );

  expect(result.isValid).toBe(false);
  expect(result.conflicts.length).toBeGreaterThan(0);
});
```

#### Task Update and Cascade Tests
```typescript
it('should update dependent tasks and emit WebSocket events', async () => {
  // Create task chain
  const task1 = await prisma.task.create({ data: {...} });
  const task2 = await prisma.task.create({ data: {...} });

  await prisma.taskDependency.create({
    data: { predecessorId: task1.id, dependentId: task2.id, type: 'FS' },
  });

  // Listen for WebSocket events (if testing broadcasts)
  const broadcastSpy = jest.spyOn(webSocketService, 'broadcastToCompany');

  // Update task schedule
  const result = await ganttService.updateTaskSchedule(task1.id, {
    startDate: new Date('2024-01-01'),
    dueDate: new Date('2024-01-10'), // Delayed by 5 days
  });

  expect(result.success).toBe(true);
  expect(result.data!.affectedTasks.length).toBe(1);

  // Verify dependent task was updated in DB
  const updatedTask2 = await prisma.task.findUnique({ where: { id: task2.id } });
  expect(updatedTask2!.startDate).toEqual(new Date('2024-01-11'));

  // Verify WebSocket broadcast
  expect(broadcastSpy).toHaveBeenCalledWith(
    testCompany.id,
    'gantt:task:updated',
    expect.objectContaining({ taskId: task1.id })
  );
});
```

#### Progress Calculation Tests
```typescript
it('should calculate weighted progress with real task data', async () => {
  await prisma.task.createMany({
    data: [
      {
        projectId: testProject.id,
        title: 'Task 1',
        estimatedHours: 40,
        actualHours: 40,
        progress: 100,
        status: 'COMPLETED',
      },
      {
        projectId: testProject.id,
        title: 'Task 2',
        estimatedHours: 60,
        actualHours: 30,
        progress: 50,
        status: 'IN_PROGRESS',
      },
    ],
  });

  const result = await ganttService.calculateProjectProgress(testProject.id);

  expect(result.success).toBe(true);
  expect(result.data!.overallProgress).toBe(70); // (40*100 + 60*50) / 100 = 70%
  expect(result.data!.completedTasks).toBe(1);
  expect(result.data!.totalTasks).toBe(2);
});
```

### 4. Benefits of Real Service Tests
- ✅ Tests actual database queries and transactions
- ✅ Catches Prisma schema issues
- ✅ Validates cascade updates work correctly
- ✅ Tests WebSocket integration if needed
- ✅ Provides confidence in production behavior
- ✅ Follows project's TDD philosophy

### 5. Implementation Checklist
- [ ] Create new test file: `gantt.service.integration.test.ts`
- [ ] Setup real Prisma client with test database
- [ ] Create helper functions for test data setup
- [ ] Implement all test cases with real services
- [ ] Add cleanup logic to prevent data leaks
- [ ] Run tests to verify 100% pass rate
- [ ] Remove old mock-based test file
- [ ] Update documentation with testing patterns

### 6. Estimated Effort
- **Time**: 2-3 hours
- **Priority**: Medium (service works, tests just need proper validation)
- **Blocking**: No (can be done during QA phase)

### 7. Reference
See `.claude/CLAUDE.md` sections:
- "WebSocket Development Learnings" (lines 67-177)
- "Testing" philosophy (line 36-40)
- "Absolute Rules" (line 60)

## Notes
The Gantt service implementation is production-ready. The tests just need to be rewritten to follow project philosophy and provide real confidence in the implementation.
