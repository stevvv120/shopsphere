CREATE TYPE "StockMovementReason" AS ENUM (
    'INITIAL_STOCK',
    'RESTOCK',
    'MANUAL_ADJUSTMENT',
    'ORDER_PLACED',
    'ORDER_CANCELLED'
);

CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER,
    "productName" TEXT NOT NULL,
    "orderId" INTEGER,
    "delta" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
