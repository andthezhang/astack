#!/usr/bin/env bun
// astack-docs linter.
// Walks down from a given path, finds every opted-in scope (directory with
// both AGENTS.md and .astack/), and enforces the allowlist against each
// scope's docs/ tree.
//
// Usage: bun run lint.ts [scope-path]
//        (default scope-path: cwd)

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";

const MAX_AGENTS_LINES = 150;

// The astack-docs allowlist. This is the contract — intentionally inline.
// Paths are relative to a scope root. Glob syntax: * (no slash), ** (any
// depth). REQUIRED files must exist. ALLOWED patterns are permitted.
const ALLOWLIST: { required: string[]; allowed: string[] } = {
  required: [
    "AGENTS.md",
    "ARCHITECTURE.md",
    "docs/DESIGN.md",
    "docs/FRONTEND.md",
    "docs/PLANS.md",
    "docs/PRODUCT_SENSE.md",
    "docs/QUALITY_SCORE.md",
    "docs/RELIABILITY.md",
    "docs/SECURITY.md",
    "docs/design-docs/index.md",
    "docs/product-specs/index.md",
    "docs/exec-plans/tech-debt-tracker.md",
  ],
  allowed: [
    "docs/design-docs/*.md",
    "docs/exec-plans/active/*.md",
    "docs/exec-plans/completed/*.md",
    "docs/generated/*.md",
    "docs/product-specs/*.md",
    "docs/references/**/*",
    "docs/_legacy/**/*",
  ],
};

// Frontmatter folders: field — required on design-docs + exec-plans.
// Valid values are read from <scope>/.astack/folders.txt (one per line).
// The special value "all" is always valid and signals cross-cutting scope.
const FOLDERS_REQUIRED_DIRS = [
  "docs/design-docs",
  "docs/exec-plans/active",
  "docs/exec-plans/completed",
  "docs/product-specs",
];

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", "dist", "build",
  ".astack", "target", ".venv", "venv", ".turbo", ".cache",
]);

// Files to ignore anywhere under docs/ (OS/editor junk, not user content).
const SKIP_FILES = new Set([
  ".DS_Store", "Thumbs.db", ".gitkeep", ".keep",
]);

// Folders where each *.md (other than index.md) must have YAML frontmatter.
const FRONTMATTER_DIRS = [
  "docs/design-docs",
  "docs/exec-plans/active",
  "docs/exec-plans/completed",
  "docs/product-specs",
];

// Structural markdown filenames that should only exist inside an opted-in
// scope's docs/ tree. Seeing them at the root of an un-opted-in descendant
// (a subproject with AGENTS.md but no .astack/) means a parallel doc tree
// is forming — drift. ARCHITECTURE.md is intentionally omitted; subpackages
// may reasonably describe their own architecture without opting into scope
// management.
const RESERVED_STRUCTURAL_FILES = new Set([
  "DESIGN.md", "FRONTEND.md", "PLANS.md", "PRODUCT_SENSE.md",
  "QUALITY_SCORE.md", "RELIABILITY.md", "SECURITY.md",
]);

function globToRegex(glob: string): RegExp {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i += 2;
        if (glob[i] === "/") i++;
      } else {
        re += "[^/]*";
        i++;
      }
    } else if (c === "?") {
      re += "[^/]";
      i++;
    } else if (".+^$(){}|[]\\".includes(c)) {
      re += "\\" + c;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  re += "$";
  return new RegExp(re);
}

function norm(p: string): string {
  return p.split("\\").join("/");
}

// Read <scope>/.astack/folders.txt and return the set of valid folder names.
// Returns an empty set (no folder validation) if the file doesn't exist —
// this keeps the check opt-in per scope rather than hard-failing repos that
// haven't configured it yet. "all" is always implicitly valid.
async function readFoldersConfig(scope: string): Promise<Set<string> | null> {
  const path = join(scope, ".astack", "folders.txt");
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf8");
  const out = new Set<string>();
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    out.add(t);
  }
  return out;
}

