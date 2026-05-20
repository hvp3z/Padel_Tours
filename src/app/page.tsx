import { SearchForm } from "@/components/SearchForm";

export default function HomePage() {
  return (
    <div className="space-y-6 pt-2">
      <SearchForm />

      <section className="card text-sm text-slate-600 dark:text-slate-400 space-y-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Comment ça marche ?</h2>
        <p>
          On interroge en temps réel les sites de réservation de tous les clubs de padel de l&apos;agglo de Tours (Playtomic, Doinsport, Anybuddy, sites custom).
        </p>
        <p>
          Quand tu trouves un créneau qui te va, le bouton &laquo; Réserver &raquo; t&apos;envoie directement sur le panier du site qui gère ce club.
        </p>
      </section>
    </div>
  );
}
