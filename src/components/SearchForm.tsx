"use client";

import { MapPin, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { todayIso, tomorrowIso } from "@/lib/utils";

const DEFAULT_LAT = 47.39414;
const DEFAULT_LNG = 0.68484;

const RADIUS_OPTIONS = [10, 15, 20] as const;
const DURATION_OPTIONS = [
  { value: 60, label: "1h" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2h" },
] as const;

export function SearchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "denied" | "ok">("idle");

  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [radiusKm, setRadiusKm] = useState<(typeof RADIUS_OPTIONS)[number]>(15);
  const [date, setDate] = useState(todayIso());
  const [durationMinutes, setDurationMinutes] = useState<60 | 90 | 120>(90);
  const [startHour, setStartHour] = useState<number | "">("");
  const [endHour, setEndHour] = useState<number | "">("");

  function requestGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoStatus("ok");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radiusKm: radiusKm.toString(),
      date,
      durationMinutes: durationMinutes.toString(),
    });
    if (startHour !== "") params.set("startHour", String(startHour));
    if (endHour !== "") params.set("endHour", String(endHour));

    startTransition(() => {
      router.push(`/results?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-5">
      <div>
        <label className="field-label">Où ?</label>
        <button
          type="button"
          onClick={requestGeolocation}
          className="btn-secondary w-full justify-start"
          disabled={geoStatus === "locating"}
        >
          {geoStatus === "locating" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {geoStatus === "ok"
            ? `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
            : geoStatus === "denied"
              ? "Géoloc refusée — centre Tours utilisé"
              : "Utiliser ma position"}
        </button>
      </div>

      <div>
        <label className="field-label">Rayon</label>
        <div className="grid grid-cols-3 gap-2">
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => setRadiusKm(km)}
              className={`rounded-xl border-2 py-3 font-semibold transition ${
                radiusKm === km
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="date">Date</label>
          <div className="flex gap-2 mb-2">
            <button type="button" className="text-xs underline" onClick={() => setDate(todayIso())}>
              Aujourd&apos;hui
            </button>
            <button type="button" className="text-xs underline" onClick={() => setDate(tomorrowIso())}>
              Demain
            </button>
          </div>
          <input
            id="date"
            type="date"
            value={date}
            min={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Durée</label>
          <div className="grid grid-cols-3 gap-1">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDurationMinutes(opt.value)}
                className={`rounded-xl border-2 py-3 font-semibold transition ${
                  durationMinutes === opt.value
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="field-label">Plage horaire (optionnel)</label>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={startHour}
            onChange={(e) => setStartHour(e.target.value === "" ? "" : Number(e.target.value))}
            className="field-input"
          >
            <option value="">Pas avant…</option>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{`${i.toString().padStart(2, "0")}h`}</option>
            ))}
          </select>
          <select
            value={endHour}
            onChange={(e) => setEndHour(e.target.value === "" ? "" : Number(e.target.value))}
            className="field-input"
          >
            <option value="">Pas après…</option>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>{`${h.toString().padStart(2, "0")}h`}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Chercher des créneaux
      </button>
    </form>
  );
}
