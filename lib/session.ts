import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifyToken } from "@/lib/auth";

export async function getAuthUser(request: NextRequest) {
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const token = bearerToken || cookieToken;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

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
}
