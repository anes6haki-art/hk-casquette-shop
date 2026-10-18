import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getStorefrontProduct } from "@/lib/products";
import { getShippingRatesForCheckout } from "@/lib/orders";
import { getProductTitleAr } from "@/lib/store-data";
import ProductDirectCheckout from "./product-direct-checkout";

export const instant = false;

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  await connection();
  const { id } = await params;
  const [product, shippingRates] = await Promise.all([
    getStorefrontProduct(id),
    getShippingRatesForCheckout(),
  ]);
  if (!product) notFound();

  return (
    <main className="product-page" dir="rtl" lang="ar">
      <header className="shop-header product-header">
        <Link className="shop-brand" href="/" aria-label="متجر إتش كيه للقبعات، الصفحة الرئيسية">
          <span className="shop-brand-mark">HK</span><span>متجر إتش كيه للقبعات</span>
        </Link>
        <div className="product-header-actions">
          <Link className="product-back-link" href="/"><span aria-hidden="true">→</span> العودة إلى المجموعة</Link>
        </div>
      </header>
      <nav className="product-breadcrumb" aria-label="مسار التنقل">
        <Link href="/">الرئيسية</Link><span>/</span><span>{getProductTitleAr(product.title)}</span>
      </nav>

      <ProductDirectCheckout product={product} shippingRates={shippingRates} />

      <footer className="shop-footer">
        <Link className="shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>متجر إتش كيه للقبعات</span></Link>
        <p>أناقتكم في كل مكان في الجزائر.</p>
        <Link href="/admin">مساحة الإدارة</Link>
      </footer>
    </main>
  );
}
