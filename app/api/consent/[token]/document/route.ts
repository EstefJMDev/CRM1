import { renderConsentDocumentPdf } from "@/lib/consent";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const consentRequest = await prisma.consentRequest.findUnique({
      where: { token },
    });

    if (!consentRequest) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    if (consentRequest.status !== "APPROVED") {
      return NextResponse.json(
        { error: "El documento estara disponible cuando la solicitud haya sido enviada" },
        { status: 400 }
      );
    }

    const pdfBytes = await renderConsentDocumentPdf({
      snapshot: consentRequest.snapshot as never,
      signerName: consentRequest.signerName,
      approvedAt: consentRequest.approvedAt,
      status: consentRequest.status,
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
    console.error("Error descargando consentimiento publico:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
