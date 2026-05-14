#!/usr/bin/env bun
// astack-docs v2 linter.
// Walks down from a given path, finds every opted-in scope (directory with
// both AGENTS.md and .astack/), and enforces the v2 knowledge contract.
//
// Usage: bun run lint.ts [scope-path]
//        (default scope-path: cwd)

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";

const MAX_AGENTS_LINES = 150;

// The astack-docs v2 allowlist. This is the contract. Paths are relative to
// a scope root. Glob syntax: * (no slash), ** (any depth). REQUIRED files
// must exist. ALLOWED patterns are permitted when present.
const ALLOWLIST: { required: string[]; allowed: string[] } = {
  required: [
    "AGENTS.md",
    "CONTEXT.md",
    "CONTEXT-MAP.md",
    "docs/architecture/ARCHITECTURE.md",
    "docs/agents/issue-tracker.md",
    "docs/agents/triage-labels.md",
  ],
  allowed: [
    "DESIGN.md",
    "FRONTEND.md",
    "SECURITY.md",
    "RELIABILITY.md",
    "docs/architecture/decisions/*.md",
    "docs/issues/active/*.md",
    "docs/issues/completed/*.md",
    "docs/references/**/*",
    "docs/_legacy/**/*",
  ],
};

const DECISION_DIR = "docs/architecture/decisions";
const ISSUE_DIRS = new Map([
  ["docs/issues/active", "active"],
  ["docs/issues/completed", "completed"],
]);

const IMPLEMENTATION_VALUES = new Set(["planned", "partial", "implemented"]);

// These v1 primary folders are only allowed below docs/_legacy/.
const RETIRED_PRIMARY_DOC_DIRS = [
  "docs/design-docs",
  "docs/exec-plans",
  "docs/product-specs",
];

// Old root-level standing files that conflict with v2 placement.
const RETIRED_ROOT_FILES = new Map([
  ["ARCHITECTURE.md", "docs/architecture/ARCHITECTURE.md"],
  ["PLANS.md", "docs/issues/active/ or docs/_legacy/"],
  ["PRODUCT_SENSE.md", "CONTEXT.md or docs/_legacy/"],
  ["QUALITY_SCORE.md", "docs/issues/active/ or docs/_legacy/"],
]);

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", "dist", "build",
  ".astack", "target", ".venv", "venv", ".turbo", ".cache",
]);

// Known skill frontmatter keys. Skills may carry any of these without the
// linter flagging them as unknown. This is info-only and never blocks.
const SKILL_FRONTMATTER_KEYS = new Set([
  "name", "description",
  "source_docs", "verified_at", "status",
]);

// Set ASTACK_SKILLS_INFO=1 to surface info-level notes about skills missing
// the materialized-view frontmatter. Off by default.
const SKILLS_INFO = process.env.ASTACK_SKILLS_INFO === "1";

// Files to ignore anywhere under docs/ (OS/editor junk, not user content).
const SKIP_FILES = new Set([
  ".DS_Store", "Thumbs.db", ".gitkeep", ".keep",
]);

// Structural markdown filenames that belong only to opted-in scope roots.
// Seeing them in an un-opted-in descendant with AGENTS.md means a parallel
// managed knowledge tree is forming.
const RESERVED_DESCENDANT_FILES = new Set([
  "CONTEXT.md", "CONTEXT-MAP.md", "ARCHITECTURE.md",
  "DESIGN.md", "FRONTEND.md", "SECURITY.md", "RELIABILITY.md",
  "PLANS.md", "PRODUCT_SENSE.md", "QUALITY_SCORE.md",
]);

type Frontmatter = Record<string, string | string[]>;

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

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

// Parse minimal YAML frontmatter at the top of a markdown file.
// Handles scalar strings, inline YAML lists [a, b], and block lists.
function parseFrontmatter(content: string): Frontmatter | null {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) return null;
  const rest = content.slice(content.indexOf("\n") + 1);
  const endIdx = rest.indexOf("\n---");
  if (endIdx < 0) return null;

  const block = rest.slice(0, endIdx);
  const out: Frontmatter = {};
  const lines = block.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;

    const key = m[1];
    let val: string | string[] = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1)
        .split(",")
        .map(stripQuotes)
        .filter((s) => s.length > 0);
    } else if (val === "") {
      const items: string[] = [];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const im = next.match(/^\s*-\s+(.*)$/);
        if (!im) break;
        items.push(stripQuotes(im[1]));
        i++;
      }
      if (items.length > 0) val = items;
    } else {
      val = stripQuotes(val);
    }
    out[key] = val;
  }

  return out;
}

