-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL DEFAULT 'Produit',
    "wilaya" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "shippingFee" INTEGER NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'HOME',
    "totalPrice" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("commune", "createdAt", "deliveryType", "id", "name", "phone", "quantity", "shippingFee", "status", "totalPrice", "unitPrice", "updatedAt", "wilaya") SELECT "commune", "createdAt", "deliveryType", "id", "name", "phone", "quantity", "shippingFee", "status", "totalPrice", "unitPrice", "updatedAt", "wilaya" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_status_idx" ON "Order"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
