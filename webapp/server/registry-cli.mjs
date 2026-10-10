import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { argv, env, exit, pid } from "node:process";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const LOCK_STALE_MS = 10_000;
const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 30_000;

const USAGE = `usage: registry-cli <command> [options]

  register   --session <id> --pid <pid> --cwd <dir> --doc <abs-path>
  deregister --session <id>
  prune
  dirs
  sessions   --pids
  docs       --paths

  Mutating commands also accept --dead <sessionId>,... and --missing <docId>,...
  Liveness is probed by the host and passed in; this CLI never probes it.`;

const stateDir = () => env.STATE_DIR || "/state";
const registryPath = () => join(stateDir(), "registry.json");
const lockPath = () => join(stateDir(), ".lock");

export function shortId(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

function emptyRegistry() {
  return { version: SCHEMA_VERSION, sessions: {}, dirs: {}, docs: {} };
}

export function loadRegistry() {
  let raw;
  try {
    raw = readFileSync(registryPath(), "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return emptyRegistry();
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `registry.json is malformed at ${registryPath()}. Refusing to overwrite it; inspect or delete it by hand.`,
    );
  }

  return {
    version: parsed.version ?? SCHEMA_VERSION,
    sessions: parsed.sessions ?? {},
    dirs: parsed.dirs ?? {},
    docs: parsed.docs ?? {},
  };
}

export function saveRegistry(registry) {
  mkdirSync(stateDir(), { recursive: true });
  const target = registryPath();
  const temp = `${target}.tmp-${String(pid)}`;
  // Serialize before touching disk so an unserializable value cannot leave a
  // half-written temp file, then rename so readers see either old or new.
  const body = `${JSON.stringify(registry, null, 2)}\n`;
  writeFileSync(temp, body, "utf-8");
  renameSync(temp, target);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function lockAgeMs(path) {
  try {
    return Date.now() - statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

export function withLock(fn) {
  const path = lockPath();
  mkdirSync(stateDir(), { recursive: true });

  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      mkdirSync(path);
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      if (lockAgeMs(path) > LOCK_STALE_MS) {
        rmSync(path, { recursive: true, force: true });
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for the registry lock at ${path}.`);
      }
      sleepSync(LOCK_RETRY_MS);
    }
  }

  try {
    return fn();
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
}

function splitList(value) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function omitKeys(record, drop) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !drop.has(key)));
}

function keepKeys(record, keep) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => keep.has(key)));
}

// Liveness rules, in order: dead sessions go, missing docs go, docs with no
// remaining owner go, dirs with no remaining doc go.
function prune(registry, { dead = [], missing = [] } = {}) {
  const survivingSessions = omitKeys(registry.sessions, new Set(dead));
  const presentDocs = omitKeys(registry.docs, new Set(missing));

  const owned = new Set();
  const sessions = {};
  for (const [sessionId, session] of Object.entries(survivingSessions)) {
    const docs = session.docs.filter((docId) => docId in presentDocs);
    for (const docId of docs) owned.add(docId);
    sessions[sessionId] = { ...session, docs };
  }

  const docs = keepKeys(presentDocs, owned);
  const dirs = keepKeys(registry.dirs, new Set(Object.values(docs).map((doc) => doc.dirId)));

  return { version: registry.version, sessions, dirs, docs };
}

function parseArgs(rest) {
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }
  return options;
}

function shQuote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function dirLines(registry) {
  return Object.entries(registry.dirs).map(([dirId, dir]) => `${dirId}=${dir.path}`);
}

function requireOption(options, name) {
  const value = options[name];
  if (typeof value !== "string" || value === "") {
    throw new Error(`Missing required option --${name}\n\n${USAGE}`);
  }
  return value;
}

function verdicts(options) {
  return { dead: splitList(options.dead), missing: splitList(options.missing) };
}

function cmdRegister(options) {
  const session = requireOption(options, "session");
  const doc = requireOption(options, "doc");
  if (!doc.startsWith("/")) {
    throw new Error(`--doc must be an absolute path, got: ${doc}`);
  }

  const dirPath = dirname(doc);
  const filename = basename(doc);
  const docId = shortId(doc);
  const dirId = shortId(dirPath);

  return withLock(() => {
    const registry = prune(loadRegistry(), verdicts(options));

    registry.dirs[dirId] = { path: dirPath };
    registry.docs[docId] = { dirId, filename };

    const existing = registry.sessions[session];
    const docs = existing ? existing.docs.filter((id) => id !== docId) : [];
    registry.sessions[session] = {
      pid: Number(options.pid ?? 0),
      cwd: typeof options.cwd === "string" ? options.cwd : "",
      docs: [...docs, docId],
    };

    saveRegistry(registry);
    return `DOC_ID=${docId}\nREQUIRED_DIRS=${shQuote(dirLines(registry).join("\n"))}\n`;
  });
}

function cmdDeregister(options) {
  const session = requireOption(options, "session");

  return withLock(() => {
    const registry = loadRegistry();
    const pruned = prune(
      { ...registry, sessions: omitKeys(registry.sessions, new Set([session])) },
      verdicts(options),
    );
    saveRegistry(pruned);
    return `${String(Object.keys(pruned.sessions).length)}\n`;
  });
}

function cmdPrune(options) {
  return withLock(() => {
    const registry = prune(loadRegistry(), verdicts(options));
    saveRegistry(registry);
    return "";
  });
}

function cmdDirs() {
  const lines = dirLines(loadRegistry());
  return lines.length ? `${lines.join("\n")}\n` : "";
}

function cmdSessions() {
  const lines = Object.entries(loadRegistry().sessions).map(
    ([sessionId, session]) => `${sessionId} ${String(session.pid)}`,
  );
  return lines.length ? `${lines.join("\n")}\n` : "";
}

function cmdDocs() {
  const registry = loadRegistry();
  const lines = [];
  for (const [docId, doc] of Object.entries(registry.docs)) {
    const dir = registry.dirs[doc.dirId];
    if (!dir) continue;
    lines.push(`${docId} ${join(dir.path, doc.filename)}`);
  }
  return lines.length ? `${lines.join("\n")}\n` : "";
}

export function main(args) {
  const [command, ...rest] = args;
  const options = parseArgs(rest);

  switch (command) {
    case "register":
      return cmdRegister(options);
    case "deregister":
      return cmdDeregister(options);
    case "prune":
      return cmdPrune(options);
    case "dirs":
      return cmdDirs();
    case "sessions":
      return cmdSessions();
    case "docs":
      return cmdDocs();
    default:
      throw new Error(command ? `Unknown command: ${command}\n\n${USAGE}` : USAGE);
  }
}

const invokedDirectly = argv[1] && fileURLToPath(import.meta.url) === argv[1];
if (invokedDirectly) {
  try {
    process.stdout.write(main(argv.slice(2)));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    exit(1);
  }
}
