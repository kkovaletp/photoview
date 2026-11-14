#!/bin/bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
healthcheck="${script_dir}/docker-healthcheck.sh"
tmpdir="$(mktemp -d)"
LOCALHOST_IP="127.0.0.1"
trap 'rm -rf "${tmpdir}"' EXIT

cat >"${tmpdir}/curl" <<'EOF'
#!/bin/bash
set -euo pipefail

printf '%s\0' "$@" >"${FAKE_CAPTURE}"

if [[ "${FAKE_EXIT}" != "0" ]]; then
    exit "${FAKE_EXIT}"
fi

printf '%s\n%s' "${FAKE_RESPONSE}" "${FAKE_STATUS}"
EOF
chmod +x "${tmpdir}/curl"

export FAKE_CAPTURE="${tmpdir}/curl-args"
export FAKE_STATUS="200"
export FAKE_EXIT="0"
export FAKE_RESPONSE='{"data":{"siteInfo":{"initialSetup":false}}}'

run_check() {
    local endpoint="$1"
    local listen_ip="$2"
    local listen_port="$3"

    env \
        PATH="${tmpdir}:${PATH}" \
        PHOTOVIEW_API_ENDPOINT="${endpoint}" \
        PHOTOVIEW_LISTEN_IP="${listen_ip}" \
        PHOTOVIEW_LISTEN_PORT="${listen_port}" \
        bash "${healthcheck}"
}

expect_url() {
    local endpoint="$1"
    local listen_ip="$2"
    local listen_port="$3"
    local expected="$4"

    run_check "${endpoint}" "${listen_ip}" "${listen_port}"

    local -a args
    mapfile -d '' -t args <"${FAKE_CAPTURE}"

    if [[ "${args[${#args[@]}-1]}" != "${expected}" ]]; then
        printf 'Expected URL %s; got %s\n' \
            "${expected}" "${args[${#args[@]}-1]}" >&2
        exit 1
    fi

    local found_query=0
    local i
    for ((i = 0; i < ${#args[@]} - 1; i++)); do
        if [[ "${args[i]}" == "--data-raw" &&
              "${args[i+1]}" == *'siteInfo { initialSetup }'* ]]; then
            found_query=1
        fi
    done

    if [[ "${found_query}" != "1" ]]; then
        echo "GraphQL health-check query was not sent" >&2
        exit 1
    fi
}

expect_failure() {
    if run_check "/api" "$LOCALHOST_IP" "8080"; then
        echo "Expected health check to fail" >&2
        exit 1
    fi
}

expect_url "" "" "" \
    "http://$LOCALHOST_IP:4001/api/graphql"
expect_url "/api" "0.0.0.0" "8080" \
    "http://$LOCALHOST_IP:8080/api/graphql"
expect_url "/api/" "$LOCALHOST_IP" "8080" \
    "http://$LOCALHOST_IP:8080/api/graphql"
expect_url "/photoview/api" "$LOCALHOST_IP" "8080" \
    "http://$LOCALHOST_IP:8080/photoview/api/graphql"
expect_url "/photoview/api/" "$LOCALHOST_IP" "8080" \
    "http://$LOCALHOST_IP:8080/photoview/api/graphql"
expect_url "https://gallery.example.com/photoview/api" "$LOCALHOST_IP" "8080" \
    "http://$LOCALHOST_IP:8080/photoview/api/graphql"
expect_url "https://gallery.example.com/photoview/api/" "$LOCALHOST_IP" "8080" \
    "http://$LOCALHOST_IP:8080/photoview/api/graphql"
expect_url "https://gallery.example.com" "$LOCALHOST_IP" "8080" \
    "http://$LOCALHOST_IP:8080/api/graphql"
expect_url "/" "$LOCALHOST_IP" "8080" \
    "http://$LOCALHOST_IP:8080/graphql"
expect_url "/api" "192.0.2.10" "9000" \
    "http://192.0.2.10:9000/api/graphql"
expect_url "/api" "::" "8080" \
    "http://[::1]:8080/api/graphql"
expect_url "/api" "::1" "8080" \
    "http://[::1]:8080/api/graphql"

FAKE_STATUS="302"
expect_failure
FAKE_STATUS="500"
expect_failure
FAKE_STATUS="200"

FAKE_RESPONSE='{"errors":[{"message":"database unavailable"}]}'
expect_failure
FAKE_RESPONSE='<html>not GraphQL</html>'
expect_failure
FAKE_RESPONSE='{"data":{"siteInfo":{"initialSetup":null}}}'
expect_failure
FAKE_RESPONSE='{"data":{"siteInfo":{"initialSetup":true}}}'
run_check "/api" "$LOCALHOST_IP" "8080"

FAKE_EXIT="7"
expect_failure

echo "Docker health-check tests passed"
