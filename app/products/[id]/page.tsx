import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import OrderForm from "@/app/order-form";
import { getStorefrontProduct } from "@/lib/products";
import { getShippingRatesForCheckout } from "@/lib/orders";
import { getProductDescriptionAr, getProductTitleAr } from "@/lib/store-data";
import ProductGallery from "./product-gallery";

export const instant = false;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`;
}

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  await connection();
  const { id } = await params;
  const [product, shippingRates] = await Promise.all([
    getStorefrontProduct(id),
    getShippingRatesForCheckout(),
  ]);
  if (!product) notFound();

  const discount = product.originalPrice > product.discountedPrice
    ? Math.round((1 - product.discountedPrice / product.originalPrice) * 100)
    : 0;

  return (
    <main className="product-page">
      <header className="shop-header product-header">
        <Link className="shop-brand" href="/" aria-label="متجر إتش كيه للقبعات، الصفحة الرئيسية">
          <span className="shop-brand-mark">HK</span><span>Hk casquette shop</span>
        </Link>
        <div className="product-header-actions">
          <Link className="product-back-link" href="/"><span aria-hidden="true">→</span> العودة إلى المجموعة</Link>
        </div>
      </header>
      <nav className="product-breadcrumb" aria-label="مسار التنقل">
        <Link href="/">الرئيسية</Link><span>/</span><span>{getProductTitleAr(product.title)}</span>
      </nav>

      <section className="product-detail">
        <ProductGallery
          title={product.title}
          productId={product.id}
          price={product.discountedPrice}
          stockQuantity={product.stockQuantity}
          imageUrls={product.imageUrls}
          variants={product.variants}
        />
        <div className="product-detail-copy">
          <span className="shop-eyebrow"><span /> HK CASQUETTE SHOP · COLLECTION</span>
          <h1>{getProductTitleAr(product.title)}</h1>
          <div className="product-detail-price">
            <strong>{formatPrice(product.discountedPrice)}</strong>
            {product.originalPrice > product.discountedPrice && <del>{formatPrice(product.originalPrice)}</del>}
            {discount > 0 && <span className="product-discount">-{discount}%</span>}
          </div>
          <p className="product-stock"><span className={product.stockQuantity > 0 ? "stock-dot" : "stock-dot is-empty"} />{product.stockQuantity > 0 ? `${product.stockQuantity} قطعة متوفرة` : "نفدت الكمية حالياً"}</p>
          <p className="product-full-description">{getProductDescriptionAr(product.description)}</p>
          <div className="product-delivery-points">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
              التوصيل إلى الولايات الـ58
            </span>
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h8M8 14h4" /><path d="m16 15 1.5 1.5L20 14" /></svg>
              الدفع عند الاستلام
            </span>
          </div>
          <a className="shop-primary-cta product-buy-cta" href="#commander" aria-disabled={product.stockQuantity < 1}>
            اطلبوا الآن <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section className="product-order-section" id="commander">
        <div className="product-order-copy">
          <span className="shop-eyebrow"><span /> الطلب دون دفع إلكتروني</span>
          <h2>احجزوا<br /><em>قبعتكم.</em></h2>
          <p>أدخلوا بياناتكم. سيتصل بكم فريقنا لتأكيد الطلب قبل الشحن.</p>
          <div className="product-order-total"><span>{getProductTitleAr(product.title)}</span><strong>{formatPrice(product.discountedPrice)}</strong></div>
          <small>تختلف رسوم التوصيل حسب الولاية وطريقة التوصيل.</small>
        </div>
        <OrderForm product={product} shippingRates={shippingRates} />
      </section>

      <footer className="shop-footer">
        <Link className="shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
        <p>أناقتكم في كل مكان في الجزائر.</p>
        <Link href="/admin">مساحة الإدارة</Link>
      </footer>
    </main>
  );
}
