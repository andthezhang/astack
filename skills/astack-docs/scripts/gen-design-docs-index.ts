#!/usr/bin/env bun
// Generate docs/design-docs/index.md grouped by folders: frontmatter field.
// Usage: bun run gen-design-docs-index.ts [repo-root]

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();
const dir = join(root, "docs/design-docs");
const indexPath = join(dir, "index.md");

function parseFrontmatter(content: string): Record<string, string | string[]> | null {
  if (!content.startsWith("---\n")) return null;
  const rest = content.slice(4);
  const endIdx = rest.indexOf("\n---");
  if (endIdx < 0) return null;
  const block = rest.slice(0, endIdx);
  const out: Record<string, string | string[]> = {};
  const lines = block.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val: string | string[] = m[2].trim();
    if (typeof val === "string" && val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter((s) => s.length > 0);
    } else if (typeof val === "string") {
      val = val.replace(/^["']|["']$/g, "");
    }
    out[key] = val;
  }
  return out;
}

function firstHeadline(content: string): string | null {
  const lines = content.split("\n");
  let inFM = false, fmClosed = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === "---") { if (!inFM) inFM = true; else fmClosed = true; continue; }
    if (inFM && !fmClosed) continue;
    if (l.startsWith("# ")) return l.slice(2).trim();
  }
  return null;
}

interface DocEntry {
  filename: string;
  title: string;
  folders: string[];
  status?: string;
}

const entries = await readdir(dir, { withFileTypes: true });
const docs: DocEntry[] = [];
for (const e of entries) {
  if (!e.isFile()) continue;
  if (!e.name.endsWith(".md")) continue;
  if (e.name === "index.md") continue;
  const content = await readFile(join(dir, e.name), "utf8");
  const fm = parseFrontmatter(content);
  if (!fm) continue;
  const folders = Array.isArray(fm.folders) ? fm.folders as string[] : (fm.folders ? [fm.folders as string] : ["(untagged)"]);
  const title = firstHeadline(content) ?? e.name.replace(/\.md$/, "");
  const status = typeof fm.status === "string" ? fm.status as string : undefined;
  docs.push({ filename: e.name, title, folders, status });
}

// Build buckets. Each doc goes in each of its folders' sections, EXCEPT `all`
// (those get their own cross-cutting section).
const buckets = new Map<string, DocEntry[]>();
for (const d of docs) {
  if (d.folders.includes("all")) {
    const list = buckets.get("all") ?? [];
    list.push(d);
    buckets.set("all", list);
    continue;
  }
  for (const f of d.folders) {
    const list = buckets.get(f) ?? [];
    list.push(d);
    buckets.set(f, list);
  }
}

// Concrete folders first (alphabetical), then "all" last. Projects that want a
// specific display order can override via .astack/folders-order.txt in the
// future; for v1 we just sort.
const presentFolders = [...new Set(docs.flatMap((d) => d.folders))].filter((f) => f !== "all");
const sortedFolders = presentFolders.sort();

function slugify(folder: string): string {
  return `docs-for-${folder.replace(/_/g, "-")}`;
}

let md = `# Design Docs Index\n\nCanonical home for architectural and product design docs. Each doc declares which subproject(s) it applies to via a \`folders:\` frontmatter field, grouped below. Docs tagged \`folders: [all]\` are cross-cutting and appear once in the "Cross-cutting" section.\n\nA doc appears in every folder section it applies to — multi-surface docs (e.g., \`[service, app]\`) show up in both.\n\n`;

md += "## Jump to\n\n";
for (const f of sortedFolders) {
  const count = buckets.get(f)?.length ?? 0;
  md += `- [${f}](#${slugify(f)}) — ${count} doc${count === 1 ? "" : "s"}\n`;
}
if (buckets.has("all")) {
  const count = buckets.get("all")!.length;
  md += `- [Cross-cutting](#cross-cutting) — ${count} doc${count === 1 ? "" : "s"}\n`;
}
md += "\n---\n\n";

function sectionFor(folder: string, heading: string, anchor: string): string {
  const list = buckets.get(folder);
  if (!list || list.length === 0) return "";
  let s = `## ${heading}\n<a id="${anchor}"></a>\n\n`;
  const sorted = [...list].sort((a, b) => a.filename.localeCompare(b.filename));
  for (const d of sorted) {
    const tags = d.folders.length > 1 ? ` _(also: ${d.folders.filter((f) => f !== folder).join(", ")})_` : "";
    const st = d.status ? ` _[${d.status}]_` : "";
    s += `- [${d.title}](${d.filename})${st}${tags}\n`;
  }
  s += "\n";
  return s;
}

for (const f of sortedFolders) {
  md += sectionFor(f, `Docs for \`${f}\``, slugify(f));
}
if (buckets.has("all")) {
  md += sectionFor("all", "Cross-cutting", "cross-cutting");
}

md += `## Index Maintenance\n\nThis file is regenerated from design-doc frontmatter. When a new design-doc lands, re-run the generator (see astack-docs skill) so this index stays in sync. The astack-docs doc gardener may auto-update during delta passes.\n`;

await writeFile(indexPath, md);
console.log(`Wrote ${indexPath} with ${docs.length} doc entries across ${sortedFolders.length + (buckets.has("all") ? 1 : 0)} sections.`);
