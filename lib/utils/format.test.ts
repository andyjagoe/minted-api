import { describe, it, expect } from 'vitest'

describe('format', () => {
  it('should format a number as currency', () => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
    }

    expect(formatCurrency(1000)).toBe('$1,000.00')
    expect(formatCurrency(99.99)).toBe('$99.99')
    expect(formatCurrency(0)).toBe('$0.00')
  })
}) 