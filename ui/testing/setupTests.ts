// jest-dom adds custom Vitest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest'
import '@testing-library/user-event'

import { setupLocalization } from '../src/localization'

// setup localization to make it easier to select elements by text
setupLocalization()

// Mock ResizeObserver for Headless UI components
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
} as any
