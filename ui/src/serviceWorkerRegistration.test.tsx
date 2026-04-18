import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

/** Capture a single 'load' handler and expose a triggerLoad() to invoke it. */
function mockWindowLoadOnce() {
    let handler: EventListenerOrEventListenerObject | null = null
    const addSpy = vi
        .spyOn(globalThis as unknown as Window, 'addEventListener')
        .mockImplementation(((type: string, cb: EventListenerOrEventListenerObject) => {
            if (type === 'load') {
                handler = cb
            }
        }))

    return {
        addSpy,
        triggerLoad: () => {
            if (!handler) throw new Error('load handler not registered')
            const event = new Event('load')
            if (typeof handler === 'function') {
                handler(event)
            } else {
                handler.handleEvent(event)
            }
        },
    }
}

/** Simple deferred promise helper to control resolution/rejection timing. */
function deferred<T = unknown>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

/** Install a controllable navigator.serviceWorker mock. */
function mockNavigatorSW(swMock: {
    register: ReturnType<typeof vi.fn>
    ready: Promise<{ unregister: ReturnType<typeof vi.fn> }>
    controller?: object | null
}) {
    Object.defineProperty(navigator, 'serviceWorker', {
        value: swMock,
        configurable: true,
        writable: true,
    })
}

/** Minimal ServiceWorkerRegistration shape with a controllable installing worker. */
function makeRegistrationMock() {
    const installing: {
        state: string
        onstatechange: ((e: Event) => void) | null
    } = { state: 'installing', onstatechange: null }

    const registration: {
        installing: typeof installing | null
        onupdatefound: (() => void) | null
    } = { installing, onupdatefound: null }

    return { registration, installing }
}

const originalFetch = globalThis.fetch
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

function restoreNavigatorSW() {
    if (originalServiceWorker) {
        Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
    } else {
        Reflect.deleteProperty(navigator, 'serviceWorker')
    }
}