// Parse minimal YAML frontmatter at the top of a markdown file.
// Only handles the shapes we need: scalar string, YAML list inline [a, b],
// and YAML list block (next line with "- a"). Good enough for lint checks.
function parseFrontmatter(content: string): Record<string, string | string[]> | null {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) return null;
  const rest = content.slice(content.indexOf("\n") + 1);
  const endIdx = rest.indexOf("\n---");
  if (endIdx < 0) return null;
  const block = rest.slice(0, endIdx);
  const out: Record<string, string | string[]> = {};
  const lines = block.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val: string | string[] = m[2].trim();
    if (typeof val === "string" && val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map((s) => s.trim()).filter((s) => s.length > 0)
        .map((s) => s.replace(/^["']|["']$/g, ""));
    } else if (val === "") {
      const items: string[] = [];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const im = next.match(/^\s*-\s+(.*)$/);
        if (!im) break;
        items.push(im[1].trim().replace(/^["']|["']$/g, ""));
        i++;
      }
      if (items.length > 0) val = items;
    } else if (typeof val === "string") {
      val = val.replace(/^["']|["']$/g, "");
    }
    out[key] = val;
  }
  return out;
}

// A scope is opted into astack-docs when it has BOTH AGENTS.md AND a .astack/
// directory at its root. AGENTS.md alone just means Claude Code has routing
// context there; .astack/ is the explicit opt-in marker created by the
// snapshot flow (which writes .astack/last-sync).
async function findScopes(root: string): Promise<string[]> {
  const scopes: string[] = [];
  async function walk(dir: string) {
    if (existsSync(join(dir, "AGENTS.md")) && existsSync(join(dir, ".astack"))) {
      scopes.push(dir);
    }
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (SKIP_DIRS.has(e.name)) continue;
      if (e.name.startsWith(".")) continue;
      await walk(join(dir, e.name));
    }
  }
  await walk(root);
  return scopes;
}

async function walkDocs(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    if (!existsSync(d)) return;
    let entries;
    try { entries = await readdir(d, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        if (e.name.startsWith(".")) continue;
        await walk(p);
      } else if (e.isFile()) {
        if (SKIP_FILES.has(e.name)) continue;
        out.push(p);
      }
    }
  }
  await walk(dir);
  return out;
}

async function lintScope(scope: string, list: typeof ALLOWLIST): Promise<string[]> {
  const errors: string[] = [];
  const tag = relative(process.cwd(), scope) || ".";

  // 1. Required files
  for (const req of list.required) {
    if (!existsSync(join(scope, req))) {
      errors.push(
        `[${tag}] MISSING REQUIRED FILE: ${req}\n` +
        `  FIX: use astack-docs snapshot or delta mode to create this file with project-specific content.`,
      );
    }
  }

  // 2. docs/ contents against allowlist
  const docsDir = join(scope, "docs");
  if (existsSync(docsDir)) {
    const patterns = [...list.required, ...list.allowed]
      .filter((p) => p.startsWith("docs/"))
      .map(globToRegex);
    const files = await walkDocs(docsDir);
    for (const f of files) {
      const rel = norm(relative(scope, f));
      if (!patterns.some((re) => re.test(rel))) {
        errors.push(
          `[${tag}] NOT ON ALLOWLIST: ${rel}\n` +
          `  FIX: move to an allowed folder, quarantine under docs/_legacy/, or delete.`,
        );
      }
    }
  }

  // 3. AGENTS.md size
  const agents = join(scope, "AGENTS.md");
  if (existsSync(agents)) {
    const lines = (await readFile(agents, "utf8")).split("\n").length;
    if (lines > MAX_AGENTS_LINES) {
      errors.push(
        `[${tag}] AGENTS.md too long: ${lines} lines (max ${MAX_AGENTS_LINES})\n` +
        `  FIX: AGENTS.md is a map, not a manual. Move content into docs/ and link.`,
      );
    }
  }

  // 4. Frontmatter on design-docs, exec-plans, product-specs
  const validFolders = await readFoldersConfig(scope);
  for (const sub of FRONTMATTER_DIRS) {
    const dir = join(scope, sub);
    if (!existsSync(dir)) continue;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { continue; }
    const foldersRequiredHere = FOLDERS_REQUIRED_DIRS.includes(sub);
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".md")) continue;
      if (e.name === "index.md") continue;
      if (e.name === "tech-debt-tracker.md") continue;
      const f = join(dir, e.name);
      const rel = norm(relative(scope, f));
      const content = await readFile(f, "utf8");
      const fm = parseFrontmatter(content);
      if (!fm) {
        errors.push(
          `[${tag}] MISSING FRONTMATTER: ${rel}\n` +
          `  FIX: add a YAML block at the top:\n` +
          `    ---\n    status: draft\n    updated: YYYY-MM-DD\n    folders: [<folder-or-all>]\n    ---`,
        );
        continue;
      }
      if (!foldersRequiredHere) continue;
      const folders = fm["folders"];
      if (!folders || (Array.isArray(folders) && folders.length === 0)) {
        errors.push(
          `[${tag}] MISSING folders FIELD: ${rel}\n` +
          `  FIX: add a 'folders:' YAML array in the frontmatter, e.g. 'folders: [service]' or 'folders: [all]'.`,
        );
        continue;
      }
      if (validFolders && validFolders.size > 0) {
        const list = Array.isArray(folders) ? folders : [folders];
        const bad = list.filter((v) => v !== "all" && !validFolders.has(v));
        if (bad.length > 0) {
          errors.push(
            `[${tag}] INVALID folders VALUE: ${rel} has ${JSON.stringify(bad)}\n` +
            `  FIX: use one of ${[...validFolders, "all"].map((v) => `'${v}'`).join(", ")}. Configured in .astack/folders.txt.`,
          );
        }
      }
    }
  }

  return errors;
}

