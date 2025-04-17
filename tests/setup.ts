import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { mockClerk } from './mocks/clerk'

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Mock Clerk
vi.mock('@clerk/nextjs', () => mockClerk)

// Cleanup after each test case
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
}) 