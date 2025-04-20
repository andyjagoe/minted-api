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
      <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Bot className="h-4 w-4 md:h-5 md:w-5" />
            <span className="text-sm md:text-base font-bold">Minted AI API</span>
          </Link>
        </div>
        <nav className="flex items-center gap-2 md:gap-4">
          <Link
            href="https://github.com/andyjagoe/minted-api"
            className="text-xs md:text-sm font-medium hover:underline"
          >
            GitHub
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex h-8 md:h-9 items-center justify-center rounded-md bg-primary px-3 md:px-4 text-xs md:text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
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