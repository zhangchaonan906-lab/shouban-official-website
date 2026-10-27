#!/usr/bin/env bash
set -euo pipefail

# CI-only synthetic ALB-source/Host boundary, maintenance and rootless gateway test.
# No production endpoint, SMTP configuration, published host port or service entrypoint.
website_image="${WEBSITE_IMAGE:-shouban-official-website:ci}"
caddy_image="${CADDY_TEST_IMAGE:-caddy:2.10.2@sha256:c3d7ee5d2b11f9dc54f947f68a734c84e9c9666c92c88a7f30b9cba5da182adb}"
run_id="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
[[ "$run_id" =~ ^[a-zA-Z0-9-]+$ ]] || exit 1
network="shouban-ci-gw-${run_id}"
untrusted_network="shouban-ci-untrusted-${run_id}"
upstream="shouban-ci-gw-upstream-${run_id}"
gateway="shouban-ci-gateway-${run_id}"
maintenance="shouban-ci-maintenance-${run_id}"
client="shouban-ci-gw-client-${run_id}"
log_file="${RUNNER_TEMP:-/tmp}/shouban-ci-gateway-${run_id}.log"
maintenance_log_file="${RUNNER_TEMP:-/tmp}/shouban-ci-maintenance-${run_id}.log"
failure_log_file="${RUNNER_TEMP:-/tmp}/shouban-ci-gateway-failure-${run_id}.log"

cleanup() {
  docker rm -f "$client" "$maintenance" "$gateway" "$upstream" >/dev/null 2>&1 || true
  docker network rm "$untrusted_network" "$network" >/dev/null 2>&1 || true
  rm -f "$log_file" "$maintenance_log_file" "$failure_log_file"
}
trap cleanup EXIT
docker network create --internal "$network" >/dev/null
docker network create --internal "$untrusted_network" >/dev/null
trusted_subnet="$(docker network inspect --format '{{(index .IPAM.Config 0).Subnet}}' "$network")"

docker run --detach --name "$upstream" --network "$network" \
  --network-alias shouban-website --read-only --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --mount "type=bind,src=$PWD/tests/fixtures/gateway-upstream.mjs,dst=/gateway-upstream.mjs,readonly" \
  --entrypoint node "$website_image" /gateway-upstream.mjs >/dev/null

start_gateway() {
  local name=$1 config=$2 alias=$3
  docker run --detach --name "$name" --network "$network" --network-alias "$alias" \
    --user 1000:1000 --read-only --cap-drop ALL --security-opt no-new-privileges:true \
    --cpus 0.25 --memory 128m --memory-swap 128m --pids-limit 64 \
    --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777 \
    --tmpfs /config:rw,noexec,nosuid,nodev,size=8m,uid=1000,gid=1000,mode=0700 \
    --tmpfs /data:rw,noexec,nosuid,nodev,size=8m,uid=1000,gid=1000,mode=0700 \
    --env HOME=/tmp --env XDG_CONFIG_HOME=/config --env XDG_DATA_HOME=/data \
    --env SHOUBAN_SITE_DOMAIN=deployment-validation.invalid \
    --env "SHOUBAN_TRUSTED_PROXY_CIDRS=$trusted_subnet" \
    --mount "type=bind,src=$PWD/deploy/caddy/$config,dst=/etc/caddy/Caddyfile,readonly" \
    "$caddy_image" >/dev/null
}
start_gateway "$gateway" shouban-alb-http.caddy shouban-gateway
start_gateway "$maintenance" shouban-maintenance.caddy shouban-maintenance
docker network connect --alias shouban-gateway-untrusted "$untrusted_network" "$gateway"

for name in "$gateway" "$maintenance"; do
  ready=0
  for _ in $(seq 1 30); do
    if [ "$(docker inspect --format '{{.State.Status}}' "$name")" != running ]; then
      # This is a throwaway CI container before any probe has sent data. Keep
      # bootstrap diagnostics bounded and never inspect environment values.
      docker logs --tail 20 "$name" 2>&1 | python3 -c '
