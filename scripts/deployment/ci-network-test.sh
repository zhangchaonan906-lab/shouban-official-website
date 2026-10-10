#!/usr/bin/env bash
set -euo pipefail

# CI-only component smoke test. It overrides the image entrypoint solely to
# exercise the standalone Next.js server on an internal throwaway network.
# Production continues to use the gated ENTRYPOINT in deploy/Dockerfile.
website_image="${WEBSITE_IMAGE:-shouban-official-website:ci}"
caddy_image="${CADDY_TEST_IMAGE:-caddy:2.10.2@sha256:c3d7ee5d2b11f9dc54f947f68a734c84e9c9666c92c88a7f30b9cba5da182adb}"
run_id="${GITHUB_RUN_ID:-local}"
attempt="${GITHUB_RUN_ATTEMPT:-1}"
network="shouban-ci-${run_id}-${attempt}"
website="shouban-ci-website-${run_id}-${attempt}"
caddy="shouban-ci-caddy-${run_id}-${attempt}"
probe="shouban-ci-probe-${run_id}-${attempt}"
limit_upstream="shouban-ci-limit-upstream-${run_id}-${attempt}"
limit_caddy="shouban-ci-limit-caddy-${run_id}-${attempt}"
log_dir="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
log_file="${log_dir}/shouban-ci-caddy-${run_id}-${attempt}.log"
limit_log_file="${log_dir}/shouban-ci-caddy-limit-${run_id}-${attempt}.log"
limit_caddyfile="${log_dir}/shouban-ci-caddy-limit-${run_id}-${attempt}.Caddyfile"

cleanup() {
  docker rm -f "$probe" "$limit_caddy" "$limit_upstream" "$caddy" "$website" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -f "$log_file" "$limit_log_file" "$limit_caddyfile"
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
  --platform linux/amd64 \
  --entrypoint caddy \
  "$caddy_image" \
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
docker start "$probe" >/dev/null

client_ip="$(docker inspect --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" "$probe")"
[ -n "$client_ip" ] || { echo "CI_PROXY_CLIENT_IP_UNAVAILABLE" >&2; exit 1; }
probe_status="$(docker wait "$probe")"
[ "$probe_status" = "0" ] || { echo "CI_PROXY_PROBE_FAILED" >&2; exit 1; }
docker logs "$probe"

sleep 1
docker logs "$caddy" > "$log_file" 2>/dev/null
python3 tests/deployment-caddy-log-check.py "$log_file" "$client_ip"

# Run the exact site template against a disposable hit-counting upstream so the
# CI proves Caddy itself rejects oversized contact bodies before proxying them.
docker run --detach \
  --name "$limit_upstream" \
  --network "$network" \
  --network-alias shouban-ci-limit-upstream \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --mount "type=bind,src=$PWD/tests/fixtures/deployment-limit-upstream.mjs,dst=/deployment-limit-upstream.mjs,readonly" \
  --entrypoint node \
  "$website_image" /deployment-limit-upstream.mjs >/dev/null

sed 's/reverse_proxy shouban-website:3000/reverse_proxy shouban-ci-limit-upstream:3000/' \
  "$PWD/deploy/caddy/shouban-site.caddy" > "$limit_caddyfile"
grep -Fq 'reverse_proxy shouban-ci-limit-upstream:3000' "$limit_caddyfile"
docker run --detach \
  --name "$limit_caddy" \
  --network "$network" \
  --network-alias shouban-ci-limit-caddy \
  --env SHOUBAN_SITE_DOMAIN=:8081 \
  --mount "type=bind,src=$limit_caddyfile,dst=/etc/caddy/Caddyfile,readonly" \
  --platform linux/amd64 \
  --entrypoint caddy \
  "$caddy_image" \
  run --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null

docker run --rm \
  --network "$network" \
  --read-only \
  --mount "type=bind,src=$PWD/tests/deployment-request-limit-probe.mjs,dst=/deployment-request-limit-probe.mjs,readonly" \
  --entrypoint node \
  "$website_image" /deployment-request-limit-probe.mjs

sleep 1
docker logs "$limit_caddy" > "$limit_log_file" 2>/dev/null
if grep -Fq 'CI_OVERSIZED_BODY_SENTINEL' "$limit_log_file"; then
  echo 'Caddy logs contain the synthetic oversized request body.' >&2
  exit 1
fi
