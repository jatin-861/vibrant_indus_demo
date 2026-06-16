# Shade Maintenance Billing & Collection System

## Product Requirements Document (PRD) v1.0

---

### Project Overview

The Shade Maintenance Billing & Collection System is a web-based application designed to replace the client's manual Excel-based workflow for managing maintenance billing, payment tracking, penalty calculations, invoice generation, reporting, and WhatsApp communication for commercial shades.

The system manages shades, owners, tenants, invoices, payments, maintenance charges, water charges, transfer fees, penalties, and automated reminders.

The primary objective is to reduce manual administrative work and automate billing operations for 220+ shades.

---

## Objectives

### Business Goals

- Eliminate manual Excel management
- Automate invoice generation
- Automate WhatsApp reminders
- Automate penalty calculations
- Track payments and overdue bills
- Generate reports automatically
- Centralize shade, owner, and tenant records

---

## User Roles

### Admin

**Permissions:**
- Create/Edit/Delete Shades
- Create/Edit/Delete Owners
- Create/Edit/Delete Tenants
- Import Excel Files
- Generate Bills
- Generate Reports
- Send WhatsApp Messages
- Configure System Settings
- Manage Users
- Void/Delete Bills
- Mark Payments Received

---

### Viewer

**Permissions:**
- View Data
- View Reports
- Export PDF Reports
- Export Excel Reports

**Restrictions:**
- No editing
- No billing actions
- No configuration access

---

## Core Modules

### Dashboard

Displays:
- Total Shades
- Total Collected Amount
- Total Pending Amount
- Total Penalties Collected
- Total Extra Charges
- Monthly Summary

---

### Shade Management

**Fields:**
- Shade Number
- Address
- Status (Active/Inactive)
- Owner
- Tenant (Optional)

**Features:**
- Create Shade
- Edit Shade
- Deactivate Shade
- Search
- Filter

> Inactive shades receive no invoices.

---

### Owner Management

**Fields:**
- Name
- Phone Number
- Email
- Address

**Features:**
- Add Owner
- Edit Owner
- View Owner History

> An owner can own multiple shades.

---

### Tenant Management

**Fields:**
- Name
- Phone Number
- Email
- Address

**Features:**
- Add Tenant
- Edit Tenant
- Tenant History

> Historical tenant records must remain stored.

---

### Excel Import System

**Purpose:** Automatically import existing data.

**Supported Imports:**

#### Shade Import

Fields:
- Shade Number
- Owner Name
- Owner Phone
- Tenant Name
- Tenant Phone
- Address

#### Water Reading Import

Fields:
- Shade Number
- Old Reading
- New Reading

> System automatically calculates water charges.

---

### Billing Module

Admin may generate invoices for:
- All Shades
- Selected Shades

**Invoice Components:**

#### Maintenance Fee

| Setting | Value |
|--------|-------|
| Default | ₹720 |
| Configurable | Yes (Admin) |
| Effect | Future invoices only |

---

#### Water Charges

**Formula:** `(New Reading - Old Reading) × Water Rate`

| Setting | Value |
|--------|-------|
| Default Water Rate | ₹30 per unit |
| Configurable | Yes |

---

#### Transfer Fee

| Setting | Value |
|--------|-------|
| Default | ₹2500 |
| Configurable | Yes |

---

#### Other Charges

Examples:
- Pipeline Repair
- Electrical Repair
- Emergency Work

> Admin enters custom amounts.

---

#### Penalty

| Setting | Value |
|--------|-------|
| Default | ₹100/day |
| Configurable | Yes (Admin) |
| Disable per shade | Yes |

---

### Invoice Management

**Invoice Number Format:** Custom Prefix

Examples:
- `KIN-2026-0001`
- `ABC-2026-0001`

> Admin configurable.

**Invoice Actions:**
- Generate
- Edit
- Void
- Delete
- Regenerate PDF
- Resend

---

### Payment Tracking

**Statuses:**
- Paid
- Pending
- Overdue

> Admin manually marks payment received.

**Supported Payment Types:**
- UPI
- Office Payment

**System stores:**
- Amount
- Date
- Method
- Notes

---

### WhatsApp Automation

#### Before Due Date

Admin selects:
- All Shades
- Selected Shades

System sends:
- Reminder Message
- Invoice PDF
- QR Code

Recipients: Owner, Tenant

---

#### After Due Date

System sends:
- Overdue Reminder
- Updated Invoice
- Penalty Amount

Recipients: Owner, Tenant

---

#### Receipt Sending

Upon payment, system generates and sends:
- Receipt PDF via WhatsApp

Recipients: Owner, Tenant

---

### Reporting Module

#### Monthly Collection Report
- Total Collected
- Total Pending
- Total Overdue

#### Penalty Report
- Total Penalty Collected

#### Additional Charges Report
- Water Charges
- Transfer Fees
- Other Charges

#### Payment Performance Report
- Paid On Time
- Paid Late
- Unpaid

**Export Formats:** Excel, PDF

---

### Audit Log

**Tracked Actions:**
- Invoice Created
- Invoice Edited
- Invoice Deleted
- Owner Updated
- Tenant Updated
- Payment Marked
- Settings Changed

**Fields:** User, Action, Date, Time

---

### Settings Module

| Setting | Default |
|---------|---------|
| Maintenance Fee | ₹720 |
| Water Rate | ₹30/unit |
| Transfer Fee | ₹2500 |
| Penalty Per Day | ₹100 |
| Invoice Prefix | e.g. `KIN` |

**WhatsApp Reminder Schedule (configurable):**
- 3 Days Before Due Date
- 1 Day Before Due Date
- After Due Date

---

## Technical Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, TailwindCSS, shadcn/ui |
| Backend | Convex |
| Database | Convex Database |
| Storage | Convex File Storage |
| Authentication | Convex Auth (email/password) |
| Hosting | Vercel |
| PDF Generation | React PDF |
| Excel Processing | SheetJS |
| WhatsApp | WhatsApp Business API |

---

## MVP Scope

**Included:**
- Dashboard
- Shade Management
- Owner Management
- Tenant Management
- Excel Import
- Invoice Generation
- Payment Tracking
- Penalty System
- WhatsApp Automation
- Reports
- Audit Logs
- PDF Export
- Excel Export
- User Management

---

## Future Scope (Not MVP)

- Customer Portal
- Mobile App
- Online Payment Verification
- SMS Integration
- Multi-Property Support
- Advanced Analytics
- Multi-Language Support

---

## Estimated Complexity

| Area | Complexity |
|------|-----------|
| Frontend | Medium |
| Backend | Medium |
| Business Logic | High |
| WhatsApp Automation | High |
| Reporting | Medium |
| **Overall** | **Medium-High** |
