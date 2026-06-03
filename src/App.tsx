import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, GuestRoute } from '@/router/guards'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AccountsPage from '@/pages/AccountsPage'
import PartiesPage from '@/pages/PartiesPage'
import TransactionsPage from '@/pages/TransactionsPage'
import JournalEntryFormPage from '@/pages/JournalEntryFormPage'
import TrialBalancePage from '@/pages/TrialBalancePage'
import LedgerPage from '@/pages/LedgerPage'
import IncomeStatementPage from '@/pages/IncomeStatementPage'
import BalanceSheetPage from '@/pages/BalanceSheetPage'
import SettingsPage from '@/pages/SettingsPage'
import OpeningBalancesPage from '@/pages/OpeningBalancesPage'
import FiscalYearsPage from '@/pages/FiscalYearsPage'
import CashVouchersPage from '@/pages/CashVouchersPage'
import PettyCashPage from '@/pages/PettyCashPage'
import UsersPage from '@/pages/UsersPage'
import BackupPage from '@/pages/BackupPage'
import JournalSpreadsheetPage from '@/pages/JournalSpreadsheetPage'
import PrepaidRentPage from '@/pages/PrepaidRentPage'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/new" element={<JournalEntryFormPage />} />
          <Route path="/transactions/:id/edit" element={<JournalEntryFormPage />} />
          <Route path="/cash-vouchers" element={<CashVouchersPage />} />
          <Route path="/petty-cash" element={<PettyCashPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/parties" element={<PartiesPage />} />
          <Route path="/reports" element={<TrialBalancePage />} />
          <Route path="/reports/trial-balance" element={<TrialBalancePage />} />
          <Route path="/reports/ledger" element={<LedgerPage />} />
          <Route path="/reports/income-statement" element={<IncomeStatementPage />} />
          <Route path="/reports/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/opening-balances" element={<OpeningBalancesPage />} />
          <Route path="/settings/fiscal-years" element={<FiscalYearsPage />} />
        </Route>

        {/* Full-screen pages — same ProtectedRoute, but outside AppLayout */}
        <Route path="/journal-spreadsheet" element={<JournalSpreadsheetPage />} />
        <Route path="/prepaid-rent"        element={<PrepaidRentPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