function scalar(fm: Frontmatter, key: string): string | undefined {
  const value = fm[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function hasValue(fm: Frontmatter, key: string): boolean {
  const value = fm[key];
  if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

function isNonEmptyArray(fm: Frontmatter, key: string): boolean {
  const value = fm[key];
  return Array.isArray(value) && value.some((item) => item.trim().length > 0);
}

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function requireFrontmatter(
  errors: string[],
  tag: string,
  rel: string,
  content: string,
  example: string,
): Frontmatter | null {
  const fm = parseFrontmatter(content);
  if (fm) return fm;
  errors.push(
    `[${tag}] MISSING FRONTMATTER: ${rel}\n` +
    `  FIX: add a YAML block at the top:\n${example}`,
  );
  return null;
}

// A scope is opted into astack-docs when it has BOTH AGENTS.md AND a .astack/
// directory at its root. AGENTS.md alone just means routing context there.
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

async function directMarkdownFiles(scope: string, relDir: string): Promise<string[]> {
  const dir = join(scope, relDir);
  if (!existsSync(dir)) return [];

  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return []; }

  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !SKIP_FILES.has(e.name))
    .map((e) => join(dir, e.name));
}

async function checkDecisionFrontmatter(scope: string, tag: string): Promise<string[]> {
  const errors: string[] = [];
  const files = await directMarkdownFiles(scope, DECISION_DIR);
  const example =
    `    ---\n` +
    `    status: accepted\n` +
    `    implementation: partial\n` +
    `    updated: YYYY-MM-DD\n` +
    `    tracks: [docs/issues/active/<issue>.md]\n` +
    `    ---`;

  for (const file of files) {
    const rel = norm(relative(scope, file));
    const content = await readFile(file, "utf8");
    const fm = requireFrontmatter(errors, tag, rel, content, example);
    if (!fm) continue;

    for (const key of ["status", "implementation", "updated"]) {
      if (!scalar(fm, key)) {
        errors.push(
          `[${tag}] MISSING DECISION FIELD: ${rel} missing '${key}'\n` +
          `  FIX: add '${key}:' to the architecture decision frontmatter.`,
        );
      }
    }

    const updated = scalar(fm, "updated");
    if (updated && !isDateString(updated)) {
      errors.push(
        `[${tag}] INVALID updated DATE: ${rel} has updated: ${updated}\n` +
        `  FIX: use YYYY-MM-DD, for example updated: 2026-05-06.`,
      );
    }

    const implementation = scalar(fm, "implementation");
    if (implementation && !IMPLEMENTATION_VALUES.has(implementation)) {
      errors.push(
        `[${tag}] INVALID implementation VALUE: ${rel} has implementation: ${implementation}\n` +
        `  FIX: use planned, partial, or implemented.`,
      );
    }

    if ((implementation === "planned" || implementation === "partial") && !hasValue(fm, "tracks")) {
      errors.push(
        `[${tag}] MISSING tracks FIELD: ${rel}\n` +
        `  FIX: implementation '${implementation}' decisions must track open work, e.g. tracks: [docs/issues/active/<issue>.md].`,
      );
    }

    if (implementation === "implemented" && !hasValue(fm, "evidence")) {
      errors.push(
        `[${tag}] MISSING evidence FIELD: ${rel}\n` +
        `  FIX: implementation 'implemented' decisions must include evidence such as code paths, PRs, tests, or deploy receipts.`,
      );
    }

    const status = scalar(fm, "status");
    if (status === "superseded" && !hasValue(fm, "superseded_by")) {
      errors.push(
        `[${tag}] MISSING superseded_by FIELD: ${rel}\n` +
        `  FIX: status 'superseded' decisions must point at the replacement decision.`,
      );
    }
  }

  return errors;
}

async function checkIssueFrontmatter(scope: string, tag: string): Promise<string[]> {
  const errors: string[] = [];
  const example =
    `    ---\n` +
    `    status: active\n` +
    `    updated: YYYY-MM-DD\n` +
    `    labels: [docs]\n` +
    `    ---`;

  for (const [relDir, expectedStatus] of ISSUE_DIRS.entries()) {
    const files = await directMarkdownFiles(scope, relDir);
    for (const file of files) {
      const rel = norm(relative(scope, file));
      const content = await readFile(file, "utf8");
      const fm = requireFrontmatter(errors, tag, rel, content, example);
      if (!fm) continue;

      for (const key of ["status", "updated"]) {
        if (!scalar(fm, key)) {
          errors.push(
            `[${tag}] MISSING ISSUE FIELD: ${rel} missing '${key}'\n` +
            `  FIX: add '${key}:' to the local issue frontmatter.`,
          );
        }
      }

      const status = scalar(fm, "status");
      if (status && status !== expectedStatus) {
        errors.push(
          `[${tag}] ISSUE STATUS/FOLDER MISMATCH: ${rel}\n` +
          `  Folder requires status: ${expectedStatus}, but frontmatter says status: ${status}.\n` +
          `  FIX: move the issue to docs/issues/${status}/, or change the frontmatter to status: ${expectedStatus}.`,
        );
      }

      const updated = scalar(fm, "updated");
      if (updated && !isDateString(updated)) {
        errors.push(
          `[${tag}] INVALID updated DATE: ${rel} has updated: ${updated}\n` +
          `  FIX: use YYYY-MM-DD, for example updated: 2026-05-06.`,
        );
      }

      if (!isNonEmptyArray(fm, "labels")) {
        errors.push(
          `[${tag}] MISSING labels FIELD: ${rel}\n` +
          `  FIX: add a non-empty YAML array, e.g. labels: [docs]. Label meanings live in docs/agents/triage-labels.md.`,
        );
      }
    }
  }

  return errors;
}

function stripMarkdownTarget(target: string): string | null {
  let cleaned = target.trim().replace(/^<|>$/g, "");
  if (!cleaned || cleaned.startsWith("#")) return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(cleaned)) return null;

  cleaned = cleaned.split("#")[0].split("?")[0];
  if (!cleaned.endsWith(".md")) return null;
  if (cleaned.includes("*") || cleaned.includes("<") || cleaned.includes(">")) return null;
  if (cleaned.startsWith("/")) cleaned = cleaned.replace(/^\/+/, "");
  if (cleaned.startsWith("./")) cleaned = cleaned.slice(2);
  return cleaned;
}

