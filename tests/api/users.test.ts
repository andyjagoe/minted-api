import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/users/route'

describe('Users API', () => {
  const createTestRequest = (method: string, body?: any): NextRequest => {
    return new NextRequest(new URL('http://localhost/api/users'), {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    })
  }

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const req = createTestRequest('GET')
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.error).toBeNull()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
      expect(data.data[0]).toHaveProperty('id')
      expect(data.data[0]).toHaveProperty('name')
      expect(data.data[0]).toHaveProperty('email')
    })
  })

  describe('POST /api/users', () => {
    it('should create a new user with valid data', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
      }

      const req = createTestRequest('POST', newUser)
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.error).toBeNull()
      expect(data.data).toHaveProperty('id')
      expect(data.data.name).toBe(newUser.name)
      expect(data.data.email).toBe(newUser.email)
    })

    it('should return 400 for invalid user data', async () => {
      const invalidUser = {
        name: '', // Invalid: empty name
        email: 'not-an-email', // Invalid: not an email
      }

      const req = createTestRequest('POST', invalidUser)
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.data).toBeNull()
      expect(data.error).toBe('Invalid user data')
    })

    it('should validate email format', async () => {
      const invalidUser = {
        name: 'Test User',
        email: 'invalid-email',
      }

      const req = createTestRequest('POST', invalidUser)
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.data).toBeNull()
      expect(data.error).toBe('Invalid user data')
    })

    it('should validate name length', async () => {
      const invalidUser = {
        name: 'A', // Too short
        email: 'test@example.com',
      }

      const req = createTestRequest('POST', invalidUser)
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.data).toBeNull()
      expect(data.error).toBe('Invalid user data')
    })
  })
}) 