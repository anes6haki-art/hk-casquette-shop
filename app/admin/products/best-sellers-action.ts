"use server";

import { revalidatePath } from "next/cache";
import {
  updateStorefrontSettings,
  type StorefrontSettingsDto,
} from "@/lib/storefront-settings";

export async function saveBestSellersAction(input: StorefrontSettingsDto) {
  try {
    await updateStorefrontSettings(input);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { error: null };
  } catch (error) {
    console.error("Unable to save best seller settings:", error);
    return {
      error: error instanceof Error ? error.message : "تعذر حفظ إعدادات أفضل المبيعات.",
    };
  }
}
