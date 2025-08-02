#!/bin/bash
set -euo pipefail

export PATH="/app/cov-analysis/bin:${PATH}"

cov-configure --comptype go --compiler "$(which go)"
cat /app/cov-analysis/config/coverity_config.xml

coverity capture \
    --dir /app/cov-int --project-dir /app/api \
    --file-exclude-regex ".*_test\.go|.*/go/pkg/.*" \
    --fs-capture-search /app/api \
  || (\
    cat /app/cov-int/build-log.txt && \
    exit 1 \
  )