function extractMarkdownReferences(content: string): string[] {
  const refs = new Set<string>();

  // Markdown links: [label](path.md) and ![label](path.md)
  const linkRe = /!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of content.matchAll(linkRe)) {
    const ref = stripMarkdownTarget(match[1]);
    if (ref) refs.add(ref);
  }

  // Backticked paths: `docs/foo.md`
  const codePathRe = /`([^`]+\.md(?:#[^`]*)?)`/g;
  for (const match of content.matchAll(codePathRe)) {
    const ref = stripMarkdownTarget(match[1]);
    if (ref) refs.add(ref);
  }

  // Obsidian-style links: [[docs/foo.md]] or [[docs/foo.md#anchor|label]]
  const wikiLinkRe = /\[\[([^\]|#]+\.md)(?:#[^\]|]*)?(?:\|[^\]]*)?]]/g;
  for (const match of content.matchAll(wikiLinkRe)) {
    const ref = stripMarkdownTarget(match[1]);
    if (ref) refs.add(ref);
  }

  return [...refs];
}

async function checkContextMapReferences(scope: string, tag: string): Promise<string[]> {
  const errors: string[] = [];
  const file = join(scope, "CONTEXT-MAP.md");
  if (!existsSync(file)) return errors;

  const content = await readFile(file, "utf8");
  for (const ref of extractMarkdownReferences(content)) {
    const target = join(scope, ref);
    if (!existsSync(target)) {
      errors.push(
        `[${tag}] BROKEN CONTEXT-MAP REFERENCE: ${ref}\n` +
        `  FIX: update CONTEXT-MAP.md to point at an existing markdown file, or create the referenced doc.`,
      );
    }
  }

  return errors;
}

async function lintScope(scope: string, list: typeof ALLOWLIST): Promise<string[]> {
  const errors: string[] = [];
  const tag = relative(process.cwd(), scope) || ".";

  // 1. Required files.
  for (const req of list.required) {
    if (!existsSync(join(scope, req))) {
      errors.push(
        `[${tag}] MISSING REQUIRED FILE: ${req}\n` +
        `  FIX: use astack-docs snapshot or delta mode to create this file with project-specific content.`,
      );
    }
  }

  // 2. Retired root files.
  for (const [file, destination] of RETIRED_ROOT_FILES.entries()) {
    if (!existsSync(join(scope, file))) continue;
    errors.push(
      `[${tag}] RETIRED ROOT DOC: ${file}\n` +
      `  FIX: move this content to ${destination}.`,
    );
  }

  // 3. docs/ contents against allowlist.
  const docsDir = join(scope, "docs");
  if (existsSync(docsDir)) {
    for (const dir of RETIRED_PRIMARY_DOC_DIRS) {
      if (!existsSync(join(scope, dir))) continue;
      errors.push(
        `[${tag}] RETIRED PRIMARY DOC FOLDER: ${dir}/\n` +
        `  FIX: migrate active knowledge into the v2 contract, or quarantine old material under docs/_legacy/${dir.slice("docs/".length)}/.`,
      );
    }

    const patterns = [...list.required, ...list.allowed]
      .filter((p) => p.startsWith("docs/"))
      .map(globToRegex);
    const files = await walkDocs(docsDir);
    for (const f of files) {
      const rel = norm(relative(scope, f));
      if (!patterns.some((re) => re.test(rel))) {
        errors.push(
          `[${tag}] NOT ON ALLOWLIST: ${rel}\n` +
          `  FIX: move to the v2 knowledge contract, quarantine under docs/_legacy/, or delete.`,
        );
      }
    }
  }

  // 4. AGENTS.md size.
  const agents = join(scope, "AGENTS.md");
  if (existsSync(agents)) {
    const lines = (await readFile(agents, "utf8")).split("\n").length;
    if (lines > MAX_AGENTS_LINES) {
      errors.push(
        `[${tag}] AGENTS.md too long: ${lines} lines (max ${MAX_AGENTS_LINES})\n` +
        `  FIX: AGENTS.md is a map, not a manual. Move content into the v2 knowledge tree and link.`,
      );
    }
  }

  // 5. V2 frontmatter and reference checks.
  errors.push(...await checkDecisionFrontmatter(scope, tag));
  errors.push(...await checkIssueFrontmatter(scope, tag));
  errors.push(...await checkContextMapReferences(scope, tag));

  return errors;
}

// Walk descendants of a scope looking for un-opted-in subdirectories that
// have grown their own doc tree or structural markdown. Opted-in descendants
// are skipped because they are linted as their own scope.
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

      // Opted-in descendant: it is its own scope. Do not recurse or flag.
      if (hasAgents && hasAstack) continue;

      // Un-opted descendant with AGENTS.md: check for drift signals.
      if (hasAgents && !hasAstack) {
        const rel = norm(relative(scope, p));

        if (existsSync(join(p, "docs"))) {
          errors.push(
            `[${tag}] UNEXPECTED DOCS TREE: ${rel}/docs/\n` +
            `  ${rel}/ has AGENTS.md but no .astack/; it is not an opted-in scope.\n` +
            `  FIX: move content to the parent scope's v2 knowledge tree, or opt in ${rel}/ as its own scope by running astack-docs snapshot mode there.`,
          );
        }

        let subEntries;
        try { subEntries = await readdir(p, { withFileTypes: true }); }
        catch { subEntries = []; }

        for (const se of subEntries) {
          if (!se.isFile()) continue;
          if (!RESERVED_DESCENDANT_FILES.has(se.name)) continue;
          errors.push(
            `[${tag}] UNEXPECTED STRUCTURAL FILE: ${rel}/${se.name}\n` +
            `  ${se.name} belongs to an opted-in astack-docs scope root.\n` +
            `  FIX: move content to the parent scope's v2 knowledge tree, or opt in ${rel}/ as its own scope.`,
          );
        }
      }

      await walk(p);
    }
  }

  await walk(scope);
  return errors;
}

