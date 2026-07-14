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

export function parseUserAgent(userAgent?: string | null) {
  const value = String(userAgent || "").trim();
  const normalized = value.toLowerCase();
  const pickVersion = (pattern: RegExp) => {
    const match = value.match(pattern);
    return match?.[1] || "";
  };

  let browser = "Desconocido";
  if (normalized.includes("edg/")) {
    const version = pickVersion(/Edg\/(\d+)/i);
    browser = version ? `Microsoft Edge ${version}` : "Microsoft Edge";
  } else if (normalized.includes("opr/") || normalized.includes("opera")) {
    const version = pickVersion(/(?:OPR|Opera)\/(\d+)/i);
    browser = version ? `Opera ${version}` : "Opera";
  } else if (normalized.includes("chrome/") && !normalized.includes("edg/")) {
    const version = pickVersion(/Chrome\/(\d+)/i);
    browser = version ? `Chrome ${version}` : "Google Chrome";
  } else if (normalized.includes("firefox/")) {
    const version = pickVersion(/Firefox\/(\d+)/i);
    browser = version ? `Firefox ${version}` : "Mozilla Firefox";
  } else if (normalized.includes("safari/") && !normalized.includes("chrome/")) {
    const version = pickVersion(/Version\/(\d+)/i);
    browser = version ? `Safari ${version}` : "Safari";
  }

  let os = "Desconocido";
  if (normalized.includes("windows nt")) {
    if (normalized.includes("windows nt 10.0")) {
      os = normalized.includes("win64") || normalized.includes("x64") ? "Windows 11" : "Windows 10";
    } else if (normalized.includes("windows nt 6.3")) {
      os = "Windows 8.1";
    } else if (normalized.includes("windows nt 6.2")) {
      os = "Windows 8";
    } else if (normalized.includes("windows nt 6.1")) {
      os = "Windows 7";
    } else {
      os = "Windows";
    }
  } else if (normalized.includes("iphone") || normalized.includes("ipad") || normalized.includes("cpu os")) {
    os = "iOS";
  } else if (normalized.includes("android")) {
    const version = pickVersion(/Android (\d+(?:[._]\d+)?)/i).replace("_", ".");
    os = version ? `Android ${version}` : "Android";
  } else if (normalized.includes("mac os x") || normalized.includes("macintosh")) {
    os = "macOS";
  } else if (normalized.includes("linux")) {
    os = "Linux";
  } else if (normalized.includes("cros")) {
    os = "ChromeOS";
  }

  return { browser, os };
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
