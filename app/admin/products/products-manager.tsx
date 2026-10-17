"use client";

import Image from "next/image";
import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import type { ProductDto } from "@/lib/store-data";
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
      setError("Ajoutez au maximum 12 couleurs par produit.");
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
    if (existingImageCount + files.length > 8) {
      setError("Ajoutez au maximum 8 images au total.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);
    try {
      const uploadData = new FormData();
      for (const file of files) uploadData.append("images", file);
      const response = await fetch("/admin/products/upload", {
        method: "POST",
        body: uploadData,
      });
      const result: { imageUrls?: string[]; error?: string } = await response.json();
      if (!response.ok || !result.imageUrls) {
        setError(result.error ?? "Impossible d’envoyer les images.");
        return;
      }

      const uploadedUrls = result.imageUrls;
      setForm((current) => {
        const imageUrls = parseImageUrls(current.imageUrls);
        return { ...current, imageUrls: [...imageUrls, ...uploadedUrls].join("\n") };
      });
      setSuccess(`${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} envoyée${uploadedUrls.length === 1 ? "" : "s"}.`);
    } catch (uploadError) {
      console.error("Unable to upload product images:", uploadError);
      setError("Échec de l’envoi. Vérifiez votre connexion et réessayez.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleVariantImageUpload(index: number, event: ChangeEvent<HTMLInputElement>) {
    const inputElement = event.currentTarget;
    const files = Array.from(inputElement.files ?? []);
    inputElement.value = "";
    if (files.length === 0) return;

    const existingImageCount = parseImageUrls(form.variants[index]?.images ?? "").length;
    if (existingImageCount + files.length > 8) {
      setError("Ajoutez au maximum 8 photos par couleur.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);
    try {
      const uploadData = new FormData();
      for (const file of files) uploadData.append("images", file);
      const response = await fetch("/admin/products/upload", { method: "POST", body: uploadData });
      const result: { imageUrls?: string[]; error?: string } = await response.json();
      if (!response.ok || !result.imageUrls) {
        setError(result.error ?? "Impossible d’envoyer les images.");
        return;
      }
      const uploadedUrls = result.imageUrls;

      setForm((current) => ({
        ...current,
        variants: current.variants.map((variant, variantIndex) =>
          variantIndex === index
            ? { ...variant, images: [...parseImageUrls(variant.images), ...uploadedUrls].join("\n") }
            : variant,
        ),
      }));
      setSuccess(`${uploadedUrls.length} photo${uploadedUrls.length === 1 ? "" : "s"} ajoutée${uploadedUrls.length === 1 ? "" : "s"} à la couleur.`);
    } catch (uploadError) {
      console.error("Unable to upload product variant images:", uploadError);
      setError("Échec de l’envoi. Vérifiez votre connexion et réessayez.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const imageUrls = parseImageUrls(form.imageUrls);
    if (imageUrls.length > 8) {
      setError("Ajoutez au maximum 8 images au total.");
      return;
    }
    const numericFields = [form.originalPrice, form.discountedPrice, form.stockQuantity];
    if (numericFields.some((value) => !/^\d+$/.test(value))) {
      setError("Les prix et le stock doivent être des nombres entiers.");
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
      setSuccess(input.id ? "Produit modifié avec succès." : "Produit créé avec succès.");
    });
  }

  function handleDelete(product: ProductDto) {
    if (!window.confirm(`Supprimer « ${product.title} » ? Cette action est définitive.`)) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (form.id === product.id) setForm(emptyForm);
      setSuccess("Produit supprimé.");
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
      setSuccess(`${product.title} est maintenant disponible dans le catalogue.`);
    });
  }

  return (
    <>
      <section className="admin-table-card product-editor-card" id="product-editor" aria-labelledby="product-editor-title">
        <div className="admin-table-heading">
          <div>
            <h2 id="product-editor-title">{form.id ? "Modifier le produit" : "Ajouter un produit"}</h2>
            <p>Les casquettes actives sont visibles dans le catalogue public.</p>
          </div>
        </div>
        <form className="product-editor-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <label className="product-field product-field-wide">
              <span>Titre</span>
              <input maxLength={120} required value={form.title} onChange={(event) => updateField("title", event.currentTarget.value)} />
            </label>
            <label className="product-field product-field-wide">
              <span>Description</span>
              <textarea maxLength={4000} rows={4} required value={form.description} onChange={(event) => updateField("description", event.currentTarget.value)} />
            </label>
            <label className="product-field">
              <span>Prix original (DA)</span>
              <input type="number" min="1" max="100000000" step="1" required value={form.originalPrice} onChange={(event) => updateField("originalPrice", event.currentTarget.value)} />
            </label>
            <label className="product-field">
              <span>Prix remisé (DA)</span>
              <input type="number" min="1" max="100000000" step="1" required value={form.discountedPrice} onChange={(event) => updateField("discountedPrice", event.currentTarget.value)} />
            </label>
            <label className="product-field">
              <span>Quantité en stock</span>
              <input type="number" min="0" max="1000000" step="1" required value={form.stockQuantity} onChange={(event) => updateField("stockQuantity", event.currentTarget.value)} />
            </label>
            <label className="product-field product-field-wide">
              <span>Choisir des photos sur votre appareil</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                disabled={isUploading || isPending}
                onChange={handleImageUpload}
              />
              <small>JPEG, PNG, WebP ou AVIF · 5 Mo maximum par image · 8 photos au total.</small>
            </label>
            <label className="product-field product-field-wide">
              <span>Photos du produit (une URL par ligne, maximum 8)</span>
              <textarea rows={3} placeholder={"https://exemple.com/image-produit.jpg\nhttps://exemple.com/autre-image.jpg"} value={form.imageUrls} onChange={(event) => updateField("imageUrls", event.currentTarget.value)} />
              <small>{parseImageUrls(form.imageUrls).length}/8 photos. Les photos envoyées sont ajoutées ici automatiquement. Vous pouvez aussi saisir plusieurs URL HTTP ou HTTPS, une par ligne.</small>
            </label>
          </div>
          <section className="product-variants-editor" aria-labelledby="product-variants-title">
            <div className="product-variants-heading">
              <div>
                <h3 id="product-variants-title">Couleurs et photos associées</h3>
                <p>Chaque couleur affiche sa propre galerie sur la fiche produit.</p>
              </div>
              <button type="button" onClick={addVariant} disabled={isPending || isUploading || form.variants.length >= 12}>
                Ajouter une couleur
              </button>
            </div>
            {form.variants.map((variant, index) => {
              const variantImages = parseImageUrls(variant.images);
              return (
                <div className="product-variant-editor" key={index}>
                  <div className="product-variant-heading">
                    <strong>Couleur {index + 1}</strong>
                    <button
                      className="product-delete-button"
                      type="button"
                      onClick={() => setForm((current) => ({
                        ...current,
                        variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
                      }))}
                      disabled={isPending || isUploading}
                    >
                      Supprimer la couleur
                    </button>
                  </div>
                  <div className="product-form-grid">
                    <label className="product-field">
                      <span>Nom de la couleur</span>
                      <input
                        maxLength={40}
                        placeholder="Noir, Terracotta…"
                        value={variant.colorName}
                        onChange={(event) => updateVariant(index, "colorName", event.currentTarget.value)}
                      />
                    </label>
                    <label className="product-field">
                      <span>Code couleur</span>
                      <input
                        type="color"
                        value={variant.colorHex}
                        onChange={(event) => updateVariant(index, "colorHex", event.currentTarget.value)}
                      />
                    </label>
                    <label className="product-field product-field-wide">
                      <span>Photos de cette couleur</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        multiple
                        disabled={isUploading || isPending}
                        onChange={(event) => void handleVariantImageUpload(index, event)}
                      />
                      <small>Jusqu’à 8 photos JPEG, PNG, WebP ou AVIF · 5 Mo maximum par photo.</small>
                    </label>
                    <label className="product-field product-field-wide">
                      <span>URL des photos (une par ligne)</span>
                      <textarea
                        rows={3}
                        placeholder={"https://exemple.com/casquette-noire.jpg\nhttps://exemple.com/detail-broderie.jpg"}
                        value={variant.images}
                        onChange={(event) => updateVariant(index, "images", event.currentTarget.value)}
                      />
                      <small>{variantImages.length}/8 photos pour cette couleur.</small>
                    </label>
                  </div>
                  {variantImages.length > 0 && (
                    <div className="product-image-previews" aria-label={`Aperçu des photos de la couleur ${variant.colorName || index + 1}`}>
                      {variantImages.map((imageUrl, imageIndex) => (
                        <div className="product-image-preview" key={`${imageUrl}-${imageIndex}`}>
                          <Image src={imageUrl} alt={`Photo ${imageIndex + 1} de ${variant.colorName || `la couleur ${index + 1}`}`} width={52} height={52} unoptimized />
                          <span>Photo {imageIndex + 1}</span>
                          <button
                            type="button"
                            aria-label={`Retirer la photo ${imageIndex + 1} de ${variant.colorName || `la couleur ${index + 1}`}`}
                            disabled={isPending || isUploading}
                            onClick={() => updateVariant(
                              index,
                              "images",
                              variantImages.filter((_, photoIndex) => photoIndex !== imageIndex).join("\n"),
                            )}
                          >
                            Retirer
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
            <div className="product-image-previews" aria-label="Aperçu des photos du produit">
              {parseImageUrls(form.imageUrls).map((imageUrl, index) => (
                <div className="product-image-preview" key={`${imageUrl}-${index}`}>
                  <Image src={imageUrl} alt={`Aperçu de la photo ${index + 1}`} width={52} height={52} unoptimized />
                  <span>Photo {index + 1}</span>
                  <button
                    type="button"
                    aria-label={`Retirer la photo ${index + 1}`}
                    disabled={isPending || isUploading}
                    onClick={() => updateField(
                      "imageUrls",
                      parseImageUrls(form.imageUrls).filter((_, imageIndex) => imageIndex !== index).join("\n"),
                    )}
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="product-active-toggle">
            <input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.currentTarget.checked)} />
            <span>Afficher cette casquette dans le catalogue</span>
          </label>
          {error && <p className="product-action-error" role="alert">{error}</p>}
          {success && <p className="product-action-success" role="status">{success}</p>}
          <div className="product-form-actions">
            <button className="admin-primary-button" type="submit" disabled={isPending || isUploading}>
              {isUploading ? "Envoi des photos…" : isPending ? "Enregistrement…" : form.id ? "Enregistrer les modifications" : "Créer le produit"}
            </button>
            {form.id && <button className="product-cancel-button" type="button" onClick={resetForm} disabled={isPending || isUploading}>Annuler</button>}
          </div>
        </form>
      </section>

      <section className="products-list-section" aria-labelledby="products-list-title">
        <div className="products-list-heading">
          <div>
            <h2 id="products-list-title">Vos produits</h2>
            <p>Activez les casquettes que vous souhaitez proposer à vos clients.</p>
          </div>
        </div>
        {products.length === 0 ? (
          <div className="admin-table-card admin-empty">
            <span aria-hidden="true">✳</span>
            <strong>Votre catalogue est vide</strong>
            <p>Ajoutez une casquette pour commencer à remplir votre catalogue.</p>
          </div>
        ) : (
          <div className="product-cards-grid">
            {products.map((product) => (
              <article className="product-admin-card" key={product.id}>
                <div
                  className="product-admin-image"
                  role="img"
                  aria-label={product.title}
                  style={product.imageUrls[0] ? { backgroundImage: `url("${product.imageUrls[0].replaceAll('"', "%22")}")` } : undefined}
                >
                  {!product.imageUrls[0] && <span>Pas d’image</span>}
                </div>
                <div className="product-admin-body">
                  <div className="product-admin-title-row">
                    <h3>{product.title}</h3>
                    <span className={`product-status-badge${product.isActive ? " is-active" : ""}`}>
                      {product.isActive ? "En ligne" : "Masqué"}
                    </span>
                  </div>
                  <p className="product-admin-description">{product.description}</p>
                  <div className="product-admin-meta">
                    <span><strong>{formatPrice(product.discountedPrice)}</strong>{product.originalPrice > product.discountedPrice && <del>{formatPrice(product.originalPrice)}</del>}</span>
                    <span>Stock : <strong>{product.stockQuantity}</strong></span>
                  </div>
                  <div className="product-admin-actions">
                    <button type="button" onClick={() => editProduct(product)} disabled={isPending}>Modifier</button>
                    {!product.isActive && (
                      <button type="button" onClick={() => handleActivate(product)} disabled={isPending}>Activer</button>
                    )}
                    <button className="product-delete-button" type="button" onClick={() => handleDelete(product)} disabled={isPending}>Supprimer</button>
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
