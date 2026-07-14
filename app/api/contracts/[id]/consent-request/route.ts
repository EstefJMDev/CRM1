import { prisma } from "@/lib/db";
import { canViewAllContracts } from "@/lib/contracts";
import {
  buildConsentLink,
  buildConsentSnapshot,
  generateConsentToken,
  sendConsentEmail,
} from "@/lib/consent";
import { getClientIpAddress, parseUserAgent } from "@/lib/request-security";
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

    const recipientEmail = contract.clientEmail;
    const token = generateConsentToken();
    const requestUserAgent = request.headers.get("user-agent");
    const requestIp = getClientIpAddress(request);
    const { browser, os } = parseUserAgent(requestUserAgent);
    const requestedAt = new Date();
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
      commercializer: contract.commercializer,
      tariff: contract.tariff,
      user: contract.user,
    });
    const consentLink = buildConsentLink(token, request.nextUrl.origin);

    await sendConsentEmail({
      to: recipientEmail,
      consentLink,
      customerName: snapshot.clientFullName,
      contractNumber: contract.contractNumber,
    });

    const consentRequest = await prisma.$transaction(async (tx) => {
      await tx.consentRequest.updateMany({
        where: {
          contractId: contract.id,
          status: "PENDING",
        },
        data: {
          status: "SUPERSEDED",
        },
      });

      return tx.consentRequest.create({
        data: {
          token,
          recipientEmail,
          snapshot,
          requestedIp: requestIp,
          requestedUserAgent: requestUserAgent,
          requestedBrowser: browser,
          requestedOs: os,
          legalTextVersion: snapshot.legalTextVersion,
          legalTextHash: snapshot.legalTextHash,
          requestedBy: `${user.name} ${user.lastName || ""}`.trim() || user.email,
          requestedAt,
          contractId: contract.id,
          signerIp: requestIp,
          signerUserAgent: requestUserAgent,
        },
      });
    });

    return NextResponse.json(
      {
        ...consentRequest,
        consentLink,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error enviando solicitud de consentimiento:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
