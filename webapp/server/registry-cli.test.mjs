import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { main, loadRegistry, saveRegistry, withLock, shortId } from "./registry-cli.mjs";

let stateDir;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), "nobody-registry-"));
  process.env.STATE_DIR = stateDir;
});

afterEach(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.STATE_DIR;
});

const registryPath = () => join(stateDir, "registry.json");
const readRaw = () => JSON.parse(readFileSync(registryPath(), "utf-8"));

function register(doc, { session = "s1", pid = 1, cwd = "/cwd", dead = "", missing = "" } = {}) {
  return main([
    "register",
    "--session",
    session,
    "--pid",
    String(pid),
    "--cwd",
    cwd,
    "--doc",
    doc,
    "--dead",
    dead,
    "--missing",
    missing,
  ]);
}

function parseShell(output) {
  const docId = /^DOC_ID=(.*)$/m.exec(output)?.[1] ?? "";
  const dirsBlock = /^REQUIRED_DIRS='([\s\S]*)'$/m.exec(output)?.[1] ?? "";
  const dirs = dirsBlock
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const eq = line.indexOf("=");
      return { dirId: line.slice(0, eq), path: line.slice(eq + 1) };
    });
  return { docId, dirs };
}

describe("atomic write cycle", () => {
  it("creates the registry file when absent", () => {
    saveRegistry({ version: 1, sessions: {}, dirs: {}, docs: {} });
    expect(readRaw()).toEqual({ version: 1, sessions: {}, dirs: {}, docs: {} });
  });

  it("creates the state directory when absent", () => {
    const nested = join(stateDir, "deep", "nested");
    process.env.STATE_DIR = nested;
    saveRegistry({ version: 1, sessions: {}, dirs: {}, docs: {} });
    expect(JSON.parse(readFileSync(join(nested, "registry.json"), "utf-8")).version).toBe(1);
  });

  it("returns an empty registry when the file does not exist", () => {
    expect(loadRegistry()).toEqual({ version: 1, sessions: {}, dirs: {}, docs: {} });
  });

  it("leaves no temp files behind after a save", () => {
    saveRegistry({ version: 1, sessions: {}, dirs: {}, docs: {} });
    const stray = readFileSync(registryPath(), "utf-8");
    expect(stray).toContain('"version"');
    expect(() => readFileSync(`${registryPath()}.tmp`, "utf-8")).toThrow();
  });

  it("leaves the previous registry intact when a write throws before rename", () => {
    saveRegistry({
      version: 1,
      sessions: { keep: { pid: 1, cwd: "/c", docs: [] } },
      dirs: {},
      docs: {},
    });
    const circular = { version: 1, sessions: {}, dirs: {}, docs: {} };
    circular.self = circular;
    expect(() => saveRegistry(circular)).toThrow();
    expect(readRaw().sessions.keep).toBeDefined();
  });

  it("reports a malformed registry rather than silently resetting it", () => {
    writeFileSync(registryPath(), "{ not json", "utf-8");
    expect(() => loadRegistry()).toThrow(/malformed/i);
  });
});

