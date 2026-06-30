import { NextRequest } from "next/server";

const DANGEROUS_FILE_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".svg",
  ".xml",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".php",
  ".sh",
  ".bat",
  ".cmd",
  ".exe",
  ".dll",
  ".msi",
]);

const DANGEROUS_MIME_TYPES = new Set([
  "text/html",
  "image/svg+xml",
  "application/xml",
  "text/xml",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/css",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-sh",
  "application/x-bat",
]);

export function getClientIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export function buildRateLimitKey(prefix: string, request: NextRequest, value?: string) {
  const ip = getClientIpAddress(request);
  return [prefix, ip, value?.trim().toLowerCase() || "anonymous"].join(":");
}

export function sanitizeFileName(value: string) {
  const normalized = value.replace(/[^\w.\-() ]+/g, "_").replace(/\s+/g, " ").trim();
  return normalized.slice(0, 180) || "documento";
}

export function isDangerousUpload(fileName: string, mimeType?: string | null) {
  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop()?.toLowerCase() || ""}`
    : "";
  const normalizedMimeType = String(mimeType || "").toLowerCase().trim();

  return (
    DANGEROUS_FILE_EXTENSIONS.has(extension) ||
    DANGEROUS_MIME_TYPES.has(normalizedMimeType)
  );
}
