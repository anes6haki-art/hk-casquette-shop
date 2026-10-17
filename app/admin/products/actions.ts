"use server";

import { revalidatePath } from "next/cache";
import { saveProduct, deleteProduct } from "@/lib/products";
import type { ProductInput } from "@/lib/products";

export type ProductActionResult = { error: string | null };

export async function saveProductAction(input: ProductInput): Promise<ProductActionResult> {
  try {
    await saveProduct(input);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    revalidatePath("/");
    return { error: null };
  } catch (error) {
    console.error("Unable to save product:", error);
    return {
      error: error instanceof Error ? error.message : "Impossible d’enregistrer le produit.",
    };
  }
}

export async function deleteProductAction(id: string): Promise<ProductActionResult> {
  try {
    await deleteProduct(id);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    revalidatePath("/");
    return { error: null };
  } catch (error) {
    console.error("Unable to delete product:", error);
    return {
      error: error instanceof Error ? error.message : "Impossible de supprimer le produit.",
    };
  }
}