describe("locking", () => {
  it("serializes mutations rather than interleaving them", () => {
    const order = [];
    withLock(() => {
      order.push("outer-start");
      // A nested acquisition would deadlock if the lock were not released;
      // this asserts the happy path releases on completion.
      order.push("outer-end");
    });
    withLock(() => {
      order.push("second");
    });
    expect(order).toEqual(["outer-start", "outer-end", "second"]);
  });

  it("releases the lock even when the callback throws", () => {
    expect(() => {
      withLock(() => {
        throw new Error("boom");
      });
    }).toThrow("boom");
    let ran = false;
    withLock(() => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it("reclaims a lock held past the stale threshold", () => {
    const lockPath = join(stateDir, ".lock");
    mkdirSync(lockPath, { recursive: true });
    const ancient = new Date(Date.now() - 60_000);
    utimesSync(lockPath, ancient, ancient);

    let ran = false;
    withLock(() => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it("still produces a consistent registry after reclaiming a stale lock", () => {
    const lockPath = join(stateDir, ".lock");
    mkdirSync(lockPath, { recursive: true });
    const ancient = new Date(Date.now() - 60_000);
    utimesSync(lockPath, ancient, ancient);

    register("/repos/proj/plan.md");
    expect(Object.keys(readRaw().docs)).toHaveLength(1);
  });
});

describe("register", () => {
  it("creates a fresh registry with the schema version", () => {
    register("/repos/proj/plan.md");
    expect(readRaw().version).toBe(1);
  });

  it("derives docId as the first 12 hex chars of sha256(absPath)", () => {
    const abs = "/repos/proj/plan.md";
    const { docId } = parseShell(register(abs));
    const expected = createHash("sha256").update(abs).digest("hex").slice(0, 12);
    expect(docId).toBe(expected);
    expect(shortId(abs)).toBe(expected);
  });

  it("returns the same id and creates no duplicate when re-registering a path", () => {
    const first = parseShell(register("/repos/proj/plan.md"));
    const second = parseShell(register("/repos/proj/plan.md"));
    expect(second.docId).toBe(first.docId);
    expect(Object.keys(readRaw().docs)).toHaveLength(1);
    expect(readRaw().sessions.s1.docs).toEqual([first.docId]);
  });

  it("adds a second session to an existing doc's owner list", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md", { session: "s1", pid: 11 }));
    register("/repos/proj/plan.md", { session: "s2", pid: 22 });
    const raw = readRaw();
    expect(raw.sessions.s1.docs).toEqual([docId]);
    expect(raw.sessions.s2.docs).toEqual([docId]);
    expect(Object.keys(raw.docs)).toHaveLength(1);
  });

  it("stores no derived data on the doc entry", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md"));
    expect(Object.keys(readRaw().docs[docId]).sort()).toEqual(["dirId", "filename"]);
  });

  it("returns one dir entry per distinct parent directory", () => {
    register("/repos/proj/plan.md");
    register("/repos/proj/research.md");
    const { dirs } = parseShell(register("/repos/other/notes.md"));
    expect(dirs).toHaveLength(2);
    expect(dirs.map((d) => d.path).sort()).toEqual(["/repos/other", "/repos/proj"]);
  });

  it("records the session pid and cwd", () => {
    register("/repos/proj/plan.md", { session: "abc", pid: 4242, cwd: "/work" });
    expect(readRaw().sessions.abc).toMatchObject({ pid: 4242, cwd: "/work" });
  });

  it("shell-quotes directory paths containing spaces and quotes", () => {
    const { dirs } = parseShell(register("/repos/my proj/plan.md"));
    expect(dirs[0].path).toBe("/repos/my proj");
  });
});

describe("deregister", () => {
  it("keeps a shared doc alive when one of two owners leaves", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md", { session: "s1" }));
    register("/repos/proj/plan.md", { session: "s2" });
    main(["deregister", "--session", "s1"]);
    const raw = readRaw();
    expect(raw.docs[docId]).toBeDefined();
    expect(raw.sessions.s1).toBeUndefined();
    expect(raw.sessions.s2.docs).toEqual([docId]);
  });

  it("prunes the doc and its dir when the last owner leaves", () => {
    register("/repos/proj/plan.md", { session: "s1" });
    main(["deregister", "--session", "s1"]);
    const raw = readRaw();
    expect(raw.docs).toEqual({});
    expect(raw.dirs).toEqual({});
  });

  it("prints the remaining live session count", () => {
    register("/repos/proj/plan.md", { session: "s1" });
    register("/repos/proj/plan.md", { session: "s2" });
    expect(main(["deregister", "--session", "s1"]).trim()).toBe("1");
    expect(main(["deregister", "--session", "s2"]).trim()).toBe("0");
  });

  it("is a no-op for an unknown session and still reports the count", () => {
    register("/repos/proj/plan.md", { session: "s1" });
    expect(main(["deregister", "--session", "nope"]).trim()).toBe("1");
  });
});

describe("pruning", () => {
  it("drops a dead session and its now-orphaned docs", () => {
    register("/repos/proj/plan.md", { session: "dead-one" });
    register("/repos/other/notes.md", { session: "live-one" });
    main(["prune", "--dead", "dead-one,"]);
    const raw = readRaw();
    expect(raw.sessions["dead-one"]).toBeUndefined();
    expect(Object.keys(raw.docs)).toHaveLength(1);
    expect(Object.values(raw.dirs).map((d) => d.path)).toEqual(["/repos/other"]);
  });

  it("keeps a doc alive when a dead session was not its only owner", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md", { session: "dead-one" }));
    register("/repos/proj/plan.md", { session: "live-one" });
    main(["prune", "--dead", "dead-one"]);
    expect(readRaw().docs[docId]).toBeDefined();
  });

  it("drops a missing doc and its dir when it held the last live doc", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md", { session: "s1" }));
    main(["prune", "--missing", docId]);
    const raw = readRaw();
    expect(raw.docs).toEqual({});
    expect(raw.dirs).toEqual({});
    expect(raw.sessions.s1.docs).toEqual([]);
  });

  it("keeps the dir when a sibling doc in it survives", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md", { session: "s1" }));
    register("/repos/proj/research.md", { session: "s1" });
    main(["prune", "--missing", docId]);
    const raw = readRaw();
    expect(Object.keys(raw.docs)).toHaveLength(1);
    expect(Object.values(raw.dirs).map((d) => d.path)).toEqual(["/repos/proj"]);
  });

  it("prunes a doc that is both missing and owned by a dead session exactly once", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md", { session: "dead-one" }));
    expect(() => main(["prune", "--dead", "dead-one", "--missing", docId])).not.toThrow();
    const raw = readRaw();
    expect(raw.docs).toEqual({});
    expect(raw.dirs).toEqual({});
    expect(raw.sessions).toEqual({});
  });

  it("keeps a live session that has lost all of its docs", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md", { session: "s1" }));
    main(["prune", "--missing", docId]);
    expect(readRaw().sessions.s1).toBeDefined();
  });

  it("tolerates empty and trailing-comma verdict lists", () => {
    register("/repos/proj/plan.md", { session: "s1" });
    expect(() => main(["prune", "--dead", ",,", "--missing", ""])).not.toThrow();
    expect(Object.keys(readRaw().docs)).toHaveLength(1);
  });
});

