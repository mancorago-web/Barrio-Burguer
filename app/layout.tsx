import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hamburguesería",
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
            BlakBox © 2026 | v1.0.0
          </footer>
        </div>
      </body>
    </html>
  );
}
