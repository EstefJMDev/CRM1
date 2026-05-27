import { clearSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Sesion cerrada" }, { status: 200 });
  clearSessionCookie(response);
  return response;
}
