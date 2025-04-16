import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Define the user schema for validation
const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
})

// Mock database
const users = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    createdAt: "2023-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    createdAt: "2023-01-02T00:00:00Z",
  },
]

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "10")
  const page = Number.parseInt(searchParams.get("page") || "1")

  // Calculate pagination
  const startIndex = (page - 1) * limit
  const endIndex = page * limit
  const paginatedUsers = users.slice(startIndex, endIndex)

  return NextResponse.json(
    {
      users: paginatedUsers,
      pagination: {
        total: users.length,
        page,
        limit,
        pages: Math.ceil(users.length / limit),
      },
    },
    {
      headers: {
        // Configure CORS for cross-platform access
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()

    // Validate request body
    const validatedData = userSchema.parse(body)

    // Create new user (in a real app, you'd save to a database)
    const newUser = {
      id: (users.length + 1).toString(),
      name: validatedData.name,
      email: validatedData.email,
      createdAt: new Date().toISOString(),
    }

    // Add to mock database
    users.push(newUser)

    return NextResponse.json(newUser, {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return validation errors
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      )
    }

    // Return generic error
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
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
