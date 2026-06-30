import { prisma } from "@/lib/db";
import { canViewAllContracts } from "@/lib/contracts";
import { withProtectedDocumentUrl } from "@/lib/documents";
import { getAuthUser } from "@/lib/session";
import {
  isDangerousUpload,
  sanitizeFileName,
} from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
        { error: "Archivo no valido" },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Tamano de archivo invalido (maximo 10MB)" },
        { status: 400 }
      );
    }

    if (isDangerousUpload(file.name, file.type)) {
      return NextResponse.json(
        { error: "Ese tipo de archivo no esta permitido" },
        { status: 400 }
      );
    }

    const safeName = sanitizeFileName(file.name);
    const extension = path.extname(safeName) || "";
    const blobKey = `contracts/${id}/${randomUUID()}${extension}`;

    const blob = await put(blobKey, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
      addRandomSuffix: false,
    });

    const document = await prisma.document.create({
      data: {
        name: safeName,
        url: blob.url,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        contractId: id,
      },
    });

    return NextResponse.json(withProtectedDocumentUrl(document), { status: 201 });
  } catch (error) {
    console.error("Error subiendo documento:", error);
    return NextResponse.json(
      { error: "Error subiendo el documento" },
      { status: 500 }
    );
  }
}
