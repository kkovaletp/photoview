#!/usr/bin/env bash

curl --fail \
        "http://localhost:${PHOTOVIEW_LISTEN_PORT}${PHOTOVIEW_API_ENDPOINT}/graphql" \
        -X POST \
        -H 'Content-Type: application/json' \
        --data-raw '{"operationName":"CheckInitialSetup","variables":{},"query":"query CheckInitialSetup { siteInfo { initialSetup }}"}' \
    || exit 1
