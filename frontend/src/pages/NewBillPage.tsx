import { useState, type ChangeEvent, type FormEvent } from "react"
import { useAuth } from "@clerk/clerk-react"
import { fetchWithAuth } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Receipt,
  FileText,
  DollarSign,
  Calendar,
  Building,
} from "lucide-react"

interface ExtractedItem {
  item_id?: number
  description: string
  price: number | string
}

interface BillResponseData {
  id: string
  user_id: string
  merchant: string | null
  expense_category: string | null
  receipt_date: string | null
  total_amount: number | string | null
  ai_verdict: "accept" | "reject" | "pending" | string | null
  ai_reason: string | null
  status: string
  items: ExtractedItem[]
}

export default function NewBillPage() {
  const { getToken } = useAuth()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auditResult, setAuditResult] = useState<BillResponseData | null>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file (JPEG, PNG, WEBP).")
        return
      }
      setSelectedFile(file)
      setError(null)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError("Please select a receipt image to upload.")
      return
    }

    setLoading(true)
    setError(null)
    setAuditResult(null)

    try {
      const token = await getToken()
      if (!token) {
        throw new Error("Could not retrieve authentication token. Please sign in again.")
      }

      const formData = new FormData()
      formData.append("file", selectedFile)
      if (notes.trim()) {
        formData.append("notes", notes.trim())
      }

      const response = await fetchWithAuth("/api/bills/upload", token, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || `Upload failed with HTTP ${response.status}`)
      }

      setAuditResult(data)
      // Reset form fields
      setSelectedFile(null)
      setPreviewUrl(null)
      setNotes("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const getVerdictBadge = (verdict?: string | null) => {
    switch (verdict) {
      case "accept":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Policy Compliant (Accept)</span>
          </Badge>
        )
      case "reject":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Policy Violation (Reject)</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </Badge>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Expense Receipt</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a receipt image for automated multimodal extraction and policy auditing.
        </p>
      </div>

      {/* Upload Form */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <span>Receipt Details</span>
          </CardTitle>
          <CardDescription>
            Supported formats: PNG, JPEG, WEBP. Gemini 2.5 Flash will automatically parse line items and verify company policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Drop / Upload Box */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Receipt Image <span className="text-destructive">*</span>
              </label>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 transition-colors bg-muted/20">
                {previewUrl ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="max-h-64 rounded-md shadow-xs object-contain border border-border"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedFile?.name} ({(Number(selectedFile?.size) / 1024).toFixed(1)} KB)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null)
                          setPreviewUrl(null)
                        }}
                        className="text-xs text-destructive hover:text-destructive cursor-pointer h-7 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer w-full py-4">
                    <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium text-foreground">
                      Click or drag receipt image here
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      JPEG, PNG, WEBP up to 10MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Employee Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Client dinner with ACME partner team"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !selectedFile}
              className="w-full sm:w-auto px-8 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing with Gemini 2.5 Flash...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit & Audit Receipt</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* AI Extraction & Audit Result Display */}
      {auditResult && (
        <Card className="border-border shadow-md overflow-hidden animate-in fade-in-50 duration-300">
          <CardHeader className="bg-muted/40 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>AI Audit Result</span>
                </CardTitle>
                <CardDescription>
                  Successfully processed and recorded in database.
                </CardDescription>
              </div>
              <div>{getVerdictBadge(auditResult.ai_verdict)}</div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Meta Information Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>Merchant</span>
                </div>
                <div className="font-semibold text-foreground truncate">
                  {auditResult.merchant || "Unknown"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date</span>
                </div>
                <div className="font-semibold text-foreground">
                  {auditResult.receipt_date || "N/A"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Category</span>
                </div>
                <div className="font-semibold text-foreground capitalize">
                  {auditResult.expense_category || "General"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Total Amount</span>
                </div>
                <div className="font-bold text-base text-foreground">
                  ${Number(auditResult.total_amount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* AI Policy Reason */}
            {auditResult.ai_reason && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Policy Compliance Explanation</span>
                </div>
                <p className="text-sm text-foreground">{auditResult.ai_reason}</p>
              </div>
            )}

            {/* Granular Line Items Breakdown */}
            {auditResult.items && auditResult.items.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Extracted Line Items ({auditResult.items.length})
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Item Description</th>
                        <th className="px-4 py-2.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {auditResult.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-4 py-2 text-foreground">{item.description}</td>
                          <td className="px-4 py-2 text-right font-medium text-foreground">
                            ${Number(item.price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
