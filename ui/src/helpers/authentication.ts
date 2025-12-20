import Cookies from 'js-cookie'

// Helper function to validate domain format
export const validateDomain = (domain: string): boolean => {
  if (!domain || domain === '') {
    return false
  }

  // Domain should start with a dot for subdomain sharing (e.g., '.example.com')
  // Regex: starts with dot, at least two segments, each segment 1-63 chars, no leading/trailing hyphens, valid chars
  const domainRegex = /^\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.?$/

  if (!domainRegex.test(domain)) {
    console.warn(
      `Invalid cookie domain format: "${domain}". Domain will be ignored.`
    )
    return false
  }

  return true
}

// Read cookie security configuration from environment variables
const COOKIE_SECURE = import.meta.env.UI_COOKIE_SECURE === 'true'
const COOKIE_DOMAIN = import.meta.env.UI_COOKIE_DOMAIN?.trim()

// Build default cookie options with conditional security attributes
export const buildCookieOptions = (): Partial<Cookies.CookieAttributes> => {
  const options: Partial<Cookies.CookieAttributes> = {
    path: '/',
    sameSite: 'Lax',
  }

  // Add secure flag if explicitly enabled via environment variable
  if (COOKIE_SECURE) {
    options.secure = true
  }

  // Add domain attribute if configured via environment variable
  if (COOKIE_DOMAIN && validateDomain(COOKIE_DOMAIN)) {
    options.domain = COOKIE_DOMAIN
  }

  return options
}

const COOKIE_DEFAULT_OPTIONS = buildCookieOptions()

const AUTH_TOKEN_MAX_AGE_IN_DAYS = 14
const AUTH_TOKEN_COOKIE_NAME = 'auth-token'

const SHARE_TOKEN_COOKIE_NAME = (shareToken: string) =>
  `share-token-pw-${shareToken}`

export function saveTokenCookie(token: string) {
  const options = {
    ...COOKIE_DEFAULT_OPTIONS,
    expires: AUTH_TOKEN_MAX_AGE_IN_DAYS,
  }

  Cookies.set(AUTH_TOKEN_COOKIE_NAME, token, options)
}

export function clearTokenCookie() {
  Cookies.remove(AUTH_TOKEN_COOKIE_NAME, COOKIE_DEFAULT_OPTIONS)
}

export function authToken() {
  return Cookies.get(AUTH_TOKEN_COOKIE_NAME)
}

export function saveSharePassword(shareToken: string, password: string) {
  const cookieName = SHARE_TOKEN_COOKIE_NAME(shareToken)

  Cookies.set(cookieName, password, COOKIE_DEFAULT_OPTIONS)
}

export function clearSharePassword(shareToken: string) {
  const cookieName = SHARE_TOKEN_COOKIE_NAME(shareToken)

  Cookies.remove(cookieName, COOKIE_DEFAULT_OPTIONS)
}

export function getSharePassword(shareToken: string) {
  const cookieName = SHARE_TOKEN_COOKIE_NAME(shareToken)

  return Cookies.get(cookieName)
}
