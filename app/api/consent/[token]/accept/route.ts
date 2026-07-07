import { prisma } from "@/lib/db";
import { getClientIpAddress } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const payload = (await request.json()) as Record<string, unknown>;
    const signerName = String(payload.signerName || "").trim();
    const accepted = Boolean(payload.accepted);

    if (!accepted || !signerName) {
      return NextResponse.json(
        { error: "Debes indicar el nombre del firmante y aceptar el consentimiento" },
        { status: 400 }
      );
    }

    const consentRequest = await prisma.consentRequest.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
      },
    });

    if (!consentRequest) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    if (consentRequest.status === "APPROVED") {
      return NextResponse.json(
        {
          message: "Consentimiento ya aprobado",
          downloadUrl: `/api/consent/${token}/document`,
        },
        { status: 200 }
      );
    }

    if (consentRequest.status === "SUPERSEDED") {
      return NextResponse.json(
        {
          error: "Este enlace ya no es valido porque existe una solicitud mas reciente",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.consentRequest.update({
      where: { token },
      data: {
        status: "APPROVED",
        signerName,
        signerIp: getClientIpAddress(request),
        signerUserAgent: request.headers.get("user-agent") || null,
        approvedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        ...updated,
        downloadUrl: `/api/consent/${token}/document`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error aprobando consentimiento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
