#!/bin/bash
set -euo pipefail

export PATH="/app/cov-analysis/bin:${PATH}"

set
which go
go version

cov-configure --comptype go --compiler "$(which go)"
coverity capture \
    --dir /app/cov-int --language go --project-dir /app/api \
    --file-exclude-regex ".*_test\.go|.*/go/pkg/.*" \
    -- go build -v -o photoview . \
  || (\
    cat /app/cov-int/build-log.txt && \
    exit 1 \
  )
