ALTER TABLE "Order"
  ADD COLUMN "subtotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "shippingFee" DECIMAL(14, 2) NOT NULL DEFAULT 0;

UPDATE "Order" SET "subtotal" = "total";

ALTER TABLE "Order"
  ALTER COLUMN "subtotal" DROP DEFAULT,
  ALTER COLUMN "shippingFee" DROP DEFAULT,
  ADD CONSTRAINT "Order_shipping_amounts_check"
    CHECK ("subtotal" >= 0 AND "shippingFee" >= 0 AND "total" = "subtotal" + "shippingFee");
