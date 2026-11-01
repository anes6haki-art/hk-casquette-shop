CREATE TABLE "StorefrontSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bestSellerProductIds" TEXT NOT NULL DEFAULT '[]',
    "bestSellerTitle" TEXT NOT NULL DEFAULT 'أفضل المبيعات',
    "bestSellerSubtitle" TEXT NOT NULL DEFAULT 'اختياراتنا المميزة لكم',
    "bestSellerImage" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "StorefrontSettings_pkey" PRIMARY KEY ("id")
);
