import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM GestiÃ³n de Contratos",
  description: "Sistema de gestiÃ³n de contratos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}

