### Build UI ###
FROM --platform=${BUILDPLATFORM:-linux/amd64} node:18 AS ui
# See for details: https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app/ui

COPY ui/package.json ui/package-lock.json /app/ui/
# NPM 10.x is the latest supported version for Node.js 18.x
RUN npm install --global npm@10 \
    && if [ "$NODE_ENV" = "production" ]; then \
        echo "Installing production dependencies only..."; \
        npm ci --omit=dev; \
    else \
        echo "Installing all dependencies..."; \
        npm ci; \
    fi

COPY ui/ /app/ui

# Set environment variable REACT_APP_API_ENDPOINT from build args, uses "<web server>/api" as default
# Make sure to set this variable to the correct API endpoint URL when building the Caddy proxy image.
ARG REACT_APP_API_ENDPOINT
ENV REACT_APP_API_ENDPOINT=${REACT_APP_API_ENDPOINT}

# Set environment variable UI_PUBLIC_URL from build args, uses "<web server>/" as default
ARG UI_PUBLIC_URL=/
ENV UI_PUBLIC_URL=${UI_PUBLIC_URL}

ARG VERSION=unknown-branch
ENV VERSION=${VERSION}
ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}
# hadolint ignore=SC2155
RUN export REACT_APP_BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%S+00:00(UTC)')"; \
    export REACT_APP_BUILD_COMMIT_SHA="-=<GitHub-CI-commit-sha-placeholder>=-"; \
    export REACT_APP_BUILD_VERSION="kkovaletp-2-${VERSION}-${TARGETARCH}"; \
    export REACT_APP_API_ENDPOINT="${REACT_APP_API_ENDPOINT}"; \
    npm run build"$( [ "$NODE_ENV" = "production" ] || echo ":dev" )" -- --base="${UI_PUBLIC_URL}"

### Build API ###
FROM --platform=${BUILDPLATFORM:-linux/amd64} golang:1.25-trixie AS api
ARG TARGETPLATFORM

# See for details: https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

ENV GOPATH="/go"
ENV PATH="${GOPATH}/bin:${PATH}"
ENV CGO_ENABLED=1

# Download dependencies
COPY scripts/set_compiler_env.sh /app/scripts/
RUN chmod +x /app/scripts/*.sh \
    && source /app/scripts/set_compiler_env.sh

COPY scripts/install_*.sh /app/scripts/
RUN chmod +x /app/scripts/*.sh \
    && set -a && source /env && set +a \
    && /app/scripts/install_build_dependencies.sh \
    && /app/scripts/install_runtime_dependencies.sh

# hadolint ignore=DL3022
COPY --from=kkoval/dependencies:trixie /artifacts.tar.gz /dependencies/
WORKDIR /dependencies
RUN set -a && source /env && set +a \
    && git config --global --add safe.directory /app \
    && tar xfv artifacts.tar.gz \
    && cp -a include/* /usr/local/include/ \
    && cp -a pkgconfig/* "${PKG_CONFIG_PATH}" \
    && cp -a lib/* /usr/local/lib/ \
    && ldconfig \
    && apt-get install -y ./deb/jellyfin-ffmpeg.deb \
    && ln -s /usr/lib/jellyfin-ffmpeg/ffmpeg /usr/local/bin/ \
    && ln -s /usr/lib/jellyfin-ffmpeg/ffprobe /usr/local/bin/

COPY api/go.mod api/go.sum /app/api/
WORKDIR /app/api
RUN set -a && source /env && set +a \
    && go env \
    && go mod download \
    # Patch go-face
    && sed -i 's/-march=native//g' ${GOPATH}/pkg/mod/github.com/!kagami/go-face*/face.go \
    && sed -i 's/-lcblas//g' ${GOPATH}/pkg/mod/github.com/!kagami/go-face*/face.go \
    # Build dependencies that use CGO
    && go install \
        github.com/mattn/go-sqlite3 \
        github.com/Kagami/go-face

COPY api /app/api
RUN set -a && source /env && set +a \
    && go env \
    && go build -v -o photoview .

### Build release image ###
FROM debian:trixie-slim AS release
ARG TARGETPLATFORM

# See for details: https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

