import Cookies from 'js-cookie'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

import {
  saveTokenCookie,
  clearTokenCookie,
  authToken,
  saveSharePassword,
  clearSharePassword,
  getSharePassword,
  validateDomain,
} from './authentication'

function resetCookies() {
  Object.keys(Cookies.get()).forEach(function (cookieName) {
    Cookies.remove(cookieName)
  })
}

describe('helpers/authentication', () => {
  afterEach(() => {
    resetCookies()
    vi.unstubAllEnvs()
  })

  describe('validateDomain', () => {
    test('accepts valid dot-prefixed domain', () => {
      expect(validateDomain('.example.com')).toBe(true)
      expect(validateDomain('.app.example.com')).toBe(true)
      expect(validateDomain('.subdomain.example.co.uk')).toBe(true)
      expect(validateDomain('.local')).toBe(true)
      expect(validateDomain('.1-2')).toBe(true)
      expect(validateDomain('.a')).toBe(true)
      expect(validateDomain('.a.b.c.d.e.')).toBe(true)
      expect(validateDomain('.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz12345678901')).toBe(true)
      expect(validateDomain(
        '.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz12345678901.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz12345678901.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz12345678901'
      )).toBe(true)
    })

    test('rejects empty or whitespace-only strings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

      expect(validateDomain('')).toBe(false)
      expect(validateDomain('   ')).toBe(false)
      expect(validateDomain('\t\n')).toBe(false)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    test('rejects invalid domain formats', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

      expect(validateDomain('invalid.domain')).toBe(false)
      expect(validateDomain('..')).toBe(false)
      expect(validateDomain('.')).toBe(false)
      expect(validateDomain('-example.com')).toBe(false)
      expect(validateDomain('example-.com')).toBe(false)
      expect(validateDomain('.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz12345678901A')).toBe(false)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('buildCookieOptions', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    test('returns base options without secure or domain by default', async () => {
      vi.unstubAllEnvs()

      const { buildCookieOptions } = await import('./authentication')
      const options = buildCookieOptions()

      expect(options).toEqual({
        path: '/',
        sameSite: 'Lax',
      })
      expect(options.secure).toBeUndefined()
      expect(options.domain).toBeUndefined()
    })

    test('includes secure flag when UI_COOKIE_SECURE is true', async () => {
      vi.stubEnv('UI_COOKIE_SECURE', 'true')

      const { buildCookieOptions } = await import('./authentication')
      const options = buildCookieOptions()

      expect(options.secure).toBe(true)
      expect(options.path).toBe('/')
      expect(options.sameSite).toBe('Lax')
    })

    test('does not include secure flag when UI_COOKIE_SECURE is false', async () => {
      vi.stubEnv('UI_COOKIE_SECURE', 'false')

      const { buildCookieOptions } = await import('./authentication')
      const options = buildCookieOptions()

      expect(options.secure).toBeUndefined()
    })

    test('includes domain when UI_COOKIE_DOMAIN is valid', async () => {
      vi.stubEnv('UI_COOKIE_DOMAIN', '.example.com')

      const { buildCookieOptions } = await import('./authentication')
      const options = buildCookieOptions()

      expect(options.domain).toBe('.example.com')
      expect(options.path).toBe('/')
      expect(options.sameSite).toBe('Lax')
    })

    test('ignores invalid domain', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
      vi.stubEnv('UI_COOKIE_DOMAIN', 'invalid..domain')

      const { buildCookieOptions } = await import('./authentication')
      const options = buildCookieOptions()

      expect(options.domain).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    test('includes both secure and domain when both are configured', async () => {
      vi.stubEnv('UI_COOKIE_SECURE', 'true')
      vi.stubEnv('UI_COOKIE_DOMAIN', '.example.com')

      const { buildCookieOptions } = await import('./authentication')
      const options = buildCookieOptions()

      expect(options.secure).toBe(true)
      expect(options.domain).toBe('.example.com')
      expect(options.path).toBe('/')
      expect(options.sameSite).toBe('Lax')
    })
  })

  describe('cookie operations', () => {
    test('saveTokenCookie sets cookie with correct options', () => {
      const cookiesSetSpy = vi.spyOn(Cookies, 'set')
      const AUTH_TOKEN = 'test-token-123'

      saveTokenCookie(AUTH_TOKEN)

      expect(cookiesSetSpy).toHaveBeenCalledWith(
        'auth-token',
        AUTH_TOKEN,
        expect.objectContaining({
          path: '/',
          sameSite: 'Lax',
          expires: 14,
        })
      )

      cookiesSetSpy.mockRestore()
    })

    test('authToken retrieves the auth token', () => {
      const AUTH_TOKEN = 'retrieved-token-456'

      saveTokenCookie(AUTH_TOKEN)

      expect(authToken()).toBe(AUTH_TOKEN)
    })

    test('clearTokenCookie removes auth token with correct options', () => {
      const cookiesRemoveSpy = vi.spyOn(Cookies, 'remove')
      const AUTH_TOKEN = 'token-to-clear'

      saveTokenCookie(AUTH_TOKEN)
      clearTokenCookie()

      expect(cookiesRemoveSpy).toHaveBeenCalledWith(
        'auth-token',
        expect.objectContaining({
          path: '/',
          sameSite: 'Lax',
        })
      )
      expect(authToken()).toBeUndefined()

      cookiesRemoveSpy.mockRestore()
    })

    test('saveSharePassword sets share password cookie', () => {
      const cookiesSetSpy = vi.spyOn(Cookies, 'set')
      const SHARE_TOKEN = 'share-123'
      const PASSWORD = 'secret-password'

      saveSharePassword(SHARE_TOKEN, PASSWORD)

      expect(cookiesSetSpy).toHaveBeenCalledWith(
        `share-token-pw-${SHARE_TOKEN}`,
        PASSWORD,
        expect.objectContaining({
          path: '/',
          sameSite: 'Lax',
        })
      )

      cookiesSetSpy.mockRestore()
    })

    test('getSharePassword retrieves share password', () => {
      const SHARE_TOKEN = 'share-456'
      const PASSWORD = 'my-password'

      saveSharePassword(SHARE_TOKEN, PASSWORD)

      expect(getSharePassword(SHARE_TOKEN)).toBe(PASSWORD)
    })

    test('clearSharePassword removes share password cookie', () => {
      const cookiesRemoveSpy = vi.spyOn(Cookies, 'remove')
      const SHARE_TOKEN = 'share-789'
      const PASSWORD = 'password-to-clear'

      saveSharePassword(SHARE_TOKEN, PASSWORD)
      clearSharePassword(SHARE_TOKEN)

      expect(cookiesRemoveSpy).toHaveBeenCalledWith(
        `share-token-pw-${SHARE_TOKEN}`,
        expect.objectContaining({
          path: '/',
          sameSite: 'Lax',
        })
      )
      expect(getSharePassword(SHARE_TOKEN)).toBeUndefined()

      cookiesRemoveSpy.mockRestore()
    })

    test('handles special characters in passwords correctly', () => {
      const SHARE_TOKEN = 'special-token'
      const PASSWORD = 'p@ssw0rd!#$%^&*()'

      saveSharePassword(SHARE_TOKEN, PASSWORD)

      expect(getSharePassword(SHARE_TOKEN)).toBe(PASSWORD)
    })

    test('multiple share passwords coexist independently', () => {
      const tokens = [
        { token: 'token-1', password: 'password-1' },
        { token: 'token-2', password: 'password-2' },
        { token: 'token-3', password: 'password-3' },
      ]

      tokens.forEach(({ token, password }) => {
        saveSharePassword(token, password)
      })

      tokens.forEach(({ token, password }) => {
        expect(getSharePassword(token)).toBe(password)
      })

      clearSharePassword('token-2')

      expect(getSharePassword('token-1')).toBe('password-1')
      expect(getSharePassword('token-2')).toBeUndefined()
      expect(getSharePassword('token-3')).toBe('password-3')
    })

    test('auth token and share passwords are independent', () => {
      const AUTH_TOKEN = 'auth-xyz'
      const SHARE_TOKEN = 'share-xyz'
      const SHARE_PASSWORD = 'share-pass'

      saveTokenCookie(AUTH_TOKEN)
      saveSharePassword(SHARE_TOKEN, SHARE_PASSWORD)

      expect(authToken()).toBe(AUTH_TOKEN)
      expect(getSharePassword(SHARE_TOKEN)).toBe(SHARE_PASSWORD)

      clearTokenCookie()

      expect(authToken()).toBeUndefined()
      expect(getSharePassword(SHARE_TOKEN)).toBe(SHARE_PASSWORD)
    })
  })

  describe('integration with environment variables', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    test('cookies use secure flag when UI_COOKIE_SECURE is true', async () => {
      vi.stubEnv('UI_COOKIE_SECURE', 'true')

      const auth = await import('./authentication')
      const cookiesSetSpy = vi.spyOn(Cookies, 'set')

      auth.saveTokenCookie('secure-test-token')

      expect(cookiesSetSpy).toHaveBeenCalledWith(
        'auth-token',
        'secure-test-token',
        expect.objectContaining({
          secure: true,
          path: '/',
          sameSite: 'Lax',
        })
      )

      cookiesSetSpy.mockRestore()
    })

    test('cookies use domain when UI_COOKIE_DOMAIN is set', async () => {
      vi.stubEnv('UI_COOKIE_DOMAIN', '.example.com')

      const auth = await import('./authentication')
      const cookiesSetSpy = vi.spyOn(Cookies, 'set')

      auth.saveTokenCookie('domain-test-token')

      expect(cookiesSetSpy).toHaveBeenCalledWith(
        'auth-token',
        'domain-test-token',
        expect.objectContaining({
          domain: '.example.com',
          path: '/',
          sameSite: 'Lax',
        })
      )

      cookiesSetSpy.mockRestore()
    })

    test('cookies use both secure and domain when both are configured', async () => {
      vi.stubEnv('UI_COOKIE_SECURE', 'true')
      vi.stubEnv('UI_COOKIE_DOMAIN', '.example.com')

      const auth = await import('./authentication')
      const cookiesSetSpy = vi.spyOn(Cookies, 'set')

      auth.saveTokenCookie('full-config-token')

      expect(cookiesSetSpy).toHaveBeenCalledWith(
        'auth-token',
        'full-config-token',
        expect.objectContaining({
          secure: true,
          domain: '.example.com',
          path: '/',
          sameSite: 'Lax',
          expires: 14,
        })
      )

      cookiesSetSpy.mockRestore()
    })

    test('clearTokenCookie passes same options including domain', async () => {
      vi.stubEnv('UI_COOKIE_DOMAIN', '.example.com')

      const auth = await import('./authentication')
      const cookiesRemoveSpy = vi.spyOn(Cookies, 'remove')

      auth.clearTokenCookie()

      expect(cookiesRemoveSpy).toHaveBeenCalledWith(
        'auth-token',
        expect.objectContaining({
          domain: '.example.com',
          path: '/',
          sameSite: 'Lax',
        })
      )

      cookiesRemoveSpy.mockRestore()
    })
  })
})
