#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$repo_root/integrations/codex/agents"
target_dir="$HOME/.codex/agents"

if [[ ! -d "$source_dir" ]]; then
  echo "Career agent source directory not found: $source_dir" >&2
  exit 1
fi

mkdir -p "$target_dir"
shopt -s nullglob
agents=("$source_dir"/*.toml)

if (( ${#agents[@]} == 0 )); then
  echo "No Career Codex agent TOML files found in $source_dir" >&2
  exit 1
fi

cp -f "${agents[@]}" "$target_dir/"

echo "Installed ${#agents[@]} Career Evolution Platform agents to $target_dir"
for agent in "${agents[@]}"; do
  echo " - $(basename "${agent%.toml}")"
done
