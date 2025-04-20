import Link from "next/link"
import { Bot } from "lucide-react"
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2 font-bold">
          <Link href="/" className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span>Minted AI API</span>
          </Link>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <Link
            href="https://github.com/andyjagoe/minted-api"
            className="text-sm font-medium hover:underline"
          >
            GitHub
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </nav>
      </div>
    </header>
  )
} 