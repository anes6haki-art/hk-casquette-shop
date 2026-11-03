import Image from "next/image";
import Link from "next/link";
import { getProductTitleAr, type ProductDto } from "@/lib/store-data";
import type { StorefrontSettingsDto } from "@/lib/storefront-settings";
import { getAbsoluteImageUrl } from "@/lib/image-url";

function CapIllustration() {
  return (
    <svg className="cap-illustration" viewBox="0 0 240 180" role="img" aria-label="رسم توضيحي لقبعة">
      <path d="M47 103c4-44 29-68 71-68s67 24 71 68l3 18H45l2-18Z" />
      <path d="M46 111c-25 6-38 22-31 35 8 16 58 22 105 15 23-3 40-9 55-18-20 4-44 2-66-4-25-7-43-19-63-28Z" />
      <path d="M118 42v48m-51 2c15-12 33-18 53-18 20 0 38 6 54 18" />
    </svg>
  );
}

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`;
}

export default function BestSellersShowcase({
  products,
  settings,
}: {
  products: ProductDto[];
  settings: StorefrontSettingsDto;
}) {
  return (
    <section className={`best-sellers-showcase${settings.bestSellerImage ? " has-banner" : ""}`} aria-labelledby="best-sellers-heading">
      {settings.bestSellerImage && (
        <div className="best-sellers-banner">
          <Image
            src={getAbsoluteImageUrl(settings.bestSellerImage)}
            alt=""
            fill
            priority
            unoptimized
            sizes="(max-width: 760px) 94vw, 52vw"
          />
        </div>
      )}
      <div className="best-sellers-showcase-heading">
        <span className="best-sellers-showcase-kicker"><span /> الأفضل اختياراً</span>
        <h2 id="best-sellers-heading">{settings.bestSellerTitle}</h2>
        {settings.bestSellerSubtitle && <p>{settings.bestSellerSubtitle}</p>}
      </div>
      {products.length > 0 ? (
        <div className="best-sellers-showcase-grid">
          {products.map((product, index) => (
            <Link
              className="best-seller-showcase-card"
              href={`/products/${product.id}`}
              key={product.id}
              aria-label={`اكتشف ${getProductTitleAr(product.title)}`}
            >
              <span className="best-seller-showcase-rank" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="best-seller-showcase-image">
                {product.imageUrls[0]
                  ? <Image src={getAbsoluteImageUrl(product.imageUrls[0])} alt="" fill unoptimized sizes="(max-width: 600px) 40vw, 200px" />
                  : <CapIllustration />}
              </span>
              <span className="best-seller-showcase-info">
                <strong>{getProductTitleAr(product.title)}</strong>
                <span>{formatPrice(product.discountedPrice)}</span>
              </span>
              <span className="best-seller-showcase-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="best-sellers-showcase-empty">
          <CapIllustration />
          <p>ترقبوا قريباً اختياراتنا المميزة.</p>
        </div>
      )}
    </section>
  );
}
