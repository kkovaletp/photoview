#!/bin/sh
set -eu

cd "$(dirname "$0")/../ui"
npm run genSchemaTypes

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo '--- FAIL: GraphQL Schema types sync check must run inside a git work tree.'
  exit 1
fi

if [ "$(git status -s 2>/dev/null | head -1)" != "" ]; then
  echo '--- FAIL: The generated GraphQL Schema types are out of sync with the recent changes. Please run `npm run genSchemaTypes` under `./ui` to regenerate them and commit them to this branch.'
  echo 'These are the changes:'
  git status -s
  exit 1
fi

echo '--- PASS: All generated code is in sync with the project.'
