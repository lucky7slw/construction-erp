-- CreateTable
CREATE TABLE "public"."module_access" (
    "id" TEXT NOT NULL,
    "roleId" TEXT,
    "userId" TEXT,
    "module" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_access_roleId_module_key" ON "public"."module_access"("roleId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "module_access_userId_module_key" ON "public"."module_access"("userId", "module");

-- AddForeignKey
ALTER TABLE "public"."module_access" ADD CONSTRAINT "module_access_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."module_access" ADD CONSTRAINT "module_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
