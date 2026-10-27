FROM caddy:2.10.2@sha256:c3d7ee5d2b11f9dc54f947f68a734c84e9c9666c92c88a7f30b9cba5da182adb

# The pinned official image retains libcap's setcap/getcap utilities. Remove
# its low-port file capability at build time so execution also works with a
# non-root UID, cap_drop: ALL and no-new-privileges on the private HTTP port.
USER 0:0
RUN set -eu; \
    command -v setcap >/dev/null; \
    command -v getcap >/dev/null; \
    setcap -r /usr/bin/caddy; \
    gateway_caps="$(getcap /usr/bin/caddy)"; \
    test -z "$gateway_caps"

ENV HOME=/tmp
ENV XDG_CONFIG_HOME=/config
ENV XDG_DATA_HOME=/data
USER 1000:1000

# The approved HTTP:8080 Caddyfile is mounted by the gateway Compose model.
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