// Gently inspect SKILL.md frontmatter under <scope>/skills/*/SKILL.md (if
// that tree exists). Info-only; never contributes to the error count.
async function checkSkillFrontmatter(scope: string): Promise<string[]> {
  const notes: string[] = [];
  if (!SKILLS_INFO) return notes;

  const skillsDir = join(scope, "skills");
  if (!existsSync(skillsDir)) return notes;

  let entries;
  try { entries = await readdir(skillsDir, { withFileTypes: true }); }
  catch { return notes; }

  const tag = relative(process.cwd(), scope) || ".";
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const file = join(skillsDir, e.name, "SKILL.md");
    if (!existsSync(file)) continue;

    const content = await readFile(file, "utf8");
    const fm = parseFrontmatter(content);
    if (!fm) continue;

    const missing: string[] = [];
    if (!fm["source_docs"]) missing.push("source_docs");
    if (!fm["verified_at"]) missing.push("verified_at");
    if (missing.length > 0) {
      notes.push(
        `[${tag}] INFO skills/${e.name}/SKILL.md missing ${missing.join(", ")} (materialized-view fields).`,
      );
    }

    for (const key of Object.keys(fm)) {
      if (!SKILL_FRONTMATTER_KEYS.has(key)) {
        notes.push(`[${tag}] INFO skills/${e.name}/SKILL.md has unknown frontmatter key '${key}'.`);
      }
    }
  }

  return notes;
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
  let infos: string[] = [];
  for (const s of scopes) {
    all = all.concat(await lintScope(s, ALLOWLIST));
    all = all.concat(await checkDescendantDrift(s));
    infos = infos.concat(await checkSkillFrontmatter(s));
  }

  for (const note of infos) console.log(note);

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
