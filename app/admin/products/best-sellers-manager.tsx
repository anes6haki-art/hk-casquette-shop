"use client";

import { useState } from "react";
import AdminImage from "./admin-image";
import {
  ACCEPTED_IMAGE_INPUT,
  uploadProductImages,
} from "./image-upload";
import { saveBestSellersAction } from "./best-sellers-action";
import {
  getProductTitleAr,
  type ProductDto,
} from "@/lib/store-data";
import type { StorefrontSettingsDto } from "@/lib/storefront-settings";
import { getAbsoluteImageUrl } from "@/lib/image-url";

export default function BestSellersManager({
  products,
  settings,
}: {
  products: ProductDto[];
  settings: StorefrontSettingsDto;
}) {
  const [productIds, setProductIds] = useState(() => settings.bestSellerProductIds.filter(
    (id) => products.some((product) => product.id === id && product.isActive),
  ));
  const [title, setTitle] = useState(settings.bestSellerTitle);
  const [subtitle, setSubtitle] = useState(settings.bestSellerSubtitle);
  const [image, setImage] = useState(settings.bestSellerImage);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function toggleProduct(productId: string) {
    setProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : current.length < 8 ? [...current, productId] : current);
  }

  async function handleBannerUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    try {
      const [uploadedImage] = await uploadProductImages([file]);
      if (!uploadedImage) throw new Error("تعذر العثور على الصورة بعد رفعها.");
      setImage(uploadedImage);
      setSuccess("تم رفع صورة البانر. احفظوا التغييرات لنشرها.");
    } catch (uploadError) {
      console.error("Unable to upload best seller banner:", uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع صورة البانر.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const result = await saveBestSellersAction({
        bestSellerProductIds: productIds,
        bestSellerTitle: title,
        bestSellerSubtitle: subtitle,
        bestSellerImage: image,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("تم حفظ قسم أفضل المبيعات وتحديث واجهة المتجر.");
    } catch (saveError) {
      console.error("Unable to save best seller settings:", saveError);
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ إعدادات أفضل المبيعات.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-table-card best-sellers-manager" id="best-sellers" aria-labelledby="best-sellers-title">
      <div className="admin-table-heading">
        <div>
          <h2 id="best-sellers-title">أفضل المبيعات</h2>
          <p>اختاروا حتى 8 منتجات لعرضها في واجهة المتجر، وحددوا العنوان وصورة البانر.</p>
        </div>
        <span className="admin-order-count">{productIds.length}/8 منتجات</span>
      </div>

      <div className="best-sellers-settings">
        <label className="product-field">
          <span>عنوان القسم</span>
          <input maxLength={100} value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
        </label>
        <label className="product-field">
          <span>العنوان الترويجي</span>
          <textarea maxLength={240} rows={2} value={subtitle} onChange={(event) => setSubtitle(event.currentTarget.value)} />
        </label>
        <div className="product-field product-field-wide">
          <label htmlFor="best-sellers-banner">صورة البانر</label>
          <input
            id="best-sellers-banner"
            type="file"
            accept={ACCEPTED_IMAGE_INPUT}
            disabled={isUploading || isSaving}
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = "";
              void handleBannerUpload(file);
            }}
          />
          <input
            aria-label="رابط صورة البانر"
            placeholder="رابط صورة HTTP أو HTTPS أو ارفعوا صورة"
            value={image}
            onChange={(event) => setImage(event.currentTarget.value)}
          />
          {image && (
            <div className="best-sellers-banner-preview">
              <AdminImage src={getAbsoluteImageUrl(image)} alt="معاينة صورة البانر" fill sizes="240px" />
            </div>
          )}
        </div>
      </div>

      <div className="best-sellers-product-grid" role="group" aria-label="اختيار منتجات أفضل المبيعات">
        {products.filter((product) => product.isActive).map((product) => {
          const isSelected = productIds.includes(product.id);
          const isLimitReached = productIds.length >= 8 && !isSelected;

          return (
            <label
              className={`best-seller-product-option${isSelected ? " is-selected" : ""}`}
              key={product.id}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isLimitReached || isSaving}
                onChange={() => toggleProduct(product.id)}
              />
              <span className="best-seller-product-image">
                {product.imageUrls[0]
                  ? <AdminImage src={getAbsoluteImageUrl(product.imageUrls[0])} alt="" fill sizes="80px" />
                  : <span aria-hidden="true">HK</span>}
              </span>
              <span className="best-seller-product-name">{getProductTitleAr(product.title)}</span>
              <span className="best-seller-product-check" aria-hidden="true">{isSelected ? "✓" : "+"}</span>
            </label>
          );
        })}
      </div>

      {products.every((product) => !product.isActive) && (
        <p className="admin-data-error">فعّلوا منتجاً واحداً على الأقل قبل اختياره ضمن أفضل المبيعات.</p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="admin-success-message" role="status">{success}</p>}
      <div className="best-sellers-actions">
        <button type="button" className="admin-primary-button" onClick={() => void handleSave()} disabled={isSaving || isUploading || !title.trim()}>
          {isSaving ? "جارٍ الحفظ…" : "حفظ قسم أفضل المبيعات"}
        </button>
        <span>يظهر القسم على الصفحة الرئيسية بعد الحفظ.</span>
      </div>
    </section>
  );
}
