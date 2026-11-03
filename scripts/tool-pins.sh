#!/usr/bin/env bash
# Reports each pin in .github/workflows whose release is behind the latest one: `pnpm tool-pins`.
# It covers tools downloaded with curl and the Bun and Deno versions. Dependabot updates neither.
# Exits 1 when a pin is behind or cannot be checked.
# A release counts once it is 1 day old, like `minimumReleaseAge` in pnpm-workspace.yaml.
set -euo pipefail

cd "$(dirname "$0")/.."
min_age_seconds=86400
now=$(date +%s)
failed=0

# Each pin becomes "<owner> <repo> <tag>": a release URL (github.com/<owner>/<repo>/releases/download/<tag>/<asset>),
# or a `bun-version` or `deno-version` input, whose release tags are `bun-v<version>` and `v<version>`.
pins=$({
  { grep -ohE 'github\.com/[^/]+/[^/]+/releases/download/[^/]+' .github/workflows/*.yml || true; } | sed -E 's#^github\.com/([^/]+)/([^/]+)/releases/download/(.+)$#\1 \2 \3#'
  { grep -ohE 'bun-version: [0-9.]+' .github/workflows/*.yml || true; } | awk '{ print "oven-sh bun bun-v" $2 }'
  { grep -ohE 'deno-version: [0-9.]+' .github/workflows/*.yml || true; } | awk '{ print "denoland deno v" $2 }'
} | sort -u)
if [[ -z "$pins" ]]; then
  echo "No release-download pins found in .github/workflows." >&2
  exit 1
fi

while read -r owner repo tag; do
  if ! latest=$(gh api "repos/$owner/$repo/releases/latest" --jq '[.tag_name, (.published_at | fromdateiso8601)] | @tsv'); then
    echo "ERROR    $owner/$repo $tag: could not read its latest release"
    failed=1
    continue
  fi
  IFS=$'\t' read -r latest_tag published <<<"$latest"
  if [[ "$latest_tag" == "$tag" ]]; then
    echo "current  $owner/$repo $tag"
  elif ((now - published < min_age_seconds)); then
    echo "too new  $owner/$repo $tag (latest $latest_tag is under 1 day old)"
  else
    echo "BEHIND   $owner/$repo $tag -> $latest_tag: https://github.com/$owner/$repo/releases/tag/$latest_tag"
    failed=1
  fi
done <<<"$pins"

if ((failed)); then
  echo "For each BEHIND line, bump the version: a download URL together with its SHA-256. An ERROR line needs a look by hand." >&2
fi
exit "$failed"
