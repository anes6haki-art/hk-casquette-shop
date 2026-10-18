import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { getProductsForAdmin } from "@/lib/products";
import ProductsManager from "./products-manager";

export const instant = false;

export default async function AdminProductsPage() {
  await connection();
  if (!(await hasAdminSession())) redirect("/admin/login");
  let products: Awaited<ReturnType<typeof getProductsForAdmin>> = [];
  let productsError = false;
  try {
    products = await getProductsForAdmin();
  } catch (error: unknown) {
    console.error("Failed to load admin products.", error);
    productsError = true;
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="shop-brand admin-shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>متجر HK للقبعات</span></Link>
        <nav className="admin-header-links" aria-label="التنقل في الإدارة">
          <Link href="/admin">الطلبات والتوصيل</Link>
          <Link href="/admin/products" aria-current="page">المنتجات</Link>
        </nav>
        <Link className="admin-logout-button" href="/admin">العودة إلى لوحة التحكم</Link>
      </header>
      <section className="admin-content products-content">
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">كتالوج المتجر</span>
            <h1>المنتجات<span>.</span></h1>
            <p>أديروا القبعات المتاحة في الكتالوج.</p>
          </div>
          {!productsError && (
            <span className="admin-order-count">{products.length} منتج</span>
          )}
        </div>
        {productsError ? (
          <p className="admin-data-error" role="alert">
            تعذر تحميل المنتجات. تحققوا من إعداد قاعدة البيانات ومخطط PostgreSQL.
          </p>
        ) : (
          <ProductsManager products={products} />
        )}
      </section>
    </main>
  );
}
