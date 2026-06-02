"use client";

import { MapPin, Loader2, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isInCentreValDeLoire, nominatimRegionParams } from "@/lib/region";
import { todayIso, tomorrowIso } from "@/lib/utils";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

const DEFAULT_LAT = 47.39414;
const DEFAULT_LNG = 0.68484;

const RADIUS_OPTIONS = [10, 15, 20] as const;
const DURATION_OPTIONS = [
  { value: 60, label: "1h" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2h" },
] as const;

type LocationMode = "default" | "geo" | "address";

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export function SearchForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [locationMode, setLocationMode] = useState<LocationMode>("default");
  const [addressQuery, setAddressQuery] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "ok" | "denied">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [coordsFromSuggestion, setCoordsFromSuggestion] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [radiusKm, setRadiusKm] = useState<(typeof RADIUS_OPTIONS)[number]>(15);
  const [date, setDate] = useState(todayIso());
  const [durationMinutes, setDurationMinutes] = useState<60 | 90 | 120>(90);
  const [startHour, setStartHour] = useState<number | "">("");
  const [endHour, setEndHour] = useState<number | "">("");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = addressQuery.trim();
    if (query.length < 3 || locationMode === "geo") {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=fr&addressdetails=0&${nominatimRegionParams()}`;
        const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
        if (!res.ok) return;
        const data: Suggestion[] = await res.json();
        const inRegion = data.filter((s) =>
          isInCentreValDeLoire(parseFloat(s.lat), parseFloat(s.lon)),
        );
        setSuggestions(inRegion);
        setShowSuggestions(inRegion.length > 0);
        setActiveSuggestion(-1);
      } catch {
        // silently ignore network errors for autocomplete
      }
    }, 350);
  }, [addressQuery, locationMode]);

  function pickSuggestion(s: Suggestion) {
    setAddressQuery(s.display_name);
    setCoordsFromSuggestion({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setLocationMode("address");
    setShowSuggestions(false);
    setSuggestions([]);
    setLocationError(null);
  }

  function handleAddressKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function requestGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("denied");
      setLocationError("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    setGeoStatus("locating");
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoStatus("ok");
        setLocationMode("geo");
        setAddressQuery("");
        setLocationError(null);
      },
      () => {
        setGeoStatus("denied");
        setLocationError(null);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function handleAddressChange(value: string) {
    setAddressQuery(value);
    setCoordsFromSuggestion(null);
    if (value.trim()) {
      setLocationMode("address");
    } else {
      setLocationMode("default");
    }
    setLocationError(null);
    if (locationMode === "geo") {
      setGeoStatus("idle");
    }
  }

  async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=fr&${nominatimRegionParams()}`;
    const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!isInCentreValDeLoire(lat, lng)) return null;
    return { lat, lng };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocationError(null);
    setIsPending(true);

    let finalLat = lat;
    let finalLng = lng;

    if (locationMode === "address" && addressQuery.trim()) {
      if (coordsFromSuggestion) {
        finalLat = coordsFromSuggestion.lat;
        finalLng = coordsFromSuggestion.lng;
      } else {
        const coords = await geocodeAddress(addressQuery.trim());
        if (!coords) {
          setLocationError(
            "Adresse introuvable en Centre-Val de Loire. Essaie avec une ville ou un code postal de la région.",
          );
          setIsPending(false);
          return;
        }
        finalLat = coords.lat;
        finalLng = coords.lng;
      }
      if (!isInCentreValDeLoire(finalLat, finalLng)) {
        setLocationError(
          "Cette adresse est hors Centre-Val de Loire. Choisis une ville ou un code postal de la région.",
        );
        setIsPending(false);
        return;
      }
    }

    const params = new URLSearchParams({
      lat: finalLat.toString(),
      lng: finalLng.toString(),
      radiusKm: radiusKm.toString(),
      date,
      durationMinutes: durationMinutes.toString(),
    });
    if (startHour !== "") params.set("startHour", String(startHour));
    if (endHour !== "") params.set("endHour", String(endHour));

    router.push(`/results?${params.toString()}`);
    setIsPending(false);
  }

  const geoButtonLabel =
    geoStatus === "locating"
      ? "Localisation…"
      : geoStatus === "ok"
        ? "Position GPS détectée"
        : geoStatus === "denied"
          ? "GPS refusé — saisir une adresse"
          : "Utiliser ma position GPS";

  return (
    <form onSubmit={submit} className="card flex flex-col gap-5">
      {/* Location */}
      <div>
        <label className="field-label" htmlFor="address">
          Où ?
        </label>
        <div className="relative" ref={wrapperRef}>
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
          <input
            id="address"
            type="text"
            placeholder="Ville ou code postal (Centre-Val de Loire)…"
            value={locationMode === "geo" ? "" : addressQuery}
            onChange={(e) => handleAddressChange(e.target.value)}
            onKeyDown={handleAddressKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            readOnly={locationMode === "geo"}
            autoComplete="off"
            className="field-input pl-9"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onMouseDown={() => pickSuggestion(s)}
                  className={`px-4 py-2.5 text-sm cursor-pointer truncate transition-colors ${
                    i === activeSuggestion
                      ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {s.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {locationMode === "geo" && geoStatus === "ok" && (
          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
            <Navigation className="h-3 w-3" />
            Position GPS utilisée
          </p>
        )}
        {locationMode === "default" && !addressQuery && (
          <p className="text-xs text-slate-400 mt-1">
            Centre de Tours utilisé par défaut
          </p>
        )}
        {locationError && (
          <p className="text-xs text-red-500 mt-1">{locationError}</p>
        )}
        <button
          type="button"
          onClick={requestGeolocation}
          disabled={geoStatus === "locating"}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition disabled:opacity-50"
        >
          {geoStatus === "locating" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Navigation className="h-3 w-3" />
          )}
          {geoButtonLabel}
        </button>
      </div>

      {/* Radius */}
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

      {/* Date + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="field-label mb-0" htmlFor="date">Date</label>
            <div className="flex gap-2">
              <button type="button" className="text-xs underline text-slate-500 dark:text-slate-400" onClick={() => setDate(todayIso())}>
                Aujourd&apos;hui
              </button>
              <button type="button" className="text-xs underline text-slate-500 dark:text-slate-400" onClick={() => setDate(tomorrowIso())}>
                Demain
              </button>
            </div>
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

      {/* Time window */}
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
