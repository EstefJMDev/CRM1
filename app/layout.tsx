import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Gestión de Contratos",
  description: "Sistema de gestión de contratos",
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
