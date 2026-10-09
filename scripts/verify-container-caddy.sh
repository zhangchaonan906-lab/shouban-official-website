#!/usr/bin/env bash
set -Eeuo pipefail

readonly NODE_IMAGE='node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20'
readonly CADDY_IMAGE='caddy:2.10.2-alpine@sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d'
readonly SITE_ORIGIN='https://shouban.example.invalid'
readonly WEB_IMAGE="shouban-container-ci:${GITHUB_RUN_ID:-local}"
readonly RUN_SUFFIX="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
readonly PROJECT="shouban-ci-${RUN_SUFFIX}"
readonly PROXY_NETWORK="shouban-proxy-ci-${RUN_SUFFIX}"
readonly OTHER_NETWORK="shouban-unrelated-ci-${RUN_SUFFIX}"
readonly UPSTREAM="shouban-upstream-${RUN_SUFFIX}"
readonly CADDY="shouban-caddy-${RUN_SUFFIX}"
readonly SENTINEL="unrelated-assistant-sentinel-${RUN_SUFFIX}"
readonly ORIGIN_MISMATCH_CONTAINER="shouban-origin-mismatch-${RUN_SUFFIX}"
readonly RELEASE_GATE_CONTAINER="shouban-release-gate-${RUN_SUFFIX}"
readonly TEMP_DIR="$(mktemp -d)"

COMPOSE_ENV="${TEMP_DIR}/compose.env"
RUNTIME_ENV="${TEMP_DIR}/runtime.env"
COMPOSE_CREATED=0
DIAGNOSE_CADDY=0

