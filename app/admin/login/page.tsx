import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import AdminAuthFallback, {
  getAdminAuthFallbackMessage,
  getAdminErrorDetail,
} from "../admin-auth-fallback";
import LoginForm from "../login-form";

export const instant = false;

export default async function AdminLoginPage() {
  await connection();

  let isAuthenticated: boolean;
  try {
    isAuthenticated = await hasAdminSession();
  } catch (error: unknown) {
    console.error("Failed to validate admin session for login.", error);
    return (
      <AdminAuthFallback
        message={getAdminAuthFallbackMessage(error)}
        errorDetail={getAdminErrorDetail(error)}
      />
    );
  }

  if (isAuthenticated) {
    redirect("/admin");
  }

  return (
    <main className="admin-login-page">
      <Link className="shop-brand admin-shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
      <LoginForm />
    </main>
  );
}
