import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Navbar from "@/components/Navbar"
import ProtectedRoute from "@/components/ProtectedRoute"
import HomePage from "@/pages/HomePage"
import NewBillPage from "@/pages/NewBillPage"
import BillsPage from "@/pages/BillsPage"
import AdminPage from "@/pages/AdminPage"

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Global Navigation Bar */}
        <Navbar />

        {/* Page Content View */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/newbill"
              element={
                <ProtectedRoute>
                  <NewBillPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bills"
              element={
                <ProtectedRoute>
                  <BillsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Auditè. Automated AI Expense Auditing.
        </footer>
      </div>
    </BrowserRouter>
  )
}