cleanup() {
  if [[ "$COMPOSE_CREATED" == "1" ]]; then
    docker compose --env-file "$COMPOSE_ENV" -p "$PROJECT" -f compose.yaml down --remove-orphans >/dev/null 2>&1 || true
  fi
  docker rm -f "$UPSTREAM" "$CADDY" "$SENTINEL" \
    "$ORIGIN_MISMATCH_CONTAINER" "$RELEASE_GATE_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$PROXY_NETWORK" "$OTHER_NETWORK" >/dev/null 2>&1 || true
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT
on_error() {
  local status=$?
  if [[ "${DIAGNOSE_CADDY:-0}" == "1" ]]; then
    printf 'Caddy integration verifier failed near line %s.\n' "${BASH_LINENO[0]}" >&2
    if docker inspect "$CADDY" >/dev/null 2>&1; then
      echo 'Caddy internal log:' >&2
      docker logs "$CADDY" >&2 || true
      docker inspect --format 'Caddy state={{.State.Status}} network={{.HostConfig.NetworkMode}} attachments={{json .NetworkSettings.Networks}}' "$CADDY" >&2 || true
    fi
    if docker inspect "$UPSTREAM" >/dev/null 2>&1; then
      docker inspect --format 'Mock upstream state={{.State.Status}} network={{.HostConfig.NetworkMode}} attachments={{json .NetworkSettings.Networks}}' "$UPSTREAM" >&2 || true
      docker logs "$UPSTREAM" >&2 || true
    fi
  fi
  return "$status"
}
trap on_error ERR

docker pull "$NODE_IMAGE"
docker pull "$CADDY_IMAGE"
docker build --pull --progress=plain \
  --tag "$WEB_IMAGE" \
  --build-arg "NEXT_PUBLIC_SITE_URL=$SITE_ORIGIN" \
  .

docker network create "$PROXY_NETWORK" >/dev/null
docker network create "$OTHER_NETWORK" >/dev/null

printf 'NEXT_PUBLIC_SITE_URL=%s\nCOMPONENT_TEST_ONLY=1\n' "$SITE_ORIGIN" > "$RUNTIME_ENV"
printf 'SHOUBAN_IMAGE=%s\nNEXT_PUBLIC_SITE_URL=%s\nSHOUBAN_RUNTIME_ENV_FILE=%s\nSHOUBAN_PROXY_NETWORK=%s\n' \
  "$WEB_IMAGE" "$SITE_ORIGIN" "$RUNTIME_ENV" "$PROXY_NETWORK" > "$COMPOSE_ENV"

docker compose --env-file "$COMPOSE_ENV" -p "$PROJECT" -f compose.yaml config --quiet
COMPOSE_CREATED=1
docker compose --env-file "$COMPOSE_ENV" -p "$PROJECT" -f compose.yaml create --no-build web
WEB_CONTAINER="$(docker compose --env-file "$COMPOSE_ENV" -p "$PROJECT" -f compose.yaml ps --all --quiet web)"
test -n "$WEB_CONTAINER"

WEB_USER="$(docker inspect --format '{{.Config.User}}' "$WEB_CONTAINER")"
[[ "$WEB_USER" == "nextjs" ]]
[[ "$(docker inspect --format '{{.HostConfig.NetworkMode}}' "$WEB_CONTAINER")" == "$PROXY_NETWORK" ]]
[[ "$(docker inspect --format '{{.HostConfig.Memory}}' "$WEB_CONTAINER")" == "1610612736" ]]
[[ "$(docker inspect --format '{{.HostConfig.NanoCpus}}' "$WEB_CONTAINER")" == "1000000000" ]]
[[ "$(docker inspect --format '{{.HostConfig.PidsLimit}}' "$WEB_CONTAINER")" == "256" ]]
[[ "$(docker inspect --format '{{.HostConfig.LogConfig.Type}}' "$WEB_CONTAINER")" == "json-file" ]]
[[ "$(docker inspect --format '{{index .HostConfig.LogConfig.Config "max-size"}}' "$WEB_CONTAINER")" == "10m" ]]
[[ "$(docker inspect --format '{{index .HostConfig.LogConfig.Config "max-file"}}' "$WEB_CONTAINER")" == "3" ]]
[[ "$(docker inspect --format '{{len .HostConfig.PortBindings}}' "$WEB_CONTAINER")" == "0" ]]
HEALTHCHECK_CONFIG="$(docker inspect --format '{{json .Config.Healthcheck.Test}}' "$WEB_CONTAINER")"
[[ "$HEALTHCHECK_CONFIG" == *'/api/health'* ]]
NETWORK_CONFIG="$(docker inspect --format '{{json .NetworkSettings.Networks}}' "$WEB_CONTAINER")"
[[ "$NETWORK_CONFIG" == *'shouban-web'* ]]

docker export "$WEB_CONTAINER" > "${TEMP_DIR}/web-rootfs.tar"
tar -tf "${TEMP_DIR}/web-rootfs.tar" > "${TEMP_DIR}/image-files.txt"
for path in \
  app/server.js \
  app/.build-site-origin \
  app/scripts/container-entrypoint.mjs \
  app/scripts/privacy-release-check.mjs \
  app/lib/privacy-readiness.mjs \
  app/lib/privacy-policy.mjs \
  app/.next/BUILD_ID \
  app/.next/server/app/index.html \
  app/.next/server/app/api/health/route.js \
  app/.next/server/app/sitemap.xml.body; do
  grep -Fxq "$path" "${TEMP_DIR}/image-files.txt"
done
grep -Eq '^nextjs:x:1001:1001:' < <(tar -xOf "${TEMP_DIR}/web-rootfs.tar" etc/passwd)
tar -xOf "${TEMP_DIR}/web-rootfs.tar" app/.build-site-origin > "${TEMP_DIR}/build-site-origin"
printf '%s' "$SITE_ORIGIN" > "${TEMP_DIR}/expected-site-origin"
cmp -s "${TEMP_DIR}/build-site-origin" "${TEMP_DIR}/expected-site-origin"
tar -xOf "${TEMP_DIR}/web-rootfs.tar" app/.next/server/app/index.html > "${TEMP_DIR}/built-home.html"
grep -Fq "$SITE_ORIGIN/" "${TEMP_DIR}/built-home.html"
tar -xOf "${TEMP_DIR}/web-rootfs.tar" app/.next/server/app/sitemap.xml.body > "${TEMP_DIR}/built-sitemap.xml"
grep -Fq "$SITE_ORIGIN/" "${TEMP_DIR}/built-sitemap.xml"
if grep -Eq '(^|/)\.env([^/]|$)' "${TEMP_DIR}/image-files.txt"; then
  echo 'Unexpected environment file in final image' >&2
  exit 1
fi
if grep -Eiq '^app/.*\.(pem|key|p12|pfx)$' "${TEMP_DIR}/image-files.txt"; then
  echo 'Unexpected credential file in final image' >&2
  exit 1
fi
IMAGE_ENV="$(docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$WEB_IMAGE")"
RUNTIME_ENV_VALUES="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$WEB_CONTAINER")"
if grep -Eiq '(^|=)(SMTP_PASS|CONTACT_TO_EMAIL|PRIVACY_OPERATIONS_ATTESTATION_ID|PRIVACY_OPERATIONS_APPROVED_AT)=' <<< "$IMAGE_ENV"; then
  echo 'Unexpected secret or release-evidence variable baked into image environment' >&2
  exit 1
