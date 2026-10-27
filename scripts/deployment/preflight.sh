#!/bin/sh
set -eu

# Read-only checks. Node 24 is an explicit operations-tool prerequisite.
# PREFLIGHT_ASSISTANT_ON_WEBSITE_NETWORK remains fail-closed.
command -v node >/dev/null 2>&1 || { printf '%s\n' PREFLIGHT_NODE_UNAVAILABLE >&2; exit 1; }
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$script_dir/deployment-checks.mjs" preflight "$@"
