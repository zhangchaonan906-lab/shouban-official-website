# Standalone Docker and Caddy Deployment Preparation

> This PR is deployment preparation only. No ECS host or production Caddy service, DNS record, certificate, security group, production secret, or Feishu assistant was inspected or changed. CI creates only disposable isolated Docker networks and Caddy test containers.

## Current deployment block

The current production Caddy container's network mode, attached Docker networks, Compose project/configuration, config-loading path, and Caddy version have not been verified. This workspace has no SSH configuration or ECS connection environment. Do not apply the network template or start the site until an authorized operator completes the read-only checks below and confirms that the additive bridge-network design matches the actual topology.

Read-only checks on the ECS host, using a locally resolved Caddy container name and without printing Caddyfile contents or environment values:

```sh
docker inspect --format 'mode={{.HostConfig.NetworkMode}} networks={{json .NetworkSettings.Networks}} project={{index .Config.Labels "com.docker.compose.project"}} service={{index .Config.Labels "com.docker.compose.service"}} config_files={{index .Config.Labels "com.docker.compose.project.config_files"}}' "$CADDY_CONTAINER"
docker inspect --format 'entrypoint={{json .Config.Entrypoint}} command={{json .Config.Cmd}} mount_destinations={{range .Mounts}}{{.Destination}} {{end}}' "$CADDY_CONTAINER"
docker exec "$CADDY_CONTAINER" caddy version
```

Do not publish the container's environment, mounted file contents, or full expanded Compose configuration. Confirm which mounted Caddyfile is loaded and how per-site snippets are included before considering a rollout.

## Proposed network shape

The application Compose service joins one explicitly named external bridge network and publishes no host port. It has the Docker DNS alias `shouban-web`; the Caddy site template proxies to `shouban-web:3000`. This works only when the Caddy container is also attached to that same bridge network.

The network is dedicated to Caddy and this site. When the actual Caddy topology is confirmed, add the network to Caddy's existing Compose service while retaining every existing network attachment. Leave the Feishu assistant on its existing network. Do not replace the Caddy container's network list, use `host.docker.internal`, or assume that `127.0.0.1` inside Caddy means the ECS host.

The app Compose file expects an existing Docker bridge network named by `SHOUBAN_PROXY_NETWORK`. Caddy's own Compose project must join the same external network through a separately reviewed additive overlay. The production overlay and network are intentionally not created here. If Caddy uses `network_mode: host`, it cannot join this bridge; stop and redesign from the observed topology. Do not fall back to a host gateway without confirming the app bind address, firewall, routing, and exposure.

The CI integration test creates separate disposable bridge networks. A mock Caddy and mock upstream communicate through the `shouban-web` DNS alias; an unrelated assistant sentinel on another network remains unresolved. This proves Docker bridge DNS and isolation behavior in that test topology only. It does not prove production Caddy is attached to the required network.

## Container image and release gate

- The Dockerfile pins Node 24 Bookworm slim to multi-platform index digest `sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20` from the [official Node image](https://hub.docker.com/_/node).
- The image is built with a public, reserved `.invalid` site origin in CI. The origin is written to `.build-site-origin`; startup compares it exactly with runtime `NEXT_PUBLIC_SITE_URL` before running the existing release check. A mismatch exits without starting the server.
- The CI image inspection checks that the standalone server, origin marker, health route output, and release-check modules exist; the image user is `nextjs` (UID 1001), and no `.env` file or runtime credentials are packaged.
- A matching-origin test with no release evidence reaches the real `privacy-release-check.mjs`, fails on missing required production configuration, and confirms the web server did not start. CI does not provide SMTP credentials or generate privacy-operation approval evidence.
- The `/api/health` route is a no-store liveness response only. Route unit tests cover it; the gated container cannot become healthy without genuine release configuration. The proxy test does not claim to be a complete production application or SMTP test.

The build stage sets `NEXT_PUBLIC_SITE_URL`, which Next.js uses when producing canonical metadata and sitemap content. CI checks the built homepage and sitemap contain the build origin, confirms the marker matches it, and tests that a different runtime origin is rejected. For a candidate release, supply the same approved HTTPS origin at build and runtime.

## Resource and log limits

The Compose service configures 1 CPU, 1536 MiB memory, and 256 PIDs. CI creates the container without starting the app and inspects the effective Docker Engine limits, then runs the container under the same limits with the release configuration absent and verifies that the gate exits. This verifies Docker applied the limits; it is not an application load test. Capacity under a genuinely approved release configuration remains unmeasured and must be checked before production.

The app container uses Docker's `json-file` log driver with `max-size=10m` and `max-file=3`, bounding its stdout/stderr logs to about 30 MB. The Caddy template does not enable access logging, and the contact application logs request outcome metadata without request bodies. The existing production Caddy container's driver, rotation settings, and access-log configuration remain unknown. Before rollout, inspect those settings and apply an approved rotation policy in Caddy's own Compose project; do not log form bodies.

## Caddy validation and compatibility

The isolated CI test pins the official Caddy [`2.10.2-alpine` image](https://hub.docker.com/_/caddy) to digest `sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d`; the version is recorded in the [official v2.10.2 release](https://github.com/caddyserver/caddy/releases/tag/v2.10.2). It runs `caddy adapt` and `caddy validate` on the template and an HTTP-only test copy with a second simulated site. It then tests DNS upstream connection, route matching, repeated requests without proxy caching, no-store header forwarding on `/contact`, `/privacy`, and `/api/contact`, the 16 KiB `/api/contact` request cap, and absence of a request-body sentinel from Caddy logs.

The Caddy `request_body` directive is experimental and requires Caddy v2.10.0 or newer ([official directive documentation](https://caddyserver.com/docs/caddyfile/directives/request_body)). CI's pinned Caddy version validates only the test environment. The production Caddy version has not been inspected, so compatibility remains a release blocker. Do not upgrade production Caddy as part of this PR.

If the observed production Caddy does not support `request_body`, use the existing application-side streaming limit `CONTACT_MAX_BODY_BYTES = 16384` as the authoritative cap and prepare a Caddyfile variant without that experimental directive. Validate that exact variant against the observed production binary before rollout. Keep the request-body cap and application validation enabled; do not make an unsupported directive silently disappear during deployment.

No Caddy cache directive is configured. In CI, repeated requests reach the mock upstream separately, and its no-store response headers pass through. This validates the pinned standard Caddy image and test config, not unknown production Caddy modules or snippets.

## Rollout and rollback conditions

Before any later authorized rollout:

1. Complete the read-only production Caddy topology/version/config-load checks above and select a compatible network/configuration plan.
2. Create or confirm the dedicated bridge network and attach Caddy additively without detaching its current networks; leave Feishu unchanged.
3. Use an immutable application image built from the reviewed commit and pin the verified Node base digest.
4. Supply the protected runtime environment file from outside the repository. Do not put it in the image, Compose build args, or CI.
5. Complete genuine privacy operations evidence and verify `npm run release:check` in the candidate environment. The container entrypoint repeats the check before serving.
6. Verify the Compose resource/log settings, health check, canonical origin, sitemap origin, `/contact`, `/privacy`, and `/api/contact` with the approved release candidate. SMTP acceptance remains a separate controlled test.

Keep immutable current and previous images. For rollback, restore the previous image together with its matching protected runtime environment and attestation. Do not alter DNS, certificates, security groups, Caddy's existing networks, or the Feishu assistant as a shortcut.
