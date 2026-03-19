/**
 * Mock .svg imports
 */

import { basename } from 'node:path'

export function process(_, filename) {
  return 'module.exports = "' + basename(filename) + '"'
}
export function getCacheKey(_, filename) {
  return basename(filename)
}