import json, sys
for line in sys.stdin:
    try:
        item = json.loads(line)
        print("CI_GATEWAY_BOOTSTRAP", json.dumps({key: item[key] for key in ("level", "logger", "msg", "error") if key in item}))
    except (ValueError, TypeError):
        print("CI_GATEWAY_BOOTSTRAP", line.strip()[:400])
'
      echo CI_GATEWAY_EXITED_BEFORE_HEALTH >&2
      exit 1
    fi
    if docker exec "$name" wget -q -T 3 -O /dev/null http://127.0.0.1:8080/healthz >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  [ "$ready" -eq 1 ] || { echo CI_GATEWAY_HEALTH_FAILED >&2; exit 1; }
done

docker create --name "$client" --network "$network" --read-only \
  --mount "type=bind,src=$PWD/tests/deployment-gateway-probe.mjs,dst=/gateway-probe.mjs,readonly" \
  --entrypoint node "$website_image" /gateway-probe.mjs >/dev/null
client_ip="$(docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$client")"
docker start "$client" >/dev/null
[ "$(docker wait "$client")" = 0 ] || { docker logs "$client"; exit 1; }
docker logs "$client"

docker run --rm --network "$untrusted_network" --read-only \
  --env PROBE_MODE=untrusted --env PROBE_TARGET=shouban-gateway-untrusted \
  --mount "type=bind,src=$PWD/tests/deployment-gateway-probe.mjs,dst=/gateway-probe.mjs,readonly" \
  --entrypoint node "$website_image" /gateway-probe.mjs
docker run --rm --network "$network" --read-only \
  --env PROBE_MODE=maintenance --env PROBE_TARGET=shouban-maintenance \
  --mount "type=bind,src=$PWD/tests/deployment-gateway-probe.mjs,dst=/gateway-probe.mjs,readonly" \
  --entrypoint node "$website_image" /gateway-probe.mjs

docker logs "$gateway" > "$log_file" 2>&1
python3 tests/deployment-caddy-log-check.py "$log_file" "$client_ip"
docker logs "$maintenance" > "$maintenance_log_file" 2>&1
python3 tests/deployment-caddy-log-check.py "$maintenance_log_file" "$client_ip"

# Stop only this run's synthetic upstream to produce an actual 502. In
# particular, collect stderr too: Caddy runtime errors are a separate log stream.
docker stop --timeout 1 "$upstream" >/dev/null
docker run --rm --network "$network" --read-only \
  --env PROBE_MODE=failure --env PROBE_TARGET=shouban-gateway \
  --mount "type=bind,src=$PWD/tests/deployment-gateway-probe.mjs,dst=/gateway-probe.mjs,readonly" \
  --entrypoint node "$website_image" /gateway-probe.mjs
docker logs "$gateway" > "$failure_log_file" 2>&1
python3 tests/deployment-caddy-log-check.py "$failure_log_file" "$client_ip"
python3 - "$failure_log_file" <<'PY'
import json
import sys

records = []
with open(sys.argv[1], encoding="utf-8") as source:
    for line in source:
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            pass
errors = [record for record in records
          if isinstance(record, dict)
          and record.get("level") == "error"
          and str(record.get("logger", "")).startswith("http.log.error")]
if not errors:
    raise SystemExit("CI_GATEWAY_RUNTIME_ERROR_LOG_MISSING")
if any("request" in record or "req" in record or "headers" in record for record in errors):
    raise SystemExit("CI_GATEWAY_RUNTIME_REQUEST_RETAINED")
print("CI_GATEWAY_RUNTIME_ERROR_REDACTION_OK")
PY
if grep -Fq 'CI_OVERSIZED_BODY_SENTINEL' "$log_file"; then
  echo CI_GATEWAY_BODY_LOGGED >&2
  exit 1
fi
echo CI_GATEWAY_ISOLATED_COMPONENTS_OK
