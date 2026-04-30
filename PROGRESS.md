# المالية — Finance System Progress

## Tech Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Backend   | Laravel 12 + Sanctum SPA cookie auth |
| Server    | XAMPP Apache (no `php artisan serve`) |
| DB        | MySQL (via XAMPP) |
| Currency  | SDG — ج.س |
| Dates     | dayjs · DD/MM/YYYY · Arabic locale |
| Language  | Arabic (RTL) · Cairo Variable font |

Backend URL: `http://localhost/finance-api/public`
Frontend URL: `http://localhost:5173`

---

## Done

### Infrastructure
- [x] Vite + React + TS project scaffold
- [x] Tailwind CSS v4 + shadcn/ui (Base UI primitives)
- [x] Cairo Variable font (Arabic)
- [x] RTL layout (`dir="rtl"` on `<html>`)
- [x] Laravel 12 backend served via XAMPP Apache subfolder
- [x] Sanctum SPA cookie auth (`SESSION_DRIVER=cookie`, `statefulApi()`)
- [x] CORS configured for `localhost:5173`
- [x] Axios instance (`withCredentials`, `withXSRFToken`)
- [x] Auth context with session persistence on page refresh
- [x] Route guards (`ProtectedRoute` / `GuestRoute`)
- [x] App layout: Sidebar + Topbar + main outlet

### Pages
- [x] Login page — username/password, Arabic validation errors
- [x] Dashboard — 4 stat cards (placeholders, no real data yet)

### Chart of Accounts — شجرة الحسابات
- [x] `accounts` table migration (code, name, type, parent_id, is_active)
- [x] `Account` model with `parent()` / `children()` relations
- [x] `AccountController` — full REST CRUD
  - Prevents self-referential parent
  - Prevents deleting accounts with children
- [x] 21 starter accounts seeded (5 root types → full tree)
- [x] Accounts page — tree table with RTL-correct indentation
- [x] Create / Edit dialog (code, name, type, parent select, active toggle)
- [x] Delete confirmation dialog (shows backend error inline)
- [x] Descendant filtering in parent select (no circular refs)

---

## Next — Build Order

### 1. Parties — الأطراف
- [ ] `parties` migration (name, type: customer/supplier/employee/other, phone, account_id)
- [ ] `Party` model + controller + routes
- [ ] Parties page (list + create/edit/delete)
- [ ] Link each party to a receivable/payable account in chart of accounts

### 2. Journal Entries — القيود اليومية  ← **heart of the system**
- [ ] `journal_entries` migration (date, reference, description, is_posted)
- [ ] `journal_entry_lines` migration (journal_entry_id, account_id, party_id, debit, credit, description)
- [ ] Enforce `SUM(debit) = SUM(credit)` per entry (backend + frontend)
- [ ] Journal entry list page
- [ ] Journal entry form (dynamic debit/credit lines, running balance check)
- [ ] Post / unpost toggle (posted = locked from edits)

### 3. Dashboard — Real Data
- [ ] Wire stat cards to actual API data:
  - Total balance (sum of asset accounts)
  - Transactions this month
  - Parties count
  - Net profit (revenue − expenses)

### 4. Reports — التقارير
- [ ] Trial Balance — ميزان المراجعة
- [ ] Balance Sheet — الميزانية العمومية
- [ ] Income Statement — قائمة الدخل (Revenue − Expenses)
- [ ] Account Ledger — كشف حساب (transactions per account)

---

## Key Decisions & Gotchas

- `DropdownMenuTrigger` does **not** support `asChild` in this shadcn build (Base UI, not Radix)
- Login route has **no** `guest` middleware — controller handles already-authenticated users via `Auth::check()`
- Apache subfolder serving: backend URL hardcoded in `src/lib/constants.ts`, not vhosts
- `SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173` — both ports needed
- Migrations use `php artisan migrate` run from PowerShell (not bash — Windows paths)
