### Build UI ###
FROM --platform=${BUILDPLATFORM:-linux/amd64} node:18 AS ui
# See for details: https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app/ui

COPY ui/package.json ui/package-lock.json /app/ui/
RUN if [ "$NODE_ENV" = "production" ]; then \
        echo "Installing production dependencies only..."; \
        npm ci --omit=dev; \
    else \
        echo "Installing all dependencies..."; \
        npm ci; \
    fi

COPY ui/ /app/ui

ARG REACT_APP_API_ENDPOINT=http://photoview-api:8000/api
ENV REACT_APP_API_ENDPOINT=${REACT_APP_API_ENDPOINT}

# Set environment variable UI_PUBLIC_URL from build args, uses "<web server>/" as default
ARG UI_PUBLIC_URL=/
ENV UI_PUBLIC_URL=${UI_PUBLIC_URL}

ARG VERSION=unknown-branch
ARG TARGETARCH
# hadolint ignore=SC2155
RUN export BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%S+00:00(UTC)'); \
    export REACT_APP_BUILD_DATE=${BUILD_DATE}; \
    export COMMIT_SHA="-=<GitHub-CI-commit-sha-placeholder>=-"; \
    export REACT_APP_BUILD_COMMIT_SHA=${COMMIT_SHA}; \
    export VERSION="kkovaletp-2-ui-${VERSION}-${TARGETARCH}"; \
    export REACT_APP_BUILD_VERSION=${VERSION}; \
    npm run build -- --base="${UI_PUBLIC_URL}"

### Build Caddy with plugins ###
FROM caddy:2.10-builder AS builder
RUN xcaddy build \
    # Public DNS providers
    --with github.com/caddy-dns/cloudflare \
    --with github.com/caddy-dns/route53 \
    --with github.com/caddy-dns/digitalocean \
    --with github.com/caddy-dns/duckdns \
    --with github.com/caddy-dns/godaddy \
    --with github.com/caddy-dns/namecheap \
    --with github.com/caddy-dns/googleclouddns \
    --with github.com/caddy-dns/linode \
    --with github.com/caddy-dns/vultr \
    # Local DNS servers case
    --with github.com/caddy-dns/rfc2136

### Build release image ###
FROM caddy:2.10 AS release

RUN addgroup -g 999 -S caddyuser \
    && adduser  -u 999 -S -D -G caddyuser caddyuser

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY --chown=999:999 Caddyfile /etc/caddy/Caddyfile
COPY --from=ui --chown=999:999 /app/ui/dist /srv

# This is a w/a for letting the UI build stage to be cached
# and not rebuilt every new commit because of the build_arg value change.
ARG COMMIT_SHA=NoCommit
RUN find /srv/assets -type f -name "SettingsPage.*.js" \
        -exec sed -i "s/=\"-=<GitHub-CI-commit-sha-placeholder>=-\";/=\"${COMMIT_SHA}\";/g" {} \; \
    # Set correct ownership for Caddy's runtime dirs
    && mkdir -p /data /config \
    && chown -R 999:999 /data /config /etc/caddy

# Expose unprivileged ports
EXPOSE 8080 8443 8443/udp

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=2 \
    CMD curl --fail https://localhost:8443/health-check \
    || exit 1

# Switch to non-root user
USER caddyuser

LABEL org.opencontainers.image.source=https://github.com/kkovaletp/photoview/
