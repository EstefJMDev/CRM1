import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key";

type TokenPayload = {
  userId: string;
  email: string;
};

export async function getAuthUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        lastName: true,
        mustChangePassword: true,
        isActive: true,
      },
    });

    if (!user?.isActive) return null;

    return user;
  } catch {
    return null;
  }
}
