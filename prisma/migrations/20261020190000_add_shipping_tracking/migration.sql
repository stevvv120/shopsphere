-- Add manual courier and shipment tracking information to orders.
ALTER TABLE "Order" ADD COLUMN "shippingCarrier" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippedAt" TIMESTAMP(3);

CREATE INDEX "Order_trackingNumber_idx" ON "Order"("trackingNumber");