fi
if grep -Eiq '(^|=)(SMTP_PASS|CONTACT_TO_EMAIL|PRIVACY_OPERATIONS_ATTESTATION_ID|PRIVACY_OPERATIONS_APPROVED_AT)=' <<< "$RUNTIME_ENV_VALUES"; then
  echo 'Unexpected secret or release-evidence variable in the isolated container environment' >&2
  exit 1
fi

docker rm "$WEB_CONTAINER" >/dev/null
docker compose --env-file "$COMPOSE_ENV" -p "$PROJECT" -f compose.yaml down --remove-orphans >/dev/null
COMPOSE_CREATED=0
DIAGNOSE_CADDY=0

set +e
docker run --name "$ORIGIN_MISMATCH_CONTAINER" \
  --env NEXT_PUBLIC_SITE_URL=https://runtime.example.invalid \
  "$WEB_IMAGE" > "${TEMP_DIR}/origin-mismatch.log" 2>&1
MISMATCH_STATUS=$?
set -e
[[ "$MISMATCH_STATUS" == "1" ]]
grep -Fq 'CONTAINER_SITE_ORIGIN_MISMATCH' "${TEMP_DIR}/origin-mismatch.log"
if grep -Fq 'PRIVACY_CONFIG_MISSING' "${TEMP_DIR}/origin-mismatch.log"; then
  echo 'Origin mismatch was not rejected before the release check' >&2
  exit 1
fi
docker rm "$ORIGIN_MISMATCH_CONTAINER" >/dev/null

set +e
docker run --name "$RELEASE_GATE_CONTAINER" \
  --cpus 1 --memory 1536m --pids-limit 256 \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
  --env "NEXT_PUBLIC_SITE_URL=$SITE_ORIGIN" \
  "$WEB_IMAGE" > "${TEMP_DIR}/release-gate.log" 2>&1
GATE_STATUS=$?
set -e
[[ "$GATE_STATUS" == "1" ]]
grep -Fq 'PRIVACY_CONFIG_MISSING PRIVACY_CONTACT_EMAIL' "${TEMP_DIR}/release-gate.log"
if grep -Eiq 'ready - started server|listening on' "${TEMP_DIR}/release-gate.log"; then
  echo 'Server started although the release check failed' >&2
  exit 1
fi
docker rm "$RELEASE_GATE_CONTAINER" >/dev/null

DIAGNOSE_CADDY=1
readonly CADDY_TEMPLATE="$PWD/deploy/caddy/shouban-site.Caddyfile.example"
docker run --rm --entrypoint caddy \
  --mount "type=bind,src=${CADDY_TEMPLATE},dst=/tmp/site.Caddyfile,readonly" \
  "$CADDY_IMAGE" adapt --config /tmp/site.Caddyfile --adapter caddyfile --pretty >/dev/null
