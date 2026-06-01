import { ExternalLink, Clock, MapPin } from "lucide-react";
import type { SearchResponse } from "@/lib/search";
import { formatDistance, formatTime } from "@/lib/utils";

interface Props {
  data: SearchResponse;
}

export function ResultsList({ data }: Props) {
  if (data.totalClubs === 0) {
    return (
      <div className="card text-center py-12">
        <MapPin className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <p className="font-medium">Aucun club dans le rayon</p>
        <p className="text-sm text-slate-500 mt-1">Essaie d&apos;élargir le rayon ou de changer de date.</p>
      </div>
    );
  }

  const clubsWithSlots = data.results.filter((r) => r.slots.length > 0);
  const clubsWithoutSlots = data.results.filter((r) => r.slots.length === 0 && !r.error);

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-slate-900 dark:text-slate-100">{data.totalSlots}</span>{" "}
        créneaux dispo dans{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-100">{clubsWithSlots.length}</span>{" "}
        clubs
      </div>

      {clubsWithSlots.map((r) => (
        <div key={r.club.id} className="card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold">{r.club.name}</h3>
              <p className="text-xs text-slate-500">
                {r.club.city} · {formatDistance(r.club.distanceMeters)} · {r.club.provider}
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {r.slots.length} créneaux
            </span>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {r.slots.slice(0, 12).map((slot, idx) => (
              <li key={idx}>
                <a
                  href={slot.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 p-2 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
                >
                  <span className="flex items-center gap-1 font-semibold text-sm">
                    <Clock className="h-3 w-3" />
                    {formatTime(slot.startTime)}
                  </span>
                  <span className="text-xs text-slate-500 truncate">{slot.courtName}</span>
                  {slot.priceEur !== undefined && (
                    <span className="text-xs font-medium mt-0.5">{slot.priceEur}€</span>
                  )}
                  <span className="text-xs text-brand-700 dark:text-brand-300 mt-1 flex items-center gap-0.5">
                    Réserver <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {r.slots.length > 12 && (
            <p className="text-xs text-slate-500 mt-2">+ {r.slots.length - 12} autres créneaux</p>
          )}
        </div>
      ))}

      {clubsWithoutSlots.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium">
            {clubsWithoutSlots.length} clubs sans créneau dispo
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {clubsWithoutSlots.map((r) => (
              <li key={r.club.id} className="flex items-center justify-between">
                <span>{r.club.name}</span>
                <span className="text-xs text-slate-500">{formatDistance(r.club.distanceMeters)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

    </div>
  );
}
