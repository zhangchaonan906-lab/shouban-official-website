# Standalone Docker/Caddy Deployment Preparation

> Template only. This change does not create or modify an ECS instance, Docker daemon, Caddy service, DNS record, certificate, security group, or production secret.

## Runtime shape

- next.config.ts enables Next.js standalone output.
- Dockerfile installs from the lockfile, builds with Node 24, and runs the traced standalone server as an unprivileged user. The base currently uses the Node 24 Bookworm slim tag; pin its verified image digest before a production release.
- scripts/container-entrypoint.mjs executes scripts/privacy-release-check.mjs before starting server.js. A nonzero check exits before the web process starts.
- GET /api/health is a no-store liveness endpoint. It reports only { "status": "ok" }; it does not claim that privacy, SMTP, or release readiness has been approved.
- compose.yaml runs only this site. It binds the app to loopback port 3100 by default and has no fixed container name, public HTTP port, or shared external network.
- deploy/caddy/shouban-site.Caddyfile.example is a per-site reverse-proxy template with the reserved .invalid host. It is not included in or loaded by Compose.

When this template is applied, the app will be reachable on the ECS host at 127.0.0.1:3100; a separately approved Caddy site configuration can proxy to that address. Do not replace or edit a shared Caddy configuration as part of this preparation. This separation keeps the Feishu assistant's existing Caddy sites and ports outside this project's Compose stack.

## Build and runtime configuration

Set NEXT_PUBLIC_SITE_URL to the approved HTTPS origin for the build; this public value is used while Next.js generates metadata and sitemap output. Do not put SMTP or privacy-operation secrets in build arguments.

At runtime, set SHOUBAN_RUNTIME_ENV_FILE to an absolute path outside the repository and provide it to Compose as the site's protected environment file. Keep that file out of Git and Docker build context, restrict filesystem access, and do not print its contents or the expanded docker compose config output.

The existing release check requires these runtime keys and valid, mutually consistent values:

- Public/site and policy facts: NEXT_PUBLIC_SITE_URL, PRIVACY_CONTACT_EMAIL, PRIVACY_POLICY_EFFECTIVE_DATE, PRIVACY_HOSTING_PROVIDER_NAME, PRIVACY_HOSTING_PRODUCT_NAME, PRIVACY_HOSTING_LOCATION, PRIVACY_SMTP_RELAY_PROVIDER_NAME, PRIVACY_SMTP_RELAY_LOCATION, PRIVACY_CONTACT_MAILBOX_PROVIDER_NAME, PRIVACY_CONTACT_MAILBOX_LOCATION, PRIVACY_RIGHTS_MAILBOX_PROVIDER_NAME, PRIVACY_RIGHTS_MAILBOX_LOCATION, PRIVACY_MAIL_DELETION_METHOD.
- Contact delivery: CONTACT_TO_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
- Release evidence: SERVICE_VERSION_ID, PRIVACY_OPERATIONS_ATTESTATION_ID, PRIVACY_OPERATIONS_APPROVED_AT, PRIVACY_OPERATIONS_OWNER, PRIVACY_ATTESTED_SERVICE_VERSION_ID, PRIVACY_ATTESTED_SITE_ORIGIN, PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID.

The EDGEONE_* group in .env.example remains optional only when EdgeOne is not enabled. If EdgeOne is enabled, complete its documented evidence and regenerate the privacy snapshot and attestation. The entrypoint must not be removed or replaced by a direct node server.js command.

For a later candidate release, the approved operator should:

1. Build an immutable image reference from the reviewed commit SHA, pass the approved public site origin as the build argument, and pin the verified Node base image digest.
2. Supply the protected runtime environment file without adding it to the image or repository.
3. Run npm run privacy:snapshot, complete the documented operational evidence and bindings, then verify npm run release:check in the candidate environment.
4. Start the container only after the release check passes. The container entrypoint runs the same check again before serving requests.
5. Verify the container health status and the approved /contact, /privacy, and /api/contact behaviors. Keep the contact collection gate closed until the policy and SMTP acceptance steps are complete.

No placeholder or synthetic privacy attestation may be used to make the release check pass.

## Compose and Caddy preparation

Compose publishes only 127.0.0.1:3100 on the host by default. It does not claim ports 80/443, create a Caddy container, or alter other applications. Keep the Caddy upstream port synchronized with SHOUBAN_APP_PORT if it is changed.

The Caddy template applies a 16 KiB request-body cap to /api/contact, matching the application limit. Caddy documents request_body as experimental and available in v2.10.0+; pin and validate the exact Caddy version before deployment: https://caddyserver.com/docs/caddyfile/directives/request_body. The template does not enable access logs or caching. Before production, configure approved log retention without request bodies and verify no-store headers remain intact.

The Caddy example uses shouban.example.invalid intentionally. Before a separately authorized deployment, copy it into the per-site include directory, replace the reserved host with the approved domain, validate the complete Caddy configuration, and reload using the host's established change procedure. Do not run those steps during this preparation.

The container healthcheck requests http://127.0.0.1:3000/api/health every 30 seconds, with a 20-second start period and three retries. The endpoint is process liveness only; the release gate prevents the server from starting when required privacy configuration or evidence is missing.

## Rollback

Use immutable image tags and retain the currently deployed and previous known-good images.

1. Record the currently active image tag and its source commit before a rollout.
2. After an approved rollout, wait for Compose to report the service healthy and run the approved route smoke checks.
3. If the healthcheck or smoke checks fail, set SHOUBAN_IMAGE back to the recorded previous image tag and point SHOUBAN_RUNTIME_ENV_FILE at the matching protected environment/attestation file, then recreate only this site's web service with the same Compose project.
4. Confirm the previous service is healthy, verify the site's public routes, and preserve the failed image and logs for review under the approved retention policy.
5. Do not change DNS, certificates, security groups, or the Feishu assistant as a rollback shortcut.

This project currently has no application database migration or local persistent business data, so rollback consists of restoring the previous immutable image and its matching release environment/attestation. If those facts change, the rollback plan must be revised before release.
