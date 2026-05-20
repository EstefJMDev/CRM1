import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
function canViewAllContracts(role: string) {
  return role === "SUPER_ADMIN" || role === "TENANT_ADMIN";
}

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
      select: { id: true, userId: true },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contrato no encontrado" },
        { status: 404 }
      );
    }

    if (!canViewAllContracts(user.role) && contract.userId !== user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Archivo no válido" },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Tamaño de archivo inválido (máximo 10MB)" },
        { status: 400 }
      );
    }

    const extension = path.extname(file.name) || "";
    const blobKey = `contracts/${id}/${randomUUID()}${extension}`;

    const blob = await put(blobKey, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    const document = await prisma.document.create({
      data: {
        name: file.name,
        url: blob.url,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        contractId: id,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error subiendo documento:", error);
    return NextResponse.json(
      { error: "Error subiendo el documento" },
      { status: 500 }
    );
  }
}

