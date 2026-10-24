"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import {
  updateOrderStatus as saveOrderStatus,
  updateShippingRate as saveShippingRate,
  deleteOrder,
} from "@/lib/orders";

export type LoginState = {
  error: string | null;
};

export async function loginAdmin(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return { error: "Mot de passe incorrect. Veuillez réessayer." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
  cookieStore.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  redirect("/admin/login");
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = formData.get("orderId");
  const status = formData.get("status");
  if (typeof orderId !== "string" || typeof status !== "string") {
    throw new Error("Invalid order status update.");
  }

  await saveOrderStatus(orderId, status);
  revalidatePath("/admin");
}

export async function deleteOrderAction(formData: FormData) {
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string") throw new Error("Invalid order id");
  await deleteOrder(orderId);
  revalidatePath("/admin");
}

export async function updateShippingRate(formData: FormData) {
  const wilaya = formData.get("wilaya");
  const homePrice = formData.get("homePrice");
  const deskPrice = formData.get("deskPrice");
  if (
    typeof wilaya !== "string" ||
    typeof homePrice !== "string" ||
    typeof deskPrice !== "string" ||
    !/^\d+$/.test(homePrice) ||
    !/^\d+$/.test(deskPrice)
  ) {
    throw new Error("Invalid shipping price details.");
  }

  await saveShippingRate(wilaya, Number(homePrice), Number(deskPrice));
  revalidatePath("/admin");
}