// Walk descendants of a scope looking for un-opted-in subdirectories that
// have grown their own doc tree or structural markdown. Opted-in descendants
// are skipped (they're linted as their own scope). Un-opted descendants
// should inherit from the parent scope — no parallel docs/, no structural
// root files.
async function checkDescendantDrift(scope: string): Promise<string[]> {
  const errors: string[] = [];
  const tag = relative(process.cwd(), scope) || ".";

  async function walk(dir: string) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (SKIP_DIRS.has(e.name)) continue;
      if (e.name.startsWith(".")) continue;
      const p = join(dir, e.name);

      const hasAgents = existsSync(join(p, "AGENTS.md"));
      const hasAstack = existsSync(join(p, ".astack"));

      // Opted-in descendant: it's its own scope. Don't recurse; don't flag.
      if (hasAgents && hasAstack) continue;

      // Un-opted descendant with AGENTS.md: check for drift signals.
      if (hasAgents && !hasAstack) {
        const rel = norm(relative(scope, p));

        if (existsSync(join(p, "docs"))) {
          errors.push(
            `[${tag}] UNEXPECTED DOCS TREE: ${rel}/docs/\n` +
            `  ${rel}/ has AGENTS.md but no .astack/ — it is not an opted-in scope.\n` +
            `  FIX: move content to the scope's root docs/ tree, or opt in ${rel}/ as its own scope by running astack-docs snapshot mode there.`,
          );
        }

        let subEntries;
        try { subEntries = await readdir(p, { withFileTypes: true }); }
        catch { subEntries = []; }
        for (const se of subEntries) {
          if (!se.isFile()) continue;
          if (!RESERVED_STRUCTURAL_FILES.has(se.name)) continue;
          errors.push(
            `[${tag}] UNEXPECTED STRUCTURAL FILE: ${rel}/${se.name}\n` +
            `  ${se.name} is reserved for opted-in scopes' docs/ trees.\n` +
            `  FIX: move content to the scope's root docs/${se.name}, or opt in ${rel}/ as its own scope.`,
          );
        }
      }

      // Recurse into descendants that are not themselves scopes.
      await walk(p);
    }
  }

  await walk(scope);
  return errors;
}

async function main() {
  const root = process.argv[2] ?? process.cwd();
  const scopes = await findScopes(root);

  if (scopes.length === 0) {
    console.error(
      `astack-docs: no opted-in scope found under ${root}.\n` +
      `  A scope is opted in when it has both AGENTS.md and a .astack/ directory.\n` +
      `  FIX: run astack-docs snapshot mode to initialize this scope.`,
    );
    process.exit(1);
  }

  let all: string[] = [];
  for (const s of scopes) {
    all = all.concat(await lintScope(s, ALLOWLIST));
    all = all.concat(await checkDescendantDrift(s));
  }

  if (all.length === 0) {
    console.log(`astack-docs: ${scopes.length} scope(s) OK`);
    return;
  }

  for (const e of all) console.error(e);
  console.error(`\nastack-docs: ${all.length} error(s) across ${scopes.length} scope(s).`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`astack-docs lint crashed: ${err?.message ?? err}`);
  process.exit(2);
});
