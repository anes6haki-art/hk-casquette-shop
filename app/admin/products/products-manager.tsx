"use client";

import Image from "next/image";
import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import {
  getProductDescriptionAr,
  getProductTitleAr,
  type ProductDto,
} from "@/lib/store-data";
import {
  ACCEPTED_IMAGE_INPUT,
  MAX_UPLOAD_IMAGES,
  uploadProductImages,
} from "./image-upload";
import { deleteProductAction, saveProductAction } from "./actions";

type ProductForm = {
  id: string;
  title: string;
  description: string;
  originalPrice: string;
  discountedPrice: string;
  stockQuantity: string;
  imageUrls: string;
  variants: VariantForm[];
  isActive: boolean;
};

type VariantForm = {
  colorName: string;
  colorHex: string;
  images: string;
};

const emptyForm: ProductForm = {
  id: "",
  title: "",
  description: "",
  originalPrice: "",
  discountedPrice: "",
  stockQuantity: "0",
  imageUrls: "",
  variants: [],
  isActive: true,
};

function formatPrice(price: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(price)} DA`;
}

function parseImageUrls(value: string) {
  return value
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
}

export default function ProductsManager({ products }: { products: ProductDto[] }) {
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  function updateField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateVariant(index: number, key: keyof VariantForm, value: string) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant,
      ),
    }));
  }

  function addVariant() {
    if (form.variants.length >= 12) {
      setError("يمكن إضافة 12 لوناً كحد أقصى لكل منتج.");
      return;
    }
    setForm((current) => ({
      ...current,
      variants: [...current.variants, { colorName: "", colorHex: "#18181b", images: "" }],
    }));
    setError(null);
  }

  function editProduct(product: ProductDto) {
    setError(null);
    setSuccess(null);
    setForm({
      id: product.id,
      title: product.title,
      description: product.description,
      originalPrice: String(product.originalPrice),
      discountedPrice: String(product.discountedPrice),
      stockQuantity: String(product.stockQuantity),
      imageUrls: product.imageUrls.join("\n"),
      variants: product.variants.map((variant) => ({
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        images: variant.images.join("\n"),
      })),
      isActive: product.isActive,
    });
    document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const inputElement = event.currentTarget;
    const files = Array.from(inputElement.files ?? []);
    inputElement.value = "";
    if (files.length === 0) return;

    const existingImageCount = parseImageUrls(form.imageUrls).length;
    if (existingImageCount + files.length > MAX_UPLOAD_IMAGES) {
      setError(`يمكن إضافة ${MAX_UPLOAD_IMAGES} صور كحد أقصى.`);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);
    setUploadProgress(null);
    try {
      const uploadedUrls = await uploadProductImages(files, (message) => setUploadProgress(message));
      setForm((current) => {
        const imageUrls = parseImageUrls(current.imageUrls);
        return { ...current, imageUrls: [...imageUrls, ...uploadedUrls].join("\n") };
      });
      setSuccess(`تم رفع ${uploadedUrls.length} صورة.`);
    } catch (uploadError) {
      console.error("Unable to upload product images:", uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الصور.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleVariantImageUpload(index: number, event: ChangeEvent<HTMLInputElement>) {
    const inputElement = event.currentTarget;
    const files = Array.from(inputElement.files ?? []);
    inputElement.value = "";
    if (files.length === 0) return;

    const existingImageCount = parseImageUrls(form.variants[index]?.images ?? "").length;
    if (existingImageCount + files.length > MAX_UPLOAD_IMAGES) {
      setError(`يمكن إضافة ${MAX_UPLOAD_IMAGES} صور كحد أقصى لكل لون.`);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);
    setUploadProgress(null);
    try {
      const uploadedUrls = await uploadProductImages(files, (message) => setUploadProgress(message));
      setForm((current) => ({
        ...current,
        variants: current.variants.map((variant, variantIndex) =>
          variantIndex === index
            ? { ...variant, images: [...parseImageUrls(variant.images), ...uploadedUrls].join("\n") }
            : variant,
        ),
      }));
      setSuccess(`تمت إضافة ${uploadedUrls.length} صورة إلى اللون.`);
    } catch (uploadError) {
      console.error("Unable to upload product variant images:", uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الصور.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const imageUrls = parseImageUrls(form.imageUrls);
    if (imageUrls.length > 8) {
      setError("يمكن إضافة 8 صور كحد أقصى.");
      return;
    }
    const numericFields = [form.originalPrice, form.discountedPrice, form.stockQuantity];
    if (numericFields.some((value) => !/^\d+$/.test(value))) {
      setError("يجب أن تكون الأسعار والكمية أعداداً صحيحة.");
      return;
    }

    const input = {
      ...(form.id ? { id: form.id } : {}),
      title: form.title,
      description: form.description,
      originalPrice: Number(form.originalPrice),
      discountedPrice: Number(form.discountedPrice),
      stockQuantity: Number(form.stockQuantity),
      imageUrls,
      variants: form.variants
        .filter((variant) => variant.colorName.trim() || variant.images.trim())
        .map((variant) => ({
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          images: parseImageUrls(variant.images),
        })),
      isActive: form.isActive,
    };

    startTransition(async () => {
      const result = await saveProductAction(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      setForm(emptyForm);
      setSuccess(input.id ? "تم تعديل المنتج بنجاح." : "تم إنشاء المنتج بنجاح.");
    });
  }

  function handleDelete(product: ProductDto) {
    if (!window.confirm(`حذف « ${getProductTitleAr(product.title)} »؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (form.id === product.id) setForm(emptyForm);
      setSuccess("تم حذف المنتج.");
    });
  }

  function handleActivate(product: ProductDto) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveProductAction({
        id: product.id,
        title: product.title,
        description: product.description,
        originalPrice: product.originalPrice,
        discountedPrice: product.discountedPrice,
        stockQuantity: product.stockQuantity,
        imageUrls: product.imageUrls,
        variants: product.variants,
        isActive: true,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(`أصبح ${getProductTitleAr(product.title)} متاحاً في الكتالوج.`);
    });
  }

  return (
    <>
      <section className="admin-table-card product-editor-card" id="product-editor" aria-labelledby="product-editor-title">
        <div className="admin-table-heading">
          <div>
            <h2 id="product-editor-title">{form.id ? "تعديل المنتج" : "إضافة منتج"}</h2>
            <p>تظهر القبعات المفعّلة في كتالوج المتجر.</p>
          </div>
        </div>
        <form className="product-editor-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <label className="product-field product-field-wide">
              <span>اسم المنتج</span>
              <input maxLength={120} required value={form.title} onChange={(event) => updateField("title", event.currentTarget.value)} />
            </label>
            <label className="product-field product-field-wide">
              <span>الوصف</span>
              <textarea maxLength={4000} rows={4} required value={form.description} onChange={(event) => updateField("description", event.currentTarget.value)} />
            </label>
            <label className="product-field">
              <span>السعر الأصلي (دج)</span>
              <input type="number" min="1" max="100000000" step="1" required value={form.originalPrice} onChange={(event) => updateField("originalPrice", event.currentTarget.value)} />
            </label>
            <label className="product-field">
              <span>السعر بعد التخفيض (دج)</span>
              <input type="number" min="1" max="100000000" step="1" required value={form.discountedPrice} onChange={(event) => updateField("discountedPrice", event.currentTarget.value)} />
            </label>
            <label className="product-field">
              <span>الكمية في المخزون</span>
              <input type="number" min="0" max="1000000" step="1" required value={form.stockQuantity} onChange={(event) => updateField("stockQuantity", event.currentTarget.value)} />
            </label>
            <label className="product-field product-field-wide">
              <span>اختيار صور من جهازكم</span>
              <input
                type="file"
                accept={ACCEPTED_IMAGE_INPUT}
                multiple
                disabled={isUploading || isPending}
                onChange={(event) => void handleImageUpload(event)}
              />
              <small>JPEG أو PNG أو WebP أو AVIF · 5 ميغابايت كحد أقصى للصورة · 8 صور إجمالاً.</small>
            </label>
            <label className="product-field product-field-wide">
              <span>صور المنتج (رابط واحد في كل سطر، 8 كحد أقصى)</span>
              <textarea rows={3} placeholder={"https://exemple.com/image-produit.jpg\nhttps://exemple.com/autre-image.jpg"} value={form.imageUrls} onChange={(event) => updateField("imageUrls", event.currentTarget.value)} />
              <small>{parseImageUrls(form.imageUrls).length}/8 صور. تضاف الصور المرفوعة هنا تلقائياً. يمكنكم أيضاً إدخال روابط HTTP أو HTTPS، رابطاً في كل سطر.</small>
            </label>
          </div>
          <section className="product-variants-editor" aria-labelledby="product-variants-title">
            <div className="product-variants-heading">
              <div>
                <h3 id="product-variants-title">الألوان والصور المرتبطة</h3>
                <p>يظهر معرض خاص لكل لون في صفحة المنتج.</p>
              </div>
              <button type="button" onClick={addVariant} disabled={isPending || isUploading || form.variants.length >= 12}>
                إضافة لون
              </button>
            </div>
            {form.variants.map((variant, index) => {
              const variantImages = parseImageUrls(variant.images);
              return (
                <div className="product-variant-editor" key={index}>
                  <div className="product-variant-heading">
                    <strong>اللون {index + 1}</strong>
                    <button
                      className="product-delete-button"
                      type="button"
                      onClick={() => setForm((current) => ({
                        ...current,
                        variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
                      }))}
                      disabled={isPending || isUploading}
                    >
                      حذف اللون
                    </button>
                  </div>
                  <div className="product-form-grid">
                    <label className="product-field">
                      <span>اسم اللون</span>
                      <input
                        maxLength={40}
                        placeholder="أسود، طوبي…"
                        value={variant.colorName}
                        onChange={(event) => updateVariant(index, "colorName", event.currentTarget.value)}
                      />
                    </label>
                    <label className="product-field">
                      <span>رمز اللون</span>
                      <input
                        type="color"
                        value={variant.colorHex}
                        onChange={(event) => updateVariant(index, "colorHex", event.currentTarget.value)}
                      />
                    </label>
                    <label className="product-field product-field-wide">
                      <span>صور هذا اللون</span>
                      <input
                        type="file"
                        accept={ACCEPTED_IMAGE_INPUT}
                        multiple
                        disabled={isUploading || isPending}
                        onChange={(event) => void handleVariantImageUpload(index, event)}
                      />
                      <small>حتى 8 صور بصيغة JPEG أو PNG أو WebP أو AVIF · 5 ميغابايت كحد أقصى للصورة.</small>
                    </label>
                    <label className="product-field product-field-wide">
                      <span>روابط الصور (رابط واحد في كل سطر)</span>
                      <textarea
                        rows={3}
                        placeholder={"https://exemple.com/casquette-noire.jpg\nhttps://exemple.com/detail-broderie.jpg"}
                        value={variant.images}
                        onChange={(event) => updateVariant(index, "images", event.currentTarget.value)}
                      />
                      <small>{variantImages.length}/8 صور لهذا اللون.</small>
                    </label>
                  </div>
                  {variantImages.length > 0 && (
                    <div className="product-image-previews" aria-label={`معاينة صور اللون ${variant.colorName || index + 1}`}>
                      {variantImages.map((imageUrl, imageIndex) => (
                        <div className="product-image-preview" key={`${imageUrl}-${imageIndex}`}>
                          <Image src={imageUrl} alt={`Photo ${imageIndex + 1} de ${variant.colorName || `la couleur ${index + 1}`}`} width={52} height={52} unoptimized />
                          <span>الصورة {imageIndex + 1}</span>
                          <button
                            type="button"
                            aria-label={`إزالة الصورة ${imageIndex + 1} من اللون ${variant.colorName || index + 1}`}
                            disabled={isPending || isUploading}
                            onClick={() => updateVariant(
                              index,
                              "images",
                              variantImages.filter((_, photoIndex) => photoIndex !== imageIndex).join("\n"),
                            )}
                          >
                            إزالة
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
          {parseImageUrls(form.imageUrls).length > 0 && (
            <div className="product-image-previews" aria-label="معاينة صور المنتج">
              {parseImageUrls(form.imageUrls).map((imageUrl, index) => (
                <div className="product-image-preview" key={`${imageUrl}-${index}`}>
                  <Image src={imageUrl} alt={`Aperçu de la photo ${index + 1}`} width={52} height={52} unoptimized />
                  <span>الصورة {index + 1}</span>
                  <button
                    type="button"
                    aria-label={`إزالة الصورة ${index + 1}`}
                    disabled={isPending || isUploading}
                    onClick={() => updateField(
                      "imageUrls",
                      parseImageUrls(form.imageUrls).filter((_, imageIndex) => imageIndex !== index).join("\n"),
                    )}
                  >
                    إزالة
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="product-active-toggle">
            <input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.currentTarget.checked)} />
            <span>عرض هذه القبعة في الكتالوج</span>
          </label>
          {error && <p className="product-action-error" role="alert">{error}</p>}
          {success && <p className="product-action-success" role="status">{success}</p>}
          {uploadProgress && (
            <p className="product-upload-progress" role="status">
              {uploadProgress}
            </p>
          )}
          <div className="product-form-actions">
            <button className="admin-primary-button" type="submit" disabled={isPending || isUploading}>
              {isUploading ? "جارٍ رفع الصور…" : isPending ? "جارٍ الحفظ…" : form.id ? "حفظ التعديلات" : "إنشاء المنتج"}
            </button>
            {form.id && <button className="product-cancel-button" type="button" onClick={resetForm} disabled={isPending || isUploading}>إلغاء</button>}
          </div>
        </form>
      </section>

      <section className="products-list-section" aria-labelledby="products-list-title">
        <div className="products-list-heading">
          <div>
            <h2 id="products-list-title">منتجاتكم</h2>
            <p>فعّلوا القبعات التي ترغبون في عرضها على العملاء.</p>
          </div>
        </div>
        {products.length === 0 ? (
          <div className="admin-table-card admin-empty">
            <span aria-hidden="true">✳</span>
            <strong>كتالوجكم فارغ</strong>
            <p>أضيفوا قبعة لبدء ملء الكتالوج.</p>
          </div>
        ) : (
          <div className="product-cards-grid">
            {products.map((product) => (
              <article className="product-admin-card" key={product.id}>
                <div
                  className="product-admin-image"
                  role="img"
                  aria-label={getProductTitleAr(product.title)}
                  style={product.imageUrls[0] ? { backgroundImage: `url("${product.imageUrls[0].replaceAll('"', "%22")}")` } : undefined}
                >
                  {!product.imageUrls[0] && <span>لا توجد صورة</span>}
                </div>
                <div className="product-admin-body">
                  <div className="product-admin-title-row">
                    <h3>{getProductTitleAr(product.title)}</h3>
                    <span className={`product-status-badge${product.isActive ? " is-active" : ""}`}>
                      {product.isActive ? "منشور" : "مخفي"}
                    </span>
                  </div>
                  <p className="product-admin-description">{getProductDescriptionAr(product.description)}</p>
                  <div className="product-admin-meta">
                    <span><strong>{formatPrice(product.discountedPrice)}</strong>{product.originalPrice > product.discountedPrice && <del>{formatPrice(product.originalPrice)}</del>}</span>
                    <span>المخزون: <strong>{product.stockQuantity}</strong></span>
                  </div>
                  <div className="product-admin-actions">
                    <button type="button" onClick={() => editProduct(product)} disabled={isPending}>تعديل</button>
                    {!product.isActive && (
                      <button type="button" onClick={() => handleActivate(product)} disabled={isPending}>تفعيل</button>
                    )}
                    <button className="product-delete-button" type="button" onClick={() => handleDelete(product)} disabled={isPending}>حذف</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
