#!/bin/sh
set -eu

cd "$(dirname $0)/../ui"
npm run extractTranslations
if [ "$(git status -s 2>/dev/null | head -1)" != "" ]; then
  echo '--- FAIL: The generated UI translations are out of sync with the recent changes. Please run `npm run extractTranslations` under `./ui` to regenerate them and commit them to this branch.'
  echo 'These are the changes:'
  git status -s
  exit 1
fi

echo '--- PASS: All generated code is in sync with the project.'