COPY scripts/install_runtime_dependencies.sh /app/scripts/
WORKDIR /dependencies
RUN --mount=type=bind,from=api,source=/dependencies/,target=/dependencies/ \
    chmod +x /app/scripts/install_runtime_dependencies.sh \
    # Create a user to run Photoview server
    && groupadd -g 999 photoview \
    && useradd -r -u 999 -g photoview -m photoview \
    # Create log folder
    && mkdir -p /var/log/photoview \
    && chown -R photoview:photoview /var/log/photoview \
    # Install required dependencies
    && /app/scripts/install_runtime_dependencies.sh \
    # Install self-building libs
    && cp -a lib/*.so* /usr/local/lib/ \
    && ldconfig \
    && apt-get install -y ./deb/jellyfin-ffmpeg.deb gzip brotli \
    && ln -s /usr/lib/jellyfin-ffmpeg/ffmpeg /usr/local/bin/ \
    && ln -s /usr/lib/jellyfin-ffmpeg/ffprobe /usr/local/bin/ \
    # Cleanup
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY api/data /app/data
COPY --from=ui /app/ui/dist /app/ui
COPY --from=api /app/api/photoview /app/photoview
# This is a w/a for letting the UI build stage to be cached
# and not rebuilt every new commit because of the build_arg value change.
ARG COMMIT_SHA=NoCommit
RUN find /app/ui/assets -type f -name "SettingsPage.*.js" \
        -exec sh -c 'sed -i "s/=\"-=<GitHub-CI-commit-sha-placeholder>=-\";/=\"${COMMIT_SHA}\";/g" "$1" \
        && rm -f "$1.gz" "$1.br" \
        && gzip -k -f -9 "$1" \
        && brotli -f -q 11 "$1"' sh {} \; \
    # Archive the `service-worker.js` file
    #TODO: zstd all
    && gzip -k -f -9 /app/ui/service-worker.js \
    && brotli -f -q 11 /app/ui/service-worker.js

WORKDIR /home/photoview

ENV PHOTOVIEW_LISTEN_IP=127.0.0.1
ENV PHOTOVIEW_LISTEN_PORT=8080
ENV PHOTOVIEW_API_ENDPOINT=/api

ENV PHOTOVIEW_SERVE_UI=1
ENV PHOTOVIEW_UI_PATH=/app/ui
ENV PHOTOVIEW_ACCESS_LOG_PATH=/var/log/photoview/access.log
ENV PHOTOVIEW_FACE_RECOGNITION_MODELS_PATH=/app/data/models
ENV PHOTOVIEW_MEDIA_CACHE=/home/photoview/media-cache

EXPOSE ${PHOTOVIEW_LISTEN_PORT}

HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=2 \
    CMD curl --fail http://localhost:${PHOTOVIEW_LISTEN_PORT}${PHOTOVIEW_API_ENDPOINT}/graphql \
        -X POST -H 'Content-Type: application/json' \
        --data-raw '{"operationName":"CheckInitialSetup","variables":{},"query":"query CheckInitialSetup { siteInfo { initialSetup }}"}' \
    || exit 1

LABEL org.opencontainers.image.source=https://github.com/kkovaletp/photoview/
USER photoview
ENTRYPOINT ["/app/photoview"]

### Build Caddy with plugins ###
FROM caddy:2.10-builder AS cady
RUN xcaddy build \
    # Public DNS providers
    --with github.com/caddy-dns/cloudflare \
    --with github.com/caddy-dns/digitalocean \
    --with github.com/caddy-dns/duckdns \
    --with github.com/caddy-dns/godaddy \
    --with github.com/caddy-dns/googleclouddns \
    --with github.com/caddy-dns/vultr \
    # Local DNS servers case
    --with github.com/caddy-dns/rfc2136

### Build release image ###
FROM caddy:2.10 AS proxy

RUN addgroup -g 9999 -S caddyuser \
    && adduser  -u 9999 -S -D -G caddyuser caddyuser

COPY --from=cady /usr/bin/caddy /usr/bin/caddy
COPY --from=ui /app/ui/dist /srv
COPY --chown=9999:9999 ui/Caddyfile /etc/caddy/Caddyfile

# This is a w/a for letting the UI build stage to be cached
# and not rebuilt every new commit because of the build_arg value change.
ARG COMMIT_SHA=NoCommit
#ARG REACT_APP_API_ENDPOINT
#ENV REACT_APP_API_ENDPOINT=${REACT_APP_API_ENDPOINT}
# hadolint ignore=DL3018
RUN apk add --no-cache curl bash \
    && apk add --no-cache --virtual .build-compress gzip brotli zstd \
    && find /srv/assets -type f -name "SettingsPage.*.js" \
        -exec sh -c 'sed -i "s/=\"-=<GitHub-CI-commit-sha-placeholder>=-\";/=\"${COMMIT_SHA}\";/g" "$1" \
        && rm -f "$1.gz" "$1.br" \
        && gzip -k -f -9 "$1" \
        && brotli -f -q 11 "$1"' sh {} \; \
    # Archive the `service-worker.js` file
    #TODO: zstd all
    && gzip -k -f -9 /srv/service-worker.js \
    && brotli -f -q 11 /srv/service-worker.js \
    && apk del .build-compress \
    # Set correct ownership for Caddy's runtime dirs
    && mkdir -p /data /config /var/log/caddy \
    && chown -R 9999:9999 /data /config /etc/caddy /var/log/caddy

# Expose unprivileged ports
EXPOSE 8080 8443 8443/udp

LABEL org.opencontainers.image.source=https://github.com/kkovaletp/photoview/

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=2 \
    CMD curl -kfsS https://localhost:8443/health-check \
    || exit 1

# Switch to non-root user
USER caddyuser
