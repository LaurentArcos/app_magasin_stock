import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import { AuthProvider } from "@/context/AuthProvider";
import { OfflineProvider } from "@/context/OfflineProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Magasin — Stock",
  description: "Gestion simple du stock magasin, avec mode hors ligne",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stock",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // lang/dir par défaut = français ; ajustés côté client par I18nProvider.
  return (
    <html lang="fr" dir="ltr">
      <body>
        <I18nProvider>
          <AuthProvider>
            <OfflineProvider>{children}</OfflineProvider>
          </AuthProvider>
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