describe("query subcommands", () => {
  it("sessions --pids emits sessionId and pid pairs", () => {
    register("/repos/proj/plan.md", { session: "s1", pid: 111 });
    register("/repos/other/notes.md", { session: "s2", pid: 222 });
    const lines = main(["sessions", "--pids"]).trim().split("\n").sort();
    expect(lines).toEqual(["s1 111", "s2 222"]);
  });

  it("docs --paths emits docId and reconstructed absolute path pairs", () => {
    const { docId } = parseShell(register("/repos/proj/plan.md"));
    expect(main(["docs", "--paths"]).trim()).toBe(`${docId} /repos/proj/plan.md`);
  });

  it("dirs emits the live dir set as dirId=path", () => {
    register("/repos/proj/plan.md");
    const line = main(["dirs"]).trim();
    expect(line).toMatch(/^[0-9a-f]{12}=\/repos\/proj$/);
  });

  it("prune sweeps without making other changes", () => {
    register("/repos/proj/plan.md", { session: "s1" });
    const before = readRaw();
    main(["prune"]);
    expect(readRaw()).toEqual(before);
  });

  it("emits nothing for an empty registry", () => {
    expect(main(["sessions", "--pids"])).toBe("");
    expect(main(["docs", "--paths"])).toBe("");
    expect(main(["dirs"])).toBe("");
  });
});

describe("argument handling", () => {
  it("throws with usage for an unknown subcommand", () => {
    expect(() => main(["frobnicate"])).toThrow(/usage/i);
  });

  it("throws when no subcommand is given", () => {
    expect(() => main([])).toThrow(/usage/i);
  });

  it("throws when register is missing required arguments", () => {
    expect(() => main(["register", "--session", "s1"])).toThrow(/--doc/);
  });

  it("throws when the doc path is not absolute", () => {
    expect(() => register("relative/plan.md")).toThrow(/absolute/i);
  });
});
