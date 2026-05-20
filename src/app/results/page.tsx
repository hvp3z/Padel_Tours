import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { search } from "@/lib/search";
import { ResultsList } from "@/components/ResultsList";
import { formatDateLong } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SearchParams {
  lat?: string;
  lng?: string;
  radiusKm?: string;
  date?: string;
  durationMinutes?: string;
  startHour?: string;
  endHour?: string;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const radiusKm = Number(params.radiusKm ?? 15);
  const dateStr = params.date ?? new Date().toISOString().slice(0, 10);
  const durationMinutes = Number(params.durationMinutes ?? 90);
  const startHour = params.startHour ? Number(params.startHour) : undefined;
  const endHour = params.endHour ? Number(params.endHour) : undefined;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return (
      <div className="card text-center py-12">
        <p className="font-medium mb-4">Paramètres invalides</p>
        <Link href="/" className="btn-primary">Retour à la recherche</Link>
      </div>
    );
  }

  let data;
  let errorMessage: string | null = null;
  try {
    data = await search({
      lat,
      lng,
      radiusKm,
      date: new Date(`${dateStr}T00:00:00`),
      durationMinutes,
      startHour,
      endHour,
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "unknown error";
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-300">
          <ArrowLeft className="h-4 w-4" />
          Nouvelle recherche
        </Link>
        <div className="text-xs text-slate-500 text-right">
          {formatDateLong(new Date(`${dateStr}T00:00:00`))}
          <br />
          {durationMinutes} min · {radiusKm} km
        </div>
      </div>

      {errorMessage ? (
        <div className="card border-red-200 dark:border-red-900">
          <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">Erreur</h3>
          <p className="text-sm font-mono text-slate-600 dark:text-slate-400">{errorMessage}</p>
          <p className="text-sm mt-3">
            Astuce : vérifie que la DB tourne (<code className="text-xs">pnpm db:up</code>) et qu&apos;elle est seedée (<code className="text-xs">pnpm db:seed</code>).
          </p>
        </div>
      ) : data ? (
        <ResultsList data={data} />
      ) : null}
    </div>
  );
}
