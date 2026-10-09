#!/usr/bin/env bash
set -euo pipefail

# CI-only component smoke test. It overrides the image entrypoint solely to
# exercise the standalone Next.js server on an internal throwaway network.
# Production continues to use the gated ENTRYPOINT in deploy/Dockerfile.
website_image="${WEBSITE_IMAGE:-shouban-official-website:ci}"
run_id="${GITHUB_RUN_ID:-local}"
attempt="${GITHUB_RUN_ATTEMPT:-1}"
network="shouban-ci-${run_id}-${attempt}"
website="shouban-ci-website-${run_id}-${attempt}"
caddy="shouban-ci-caddy-${run_id}-${attempt}"
probe="shouban-ci-probe-${run_id}-${attempt}"
log_dir="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
log_file="${log_dir}/shouban-ci-caddy-${run_id}-${attempt}.log"

cleanup() {
  docker rm -f "$probe" "$caddy" "$website" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -f "$log_file"
}
trap cleanup EXIT

docker network create --internal "$network" >/dev/null

# This isolated component invocation does not change the production ENTRYPOINT.
docker run --detach \
  --name "$website" \
  --network "$network" \
  --network-alias shouban-website \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m \
  --tmpfs /app/.next/cache:rw,noexec,nosuid,nodev,size=256m,uid=1000,gid=1000,mode=0750 \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --cpus 1 \
  --memory 1536m \
  --memory-swap 1536m \
  --pids-limit 128 \
  --env NODE_ENV=production \
  --env HOSTNAME=0.0.0.0 \
  --env PORT=3000 \
  --env NEXT_TELEMETRY_DISABLED=1 \
  --env NODE_OPTIONS=--max-old-space-size=1024 \
  --entrypoint node \
  "$website_image" server.js >/dev/null

docker run --detach \
  --name "$caddy" \
  --network "$network" \
  --network-alias shouban-ci-caddy \
  --env SHOUBAN_SITE_DOMAIN=:8080 \
  --mount "type=bind,src=$PWD/deploy/caddy/shouban-site.caddy,dst=/etc/caddy/Caddyfile,readonly" \
  --entrypoint caddy \
  caddy:2.10.2 \
  run --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$website" node -e 'fetch("http://127.0.0.1:3000/").then((response) => process.exit(response.status === 200 ? 0 : 1)).catch(() => process.exit(1))' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
[ "$ready" -eq 1 ] || { echo "CI_NEXT_COMPONENT_START_FAILED" >&2; exit 1; }

docker create \
  --name "$probe" \
  --network "$network" \
  --read-only \
  --mount "type=bind,src=$PWD/tests/deployment-proxy-probe.mjs,dst=/deployment-proxy-probe.mjs,readonly" \
  --entrypoint node \
  "$website_image" /deployment-proxy-probe.mjs >/dev/null
docker start --attach "$probe"

client_ip="$(docker inspect --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" "$probe")"
[ -n "$client_ip" ] || { echo "CI_PROXY_CLIENT_IP_UNAVAILABLE" >&2; exit 1; }

sleep 1
docker logs "$caddy" > "$log_file" 2>/dev/null
python3 tests/deployment-caddy-log-check.py "$log_file" "$client_ip"
