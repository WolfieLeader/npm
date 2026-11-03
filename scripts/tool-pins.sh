#!/usr/bin/env bash
# Reports each tool a workflow downloads with curl whose pinned release is behind the latest one: `pnpm tool-pins`.
# Dependabot updates actions and npm packages, but not these. Exits 1 when a pin is behind.
# A release counts once it is 1 day old, like `minimumReleaseAge` in pnpm-workspace.yaml.
set -euo pipefail

cd "$(dirname "$0")/.."
min_age_seconds=86400
now=$(date +%s)
behind=0

# Every pin is a release URL: https://github.com/<owner>/<repo>/releases/download/<tag>/<asset>
pins=$(grep -ohE 'github\.com/[^/]+/[^/]+/releases/download/[^/]+' .github/workflows/*.yml | sort -u)
if [[ -z "$pins" ]]; then
  echo "No release-download pins found in .github/workflows." >&2
  exit 1
fi

while IFS=/ read -r _ owner repo _ _ tag; do
  latest=$(gh api "repos/$owner/$repo/releases/latest" --jq '[.tag_name, (.published_at | fromdateiso8601)] | @tsv')
  IFS=$'\t' read -r latest_tag published <<<"$latest"
  if [[ "$latest_tag" == "$tag" ]]; then
    echo "current  $owner/$repo $tag"
  elif ((now - published < min_age_seconds)); then
    echo "too new  $owner/$repo $tag (latest $latest_tag is under 1 day old)"
  else
    echo "BEHIND   $owner/$repo $tag -> $latest_tag: https://github.com/$owner/$repo/releases/tag/$latest_tag"
    behind=1
  fi
done <<<"$pins"

if ((behind)); then
  echo "Update each BEHIND pin: the version in its URL and its SHA-256 from the release's checksums file." >&2
fi
exit "$behind"
