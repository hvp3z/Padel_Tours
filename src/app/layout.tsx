import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel Tours — Trouve un terrain dispo",
  description: "Cherche un créneau de padel disponible dans l'agglomération de Tours, en temps réel, sur tous les sites de réservation à la fois.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Padel Tours",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="mx-auto max-w-2xl min-h-screen flex flex-col">
          <header className="px-4 pt-6 pb-2">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-brand-600">●</span> Padel Tours
            </h1>
            <div className="flex gap-0.5 mt-1 mb-1 w-16 h-0.5">
              <span className="flex-1 bg-blue-800 rounded-full" />
              <span className="flex-1 bg-white rounded-full opacity-60" />
              <span className="flex-1 bg-red-500 rounded-full" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tous les créneaux dispos dans l&apos;agglo, en un coup d&apos;œil.
            </p>
          </header>
          <main className="flex-1 px-4 pb-24">{children}</main>
          <footer className="px-4 py-4 text-xs text-slate-500 text-center">
            Données récupérées en temps réel des sites des clubs. Les réservations se font directement chez le club via son site.
          </footer>
        </div>
      </body>
    </html>
  );
}
