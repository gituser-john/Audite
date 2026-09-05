import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { SignedIn, SignedOut, SignInButton, useAuth, useUser } from "@clerk/clerk-react"
import { fetchWithAuth } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  PlusCircle,
  Receipt,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  WineOff,
  BedDouble,
  Sparkles,
  TrendingUp,
  FileCheck2,
} from "lucide-react"

interface AdminStats {
  net_amount_processed: number
  bills_processed: number
  ai_accuracy: number
}

export default function HomePage() {
  const { user } = useUser()
  const { getToken } = useAuth()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    // Check Clerk user metadata for admin role directly
    const metadataRole = (user?.publicMetadata as { role?: string })?.role
    if (metadataRole === "admin") {
      setIsAdmin(true)
    }

    const loadData = async () => {
      try {
        const token = await getToken()
        if (!token) return

        setLoadingStats(true)

        // 1. Fetch user role from /api/users/me
        try {
          const userRes = await fetchWithAuth("/api/users/me", token)
          if (userRes.ok) {
            const profile = await userRes.json()
            if (profile.role === "admin") {
              setIsAdmin(true)
            }
          }
        } catch {
          // Non-blocking
        }

        // 2. Fetch company stats from /api/admin/stats
        const statsRes = await fetchWithAuth("/api/admin/stats", token)
        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats(data)
        }
      } catch {
        // Fallback default stats or offline
      } finally {
        setLoadingStats(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user, getToken])

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Hero Banner */}
      <div className="text-center space-y-3 py-6">
        <Badge
          variant="outline"
          className="px-3 py-1 font-medium text-xs bg-primary/5 border-primary/20 text-primary inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal AI Auditing with Gemini 2.5 Flash</span>
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Auditè Expense Auditor
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Instant receipt extraction, automated corporate policy compliance, and streamlined approval workflows.
        </p>

        <SignedOut>
          <div className="pt-4">
            <SignInButton mode="modal">
              <Button size="lg" className="px-8 cursor-pointer text-base">
                Sign In to Start Auditing
              </Button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="pt-2 text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-semibold text-foreground">
              {user?.primaryEmailAddress?.emailAddress || user?.fullName}
            </span>
            {isAdmin && (
              <Badge className="ml-2 bg-primary/15 text-primary border-primary/30 text-[10px] uppercase font-bold">
                Admin
              </Badge>
            )}
          </div>
        </SignedIn>
      </div>

      {/* Prominent Stats Cards (Phase 7) */}
      <SignedIn>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stat 1: Net Amount Processed */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Net Spend Approved
                </span>
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                {loadingStats ? (
                  <span className="text-muted-foreground text-lg">Loading...</span>
                ) : (
                  `$${Number(stats?.net_amount_processed || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Company approved expenditures</span>
              </p>
            </CardContent>
          </Card>

          {/* Stat 2: Total Bills Processed */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Bills Reviewed
                </span>
                <div className="w-8 h-8 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                {loadingStats ? (
                  <span className="text-muted-foreground text-lg">Loading...</span>
                ) : (
                  stats?.bills_processed ?? 0
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Finalized admin determinations</span>
              </p>
            </CardContent>
          </Card>

          {/* Stat 3: AI Accuracy Rate */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  AI Accuracy Rate
                </span>
                <div className="w-8 h-8 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                {loadingStats ? (
                  <span className="text-muted-foreground text-lg">Loading...</span>
                ) : (
                  `${Number(stats?.ai_accuracy ?? 100).toFixed(1)}%`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Gemini match against admin decisions</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </SignedIn>

      {/* Action CTA Buttons */}
      <SignedIn>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/newbill" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto px-6 cursor-pointer flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              <span>Upload Bill</span>
            </Button>
          </Link>

          <Link to="/bills" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-6 cursor-pointer flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>My Bills</span>
            </Button>
          </Link>

          {/* Role-gated Admin CTA */}
          {isAdmin && (
            <Link to="/admin" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto px-6 cursor-pointer border border-border flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Admin Dashboard</span>
              </Button>
            </Link>
          )}
        </div>
      </SignedIn>

      {/* Corporate Policy Guidelines Reference */}
      <Card className="border-border bg-muted/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span>Corporate Expense Policies</span>
          </div>
          <CardDescription>
            Auditè enforces these strict corporate rules when evaluating every submitted receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3.5 rounded-lg bg-background border border-border space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-destructive">
                <WineOff className="w-4 h-4" />
                <span>Zero Alcohol Policy</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alcoholic beverages of any type are strictly non-reimbursable and trigger an automatic rejection verdict.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background border border-border space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                <DollarSign className="w-4 h-4" />
                <span>$50 Meals Cap</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dining and food expenditures must not exceed $50.00 total per transaction.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-background border border-border space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400">
                <BedDouble className="w-4 h-4" />
                <span>$200 Lodging Cap</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Hotel and accommodation costs must remain under $200.00 per night/booking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
