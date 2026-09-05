import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@clerk/clerk-react"
import { fetchWithAuth } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Receipt,
  Building,
  Calendar,
  DollarSign,
  User,
  Sparkles,
  ShieldAlert,
} from "lucide-react"

interface BillItemData {
  item_id?: number
  description: string
  price: number | string
}

interface AdminBillData {
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

type TabFilter = "all" | "pending_review" | "approved" | "rejected"

export default function AdminPage() {
  const { getToken } = useAuth()

  const [bills, setBills] = useState<AdminBillData[]>([])
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isForbidden, setIsForbidden] = useState(false)

  const fetchAdminBills = async () => {
    setLoading(true)
    setError(null)
    setIsForbidden(false)

    try {
      const token = await getToken()
      if (!token) {
        throw new Error("Authentication token not available.")
      }

      const response = await fetchWithAuth("/api/admin/bills", token)

      if (response.status === 403) {
        setIsForbidden(true)
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to load admin bills: HTTP ${response.status}`)
      }

      const data: AdminBillData[] = await response.json()
      setBills(data)
      if (data.length > 0 && !selectedBillId) {
        setSelectedBillId(data[0].id)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminBills()
  }, [])

  const handleUpdateStatus = async (billId: string, newStatus: "approved" | "rejected") => {
    setUpdatingStatus(true)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error("Authentication token not available.")
      }
      const response = await fetchWithAuth(`/api/admin/bills/${billId}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Failed to update status")
      }

      const updatedBill: AdminBillData = await response.json()

      // Update local state instantly
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, status: updatedBill.status } : b))
      )
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating bill status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Filter and search computation
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesTab = activeTab === "all" ? true : b.status === activeTab
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !query ||
        (b.merchant && b.merchant.toLowerCase().includes(query)) ||
        (b.user_id && b.user_id.toLowerCase().includes(query)) ||
        (b.expense_category && b.expense_category.toLowerCase().includes(query))

      return matchesTab && matchesSearch
    })
  }, [bills, activeTab, searchQuery])

  const selectedBill = useMemo(() => {
    return bills.find((b) => b.id === selectedBillId) || filteredBills[0] || null
  }, [bills, selectedBillId, filteredBills])

  const getVerdictBadge = (verdict?: string | null) => {
    switch (verdict) {
      case "accept":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-medium text-xs">
            <CheckCircle2 className="w-3 h-3" />
            <span>AI Accept</span>
          </Badge>
        )
      case "reject":
        return (
          <Badge variant="destructive" className="flex items-center gap-1 font-medium text-xs">
            <XCircle className="w-3 h-3" />
            <span>AI Reject</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1 font-medium text-xs">
            <Clock className="w-3 h-3" />
            <span>AI Pending</span>
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/20 font-medium text-xs">
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 font-medium text-xs">
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-50 dark:bg-blue-950/20 font-medium text-xs">
            Pending Review
          </Badge>
        )
    }
  }

  // 403 Forbidden Access Screen
  if (isForbidden) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <Card className="border-border p-8 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Admin Privileges Required</CardTitle>
            <CardDescription className="text-base">
              Your account does not have administrator permissions. To access this dashboard, your Clerk account must have the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">role: "admin"</code> claim or be added to <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">CLERK_ADMIN_USER_IDS</code> in the backend .env.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Review Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Company-wide expense auditing, line-item verification, and manual status overrides.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAdminBills}
          disabled={loading}
          className="cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Feed
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border text-xs font-medium">
          {(
            [
              { key: "all", label: `All (${bills.length})` },
              { key: "pending_review", label: `Pending (${bills.filter((b) => b.status === "pending_review").length})` },
              { key: "approved", label: `Approved (${bills.filter((b) => b.status === "approved").length})` },
              { key: "rejected", label: `Rejected (${bills.filter((b) => b.status === "rejected").length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search merchant, user, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Split-View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Bills List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
          {loading ? (
            <Card className="p-8 text-center border-border">
              <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading company bills...</p>
            </Card>
          ) : filteredBills.length === 0 ? (
            <Card className="p-8 text-center border-border">
              <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No matching bills</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filter or search criteria.</p>
            </Card>
          ) : (
            filteredBills.map((bill) => {
              const isSelected = selectedBill?.id === bill.id

              return (
                <div
                  key={bill.id}
                  onClick={() => setSelectedBillId(bill.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {bill.merchant || "Unknown Merchant"}
                    </div>
                    <div className="font-bold text-sm text-foreground shrink-0">
                      ${Number(bill.total_amount || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="capitalize">{bill.expense_category || "General"}</span>
                    <span>{bill.receipt_date || new Date(bill.uploaded_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      {getVerdictBadge(bill.ai_verdict)}
                      {getStatusBadge(bill.status)}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                      {bill.user_id}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Selected Bill Detailed View & Action Panel */}
        <div className="lg:col-span-7">
          {selectedBill ? (
            <Card className="border-border shadow-xs sticky top-20">
              <CardHeader className="border-b border-border bg-muted/20 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-2xl font-bold">
                        {selectedBill.merchant || "Unknown Merchant"}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Submission ID: <span className="font-mono">{selectedBill.id}</span>
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {getVerdictBadge(selectedBill.ai_verdict)}
                    {getStatusBadge(selectedBill.status)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-5">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-md bg-muted/40 border border-border">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Total Amount</span>
                    </div>
                    <div className="font-bold text-sm text-foreground">
                      ${Number(selectedBill.total_amount || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Building className="w-3.5 h-3.5" />
                      <span>Category</span>
                    </div>
                    <div className="font-semibold text-foreground capitalize">
                      {selectedBill.expense_category || "General"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Receipt Date</span>
                    </div>
                    <div className="font-semibold text-foreground">
                      {selectedBill.receipt_date || "Unknown"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Employee</span>
                    </div>
                    <div className="font-mono text-foreground truncate" title={selectedBill.user_id}>
                      {selectedBill.user_id}
                    </div>
                  </div>
                </div>

                {/* AI Reasoning Banner */}
                {selectedBill.ai_reason && (
                  <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Audit Recommendation</span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground">{selectedBill.ai_reason}</p>
                  </div>
                )}

                {/* Extracted Line Items */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Line Items ({selectedBill.items?.length || 0})
                  </h3>
                  {selectedBill.items && selectedBill.items.length > 0 ? (
                    <div className="rounded-md border border-border overflow-hidden bg-card max-h-48 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted text-muted-foreground uppercase sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2 text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {selectedBill.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="px-3 py-1.5 text-foreground">{it.description}</td>
                              <td className="px-3 py-1.5 text-right font-medium text-foreground">
                                ${Number(it.price).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No granular items recorded.
                    </p>
                  )}
                </div>

                {/* Admin Decision Action Buttons */}
                <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    onClick={() => handleUpdateStatus(selectedBill.id, "approved")}
                    disabled={updatingStatus || selectedBill.status === "approved"}
                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Bill</span>
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedBill.id, "rejected")}
                    disabled={updatingStatus || selectedBill.status === "rejected"}
                    className="w-full sm:flex-1 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Bill</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12 text-center border-border">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <CardTitle className="text-lg">No Bill Selected</CardTitle>
              <CardDescription>
                Select a receipt from the list on the left to view details and perform review decisions.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
