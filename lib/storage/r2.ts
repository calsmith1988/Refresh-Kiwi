import { createHash, createHmac } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REGION = "auto";
const SERVICE = "s3";
const REQUEST_TYPE = "aws4_request";
const EMPTY_PAYLOAD_HASH = createHash("sha256").update("").digest("hex");
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

type R2Config = {
  bucket: string;
  endpoint: URL;
  accessKeyId: string;
  secretAccessKey: string;
};

type R2Object = {
  body: Buffer;
  contentType: string;
};

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodePathSegment).join("/");
}

function contentTypeForPath(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function getR2Config(): R2Config | null {
  const bucket = process.env.R2_BUCKET?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const endpointInput =
    process.env.R2_ENDPOINT?.trim() ||
    (process.env.R2_ACCOUNT_ID?.trim()
      ? `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`
      : null);

  if (!bucket || !accessKeyId || !secretAccessKey || !endpointInput) {
    return null;
  }

  return {
    bucket,
    endpoint: new URL(endpointInput),
    accessKeyId,
    secretAccessKey,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

function signingKey(secretAccessKey: string, date: string): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, date);
  const regionKey = hmac(dateKey, REGION);
  const serviceKey = hmac(regionKey, SERVICE);

  return hmac(serviceKey, REQUEST_TYPE);
}

function signedRequest(params: {
  method: "GET" | "HEAD" | "PUT";
  key?: string;
  query?: URLSearchParams;
  body?: Buffer;
  contentType?: string;
}): Request | null {
  const config = getR2Config();

  if (!config) {
    return null;
  }

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = params.body ? sha256(params.body) : EMPTY_PAYLOAD_HASH;
  const pathname = params.key
    ? `/${encodePathSegment(config.bucket)}/${encodeObjectKey(params.key)}`
    : `/${encodePathSegment(config.bucket)}`;
  const url = new URL(config.endpoint);
  url.pathname = pathname;

  const query = params.query ?? new URLSearchParams();
  const sortedQuery = new URLSearchParams(
    [...query.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
  url.search = sortedQuery.toString();

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  if (params.contentType) {
    headers["content-type"] = params.contentType;
  }

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const credentialScope = `${date}/${REGION}/${SERVICE}/${REQUEST_TYPE}`;
  const canonicalRequest = [
    params.method,
    pathname,
    sortedQuery.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(config.secretAccessKey, date))
    .update(stringToSign)
    .digest("hex");

  headers.authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return new Request(url, {
    method: params.method,
    headers,
    body: params.body ? new Uint8Array(params.body) : undefined,
  });
}

export async function putR2Object(params: {
  key: string;
  body: Buffer;
  contentType?: string;
}): Promise<boolean> {
  const request = signedRequest({
    method: "PUT",
    key: params.key,
    body: params.body,
    contentType: params.contentType,
  });

  if (!request) {
    return false;
  }

  const response = await fetch(request);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `R2 PUT ${params.key} failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  return true;
}

export async function getR2Object(key: string): Promise<R2Object | null> {
  const request = signedRequest({ method: "GET", key });

  if (!request) {
    return null;
  }

  const response = await fetch(request);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `R2 GET ${key} failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType:
      response.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function listR2Keys(prefix: string): Promise<string[]> {
  const query = new URLSearchParams({
    "list-type": "2",
    prefix,
  });
  const request = signedRequest({ method: "GET", query });

  if (!request) {
    return [];
  }

  const response = await fetch(request);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `R2 LIST ${prefix} failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const xml = await response.text();

  return [...xml.matchAll(/<Key>(.*?)<\/Key>/g)].map((match) =>
    match[1]
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">"),
  );
}

async function listLocalFiles(dir: string, baseDir = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listLocalFiles(entryPath, baseDir);
      }

      return [path.relative(baseDir, entryPath).split(path.sep).join("/")];
    }),
  );

  return files.flat();
}

export async function putSiteFile(params: {
  slug: string;
  file: string;
  body: Buffer;
  contentType?: string;
}): Promise<boolean> {
  return putR2Object({
    key: `sites/${params.slug}/${params.file}`,
    body: params.body,
    contentType: params.contentType,
  });
}

export async function uploadSiteDirectoryToR2(
  slug: string,
  baseDir: string,
): Promise<void> {
  if (!isR2Configured()) {
    return;
  }

  const files = await listLocalFiles(baseDir);

  await Promise.all(
    files.map(async (file) => {
      await putSiteFile({
        slug,
        file,
        body: await readFile(path.join(baseDir, file)),
        contentType: contentTypeForPath(file),
      });
    }),
  );
}

export async function downloadSiteDirectoryFromR2(
  slug: string,
  baseDir: string,
): Promise<boolean> {
  if (!isR2Configured()) {
    return false;
  }

  const prefix = `sites/${slug}/`;
  const keys = await listR2Keys(prefix);

  if (keys.length === 0) {
    return false;
  }

  for (const key of keys) {
    const object = await getR2Object(key);

    if (!object) {
      continue;
    }

    const relativePath = key.slice(prefix.length);
    const destination = path.join(baseDir, relativePath);

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, object.body);
  }

  return true;
}
