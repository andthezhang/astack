#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: detect-suspicious-commits.sh [BASE] [HEAD]

Reads commits in BASE..HEAD (default HEAD=HEAD). If BASE is omitted, the script
uses .astack/last-sync from the current repo root.

Heuristics are intentionally simple and noisy:
- deletion-heavy commits
- removed UI/state bindings without an obvious replacement
- dynamic UI behavior that may have been replaced by literals

Exit codes:
  0  no suspicious commits found
  1  suspicious commits found
  2  usage / revision error
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ $# -gt 2 ]; then
  usage >&2
  exit 2
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: must run inside a git repo" >&2
  exit 2
fi

BASE="${1:-}"
HEAD_REF="${2:-HEAD}"

if [ -z "$BASE" ]; then
  if [ -f ".astack/last-sync" ]; then
    BASE="$(tr -d '[:space:]' < .astack/last-sync)"
  else
    echo "error: missing BASE and no .astack/last-sync found" >&2
    exit 2
  fi
fi

if ! git rev-parse --verify "${BASE}^{commit}" >/dev/null 2>&1; then
  echo "error: unknown base revision: $BASE" >&2
  exit 2
fi

if ! git rev-parse --verify "${HEAD_REF}^{commit}" >/dev/null 2>&1; then
  echo "error: unknown head revision: $HEAD_REF" >&2
  exit 2
fi

binding_pattern='@Environment|@ObservedObject|@StateObject|@AppStorage|@Query|private var [A-Za-z_][A-Za-z0-9_]*: .* \{'
literal_pattern='Text\(".*"\)|return "[^"]+"|= \[[^]]+\]|= [0-9]+\b|= true\b|= false\b'

found=0
commit_count=0

while IFS= read -r commit; do
  [ -z "$commit" ] && continue
  commit_count=$((commit_count + 1))

  subject="$(git log -1 --format=%s "$commit")"
  patch="$(git show --format= --unified=0 "$commit")"
  files="$(git diff-tree --no-commit-id --name-only -r "$commit" | tr '\n' ',' | sed 's/,$//')"
  code_like_files="$(git diff-tree --no-commit-id --name-only -r "$commit" | grep -E '\.(swift|ts|tsx|js|jsx|py|go|rb|java|kt|m|mm|c|cc|cpp|h|rs|sh|sql|yml|yaml)$' || true)"
  ui_like_files="$(git diff-tree --no-commit-id --name-only -r "$commit" | grep -E '(^|/)(UI|Views?|Screens?|Components?|pages?|components?)/|((View|Screen|Card|Popup)\.(swift|ts|tsx|js|jsx)$)' || true)"
  add_total=0
  del_total=0

  while IFS=$'\t' read -r added deleted _path; do
    case "$added" in
      ''|*-*) ;;
      *) add_total=$((add_total + added)) ;;
    esac
    case "$deleted" in
      ''|*-*) ;;
      *) del_total=$((del_total + deleted)) ;;
    esac
  done < <(git show --numstat --format= "$commit")

  reasons=()

  if [ -n "$code_like_files" ] && [ "$del_total" -ge 12 ] && [ "$del_total" -ge $((add_total * 2)) ]; then
    reasons+=("deletion-heavy (${del_total} deletions vs ${add_total} additions)")
  fi

  ui_findings=()
  while IFS= read -r ui_file; do
    [ -z "$ui_file" ] && continue
    file_patch="$(git show --format= --unified=0 "$commit" -- "$ui_file")"
    removed_binding=0
    added_binding=0
    added_literal=0

    if printf '%s\n' "$file_patch" | grep -Eq "^-.*(${binding_pattern})"; then
      removed_binding=1
    fi

    if printf '%s\n' "$file_patch" | grep -Eq "^\+.*(${binding_pattern})"; then
      added_binding=1
    fi

    if printf '%s\n' "$file_patch" | grep -Eq "^\+.*(${literal_pattern})"; then
      added_literal=1
    fi

    if [ "$removed_binding" -eq 1 ] && [ "$added_binding" -eq 0 ]; then
      ui_findings+=("${ui_file}: removed UI/state bindings without an obvious replacement")
    fi

    if [ "$removed_binding" -eq 1 ] && [ "$added_literal" -eq 1 ]; then
      ui_findings+=("${ui_file}: dynamic UI behavior may have been replaced by literals")
    fi
  done < <(printf '%s\n' "$ui_like_files")

  if [ "${#reasons[@]}" -gt 0 ] || [ "${#ui_findings[@]}" -gt 0 ]; then
    found=1
    echo "$commit $subject"
    if [ "${#reasons[@]}" -gt 0 ]; then
      printf '  reasons: %s\n' "$(IFS='; '; echo "${reasons[*]}")"
    fi
    if [ "${#ui_findings[@]}" -gt 0 ]; then
      printf '  ui findings: %s\n' "$(IFS='; '; echo "${ui_findings[*]}")"
    fi
    [ -n "$files" ] && printf '  files: %s\n' "$files"
    echo ""
  fi
done < <(git rev-list --reverse --no-merges "${BASE}..${HEAD_REF}")

if [ "$commit_count" -eq 0 ]; then
  echo "No new commits in ${BASE}..${HEAD_REF}"
  exit 0
fi

if [ "$found" -eq 0 ]; then
  echo "No suspicious commits detected in ${BASE}..${HEAD_REF}"
  exit 0
fi

echo "Suspicious commits detected above."
exit 1
