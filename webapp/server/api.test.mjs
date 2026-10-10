import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createApiServer } from "./api.mjs";

const DIR_ID = "aaaaaaaaaaaa";

let root;
let stateDir;
let projectsDir;
let projectDir;
let server;
let baseUrl;

function writeRegistry(registry) {
  writeFileSync(join(stateDir, "registry.json"), JSON.stringify(registry), "utf-8");
}

function registryWith(docs, dirs = { [DIR_ID]: { path: "/host/proj" } }) {
  return { version: 1, sessions: {}, dirs, docs };
}

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "nobody-api-"));
  stateDir = join(root, "state");
  projectsDir = join(root, "projects");
  projectDir = join(projectsDir, DIR_ID);
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(projectDir, { recursive: true });

  process.env.STATE_DIR = stateDir;
  process.env.PROJECTS_DIR = projectsDir;

  server = createApiServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${String(server.address().port)}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(root, { recursive: true, force: true });
  delete process.env.STATE_DIR;
  delete process.env.PROJECTS_DIR;
});

describe("resolveDoc boundary", () => {
  it("returns 404 for an unknown document id", async () => {
    writeRegistry(registryWith({}));
    const res = await fetch(`${baseUrl}/api/docs/nosuchdoc`);
    expect(res.status).toBe(404);
  });

  it("returns 400 when the filename contains a path separator", async () => {
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "../escape.md" } }));
    const res = await fetch(`${baseUrl}/api/docs/d1`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when the filename contains a NUL byte", async () => {
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "bad\u0000.md" } }));
    const res = await fetch(`${baseUrl}/api/docs/d1`);
    expect(res.status).toBe(400);
  });

  it("returns 403 when a symlink resolves outside the project directory", async () => {
    const outside = join(root, "outside.md");
    writeFileSync(outside, "# Secret", "utf-8");
    symlinkSync(outside, join(projectDir, "link.md"));
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "link.md" } }));

    const res = await fetch(`${baseUrl}/api/docs/d1`);
    expect(res.status).toBe(403);
  });

  it("allows a symlink that stays inside the project directory", async () => {
    writeFileSync(join(projectDir, "real.md"), "# Inside", "utf-8");
    symlinkSync(join(projectDir, "real.md"), join(projectDir, "link.md"));
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "link.md" } }));

    const res = await fetch(`${baseUrl}/api/docs/d1`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# Inside");
  });

  it("returns 410 for a registered document deleted from disk", async () => {
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "gone.md" } }));
    const res = await fetch(`${baseUrl}/api/docs/d1`);
    expect(res.status).toBe(410);
  });

  it("returns 410 when the whole project directory is gone", async () => {
    writeRegistry(
      registryWith(
        { d1: { dirId: "bbbbbbbbbbbb", filename: "plan.md" } },
        {
          bbbbbbbbbbbb: { path: "/host/vanished" },
        },
      ),
    );
    const res = await fetch(`${baseUrl}/api/docs/d1`);
    expect(res.status).toBe(410);
  });
});

describe("GET /api/docs", () => {
  it("returns one entry per live document", async () => {
    writeFileSync(join(projectDir, "plan.md"), "# Plan", "utf-8");
    writeFileSync(join(projectDir, "research.md"), "# Research", "utf-8");
    writeRegistry(
      registryWith({
        d1: { dirId: DIR_ID, filename: "plan.md" },
        d2: { dirId: DIR_ID, filename: "research.md" },
      }),
    );

    const docs = await (await fetch(`${baseUrl}/api/docs`)).json();
    expect(docs).toHaveLength(2);
    expect(docs.map((d) => d.id).sort()).toEqual(["d1", "d2"]);
  });

  it("exposes dirPath and dirLabel from the registry", async () => {
    writeFileSync(join(projectDir, "plan.md"), "# Plan", "utf-8");
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "plan.md" } }));

    const [doc] = await (await fetch(`${baseUrl}/api/docs`)).json();
    expect(doc.dirPath).toBe("/host/proj");
    expect(doc.dirLabel).toBe("proj");
    expect(doc.filename).toBe("plan.md");
  });

  it("omits a document whose file is gone while leaving it in the registry", async () => {
    writeFileSync(join(projectDir, "plan.md"), "# Plan", "utf-8");
    writeRegistry(
      registryWith({
        d1: { dirId: DIR_ID, filename: "plan.md" },
        d2: { dirId: DIR_ID, filename: "deleted.md" },
      }),
    );

    const docs = await (await fetch(`${baseUrl}/api/docs`)).json();
    expect(docs.map((d) => d.id)).toEqual(["d1"]);

    const onDisk = JSON.parse(readFileSync(join(stateDir, "registry.json"), "utf-8"));
    expect(onDisk.docs.d2).toBeDefined();
  });

  it("picks up a document appended to the registry with no restart", async () => {
    writeFileSync(join(projectDir, "plan.md"), "# Plan", "utf-8");
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "plan.md" } }));
    expect(await (await fetch(`${baseUrl}/api/docs`)).json()).toHaveLength(1);

    writeFileSync(join(projectDir, "later.md"), "# Later", "utf-8");
    writeRegistry(
      registryWith({
        d1: { dirId: DIR_ID, filename: "plan.md" },
        d2: { dirId: DIR_ID, filename: "later.md" },
      }),
    );

    expect(await (await fetch(`${baseUrl}/api/docs`)).json()).toHaveLength(2);
  });

  it("returns an empty list when no registry exists yet", async () => {
    rmSync(join(stateDir, "registry.json"), { force: true });
    const res = await fetch(`${baseUrl}/api/docs`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("title derivation", () => {
  async function titleFor(content) {
    writeFileSync(join(projectDir, "doc.md"), content, "utf-8");
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "doc.md" } }));
    const [doc] = await (await fetch(`${baseUrl}/api/docs`)).json();
    return doc.title;
  }

  it("uses the first H1", async () => {
    expect(await titleFor("# First Heading\n\n# Second Heading\n")).toBe("First Heading");
  });

  it("ignores deeper headings", async () => {
    expect(await titleFor("## Not This\n\n# But This\n")).toBe("But This");
  });

  it("falls back to the filename when there is no H1", async () => {
    expect(await titleFor("Just prose, no heading.\n")).toBe("doc.md");
  });

  it("falls back rather than reading past the 4 KB window", async () => {
    expect(await titleFor(`${"x".repeat(5000)}\n\n# Too Late\n`)).toBe("doc.md");
  });

  it("reflects a rewritten heading with no registry mutation", async () => {
    expect(await titleFor("# Before Review\n")).toBe("Before Review");
    writeFileSync(join(projectDir, "doc.md"), "# After Review\n", "utf-8");
    const [doc] = await (await fetch(`${baseUrl}/api/docs`)).json();
    expect(doc.title).toBe("After Review");
  });

  it("trims surrounding whitespace from the heading", async () => {
    expect(await titleFor("#   Padded Title   \n")).toBe("Padded Title");
  });
});

