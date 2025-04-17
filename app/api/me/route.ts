import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
  const user = await currentUser();
  console.log(JSON.stringify(user, null, 2)
)
  if (!user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ data: user, error: null })
}
