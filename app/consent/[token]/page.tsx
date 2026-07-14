import { ConsentAcceptForm } from "@/components/consent-accept-form";
import { ConsentSnapshot, renderConsentDocumentHtml } from "@/lib/consent";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const consentRequest = await prisma.consentRequest.findUnique({
    where: { token },
  });

  if (!consentRequest) {
    notFound();
  }

  const snapshot = consentRequest.snapshot as unknown as ConsentSnapshot;
  const documentHtml = renderConsentDocumentHtml({
    snapshot,
    signerName: consentRequest.signerName,
    approvedAt: consentRequest.approvedAt,
    status: consentRequest.status,
    evidence: {
      recipientEmail: consentRequest.recipientEmail,
      approvedAt: consentRequest.approvedAt,
      approvedIp: consentRequest.approvedIp || consentRequest.signerIp,
      approvedUserAgent: consentRequest.approvedUserAgent || consentRequest.signerUserAgent,
      approvedBrowser: consentRequest.approvedBrowser,
      approvedOs: consentRequest.approvedOs,
    },
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-slate-900">Confirmacion de actuaciones precontractuales</h1>
            <p className="mt-1 text-sm text-slate-500">
              Revisa el documento y confirma su aceptacion marcando la casilla y enviando el formulario.
            </p>
          </div>
          <iframe
            title="Documento de confirmacion precontractual"
            srcDoc={documentHtml}
            className="h-[1680px] w-full bg-slate-50"
          />
        </div>

        <ConsentAcceptForm
          token={token}
          status={consentRequest.status}
          defaultSignerName={snapshot.clientFullName}
        />
      </div>
    </main>
  );
}
