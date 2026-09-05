import { type ReactNode } from "react"
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="w-full max-w-md text-center border-border shadow-sm">
            <CardHeader className="space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Lock className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold">Authentication Required</CardTitle>
              <CardDescription>
                You must be signed in to access this page and manage expense receipts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton mode="modal">
                <Button className="w-full cursor-pointer">Sign In to Continue</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </div>
      </SignedOut>
    </>
  )
}
