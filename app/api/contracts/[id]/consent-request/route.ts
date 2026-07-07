import { prisma } from "@/lib/db";
import { canViewAllContracts } from "@/lib/contracts";
import {
  buildConsentLink,
  buildConsentSnapshot,
  generateConsentToken,
  sendConsentEmail,
} from "@/lib/consent";
import { getClientIpAddress } from "@/lib/request-security";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    if (!canViewAllContracts(user.role) && contract.userId !== user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (!contract.clientEmail) {
      return NextResponse.json(
        { error: "Este cliente no tiene email informado" },
        { status: 400 }
      );
    }

    const token = generateConsentToken();
    const snapshot = buildConsentSnapshot({
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      clientName: contract.clientName,
      clientLastName: contract.clientLastName,
      clientDNI: contract.clientDNI,
      clientPhone: contract.clientPhone,
      clientEmail: contract.clientEmail,
      address: contract.address,
      municipality: contract.municipality,
      province: contract.province,
      zipCode: contract.zipCode,
      cups: contract.cups,
      user: contract.user,
    });
    const consentLink = buildConsentLink(token, request.nextUrl.origin);

    await sendConsentEmail({
      to: contract.clientEmail,
      consentLink,
      customerName: snapshot.clientFullName,
      contractNumber: contract.contractNumber,
    });

    const consentRequest = await prisma.consentRequest.create({
      data: {
        token,
        recipientEmail: contract.clientEmail,
        snapshot,
        requestedBy: `${user.name} ${user.lastName || ""}`.trim() || user.email,
        contractId: contract.id,
        signerIp: getClientIpAddress(request),
      },
    });

    return NextResponse.json(consentRequest, { status: 201 });
  } catch (error) {
    console.error("Error enviando solicitud de consentimiento:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
