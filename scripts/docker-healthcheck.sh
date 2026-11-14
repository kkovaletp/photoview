#!/usr/bin/env bash
set -euo pipefail

endpoint="${PHOTOVIEW_API_ENDPOINT:-/api}"
listen_ip="${PHOTOVIEW_LISTEN_IP:-127.0.0.1}"
listen_port="${PHOTOVIEW_LISTEN_PORT:-4001}"

# The server routes requests using the path from PHOTOVIEW_API_ENDPOINT.
# Remove the fragment and query before extracting that path.
endpoint="${endpoint%%\#*}"
endpoint="${endpoint%%\?*}"

if [[ "${endpoint}" =~ ^[[:alpha:]][[:alnum:]+.-]*:// ]]; then
    authority_and_path="${endpoint#*://}"
    if [[ "${authority_and_path}" == */* ]]; then
        api_path="/${authority_and_path#*/}"
    else
        # The API uses /api for an absolute URL with no path.
        api_path="/api"
    fi
elif [[ "${endpoint}" == //* ]]; then
    authority_and_path="${endpoint#//}"
    if [[ "${authority_and_path}" == */* ]]; then
        api_path="/${authority_and_path#*/}"
    else
        api_path=""
    fi
else
    api_path="${endpoint}"
    if [[ -n "${api_path}" && "${api_path}" != /* ]]; then
        api_path="/${api_path}"
    fi
fi

# Add exactly one slash before graphql.
while [[ "${api_path}" == */ ]]; do
    api_path="${api_path%/}"
done

# A wildcard listen address cannot be used as the request destination.
if [[ "${listen_ip}" == "0.0.0.0" ]]; then
    listen_ip="127.0.0.1"
elif [[ "${listen_ip}" == *:* && -z "${listen_ip//[0:]/}" ]]; then
    listen_ip="::1"
fi

if [[ "${listen_ip}" == *:* ]]; then
    listen_host="[${listen_ip}]"
else
    listen_host="${listen_ip}"
fi

health_url="http://${listen_host}:${listen_port}${api_path}/graphql"
query='{"operationName":"CheckInitialSetup","variables":{},"query":"query CheckInitialSetup { siteInfo { initialSetup }}"}'

# Disable curl configuration and proxies. The request must reach this API.
if ! result="$(
    curl --disable --silent --show-error \
        --noproxy '*' \
        --globoff \
        --max-time 8 \
        --output - \
        --write-out $'\n%{http_code}' \
        --header 'Content-Type: application/json' \
        --data-raw "${query}" \
        -- "${health_url}"
)"; then
    echo "API health check request failed" >&2
    exit 1
fi

http_status="${result##*$'\n'}"
response="${result%$'\n'*}"

if [[ ! "${http_status}" =~ ^2[0-9][0-9]$ ]]; then
    echo "API health check returned HTTP ${http_status}" >&2
    exit 1
fi

# Reject GraphQL errors and successful HTTP responses from a non-GraphQL handler.
if ! jq -e '
    type == "object"
    and (
        .errors == null
        or ((.errors | type) == "array" and (.errors | length) == 0)
    )
    and ((.data.siteInfo.initialSetup | type) == "boolean")
' <<<"${response}" >/dev/null 2>&1; then
    echo "API health check returned an invalid GraphQL response" >&2
    exit 1
fi
