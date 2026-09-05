import { Link, NavLink } from "react-router-dom"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { Receipt, PlusCircle, LayoutDashboard, ShieldCheck } from "lucide-react"

export default function Navbar() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary text-primary-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text">
              Auditè
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              AI Auditor
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass} end>
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/newbill" className={navLinkClass}>
              <PlusCircle className="w-4 h-4" />
              <span>Upload Bill</span>
            </NavLink>
            <NavLink to="/bills" className={navLinkClass}>
              <Receipt className="w-4 h-4" />
              <span>My Bills</span>
            </NavLink>
            <NavLink to="/admin" className={navLinkClass}>
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </NavLink>
          </nav>
        </div>

        {/* Auth Controls */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm" className="cursor-pointer font-medium">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
