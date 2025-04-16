import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'

// Define the user schema for validation
const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

// In-memory storage for demo purposes
let users = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
]

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ data: users, error: null })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = UserSchema.parse(body)
    
    const newUser = {
      id: (users.length + 1).toString(),
      ...validatedData,
    }
    
    users.push(newUser)
    
    return NextResponse.json(
      { data: newUser, error: null },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: 'Invalid user data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { data: null, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}
