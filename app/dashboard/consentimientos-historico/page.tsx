"use client";

import Link from "next/link";

export default function ConsentimientosHistóricoPage() {
  return (
    <div className="app-shell app-main">
      <div className="app-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Consentimientos Histórico</h1>
          <Link href="/dashboard" className="btn-secondary text-sm">Volver a Contratos</Link>
        </div>
        <p className="text-gray-600">Sección en construcción.</p>
      </div>
    </div>
  );
}

