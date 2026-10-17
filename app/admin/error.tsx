"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-login-page">
      <section className="admin-login-card" role="alert">
        <span className="admin-eyebrow">ERREUR SERVEUR</span>
        <h1>La page d’administration est indisponible.</h1>
        <p>
          Consultez les journaux d’exécution Vercel pour trouver la cause. Cet
          identifiant permet de rapprocher l’erreur des journaux :
        </p>
        <p>{error.digest ?? "Identifiant indisponible"}</p>
        <button className="admin-primary-button" onClick={() => reset()}>
          Réessayer
        </button>
      </section>
    </main>
  );
}
