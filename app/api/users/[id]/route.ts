import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Define the user update schema for validation
const userUpdateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
})

// Mock database (same as in the users route)
const users = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    profile: {
      bio: "Software developer",
      location: "New York",
      avatar: "https://example.com/avatar.jpg",
    },
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    createdAt: "2023-01-02T00:00:00Z",
    updatedAt: "2023-01-02T00:00:00Z",
    profile: {
      bio: "UX Designer",
      location: "San Francisco",
      avatar: "https://example.com/avatar2.jpg",
    },
  },
]

// GET /api/users/:id - Get a user by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id

  // Find user by ID
  const user = users.find((u) => u.id === userId)

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    )
  }

  return NextResponse.json(user, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

// PUT /api/users/:id - Update a user
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    // Find user by ID
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) {
      return NextResponse.json(
        { error: "User not found" },
        {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate request body
    const validatedData = userUpdateSchema.parse(body)

    // Update user
    const updatedUser = {
      ...users[userIndex],
      ...validatedData,
      updatedAt: new Date().toISOString(),
    }

    // Update in mock database
    users[userIndex] = updatedUser

    return NextResponse.json(updatedUser, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
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
            "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
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
          "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    )
  }
}

// DELETE /api/users/:id - Delete a user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id

  // Find user by ID
  const userIndex = users.findIndex((u) => u.id === userId)

  if (userIndex === -1) {
    return NextResponse.json(
      { error: "User not found" },
      {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    )
  }

  // Remove from mock database
  users.splice(userIndex, 1)

  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}