describe("GET /api/docs/:id", () => {
  it("returns the exact bytes including CriticMarkup", async () => {
    const content = "# Doc\n\nSome {==highlighted==}{>>note<<} text.\n";
    writeFileSync(join(projectDir, "plan.md"), content, "utf-8");
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "plan.md" } }));

    const res = await fetch(`${baseUrl}/api/docs/d1`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(content);
  });

  it("serves UTF-8 content unmangled", async () => {
    const content = "# Título — em dash, emoji 🎯\n";
    writeFileSync(join(projectDir, "plan.md"), content, "utf-8");
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "plan.md" } }));

    expect(await (await fetch(`${baseUrl}/api/docs/d1`)).text()).toBe(content);
  });
});

describe("PUT /api/docs/:id", () => {
  it("round-trips a body to disk", async () => {
    writeFileSync(join(projectDir, "plan.md"), "# Old\n", "utf-8");
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "plan.md" } }));

    const res = await fetch(`${baseUrl}/api/docs/d1`, { method: "PUT", body: "# New\n" });
    expect(res.status).toBe(200);
    expect(readFileSync(join(projectDir, "plan.md"), "utf-8")).toBe("# New\n");
  });

  it("preserves the inode so the host bind mount stays attached", async () => {
    const path = join(projectDir, "plan.md");
    writeFileSync(path, "# Old\n", "utf-8");
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "plan.md" } }));

    const before = statSync(path).ino;
    await fetch(`${baseUrl}/api/docs/d1`, { method: "PUT", body: "# New\n" });
    expect(statSync(path).ino).toBe(before);
  });

  it("returns 410 for a deleted file and does not recreate it", async () => {
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "gone.md" } }));

    const res = await fetch(`${baseUrl}/api/docs/d1`, { method: "PUT", body: "# Resurrected\n" });
    expect(res.status).toBe(410);
    expect(() => readFileSync(join(projectDir, "gone.md"), "utf-8")).toThrow();
  });

  it("rejects a write through a symlink escaping the project directory", async () => {
    const outside = join(root, "outside.md");
    writeFileSync(outside, "# Untouched\n", "utf-8");
    symlinkSync(outside, join(projectDir, "link.md"));
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "link.md" } }));

    const res = await fetch(`${baseUrl}/api/docs/d1`, { method: "PUT", body: "# Overwritten\n" });
    expect(res.status).toBe(403);
    expect(readFileSync(outside, "utf-8")).toBe("# Untouched\n");
  });
});

describe("routing", () => {
  it("returns 404 for an unknown path", async () => {
    writeRegistry(registryWith({}));
    expect((await fetch(`${baseUrl}/api/nope`)).status).toBe(404);
  });

  it("returns 405 for an unsupported method on a document", async () => {
    writeFileSync(join(projectDir, "plan.md"), "# Plan\n", "utf-8");
    writeRegistry(registryWith({ d1: { dirId: DIR_ID, filename: "plan.md" } }));
    expect((await fetch(`${baseUrl}/api/docs/d1`, { method: "DELETE" })).status).toBe(405);
  });

  it("reports a malformed registry as a server error rather than an empty list", async () => {
    writeFileSync(join(stateDir, "registry.json"), "{ not json", "utf-8");
    expect((await fetch(`${baseUrl}/api/docs`)).status).toBe(500);
  });
});
