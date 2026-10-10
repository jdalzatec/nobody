import { open, readFile, realpath, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, join, resolve, sep } from "node:path";
import { argv, env } from "node:process";
import { fileURLToPath } from "node:url";

const PORT = 3001;
const TITLE_READ_BYTES = 4096;

const stateDir = () => env.STATE_DIR || "/state";
const projectsDir = () => env.PROJECTS_DIR || "/projects";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function loadRegistry() {
  let raw;
  try {
    raw = await readFile(join(stateDir(), "registry.json"), "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return { version: 1, sessions: {}, dirs: {}, docs: {} };
    throw new HttpError(500, "Registry unreadable");
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version ?? 1,
      sessions: parsed.sessions ?? {},
      dirs: parsed.dirs ?? {},
      docs: parsed.docs ?? {},
    };
  } catch {
    throw new HttpError(500, "Registry is malformed");
  }
}

/**
 * The security boundary. Every filesystem access goes through here, and the
 * resolved path is only returned once it is proven to sit inside the mounted
 * project directory.
 */
export async function resolveDoc(registry, id) {
  const doc = registry.docs[id];
  if (!doc) throw new HttpError(404, "Unknown document");
  if (typeof doc.filename !== "string" || doc.filename.includes("/") || doc.filename.includes("\0"))
    throw new HttpError(400, "Invalid filename");

  const root = join(projectsDir(), doc.dirId);

  // Both sides are realpath'd before comparison: the mount root itself is often
  // a symlink (macOS /tmp, /var), and comparing a real path against a symlinked
  // root would reject perfectly legitimate documents.
  let realRoot;
  try {
    realRoot = await realpath(root);
  } catch (err) {
    if (err.code === "ENOENT") throw new HttpError(410, "Project directory is no longer mounted");
    throw err;
  }

  let real;
  try {
    real = await realpath(resolve(realRoot, doc.filename));
  } catch (err) {
    if (err.code === "ENOENT") throw new HttpError(410, "Document no longer exists on disk");
    throw err;
  }

  if (!real.startsWith(realRoot + sep)) {
    throw new HttpError(403, "Path escapes project directory");
  }

  return real;
}

async function readHead(path, bytes) {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf-8");
  } finally {
    await handle.close();
  }
}

export async function deriveTitle(path, fallback) {
  const head = await readHead(path, TITLE_READ_BYTES);
  return /^#[ \t]+(.+)$/m.exec(head)?.[1].trim() || fallback;
}

async function listDocs(registry) {
  const entries = [];
  for (const [id, doc] of Object.entries(registry.docs)) {
    let path;
    try {
      path = await resolveDoc(registry, id);
    } catch {
      // Read-time tier of the deleted-document rules: anything unreachable is
      // omitted from the rail, and the launcher prunes it on the next mutation.
      continue;
    }
    const dirPath = registry.dirs[doc.dirId]?.path ?? "";
    entries.push({
      id,
      title: await deriveTitle(path, doc.filename),
      filename: doc.filename,
      dirPath,
      dirLabel: dirPath ? basename(dirPath) : "",
    });
  }
  return entries;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

async function route(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  if (path === "/api/docs") {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
    const registry = await loadRegistry();
    send(res, 200, JSON.stringify(await listDocs(registry)), "application/json; charset=utf-8");
    return;
  }

  const match = /^\/api\/docs\/([^/]+)$/.exec(path);
  if (match) {
    const registry = await loadRegistry();
    const id = decodeURIComponent(match[1]);

    if (req.method === "GET") {
      const target = await resolveDoc(registry, id);
      send(res, 200, await readFile(target, "utf-8"));
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      // Resolve after buffering but before writing: a deleted document must
      // fail rather than be recreated from a stale browser tab.
      const target = await resolveDoc(registry, id);
      await writeFile(target, body, "utf-8");
      send(res, 200, "OK");
      return;
    }

    throw new HttpError(405, "Method not allowed");
  }

  throw new HttpError(404, "Not found");
}

export function createApiServer() {
  return createServer((req, res) => {
    route(req, res).catch((err) => {
      if (err instanceof HttpError) {
        send(res, err.status, err.message);
        return;
      }
      process.stderr.write(`Unhandled API error: ${err.stack ?? err.message}\n`);
      send(res, 500, "Internal error");
    });
  });
}

const invokedDirectly = argv[1] && fileURLToPath(import.meta.url) === argv[1];
if (invokedDirectly) {
  createApiServer().listen(PORT, () => {
    process.stdout.write(`API server listening on port ${String(PORT)}\n`);
  });
}
