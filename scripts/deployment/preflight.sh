#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

COMPOSE_FILE=deploy/compose.website.yml
: "$COMPOSE_ENV_FILE"
: "$SHOUBAN_IMAGE"
: "$SHOUBAN_PROXY_NETWORK"
: "$CADDY_CONTAINER"
: "$ASSISTANT_CONTAINER"

command -v docker >/dev/null 2>&1 || fail "PREFLIGHT_DOCKER_UNAVAILABLE"
command -v awk >/dev/null 2>&1 || fail "PREFLIGHT_AWK_UNAVAILABLE"
command -v df >/dev/null 2>&1 || fail "PREFLIGHT_DF_UNAVAILABLE"
docker info >/dev/null 2>&1 || fail "PREFLIGHT_DOCKER_ENGINE_UNAVAILABLE"
docker compose version >/dev/null 2>&1 || fail "PREFLIGHT_COMPOSE_UNAVAILABLE"
[ -r "$COMPOSE_FILE" ] || fail "PREFLIGHT_COMPOSE_FILE_UNREADABLE"
[ -r "$COMPOSE_ENV_FILE" ] || fail "PREFLIGHT_COMPOSE_ENV_UNREADABLE"

docker image inspect "$SHOUBAN_IMAGE" >/dev/null 2>&1 || fail "PREFLIGHT_IMAGE_NOT_PRESENT"
docker network inspect "$SHOUBAN_PROXY_NETWORK" >/dev/null 2>&1 || fail "PREFLIGHT_PROXY_NETWORK_NOT_PRESENT"

caddy_state="$(docker inspect --format '{{.State.Status}}' "$CADDY_CONTAINER" 2>/dev/null)" || fail "PREFLIGHT_CADDY_NOT_FOUND"
[ "$caddy_state" = "running" ] || fail "PREFLIGHT_CADDY_NOT_RUNNING"

assistant_state="$(docker inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$ASSISTANT_CONTAINER" 2>/dev/null)" || fail "PREFLIGHT_ASSISTANT_NOT_FOUND"
IFS='|' read -r assistant_status assistant_health <<EOF
$assistant_state
EOF
[ "$assistant_status" = "running" ] || fail "PREFLIGHT_ASSISTANT_NOT_RUNNING"
[ "$assistant_health" = "healthy" ] || fail "PREFLIGHT_ASSISTANT_NOT_HEALTHY"

caddy_networks="$(docker inspect --format '{{range $name, $network := .NetworkSettings.Networks}}{{printf "%s\n" $name}}{{end}}' "$CADDY_CONTAINER" 2>/dev/null)" || fail "PREFLIGHT_CADDY_NETWORKS_UNAVAILABLE"
printf '%s\n' "$caddy_networks" | grep -Fxq "$SHOUBAN_PROXY_NETWORK" || fail "PREFLIGHT_CADDY_NOT_ON_PROXY_NETWORK"
assistant_networks="$(docker inspect --format '{{range $name, $network := .NetworkSettings.Networks}}{{printf "%s\n" $name}}{{end}}' "$ASSISTANT_CONTAINER" 2>/dev/null)" || fail "PREFLIGHT_ASSISTANT_NETWORKS_UNAVAILABLE"
if printf '%s\n' "$assistant_networks" | grep -Fxq "$SHOUBAN_PROXY_NETWORK"; then
  fail "PREFLIGHT_ASSISTANT_ON_WEBSITE_NETWORK"
fi

docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" config --quiet >/dev/null 2>&1 || fail "PREFLIGHT_COMPOSE_INVALID"

docker_root="$(docker info --format '{{.DockerRootDir}}')" || fail "PREFLIGHT_DOCKER_ROOT_UNAVAILABLE"
available_kb="$(df -Pk "$docker_root" | awk 'NR == 2 {print $4}')"
memory_available_kb="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
[ -n "$available_kb" ] && [ "$available_kb" -ge 10485760 ] || fail "PREFLIGHT_DOCKER_DISK_BELOW_10_GIB"
[ -n "$memory_available_kb" ] && [ "$memory_available_kb" -ge 3670016 ] || fail "PREFLIGHT_MEMORY_BELOW_3_5_GIB"

printf '%s\n' "PREFLIGHT_READ_ONLY_OK"
