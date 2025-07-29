import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/layout/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import DashboardPage from "@/pages/DashboardPage";
import PosPage from "@/pages/PosPage";
import TransactionListPage from "@/pages/TransactionListPage";
import TransactionDetailPage from "@/pages/TransactionDetailPage";
import QuotationListPage from "@/pages/QuotationListPage";
import NewQuotationPage from "@/pages/NewQuotationPage";
import QuotationDetailPage from "@/pages/QuotationDetailPage";
import ProductPage from "@/pages/ProductPage";
import MaterialPage from "@/pages/MaterialPage";
import CustomerPage from "@/pages/CustomerPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage";
import EmployeePage from "@/pages/EmployeePage";
import PurchaseOrderPage from "@/pages/PurchaseOrderPage";
import AccountingPage from "@/pages/AccountingPage";
import AccountDetailPage from "@/pages/AccountDetailPage";
import ReceivablesPage from "@/pages/ReceivablesPage";
import ExpensePage from "@/pages/ExpensePage";
import EmployeeAdvancePage from "@/pages/EmployeeAdvancePage";
import FinancialReportPage from "@/pages/FinancialReportPage";
import SettingsPage from "@/pages/SettingsPage";
import AccountSettingsPage from "@/pages/AccountSettingsPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import AttendancePage from "@/pages/AttendancePage";
import AttendanceReportPage from "@/pages/AttendanceReportPage";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/pos" element={<PosPage />} />
                <Route path="/transactions" element={<TransactionListPage />} />
                <Route path="/transactions/:id" element={<TransactionDetailPage />} />
                <Route path="/quotations" element={<QuotationListPage />} />
                <Route path="/quotations/new" element={<NewQuotationPage />} />
                <Route path="/quotations/:id" element={<QuotationDetailPage />} />
                <Route path="/products" element={<ProductPage />} />
                <Route path="/materials" element={<MaterialPage />} />
                <Route path="/customers" element={<CustomerPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/employees" element={<EmployeePage />} />
                <Route path="/purchase-orders" element={<PurchaseOrderPage />} />
                <Route path="/accounts" element={<AccountingPage />} />
                <Route path="/accounts/:id" element={<AccountDetailPage />} />
                <Route path="/receivables" element={<ReceivablesPage />} />
                <Route path="/expenses" element={<ExpensePage />} />
                <Route path="/advances" element={<EmployeeAdvancePage />} />
                <Route path="/financial-report" element={<FinancialReportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/account-settings" element={<AccountSettingsPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/attendance/report" element={<AttendanceReportPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;