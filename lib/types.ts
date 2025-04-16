// User types
export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt?: string
  profile?: UserProfile
}

export interface UserProfile {
  bio?: string
  location?: string
  avatar?: string
}

// API response types
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export interface ErrorResponse {
  error: string
  details?: any
}

// Request types
export interface CreateUserRequest {
  name: string
  email: string
  password: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
}
