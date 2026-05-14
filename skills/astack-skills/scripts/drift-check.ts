#!/usr/bin/env bun
// astack-skills drift harvester.
//
// Role: produce deterministic (commit-diff, candidate-doc) prompt packages
// that the agent (running astack-skills in `drift` mode) then evaluates with
// a narrow LLM call. This script does NOT call the LLM — it only harvests.
//
// Output: writes prompt packages to docs/issues/active/YYYY-MM-DD-drift-report.md
// as a local issue the agent iterates over. Each block carries
// commit SHA, file path, diff, and candidate doc paths.
//
// Usage: bun run drift-check.ts [repo-root]
//        (default: cwd)

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { execSync } from "node:child_process";

const SKIP_EXT = new Set([".md", ".lock", ".png", ".jpg", ".svg", ".pdf"]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".venv"]);

type PromptPackage = {
  sha: string;
  file: string;
  diff: string;
  candidates: string[];
};

function sh(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

// Slug from a file path: strip extension, take basename, lowercase, replace
// underscores/spaces with hyphens. Matches against decision doc filenames.
function slug(path: string): string {
  const base = basename(path).replace(/\.[^.]+$/, "");
  return base.toLowerCase().replace(/[_\s]+/g, "-");
}

type DocIndex = {
  always: string[];
  bySlug: Map<string, string>;
};

function isArchitectureCandidate(docPath: string): boolean {
  return docPath === "docs/architecture/ARCHITECTURE.md"
    || (docPath.startsWith("docs/architecture/decisions/") && docPath.endsWith(".md"));
}

// Index current architecture plus decision history.
async function indexDocs(root: string): Promise<DocIndex> {
  const out: DocIndex = { always: [], bySlug: new Map() };
  const architectureDoc = join(root, "docs", "architecture", "ARCHITECTURE.md");
  if (existsSync(architectureDoc)) {
    out.always.push("docs/architecture/ARCHITECTURE.md");
    out.bySlug.set("architecture", "docs/architecture/ARCHITECTURE.md");
  }

  const decisionsDir = join(root, "docs", "architecture", "decisions");
  if (!existsSync(decisionsDir)) return out;
  let entries;
  try { entries = await readdir(decisionsDir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const docPath = join("docs", "architecture", "decisions", e.name);
    out.bySlug.set(slug(e.name), docPath);
  }
  return out;
}

// Walk skills/ and collect explicit source_docs: backrefs.
// Returns a map from doc-path → set of skill names that cite it.
async function indexSourceDocs(root: string): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const skillsDir = join(root, "skills");
  if (!existsSync(skillsDir)) return out;
  let entries;
  try { entries = await readdir(skillsDir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillFile = join(skillsDir, e.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const content = await readFile(skillFile, "utf8");
    const m = content.match(/^source_docs:\s*\[([^\]]*)\]/m);
    if (!m) continue;
    const docs = m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    for (const d of docs) {
      if (!isArchitectureCandidate(d)) continue;
      if (!out.has(d)) out.set(d, new Set());
      out.get(d)!.add(e.name);
    }
  }
  return out;
}

async function main() {
  const root = process.argv[2] ?? process.cwd();

  const raw = sh(`git log --since="24 hours ago" --no-merges --pretty=format:%H`, root).trim();
  if (!raw) {
    console.log("astack-skills drift: no commits in last 24h.");
    return;
  }
  const shas = raw.split("\n");

  const docIndex = await indexDocs(root);
  const sourceDocIndex = await indexSourceDocs(root);

  const packages: PromptPackage[] = [];

  for (const sha of shas) {
    const filesRaw = sh(`git show --name-only --pretty=format: ${sha}`, root).trim();
    const files = filesRaw.split("\n").filter(Boolean);
    for (const f of files) {
      const ext = f.slice(f.lastIndexOf("."));
      if (SKIP_EXT.has(ext)) continue;
      if (f.split("/").some((seg) => SKIP_DIRS.has(seg))) continue;

      const candidates = new Set<string>(docIndex.always);
      // Heuristic 1: slug match against docs/architecture/decisions/.
      const candidate = docIndex.bySlug.get(slug(f));
      if (candidate) candidates.add(candidate);
      // Heuristic 2: any architecture doc explicitly cited by a skill.
      // We broadcast to all architecture-cited docs — the LLM filters.
      for (const doc of sourceDocIndex.keys()) candidates.add(doc);

      if (candidates.size === 0) continue;

      let diff = "";
      try { diff = sh(`git show --format= -- ${JSON.stringify(f)} ${sha}`, root); }
      catch { continue; }
      if (!diff.trim()) continue;

      packages.push({
        sha: sha.slice(0, 12),
        file: f,
        diff: diff.length > 4000 ? diff.slice(0, 4000) + "\n...[truncated]" : diff,
        candidates: [...candidates],
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const outDir = join(root, "docs", "issues", "active");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${today}-drift-report.md`);

  const header =
    `---\n` +
    `status: active\n` +
    `updated: ${today}\n` +
    `labels: [drift, docs]\n` +
    `---\n\n`;
  const intro = `# Drift Report\n\nGenerated by astack-skills drift-check.ts on ${today}.\n\nHarvested (diff, doc) pairs. Agent evaluates each with: "Does this diff contradict any principle stated in this doc? Reply: drift: yes/no + one sentence."\n\n`;
  if (packages.length === 0) {
    await writeFile(outPath, header + intro + "_No candidate pairs harvested in the last 24h._\n");
    console.log(`astack-skills drift: 0 pairs → ${relative(root, outPath)}`);
    return;
  }
  const body = packages.map((p) =>
    `## ${p.sha} — ${p.file}\n\nCandidates: ${p.candidates.map((c) => `\`${c}\``).join(", ")}\n\n\`\`\`json\n${JSON.stringify({ sha: p.sha, file: p.file, candidates: p.candidates }, null, 2)}\n\`\`\`\n\n<details><summary>diff</summary>\n\n\`\`\`diff\n${p.diff}\n\`\`\`\n\n</details>\n`,
  ).join("\n");
  await writeFile(outPath, header + intro + body);
  console.log(`astack-skills drift: ${packages.length} pair(s) → ${relative(root, outPath)}`);
}

main().catch((err) => {
  console.error(`astack-skills drift-check crashed: ${err?.message ?? err}`);
  process.exit(2);
});
