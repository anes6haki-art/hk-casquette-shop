import Link from "next/link";

export function getAdminAuthFallbackMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Set ADMIN_PASSWORD.") {
      return "La variable ADMIN_PASSWORD n’est pas configurée sur Vercel.";
    }
    if (error.message === "Production ADMIN_PASSWORD must contain at least 12 characters.") {
      return "ADMIN_PASSWORD doit contenir au moins 12 caractères en production.";
    }
    if (error.message === "ADMIN_SESSION_SECRET must contain at least 32 characters.") {
      return "ADMIN_SESSION_SECRET doit contenir au moins 32 caractères.";
    }
  }

  return "Impossible de vérifier la session administrateur. Consultez le détail de l’erreur ci-dessous.";
}

export function getAdminErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Une erreur inconnue est survenue.";
}

export default function AdminAuthFallback({
  message,
  errorDetail,
}: {
  message: string;
  errorDetail: string;
}) {
  return (
    <main className="admin-login-page">
      <section className="admin-login-card" role="alert">
        <span className="admin-eyebrow">CONFIGURATION ADMIN</span>
        <h1>Administration indisponible.</h1>
        <p>{message}</p>
        <p>Détail de l’erreur :</p>
        <pre className="admin-error-detail">{errorDetail}</pre>
        <Link className="admin-back-link" href="/">Retour à la boutique</Link>
      </section>
    </main>
  );
}
