#!/bin/sh
set -eu

# GET-only checks, including TLS/SNI before public DNS switches.
command -v node >/dev/null 2>&1 || { printf '%s\n' ACCEPTANCE_NODE_UNAVAILABLE >&2; exit 1; }
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$script_dir/deployment-checks.mjs" acceptance "$@"
