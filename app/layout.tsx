import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hk casquette shop — قبعات في الجزائر",
  description:
    "اكتشفوا مجموعة Hk casquette shop. اطلبوا قبعاتكم مع التوصيل إلى الولايات الـ58 والدفع عند الاستلام.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
