#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

COMPOSE_FILE=deploy/compose.website.yml
: "$COMPOSE_ENV_FILE"
: "$SITE_ORIGIN"
: "$SITE_HOST"

case "$SITE_ORIGIN" in
  https://*) ;;
  *) fail "ACCEPTANCE_SITE_ORIGIN_NOT_HTTPS" ;;
esac
site_authority="$(printf '%s' "$SITE_ORIGIN" | cut -c 9-)"
case "$site_authority" in
  ""|*/*|*'?'*|*'#'*|*'@'*) fail "ACCEPTANCE_SITE_ORIGIN_NOT_AN_ORIGIN" ;;
esac
case "$SITE_HOST" in
  ""|*/*|*'?'*|*'#'*|*'@'*) fail "ACCEPTANCE_SITE_HOST_INVALID" ;;
esac

container_id="$(docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" ps -q website)" || fail "ACCEPTANCE_COMPOSE_QUERY_FAILED"
[ -n "$container_id" ] || fail "ACCEPTANCE_WEBSITE_CONTAINER_MISSING"

container_state="$(docker inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{json .HostConfig.PortBindings}}' "$container_id")"
IFS='|' read -r state health published_ports <<EOF
$container_state
EOF
[ "$state" = "running" ] || fail "ACCEPTANCE_WEBSITE_NOT_RUNNING"
[ "$health" = "healthy" ] || fail "ACCEPTANCE_WEBSITE_NOT_HEALTHY"
case "$published_ports" in
  null|'{}'|'[]') ;;
  *) fail "ACCEPTANCE_WEBSITE_HAS_PUBLISHED_PORTS" ;;
esac

http_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "http://$SITE_HOST/")" || fail "ACCEPTANCE_HTTP_REDIRECT_UNAVAILABLE"
case "$http_status" in
  301|308) ;;
  *) fail "ACCEPTANCE_HTTP_REDIRECT_STATUS_INVALID" ;;
esac
redirect_target="$(curl --silent --show-error --output /dev/null --write-out '%{redirect_url}' "http://$SITE_HOST/")" || fail "ACCEPTANCE_HTTP_REDIRECT_TARGET_UNAVAILABLE"
case "$redirect_target" in
  https://*) ;;
  *) fail "ACCEPTANCE_HTTP_REDIRECT_NOT_HTTPS" ;;
esac

root_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$SITE_ORIGIN/")" || fail "ACCEPTANCE_HTTPS_UNAVAILABLE"
[ "$root_status" = "200" ] || fail "ACCEPTANCE_ROOT_STATUS_INVALID"

check_no_store() {
  path=$1
  expected_status=$2
  url=$SITE_ORIGIN$path
  status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$url")" || fail "ACCEPTANCE_ROUTE_UNAVAILABLE"
  [ "$status" = "$expected_status" ] || fail "ACCEPTANCE_ROUTE_STATUS_INVALID"
  curl --silent --show-error --dump-header - --output /dev/null "$url" |
    awk 'tolower($0) ~ /^cache-control:/ && tolower($0) ~ /private/ && tolower($0) ~ /no-store/ {found=1} END {exit !found}' ||
    fail "ACCEPTANCE_ROUTE_CACHE_HEADER_INVALID"
  printf 'ACCEPTANCE_NO_STORE_OK path=%s status=%s\n' "$path" "$status"
}

check_no_store "/contact" "200"
check_no_store "/privacy" "200"
check_no_store "/api/contact" "405"

printf '%s\n' "ACCEPTANCE_READ_ONLY_OK"