describe('serviceWorkerRegistration', () => {
    beforeEach(() => {
        vi.resetModules()
        if (originalLocation) {
            Object.defineProperty(globalThis, 'location', originalLocation)
        }
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        globalThis.fetch = originalFetch
        restoreNavigatorSW()
    })

    // ── isLocalhost detection ──────────────────────────────────────────────────
    // isLocalhost is evaluated at module load time, so reset modules and set
    // globalThis.location before each test that depends on it.

    describe('isLocalhost detection', () => {
        test('identifies "localhost" hostname as local', async () => {
            vi.stubEnv('PROD', true)
            const { triggerLoad } = mockWindowLoadOnce()

            const mockFetch = vi.fn().mockRejectedValue(new Error('network'))
            globalThis.fetch = mockFetch
            const mockUnregister = vi.fn().mockResolvedValue(true)
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })
            vi.spyOn(console, 'warn').mockImplementation(() => { })
            vi.spyOn(console, 'error').mockImplementation(() => { })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled())
        })

        test('identifies "[::1]" hostname as local', async () => {
            Object.defineProperty(globalThis, 'location', {
                value: { hostname: '[::1]', href: 'http://[::1]/', origin: 'http://[::1]', reload: vi.fn() },
                configurable: true,
                writable: true,
            })
            vi.stubEnv('PROD', true)
            const { triggerLoad } = mockWindowLoadOnce()

            const mockFetch = vi.fn().mockRejectedValue(new Error('network'))
            globalThis.fetch = mockFetch
            const mockUnregister = vi.fn().mockResolvedValue(true)
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })
            vi.spyOn(console, 'warn').mockImplementation(() => { })
            vi.spyOn(console, 'error').mockImplementation(() => { })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled())
        })

        test('identifies 127.0.0.1 as local via regex', async () => {
            Object.defineProperty(globalThis, 'location', {
                value: { hostname: '127.0.0.1', href: 'http://127.0.0.1/', origin: 'http://127.0.0.1', reload: vi.fn() },
                configurable: true,
                writable: true,
            })
            vi.stubEnv('PROD', true)
            const { triggerLoad } = mockWindowLoadOnce()

            const mockFetch = vi.fn().mockRejectedValue(new Error('network'))
            globalThis.fetch = mockFetch
            const mockUnregister = vi.fn().mockResolvedValue(true)
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })
            vi.spyOn(console, 'warn').mockImplementation(() => { })
            vi.spyOn(console, 'error').mockImplementation(() => { })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled())
        })

        test('identifies 127.255.255.254 as local via regex', async () => {
            Object.defineProperty(globalThis, 'location', {
                value: {
                    hostname: '127.255.255.254',
                    href: 'http://127.255.255.254/',
                    origin: 'http://127.255.255.254',
                    reload: vi.fn(),
                },
                configurable: true,
                writable: true,
            })
            vi.stubEnv('PROD', true)
            const { triggerLoad } = mockWindowLoadOnce()

            const mockFetch = vi.fn().mockRejectedValue(new Error('network'))
            globalThis.fetch = mockFetch
            const mockUnregister = vi.fn().mockResolvedValue(true)
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })
            vi.spyOn(console, 'warn').mockImplementation(() => { })
            vi.spyOn(console, 'error').mockImplementation(() => { })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled())
        })

        test('does not identify an external hostname as local', async () => {
            Object.defineProperty(globalThis, 'location', {
                value: { hostname: 'example.com', href: 'http://example.com/', origin: 'http://example.com', reload: vi.fn() },
                configurable: true,
                writable: true,
            })
            vi.stubEnv('PROD', true)
            const { triggerLoad } = mockWindowLoadOnce()

            const mockRegister = vi.fn().mockResolvedValue({ installing: null, onupdatefound: null })
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })
            vi.spyOn(console, 'error').mockImplementation(() => { })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockRegister).toHaveBeenCalled())
        })

        test('does not identify 128.0.0.1 (outside 127/8) as local', async () => {
            Object.defineProperty(globalThis, 'location', {
                value: { hostname: '128.0.0.1', href: 'http://128.0.0.1/', origin: 'http://128.0.0.1', reload: vi.fn() },
                configurable: true,
                writable: true,
            })
            vi.stubEnv('PROD', true)
            const { triggerLoad } = mockWindowLoadOnce()

            const mockRegister = vi.fn().mockResolvedValue({ installing: null, onupdatefound: null })
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })
            vi.spyOn(console, 'error').mockImplementation(() => { })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockRegister).toHaveBeenCalled())
        })
    })

    // ── register() ────────────────────────────────────────────────────────────

    describe('register()', () => {
        test('does nothing when not in production mode (PROD is false)', async () => {
            const addSpy = vi.spyOn(globalThis as unknown as Window, 'addEventListener')
            const { register } = await import('./serviceWorkerRegistration')
            register()
            const loadListeners = addSpy.mock.calls.filter(call => call[0] === 'load')
            expect(loadListeners).toHaveLength(0)
        })

        test('adds a load listener in production when serviceWorker is supported', async () => {
            vi.stubEnv('PROD', true)
            const { addSpy } = mockWindowLoadOnce()

            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })
            vi.spyOn(console, 'warn').mockImplementation(() => { })
            vi.spyOn(console, 'error').mockImplementation(() => { })
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('error'))

            const { register } = await import('./serviceWorkerRegistration')
            register()

            const loadListeners = addSpy.mock.calls.filter(call => call[0] === 'load')
            expect(loadListeners.length).toBeGreaterThan(0)
        })

        test('logs service worker ready warning on localhost when ready rejects', async () => {
            vi.stubEnv('PROD', true)
            const { triggerLoad } = mockWindowLoadOnce()
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
            vi.spyOn(console, 'error').mockImplementation(() => { })

            const mockRegister = vi.fn().mockResolvedValue({ installing: null, onupdatefound: null })
            const readyDeferred = deferred<{ unregister: ReturnType<typeof vi.fn> }>()
            mockNavigatorSW({
                register: mockRegister,
                // Attach catch first (inside load), then reject:
                ready: readyDeferred.promise,
                controller: null,
            })

            globalThis.fetch = vi.fn().mockResolvedValue({
                status: 200,
                headers: { get: vi.fn().mockReturnValue('application/javascript') },
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()
            // Now reject so the .catch installed in register() handles it.
            readyDeferred.reject(new Error('sw-not-available'))

            await vi.waitFor(() =>
                expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load service worker'))
            )
        })
    })

    // ── checkValidServiceWorker() – exercised via register() on localhost ──────

    describe('checkValidServiceWorker() [localhost path]', () => {
        beforeEach(() => {
            vi.stubEnv('PROD', true)
            vi.spyOn(console, 'warn').mockImplementation(() => { })
            vi.spyOn(console, 'error').mockImplementation(() => { })
        })

        test('calls registerValidSW when fetch returns a valid JS file (200 + JS content-type)', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const mockRegister = vi.fn().mockResolvedValue({ installing: null, onupdatefound: null })
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })
            globalThis.fetch = vi.fn().mockResolvedValue({
                status: 200,
                headers: { get: vi.fn().mockReturnValue('application/javascript; charset=utf-8') },
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() =>
                expect(mockRegister).toHaveBeenCalledWith(expect.stringContaining('service-worker.js'))
            )
        })

        test('uses fetch with Service-Worker header and correct SW URL', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const mockFetch = vi.fn().mockRejectedValue(new Error('network'))
            globalThis.fetch = mockFetch
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() =>
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('service-worker.js'),
                    expect.objectContaining({ headers: { 'Service-Worker': 'script' } })
                )
            )
        })

        test('unregisters existing SW and reloads page when server returns 404', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const mockReload = vi.fn()
            const mockUnregister = vi.fn().mockResolvedValue(true)
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })
            Object.defineProperty(globalThis, 'location', {
                value: { hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost', reload: mockReload },
                configurable: true,
                writable: true,
            })
            globalThis.fetch = vi.fn().mockResolvedValue({
                status: 404,
                headers: { get: vi.fn().mockReturnValue('text/html') },
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockUnregister).toHaveBeenCalled())
            await vi.waitFor(() => expect(mockReload).toHaveBeenCalled())
        })

        test('unregisters and reloads when response content-type is not JavaScript', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const mockReload = vi.fn()
            const mockUnregister = vi.fn().mockResolvedValue(true)
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })
            Object.defineProperty(globalThis, 'location', {
                value: { hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost', reload: mockReload },
                configurable: true,
                writable: true,
            })
            globalThis.fetch = vi.fn().mockResolvedValue({
                status: 200,
                headers: { get: vi.fn().mockReturnValue('text/html; charset=utf-8') },
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockUnregister).toHaveBeenCalled())
            await vi.waitFor(() => expect(mockReload).toHaveBeenCalled())
        })

        test('proceeds to registerValidSW when content-type is null (does NOT unregister)', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const mockRegister = vi.fn().mockResolvedValue({ installing: null, onupdatefound: null })
            const mockUnregister = vi.fn()
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })
            globalThis.fetch = vi.fn().mockResolvedValue({
                status: 200,
                headers: { get: vi.fn().mockReturnValue(null) },
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockRegister).toHaveBeenCalled())
            expect(mockUnregister).not.toHaveBeenCalled()
        })

        test('logs offline warning when fetch fails due to network error', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })
            globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() =>
                expect(warnSpy).toHaveBeenCalledWith(
                    expect.stringContaining('No internet connection found')
                )
            )
        })

        test('uses globalThis.location.reload() (not window.location.reload)', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const mockReload = vi.fn()
            const mockUnregister = vi.fn().mockResolvedValue(true)
            Object.defineProperty(globalThis, 'location', {
                value: { hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost', reload: mockReload },
                configurable: true,
                writable: true,
            })
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })
            globalThis.fetch = vi.fn().mockResolvedValue({
                status: 404,
                headers: { get: vi.fn().mockReturnValue('text/html') },
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() => expect(mockReload).toHaveBeenCalled())
        })
    })

    // ── registerValidSW() – exercised via register() on a non-localhost host ──

    describe('registerValidSW() [non-localhost path]', () => {
        beforeEach(() => {
            Object.defineProperty(globalThis, 'location', {
                value: { hostname: 'example.com', href: 'http://example.com/', origin: 'http://example.com', reload: vi.fn() },
                configurable: true,
                writable: true,
            })
            vi.stubEnv('PROD', true)
            vi.spyOn(console, 'error').mockImplementation(() => { })
        })

        test('calls navigator.serviceWorker.register() with the SW URL', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const mockRegister = vi.fn().mockResolvedValue({ installing: null, onupdatefound: null })
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() =>
                expect(mockRegister).toHaveBeenCalledWith(expect.stringContaining('service-worker.js'))
            )
        })

        test('calls onUpdate callback when a new SW is installed and a controller already exists', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const onUpdate = vi.fn()
            const { registration, installing } = makeRegistrationMock()
            const mockRegister = vi.fn().mockResolvedValue(registration)
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: { state: 'activated' },
            })

            const { register } = await import('./serviceWorkerRegistration')
            register({ onUpdate })
            triggerLoad()

            await vi.waitFor(() => expect(mockRegister).toHaveBeenCalled())

            registration.onupdatefound!()
            installing.state = 'installed'
            installing.onstatechange!(new Event('statechange'))

            expect(onUpdate).toHaveBeenCalledWith(registration)
        })

        test('calls onSuccess callback when a new SW installs for the first time (no controller)', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const onSuccess = vi.fn()
            const { registration, installing } = makeRegistrationMock()
            const mockRegister = vi.fn().mockResolvedValue(registration)
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })

            const { register } = await import('./serviceWorkerRegistration')
            register({ onSuccess })
            triggerLoad()

            await vi.waitFor(() => expect(mockRegister).toHaveBeenCalled())

            registration.onupdatefound!()
            installing.state = 'installed'
            installing.onstatechange!(new Event('statechange'))

            expect(onSuccess).toHaveBeenCalledWith(registration)
        })

        test('does not call any callback when installingWorker is null', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const onUpdate = vi.fn()
            const onSuccess = vi.fn()
            const registration = { installing: null, onupdatefound: null as (() => void) | null }
            const mockRegister = vi.fn().mockResolvedValue(registration)
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })

            const { register } = await import('./serviceWorkerRegistration')
            register({ onUpdate, onSuccess })
            triggerLoad()

            await vi.waitFor(() => expect(mockRegister).toHaveBeenCalled())
            registration.onupdatefound!()

            expect(onUpdate).not.toHaveBeenCalled()
            expect(onSuccess).not.toHaveBeenCalled()
        })

        test('does not call callbacks when installing state is not "installed"', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const onUpdate = vi.fn()
            const onSuccess = vi.fn()
            const { registration, installing } = makeRegistrationMock()
            const mockRegister = vi.fn().mockResolvedValue(registration)
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })

            const { register } = await import('./serviceWorkerRegistration')
            register({ onUpdate, onSuccess })
            triggerLoad()

            await vi.waitFor(() => expect(mockRegister).toHaveBeenCalled())
            registration.onupdatefound!()
            // Leave state 'installing'
            installing.onstatechange!(new Event('statechange'))

            expect(onUpdate).not.toHaveBeenCalled()
            expect(onSuccess).not.toHaveBeenCalled()
        })

        test('uses optional chaining for onUpdate (config?.onUpdate)', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const { registration, installing } = makeRegistrationMock()
            const mockRegister = vi.fn().mockResolvedValue(registration)
            mockNavigatorSW({
                register: mockRegister,
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: { state: 'activated' },
            })

            const { register } = await import('./serviceWorkerRegistration')
            expect(() => {
                register()
                triggerLoad()
            }).not.toThrow()

            await vi.waitFor(() => expect(mockRegister).toHaveBeenCalled())
            registration.onupdatefound!()
            installing.state = 'installed'
            expect(() => installing.onstatechange!(new Event('statechange'))).not.toThrow()
        })

        test('logs error to console when registration rejects', async () => {
            const { triggerLoad } = mockWindowLoadOnce()

            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
            const registrationError = new Error('Registration failed')
            mockNavigatorSW({
                register: vi.fn().mockRejectedValue(registrationError),
                ready: Promise.resolve({ unregister: vi.fn() }),
                controller: null,
            })

            const { register } = await import('./serviceWorkerRegistration')
            register()
            triggerLoad()

            await vi.waitFor(() =>
                expect(errorSpy).toHaveBeenCalledWith(
                    'Error during service worker registration:',
                    registrationError
                )
            )
        })
    })

    // ── unregister() ──────────────────────────────────────────────────────────

    describe('unregister()', () => {
        test('calls registration.unregister() when serviceWorker is supported', async () => {
            const mockUnregister = vi.fn().mockResolvedValue(true)
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: Promise.resolve({ unregister: mockUnregister }),
                controller: null,
            })

            const { unregister } = await import('./serviceWorkerRegistration')
            unregister()

            await vi.waitFor(() => expect(mockUnregister).toHaveBeenCalled())
        })

        test('logs error message when navigator.serviceWorker.ready rejects', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
            const err = new Error('SW ready rejected')
            const d = deferred<{ unregister: ReturnType<typeof vi.fn> }>()
            mockNavigatorSW({
                register: vi.fn().mockResolvedValue({ installing: null, onupdatefound: null }),
                ready: d.promise,
                controller: null,
            })

            const { unregister } = await import('./serviceWorkerRegistration')
            unregister()
            // Reject after calling unregister() so .catch(...) is already attached.
            d.reject(err)

            await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledWith(err.message))
        })

        test('does not throw when serviceWorker is not in navigator', async () => {
            // Ensure the property truly does not exist, so `'serviceWorker' in navigator` is false.
            const desc = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
            if (desc?.configurable) {
                // Remove our own mock if present
                // eslint-disable-next-line `@typescript-eslint/no-explicit-any`
                delete (navigator as any).serviceWorker
            } else if (!desc) {
                // nothing to do — property absent
            }

            const { unregister } = await import('./serviceWorkerRegistration')
            expect(() => unregister()).not.toThrow()
        })
    })
})
