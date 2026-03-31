import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import HeaderTimer from "@/components/HeaderTimer";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Barrio Burger",
  description: "Sistema de gestión de restaurante",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Barrio Burger",
  },
  openGraph: {
    title: "Barrio Burger",
    description: "Sistema de gestión de restaurante",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Barrio Burger" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1d4ed8" />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegistration />
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="bg-gray-800 text-white py-2 px-4 flex justify-between items-center">
            <div className="font-bold text-sm md:text-base">📅 Sincronizado</div>
            <HeaderTimer />
          </div>
          <div style={{ flex: 1 }}>
            {children}
          </div>
          <footer style={{
            backgroundColor: '#1f2937',
            color: 'white',
            textAlign: 'center',
            padding: '12px',
            fontSize: '14px',
            flexShrink: 0,
          }}>
            Barrio Burger © 2026 | v1.0.0
          </footer>
        </div>
      </body>
    </html>
  );
}
