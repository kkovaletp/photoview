// jest-dom adds custom Vitest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest'
import '@testing-library/user-event'

import { setupLocalization } from '../src/localization'

// React requires this flag when tests use act() in a non-browser environment.
// It enables React act() checks for the Vitest jsdom environment.
Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
})

// setup localization to make it easier to select elements by text
setupLocalization()

// Mock ResizeObserver for Headless UI components
globalThis.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
} as any
