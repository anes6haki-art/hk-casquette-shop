import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { getStorefrontProducts } from "@/lib/products";
import { getColorLabelAr, getProductTitleAr } from "@/lib/store-data";

export const instant = false;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DA`;
}

function CapIllustration() {
  return (
    <svg className="cap-illustration" viewBox="0 0 240 180" role="img" aria-label="رسم توضيحي لقبعة">
      <path d="M47 103c4-44 29-68 71-68s67 24 71 68l3 18H45l2-18Z" />
      <path d="M46 111c-25 6-38 22-31 35 8 16 58 22 105 15 23-3 40-9 55-18-20 4-44 2-66-4-25-7-43-19-63-28Z" />
      <path d="M118 42v48m-51 2c15-12 33-18 53-18 20 0 38 6 54 18" />
    </svg>
  );
}

export default async function Home() {
  await connection();
  const products = await getStorefrontProducts();

  return (
    <main className="shop-home">
      <header className="shop-header">
        <Link className="shop-brand" href="/" aria-label="متجر إتش كيه للقبعات، الصفحة الرئيسية">
          <span className="shop-brand-mark">HK</span>
          <span>Hk casquette shop</span>
        </Link>
        <nav className="shop-nav" aria-label="Navigation principale">
          <a href="#catalogue">المجموعة</a>
          <a href="#engagements">التوصيل والدفع</a>
        </nav>
        <div className="shop-header-actions">
          <Link className="shop-header-cta" href="#catalogue">تسوقوا القبعات <span>↗</span></Link>
        </div>
      </header>

      <section className="shop-hero">
        <div className="shop-hero-copy">
          <span className="shop-eyebrow"><span /> قبعات · أناقة · الجزائر</span>
          <h1>تفاصيل تصنع<br /><em>أناقتكم.</em></h1>
          <p>قبعات مختارة لترافقكم أينما ذهبتم. اكتشفوا التصميم المناسب واطلبوه بسهولة مع الدفع عند الاستلام.</p>
          <Link className="shop-primary-cta" href="#catalogue">اكتشفوا المجموعة <span>↓</span></Link>
          <div className="shop-hero-trust"><span>✳ التوصيل إلى 58 ولاية</span><span>✳ الدفع عند الاستلام</span></div>
        </div>
        <div className="shop-hero-art">
          <div className="shop-hero-stamp">HK<br /><small>CASQUETTE SHOP</small></div>
          <div className="shop-hero-product">
            <Image
              src="/images/blue-baseball-cap.jpg"
              alt="قبعة زرقاء داكنة"
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 90vw, 48vw"
            />
          </div>
          <span className="shop-hero-caption">قطعة مميزة · أزرق داكن</span>
        </div>
      </section>

      <section className="shop-trust-strip" id="engagements">
        <span>التوصيل إلى الولايات الـ58</span><i />
        <span>دفع آمن عند الاستلام</span><i />
        <span>اطلبوا بنقرات بسيطة</span>
      </section>

      <section className="catalog-section" id="catalogue">
        <div className="catalog-heading">
          <div><span className="shop-eyebrow">مجموعة HK</span><h2>اختاروا أسلوبكم<span>.</span></h2></div>
          <p>{products.length} تصميم متاح</p>
        </div>
        {products.length === 0 ? (
          <div className="catalog-empty">
            <div className="catalog-empty-art"><CapIllustration /></div>
            <h3>المجموعة قريباً.</h3>
            <p>ستتوفر قبعاتنا قريباً. زورونا مجدداً.</p>
          </div>
        ) : (
          <div className="cap-grid">
            {products.map((product) => (
              <article className="cap-card" key={product.id}>
                <Link className="cap-card-image" href={`/products/${product.id}`} aria-label={`عرض ${getProductTitleAr(product.title)}`}>
                  {product.imageUrls[0]
                    ? <Image src={product.imageUrls[0]} alt={getProductTitleAr(product.title)} fill unoptimized sizes="(max-width: 560px) 90vw, (max-width: 900px) 44vw, 30vw" />
                    : <CapIllustration />}
                  {product.originalPrice > product.discountedPrice && (
                    <span className="cap-discount">-{Math.round((1 - product.discountedPrice / product.originalPrice) * 100)}%</span>
                  )}
                  {product.stockQuantity < 1 &&                   <span className="cap-sold-out">نفدت الكمية</span>}
                </Link>
                <div className="cap-card-info">
                  <div className="cap-card-title-row"><h3>{getProductTitleAr(product.title)}</h3><span>{product.stockQuantity > 0 ? "متوفر" : "نفدت الكمية"}</span></div>
                  <div className="cap-card-bottom">
                    <div className="cap-card-price"><strong>{formatPrice(product.discountedPrice)}</strong>{product.originalPrice > product.discountedPrice && <del>{formatPrice(product.originalPrice)}</del>}</div>
                    <div className="cap-card-buy-actions">
                      <Link className="cap-buy-button" href={`/products/${product.id}`} aria-disabled={product.stockQuantity < 1}>
                        أطلب الآن <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="shop-footer">
        <Link className="shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
        <p>أناقتكم في كل مكان في الجزائر.</p>

      </footer>
    </main>
  );
}
