import { prisma } from "@/lib/db";
import { canViewAllContracts } from "@/lib/contracts";
import { renderConsentDocumentPdf } from "@/lib/consent";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const consentRequest = await prisma.consentRequest.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!consentRequest) {
      return NextResponse.json({ error: "Consentimiento no encontrado" }, { status: 404 });
    }

    if (!canViewAllContracts(user.role) && consentRequest.contract.userId !== user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (consentRequest.status !== "APPROVED") {
      return NextResponse.json(
        { error: "El documento solo esta disponible para consentimientos aprobados" },
        { status: 400 }
      );
    }

    const pdfBytes = await renderConsentDocumentPdf({
      snapshot: consentRequest.snapshot as never,
      signerName: consentRequest.signerName,
      approvedAt: consentRequest.approvedAt,
      status: consentRequest.status,
      evidence: {
        token: consentRequest.token,
        recipientEmail: consentRequest.recipientEmail,
        requestedAt: consentRequest.requestedAt,
        requestedIp: consentRequest.requestedIp,
        requestedUserAgent: consentRequest.requestedUserAgent,
        requestedBrowser: consentRequest.requestedBrowser,
        requestedOs: consentRequest.requestedOs,
        approvedAt: consentRequest.approvedAt,
        approvedIp: consentRequest.approvedIp || consentRequest.signerIp,
        approvedUserAgent: consentRequest.approvedUserAgent || consentRequest.signerUserAgent,
        approvedBrowser: consentRequest.approvedBrowser,
        approvedOs: consentRequest.approvedOs,
        legalTextVersion: consentRequest.legalTextVersion,
        legalTextHash: consentRequest.legalTextHash,
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="consentimiento-${consentRequest.id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error descargando consentimiento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
