import { NextRequest, NextResponse } from "next/server";
import { lookupPostalCode } from "@/lib/postal-lookup";

export async function GET(request: NextRequest) {
  const zipCode = request.nextUrl.searchParams.get("zipCode") || "";
  const result = lookupPostalCode(zipCode);
  return NextResponse.json(result);
}

