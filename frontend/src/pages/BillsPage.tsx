import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Receipt,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface BillItemData {
  item_id?: number
  description: string
  price: number | string
}

interface BillData {
  id: string
  user_id: string
  merchant: string | null
  expense_category: string | null
  receipt_date: string | null
  uploaded_at: string
  total_amount: number | string | null
  ai_verdict: "accept" | "reject" | "pending" | string | null
  ai_reason: string | null
  status: "pending_review" | "approved" | "rejected" | string
  items: BillItemData[]
}

export default function BillsPage() {
  const { getToken } = useAuth()
  const [bills, setBills] = useState<BillData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)

  const fetchBills = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error("Could not retrieve authentication token. Please sign in.")
      }

      const response = await fetch("http://localhost:8000/api/bills", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load bills: HTTP ${response.status}`)
      }

      const data = await response.json()
      setBills(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBills()
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedBillId(expandedBillId === id ? null : id)
  }

  const getVerdictBadge = (verdict?: string | null) => {
    switch (verdict) {
      case "accept":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Accept</span>
          </Badge>
        )
      case "reject":
        return (
          <Badge variant="destructive" className="flex items-center gap-1 font-medium">
            <XCircle className="w-3 h-3" />
            <span>Reject</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/20 font-medium">
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 font-medium">
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-50 dark:bg-blue-950/20 font-medium">
            Pending Review
          </Badge>
        )
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Submitted Bills</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review your receipt history, line-item breakdowns, and automated AI compliance verdicts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBills}
            disabled={loading}
            className="cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link to="/newbill">
            <Button size="sm" className="cursor-pointer">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Upload Bill
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <Card className="border-border p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading your submitted bills...</p>
          </div>
        </Card>
      ) : bills.length === 0 ? (
        /* Empty state */
        <Card className="border-border p-12 text-center shadow-xs">
          <CardHeader className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Receipt className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">No Bills Submitted Yet</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              You have not uploaded any expense receipts yet. Upload your first bill to test the AI policy verification!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/newbill">
              <Button className="cursor-pointer">
                <PlusCircle className="w-4 h-4 mr-2" />
                Upload Your First Receipt
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* Bills List */
        <div className="space-y-3">
          {bills.map((bill) => {
            const isExpanded = expandedBillId === bill.id

            return (
              <Card
                key={bill.id}
                className="border-border shadow-xs hover:border-border/80 transition-colors overflow-hidden"
              >
                <div
                  onClick={() => toggleExpand(bill.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-card hover:bg-muted/10 transition-colors"
                >
                  {/* Left info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-base">
                        {bill.merchant || "Unknown Merchant"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground capitalize font-medium">
                        {bill.expense_category || "General"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>Receipt: {bill.receipt_date || "Unknown date"}</span>
                      <span>•</span>
                      <span>Uploaded: {new Date(bill.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right info & Badges */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <div className="text-right sm:mr-3">
                      <div className="font-bold text-lg text-foreground">
                        ${Number(bill.total_amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bill.items?.length || 0} line items
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getVerdictBadge(bill.ai_verdict)}
                      {getStatusBadge(bill.status)}
                    </div>

                    <div className="text-muted-foreground pl-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-border bg-muted/20 space-y-4 animate-in fade-in-50 duration-200">
                    {/* AI Policy Reason */}
                    {bill.ai_reason && (
                      <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-sm space-y-1">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                          AI Audit Verdict Reason:
                        </span>
                        <p className="text-foreground">{bill.ai_reason}</p>
                      </div>
                    )}

                    {/* Extracted Line Items */}
                    {bill.items && bill.items.length > 0 ? (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Line Items
                        </h4>
                        <div className="rounded-md border border-border overflow-hidden bg-card">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted text-muted-foreground uppercase">
                              <tr>
                                <th className="px-3 py-2">Item</th>
                                <th className="px-3 py-2 text-right">Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {bill.items.map((it, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-1.5 text-foreground">{it.description}</td>
                                  <td className="px-3 py-1.5 text-right font-medium text-foreground">
                                    ${Number(it.price).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No granular line items recorded for this bill.
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground font-mono">
                      Bill ID: {bill.id}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