docker run --rm --entrypoint caddy \
  --mount "type=bind,src=${CADDY_TEMPLATE},dst=/tmp/site.Caddyfile,readonly" \
  "$CADDY_IMAGE" validate --config /tmp/site.Caddyfile --adapter caddyfile

sed '1s#shouban.example.invalid {#http://shouban.example.invalid:8080 {#' \
  "$CADDY_TEMPLATE" > "${TEMP_DIR}/Caddyfile.integration"
cat >> "${TEMP_DIR}/Caddyfile.integration" <<'CADDY'

http://other.example.invalid:8080 {
	respond "other-site-ok"
}
CADDY
docker run --rm --entrypoint caddy \
  --mount "type=bind,src=${TEMP_DIR}/Caddyfile.integration,dst=/tmp/Caddyfile,readonly" \
  "$CADDY_IMAGE" adapt --config /tmp/Caddyfile --adapter caddyfile --pretty >/dev/null
docker run --rm --entrypoint caddy \
  --mount "type=bind,src=${TEMP_DIR}/Caddyfile.integration,dst=/tmp/Caddyfile,readonly" \
  "$CADDY_IMAGE" validate --config /tmp/Caddyfile --adapter caddyfile

docker run --detach --name "$UPSTREAM" \
  --network "$PROXY_NETWORK" --network-alias shouban-web \
  --mount "type=bind,src=$PWD/tests/fixtures/proxy-upstream.mjs,dst=/tmp/proxy-upstream.mjs,readonly" \
  "$NODE_IMAGE" node /tmp/proxy-upstream.mjs >/dev/null
docker run --detach --name "$SENTINEL" \
  --network "$OTHER_NETWORK" --network-alias unrelated-assistant \
  --mount "type=bind,src=$PWD/tests/fixtures/proxy-upstream.mjs,dst=/tmp/proxy-upstream.mjs,readonly" \
  "$NODE_IMAGE" node /tmp/proxy-upstream.mjs >/dev/null
docker run --detach --name "$CADDY" --network "$PROXY_NETWORK" \
  --publish 127.0.0.1:18080:8080 \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
  --mount "type=bind,src=${TEMP_DIR}/Caddyfile.integration,dst=/etc/caddy/Caddyfile,readonly" \
  --entrypoint caddy "$CADDY_IMAGE" run --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null

for attempt in $(seq 1 30); do
  if curl -fsS -H 'Host: shouban.example.invalid' http://127.0.0.1:18080/__hits >/dev/null; then
    break
  fi
  if [[ "$attempt" == "30" ]]; then
    docker logs "$CADDY" >&2
    exit 1
  fi
  sleep 1
done

docker run --rm --network "$PROXY_NETWORK" "$NODE_IMAGE" node -e \
  "fetch('http://unrelated-assistant:3000').then(() => process.exit(1)).catch(() => process.exit(0))"

get_hits() {
  curl -fsS -H 'Host: shouban.example.invalid' http://127.0.0.1:18080/__hits | jq -r '.hits'
}

proxy_get() {
  local path="$1"
  curl -fsS -H 'Host: shouban.example.invalid' \
    -D "${TEMP_DIR}/response.headers" -o "${TEMP_DIR}/response.body" \
    "http://127.0.0.1:18080${path}"
  grep -Eiq '^cache-control:.*no-store' "${TEMP_DIR}/response.headers" || return 1
  cat "${TEMP_DIR}/response.body"
}

proxy_post() {
  local path="$1"
  local body_file="$2"
  curl -fsS -H 'Host: shouban.example.invalid' \
    -H 'Content-Type: text/plain' \
    -D "${TEMP_DIR}/response.headers" -o "${TEMP_DIR}/response.body" \
    --data-binary "@${body_file}" "http://127.0.0.1:18080${path}"
  grep -Eiq '^cache-control:.*no-store' "${TEMP_DIR}/response.headers" || return 1
  cat "${TEMP_DIR}/response.body"
}

