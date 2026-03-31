import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import HeaderTimer from "@/components/HeaderTimer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Barrio Burger",
  description: "Sistema de gestión",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
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