for route in /contact /privacy; do
  before="$(get_hits)"
  first="$(proxy_get "$route")"
  first_hits="$(jq -r '.hits' <<< "$first")"
  second="$(proxy_get "$route")"
  second_hits="$(jq -r '.hits' <<< "$second")"
  [[ "$first_hits" -gt "$before" && "$second_hits" -gt "$first_hits" ]]
done

readonly BODY_SENTINEL='CI_BODY_SHOULD_NEVER_APPEAR_IN_PROXY_LOGS'
printf '%s' "$BODY_SENTINEL" > "${TEMP_DIR}/small-body.txt"
before="$(get_hits)"
first="$(proxy_post /api/contact "${TEMP_DIR}/small-body.txt")"
first_hits="$(jq -r '.hits' <<< "$first")"
second="$(proxy_post /api/contact "${TEMP_DIR}/small-body.txt")"
second_hits="$(jq -r '.hits' <<< "$second")"
[[ "$first_hits" -gt "$before" && "$second_hits" -gt "$first_hits" ]]

dd if=/dev/zero of="${TEMP_DIR}/large-body.bin" bs=17000 count=1 status=none
before="$(get_hits)"
oversized_status="$(curl -sS -H 'Host: shouban.example.invalid' \
  -H 'Content-Type: application/octet-stream' -o /dev/null -w '%{http_code}' \
  --data-binary "@${TEMP_DIR}/large-body.bin" \
  http://127.0.0.1:18080/api/contact)"
after="$(get_hits)"
[[ "$oversized_status" == "413" && "$after" == "$before" ]]

other_response="$(curl -fsS -H 'Host: other.example.invalid' http://127.0.0.1:18080/)"
[[ "$other_response" == "other-site-ok" ]]
if docker logs "$CADDY" 2>&1 | grep -Fq "$BODY_SENTINEL"; then
  echo 'Caddy logs contain a test request body' >&2
  exit 1
fi
[[ "$(docker inspect --format '{{.HostConfig.LogConfig.Type}}' "$CADDY")" == "json-file" ]]
[[ "$(docker inspect --format '{{index .HostConfig.LogConfig.Config "max-size"}}' "$CADDY")" == "10m" ]]
[[ "$(docker inspect --format '{{index .HostConfig.LogConfig.Config "max-file"}}' "$CADDY")" == "3" ]]

NODE_DIGEST="$NODE_IMAGE"
CADDY_DIGEST="$CADDY_IMAGE"
WEB_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$WEB_IMAGE")"
CADDY_VERSION="$(docker run --rm --entrypoint caddy "$CADDY_IMAGE" version)"
[[ "$CADDY_VERSION" == v2.10.2* ]]
printf 'Built image %s (%s).\n' "$WEB_IMAGE" "$WEB_IMAGE_ID"
printf 'Container build and release-gate checks passed.\nCaddy %s isolated proxy checks passed.\n' "$CADDY_VERSION"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo '### Isolated container and proxy verification'
    echo "- Web image: $WEB_IMAGE"
    echo "- Node base digest: $NODE_DIGEST"
    echo "- Caddy test image digest: $CADDY_DIGEST"
    echo '- Image runtime user and required standalone files verified; no `.env` file or runtime credentials were present.'
    echo '- Compose limits verified: 1 CPU, 1536 MiB RAM, 256 PIDs, JSON logs capped at 10 MiB × 3 files.'
    echo '- Homepage canonical URL, sitemap URLs, build-origin marker, and runtime origin consistency verified.'
    echo '- Origin mismatch rejected; matching build origin still failed the real release gate because production readiness evidence was absent.'
    echo '- Caddy adapt/validate and bridge DNS, request-size, no-store forwarding, no-cache hit count, alternate-site route, and separate-network isolation checks passed against a mock upstream.'
    echo '- The mock upstream test is a proxy component test, not a production site or SMTP acceptance test.'
  } >> "$GITHUB_STEP_SUMMARY"
fi
