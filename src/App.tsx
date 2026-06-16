import { useState, useEffect } from 'react';
import {
  Grid,
  Users,
  FileText,
  MessageSquare,
  Settings as SettingsIcon,
  Bell,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
  DollarSign,
  AlertTriangle,
  Mail,
  ShieldAlert,
  Menu,
  ArrowLeft,
  BarChart2,
  ClipboardList
} from 'lucide-react';
import type { Shade, Owner, Invoice, WhatsAppMessage, SystemSettings, AdminRole, Payment, FineRecord, ChangeRequest, AuditLog } from './types';
import { DashboardView } from './components/DashboardView';
import { ShadesView } from './components/ShadesView';
import { OwnersView } from './components/OwnersView';
import { InvoicesView } from './components/InvoicesView';
import { PaymentsView } from './components/PaymentsView';
import { FinesView } from './components/FinesView';
import { WhatsappSimulator } from './components/WhatsappSimulator';
import { SettingsView } from './components/SettingsView';
import { AdminRequestsView } from './components/AdminRequestsView';
import { ReportsView } from './components/ReportsView';
import { AuditLogView } from './components/AuditLogView';
import { supabase } from './supabaseClient';

// Helper Mapping Functions between Supabase snake_case tables and frontend models
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapOwnerFromDB = (db: any): Owner => ({
  id: db.id,
  name: db.name,
  phone: db.phone,
  email: db.email,
  address: db.address || undefined,
  type: db.type,
  status: db.status,
  companyName: db.company_name
});

const mapOwnerToDB = (o: Owner) => ({
  id: o.id,
  name: o.name,
  phone: o.phone,
  email: o.email,
  address: o.address || null,
  type: o.type,
  status: o.status,
  company_name: o.companyName || null
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapShadeFromDB = (db: any): Shade => ({
  id: db.id,
  block: db.block,
  floor: db.floor,
  sqFt: db.sq_ft,
  status: db.status,
  ownerId: db.owner_id,
  renterId: db.renter_id,
  fixedMaintenance: db.fixed_maintenance,
  lastWaterReading: db.last_water_reading,
  currentWaterReading: db.current_water_reading,
  transferFeeTriggered: db.transfer_fee_triggered,
  hasWaterSupply: db.has_water_supply,
  penaltyDisabled: db.penalty_disabled || false
});

const mapShadeToDB = (s: Shade) => ({
  id: s.id,
  block: s.block,
  floor: s.floor,
  sq_ft: s.sqFt,
  status: s.status,
  owner_id: s.ownerId,
  renter_id: s.renterId,
  fixed_maintenance: s.fixedMaintenance,
  last_water_reading: s.lastWaterReading,
  current_water_reading: s.currentWaterReading,
  transfer_fee_triggered: s.transferFeeTriggered,
  has_water_supply: s.hasWaterSupply !== false,
  penalty_disabled: s.penaltyDisabled || false
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapInvoiceFromDB = (db: any): Invoice => ({
  id: db.id,
  shadeId: db.shade_id,
  ownerId: db.owner_id,
  ownerName: db.owner_name,
  ownerPhone: db.owner_phone,
  renterId: db.renter_id,
  renterName: db.renter_name,
  renterPhone: db.renter_phone,
  maintenanceFee: db.maintenance_fee,
  billingMonths: db.billing_months,
  oldWaterReading: db.old_water_reading,
  newWaterReading: db.new_water_reading,
  waterUsageCharge: db.water_usage_charge,
  otherMaintenanceName: db.other_maintenance_name,
  otherMaintenanceCharge: db.other_maintenance_charge,
  transferFee: db.transfer_fee,
  fineAmount: db.fine_amount,
  totalAmount: db.total_amount,
  generatedDate: db.generated_date,
  dueDate: db.due_date,
  status: db.status,
  paymentMethod: db.payment_method,
  paymentDate: db.payment_date,
  transactionDetails: db.transaction_details
});

const mapInvoiceToDB = (i: Invoice) => ({
  id: i.id,
  shade_id: i.shadeId,
  owner_id: i.ownerId,
  owner_name: i.ownerName,
  owner_phone: i.ownerPhone,
  renter_id: i.renterId,
  renter_name: i.renterName,
  renter_phone: i.renterPhone,
  maintenance_fee: i.maintenanceFee,
  billing_months: i.billingMonths,
  old_water_reading: i.oldWaterReading,
  new_water_reading: i.newWaterReading,
  water_usage_charge: i.waterUsageCharge,
  other_maintenance_name: i.otherMaintenanceName || null,
  other_maintenance_charge: i.otherMaintenanceCharge,
  transfer_fee: i.transferFee,
  fine_amount: i.fineAmount,
  total_amount: i.totalAmount,
  generated_date: i.generatedDate,
  due_date: i.dueDate,
  status: i.status,
  payment_method: i.paymentMethod,
  payment_date: i.paymentDate,
  transaction_details: i.transactionDetails || null
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapPaymentFromDB = (db: any): Payment => ({
  id: db.id,
  date: db.date,
  invoiceId: db.invoice_id,
  tenantName: db.tenant_name,
  shadeId: db.shade_id,
  amount: db.amount,
  method: db.method,
  reference: db.reference
});

const mapPaymentToDB = (p: Payment) => ({
  id: p.id,
  date: p.date,
  invoice_id: p.invoiceId,
  tenant_name: p.tenantName,
  shade_id: p.shadeId,
  amount: p.amount,
  method: p.method,
  reference: p.reference || null
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapFineFromDB = (db: any): FineRecord => ({
  id: db.id,
  shadeId: db.shade_id,
  invoiceId: db.invoice_id,
  ownerName: db.owner_name,
  amount: db.amount,
  reason: db.reason,
  date: db.date,
  status: db.status
});

const mapFineToDB = (f: FineRecord) => ({
  id: f.id,
  shade_id: f.shadeId,
  invoice_id: f.invoiceId,
  owner_name: f.ownerName,
  amount: f.amount,
  reason: f.reason,
  date: f.date,
  status: f.status
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapMessageFromDB = (db: any): WhatsAppMessage => ({
  id: db.id,
  phone: db.phone,
  timestamp: db.timestamp,
  messageType: db.message_type,
  content: db.content,
  sent: db.sent,
  invoiceId: db.invoice_id
});

const mapMessageToDB = (m: WhatsAppMessage) => ({
  id: m.id,
  phone: m.phone,
  timestamp: m.timestamp,
  message_type: m.messageType,
  content: m.content,
  sent: m.sent,
  invoice_id: m.invoiceId
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapSettingsFromDB = (db: any): SystemSettings => ({
  defaultMaintenance: db.default_maintenance,
  waterRate: db.water_rate,
  transferFee: db.transfer_fee,
  gracePeriodDays: db.grace_period_days,
  finePerDay: db.fine_per_day,
  upiId: db.upi_id,
  qrImageUrl: db.qr_image_url,
  societyName: db.society_name,
  societyAddress: db.society_address,
  societyPhone: db.society_phone,
  societyBankDetails: db.society_bank_details,
  invoiceTitle: db.invoice_title || '',
  invoicePrefix: db.invoice_prefix || 'INV-',
  invoiceNotes: db.invoice_notes || '',
  reminderDays: db.reminder_days || [3, 1]
});

const mapSettingsToDB = (s: SystemSettings) => ({
  id: 1,
  default_maintenance: s.defaultMaintenance,
  water_rate: s.waterRate,
  transfer_fee: s.transferFee,
  grace_period_days: s.gracePeriodDays,
  fine_per_day: s.finePerDay,
  upi_id: s.upiId,
  qr_image_url: s.qrImageUrl,
  society_name: s.societyName,
  society_address: s.societyAddress,
  society_phone: s.societyPhone,
  society_bank_details: s.societyBankDetails,
  invoice_title: s.invoiceTitle,
  invoice_prefix: s.invoicePrefix,
  invoice_notes: s.invoiceNotes,
  reminder_days: s.reminderDays || [3, 1]
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRequestFromDB = (db: any): ChangeRequest => ({
  id: db.id,
  requesterRole: db.requester_role,
  requesterName: db.requester_name,
  type: db.type,
  targetId: db.target_id,
  details: db.details,
  data: db.data,
  status: db.status,
  date: db.date
});

const mapRequestToDB = (r: ChangeRequest) => ({
  id: r.id,
  requester_role: r.requesterRole,
  requester_name: r.requesterName,
  type: r.type,
  target_id: r.targetId || null,
  details: r.details,
  data: r.data,
  status: r.status,
  date: r.date
});


// Initial Mock Data (aligned with screenshots)
const INITIAL_SETTINGS: SystemSettings = {
  defaultMaintenance: 0,
  waterRate: 0,
  transferFee: 0,
  gracePeriodDays: 0,
  finePerDay: 0,
  upiId: '',
  qrImageUrl: '',
  societyName: '',
  societyAddress: '',
  societyPhone: '',
  societyBankDetails: '',
  invoiceTitle: '',
  invoicePrefix: '',
  invoiceNotes: '',
  reminderDays: [3, 1]
};

const INITIAL_OWNERS: Owner[] = [
  { id: 'OWN-001', name: 'Ramesh Patel', phone: '9876543210', email: 'ramesh.patel@gmail.com', address: '12, Sardar Nagar, Ahmedabad', type: 'owner', status: 'active', companyName: 'Patel Metals Pvt. Ltd.' },
  { id: 'OWN-002', name: 'Sunita Sharma', phone: '9823456701', email: 'sunita.sharma@yahoo.com', address: '45, MG Road, Surat', type: 'owner', status: 'active', companyName: 'Sharma Industries' },
  { id: 'OWN-003', name: 'Amit Desai', phone: '9712345678', email: 'amit.desai@desaigroup.com', address: '7, Patel Colony, Vadodara', type: 'owner', status: 'active', companyName: 'Desai Enterprises' },
  { id: 'OWN-004', name: 'Priya Mehta', phone: '9845671230', email: 'priya.mehta@gmail.com', address: '23, Ring Road, Rajkot', type: 'owner', status: 'active', companyName: 'Mehta Plastics' },
  { id: 'OWN-005', name: 'Vijay Shah', phone: '9934567812', email: 'vijay.shah@shahcorp.in', address: '89, Industrial Area, Anand', type: 'owner', status: 'active', companyName: 'Shah Corp' },
  { id: 'OWN-006', name: 'Kavita Joshi', phone: '9765432198', email: 'kavita.joshi@outlook.com', address: '3, Nehru Street, Bhavnagar', type: 'owner', status: 'active', companyName: 'Joshi Textiles' },
  { id: 'OWN-007', name: 'Harish Modi', phone: '9654321876', email: 'harish.modi@modifab.com', address: '67, Station Road, Morbi', type: 'owner', status: 'active', companyName: 'Modi Fabrications' },
  { id: 'OWN-008', name: 'Deepak Rao', phone: '9543218765', email: 'deepak.rao@raoworks.in', address: '14, Laxmi Nagar, Pune', type: 'owner', status: 'active', companyName: 'Rao Engineering Works' },
  { id: 'OWN-009', name: 'Nalini Gupta', phone: '9432187654', email: 'nalini.gupta@gmail.com', address: '55, Shiv Colony, Nashik', type: 'owner', status: 'active', companyName: 'Gupta Polymers' },
  { id: 'OWN-010', name: 'Suresh Kulkarni', phone: '9321876543', email: 'suresh.kulkarni@ktech.com', address: '101, MIDC Phase 2, Aurangabad', type: 'owner', status: 'active', companyName: 'Kulkarni Technologies' },
  { id: 'OWN-011', name: 'Rekha Agarwal', phone: '9210765432', email: 'rekha.agarwal@agarwalfab.com', address: '9, Sector 15, Gandhinagar', type: 'owner', status: 'active', companyName: 'Agarwal Fabricators' },
  { id: 'OWN-012', name: 'Manish Trivedi', phone: '9109654321', email: 'manish.trivedi@trivedico.in', address: '27, Panchvati, Ahmedabad', type: 'owner', status: 'active', companyName: 'Trivedi & Co.' },
  { id: 'OWN-013', name: 'Sanjay Verma', phone: '9098543210', email: 'sanjay.verma@vermanet.com', address: '38, Civil Lines, Jaipur', type: 'owner', status: 'inactive', companyName: 'Verma Networks' },
  { id: 'OWN-014', name: 'Geeta Nair', phone: '8987432109', email: 'geeta.nair@gmail.com', address: '12, Vyttila, Kochi', type: 'owner', status: 'active', companyName: 'Nair Auto Parts' },
  { id: 'OWN-015', name: 'Prakash Bhat', phone: '8876321098', email: 'prakash.bhat@bhatmfg.in', address: '6, Industrial Zone, Hubli', type: 'owner', status: 'active', companyName: 'Bhat Manufacturing' },
  { id: 'REN-001', name: 'Kishore Pandya', phone: '8765210987', email: 'kishore.pandya@gmail.com', address: '4, Navrangpura, Ahmedabad', type: 'renter', status: 'active', companyName: 'Pandya Traders' },
  { id: 'REN-002', name: 'Meena Pillai', phone: '8654109876', email: 'meena.pillai@pillaistore.com', address: '77, Anna Salai, Chennai', type: 'renter', status: 'active', companyName: 'Pillai General Store' },
  { id: 'REN-003', name: 'Arjun Singhania', phone: '8543098765', email: 'arjun.singhania@outlook.com', address: '20, Linking Road, Mumbai', type: 'renter', status: 'active', companyName: 'Singhania Exports' },
  { id: 'REN-004', name: 'Pooja Reddy', phone: '8432087654', email: 'pooja.reddy@reddysupplies.in', address: '5, Banjara Hills, Hyderabad', type: 'renter', status: 'active', companyName: 'Reddy Supplies' },
  { id: 'REN-005', name: 'Ravi Iyer', phone: '8321076543', email: 'ravi.iyer@gmail.com', address: '33, T. Nagar, Chennai', type: 'renter', status: 'active', companyName: 'Iyer Electronics' },
  { id: 'REN-006', name: 'Anita Banerjee', phone: '8210065432', email: 'anita.banerjee@banerindustries.com', address: '18, Salt Lake, Kolkata', type: 'renter', status: 'active', companyName: 'Banerjee Industries' },
  { id: 'REN-007', name: 'Sunil Chavan', phone: '8109054321', email: 'sunil.chavan@gmail.com', address: '62, Shivajinagar, Pune', type: 'renter', status: 'active', companyName: 'Chavan Motors' },
  { id: 'REN-008', name: 'Lalita Mishra', phone: '7998043210', email: 'lalita.mishra@mishrapack.in', address: '9, Civil Lines, Allahabad', type: 'renter', status: 'inactive', companyName: 'Mishra Packaging' },
  { id: 'REN-009', name: 'Dinesh Soni', phone: '7887032109', email: 'dinesh.soni@sonijewels.com', address: '7, Zaveri Bazar, Surat', type: 'renter', status: 'active', companyName: 'Soni Jewels' },
  { id: 'REN-010', name: 'Bhavna Contractor', phone: '7776021098', email: 'bhavna.c@contractorwholesale.in', address: '51, Manek Chowk, Ahmedabad', type: 'renter', status: 'active', companyName: 'Contractor Wholesale' },
];

const INITIAL_SHADES: Shade[] = [
  { id: 'SH-001', block: 'Block A', floor: 'Ground Floor', sqFt: 1200, status: 'occupied', ownerId: 'OWN-001', renterId: 'REN-001', fixedMaintenance: 1400, lastWaterReading: 1250, currentWaterReading: 1250, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-002', block: 'Block A', floor: 'Ground Floor', sqFt: 1500, status: 'occupied', ownerId: 'OWN-002', renterId: null, fixedMaintenance: 1400, lastWaterReading: 980, currentWaterReading: 980, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-003', block: 'Block A', floor: 'Ground Floor', sqFt: 1800, status: 'occupied', ownerId: 'OWN-003', renterId: 'REN-002', fixedMaintenance: 1400, lastWaterReading: 2100, currentWaterReading: 2100, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-004', block: 'Block A', floor: 'Ground Floor', sqFt: 1200, status: 'vacant', ownerId: 'OWN-004', renterId: null, fixedMaintenance: 1400, lastWaterReading: 450, currentWaterReading: 450, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-005', block: 'Block A', floor: 'First Floor', sqFt: 1000, status: 'occupied', ownerId: 'OWN-005', renterId: 'REN-003', fixedMaintenance: 1400, lastWaterReading: 760, currentWaterReading: 760, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-006', block: 'Block A', floor: 'First Floor', sqFt: 1400, status: 'occupied', ownerId: 'OWN-006', renterId: null, fixedMaintenance: 1400, lastWaterReading: 1340, currentWaterReading: 1340, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-007', block: 'Block A', floor: 'First Floor', sqFt: 900, status: 'maintenance', ownerId: 'OWN-007', renterId: null, fixedMaintenance: 1400, lastWaterReading: 620, currentWaterReading: 620, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: true },
  { id: 'SH-008', block: 'Block B', floor: 'Ground Floor', sqFt: 2000, status: 'occupied', ownerId: 'OWN-008', renterId: 'REN-004', fixedMaintenance: 1400, lastWaterReading: 3200, currentWaterReading: 3200, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-009', block: 'Block B', floor: 'Ground Floor', sqFt: 1600, status: 'occupied', ownerId: 'OWN-009', renterId: null, fixedMaintenance: 1400, lastWaterReading: 1870, currentWaterReading: 1870, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-010', block: 'Block B', floor: 'Ground Floor', sqFt: 1200, status: 'occupied', ownerId: 'OWN-010', renterId: 'REN-005', fixedMaintenance: 1400, lastWaterReading: 940, currentWaterReading: 940, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-011', block: 'Block B', floor: 'Ground Floor', sqFt: 1800, status: 'vacant', ownerId: 'OWN-011', renterId: null, fixedMaintenance: 1400, lastWaterReading: 310, currentWaterReading: 310, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-012', block: 'Block B', floor: 'First Floor', sqFt: 1100, status: 'occupied', ownerId: 'OWN-012', renterId: 'REN-006', fixedMaintenance: 1400, lastWaterReading: 1560, currentWaterReading: 1560, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-013', block: 'Block B', floor: 'First Floor', sqFt: 1300, status: 'occupied', ownerId: 'OWN-013', renterId: null, fixedMaintenance: 1400, lastWaterReading: 820, currentWaterReading: 820, transferFeeTriggered: false, hasWaterSupply: false, penaltyDisabled: false },
  { id: 'SH-014', block: 'Block B', floor: 'First Floor', sqFt: 1700, status: 'occupied', ownerId: 'OWN-014', renterId: 'REN-007', fixedMaintenance: 1400, lastWaterReading: 2450, currentWaterReading: 2450, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-015', block: 'Block B', floor: 'First Floor', sqFt: 950, status: 'maintenance', ownerId: 'OWN-015', renterId: null, fixedMaintenance: 1400, lastWaterReading: 490, currentWaterReading: 490, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: true },
  { id: 'SH-016', block: 'Block C', floor: 'Ground Floor', sqFt: 2200, status: 'occupied', ownerId: 'OWN-001', renterId: 'REN-008', fixedMaintenance: 1400, lastWaterReading: 4100, currentWaterReading: 4100, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-017', block: 'Block C', floor: 'Ground Floor', sqFt: 1500, status: 'occupied', ownerId: 'OWN-002', renterId: null, fixedMaintenance: 1400, lastWaterReading: 1680, currentWaterReading: 1680, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-018', block: 'Block C', floor: 'Ground Floor', sqFt: 1100, status: 'occupied', ownerId: 'OWN-003', renterId: 'REN-009', fixedMaintenance: 1400, lastWaterReading: 730, currentWaterReading: 730, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-019', block: 'Block C', floor: 'Ground Floor', sqFt: 1900, status: 'vacant', ownerId: 'OWN-004', renterId: null, fixedMaintenance: 1400, lastWaterReading: 220, currentWaterReading: 220, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-020', block: 'Block C', floor: 'First Floor', sqFt: 1350, status: 'occupied', ownerId: 'OWN-005', renterId: 'REN-010', fixedMaintenance: 1400, lastWaterReading: 1150, currentWaterReading: 1150, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-021', block: 'Block C', floor: 'First Floor', sqFt: 1250, status: 'occupied', ownerId: 'OWN-006', renterId: null, fixedMaintenance: 1400, lastWaterReading: 890, currentWaterReading: 890, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-022', block: 'Block C', floor: 'First Floor', sqFt: 1600, status: 'occupied', ownerId: 'OWN-007', renterId: null, fixedMaintenance: 1400, lastWaterReading: 2020, currentWaterReading: 2020, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-023', block: 'Block D', floor: 'Ground Floor', sqFt: 1800, status: 'occupied', ownerId: 'OWN-008', renterId: null, fixedMaintenance: 1400, lastWaterReading: 2780, currentWaterReading: 2780, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-024', block: 'Block D', floor: 'Ground Floor', sqFt: 1400, status: 'vacant', ownerId: 'OWN-009', renterId: null, fixedMaintenance: 1400, lastWaterReading: 570, currentWaterReading: 570, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
  { id: 'SH-025', block: 'Block D', floor: 'Ground Floor', sqFt: 2100, status: 'occupied', ownerId: 'OWN-010', renterId: null, fixedMaintenance: 1400, lastWaterReading: 3650, currentWaterReading: 3650, transferFeeTriggered: false, hasWaterSupply: true, penaltyDisabled: false },
];
const INITIAL_INVOICES: Invoice[] = [];
const INITIAL_PAYMENTS: Payment[] = [];
const INITIAL_MESSAGES: WhatsAppMessage[] = [];

const ADMINS: AdminRole[] = [
  { id: 'ADM-1', name: 'jatin', role: 'Admin', email: 'amit@fortuneindustrialpark.com', avatar: 'AS' },
  { id: 'ADM-2', name: 'saral', role: 'Treasurer', email: 'rajesh@fortuneindustrialpark.com', avatar: 'RP' },
  { id: 'ADM-3', name: 'example', role: 'Secretary', email: 'vikram@fortuneindustrialpark.com', avatar: 'VS' }
];

// Toast Item with progress bar and close button
const ToastItem: React.FC<{
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
  onClose: () => void;
}> = ({ type, text, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Timer runs for 3 seconds total. Decrease 1% every 30ms.
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onClose]);

  return (
    <div className={`toast ${type}`} style={{ position: 'relative', overflow: 'hidden', paddingBottom: '16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        {type === 'success' && <CheckCircle size={16} style={{ flexShrink: 0 }} />}
        {type === 'info' && <AlertCircle size={16} style={{ flexShrink: 0 }} />}
        {type === 'error' && <AlertCircle size={16} style={{ flexShrink: 0 }} />}
        <span style={{ flexGrow: 1, fontSize: '13px', paddingRight: '12px' }}>{text}</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: '1',
            padding: '2px 6px',
            opacity: 0.7,
            borderRadius: '4px',
            marginLeft: 'auto',
            fontWeight: '700'
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>
      {/* Visual Timer Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          backgroundColor: type === 'success' ? '#10b981' : type === 'info' ? '#3b82f6' : '#ef4444',
          width: `${progress}%`,
          transition: 'width 30ms linear'
        }}
      />
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [shades, setShades] = useState<Shade[]>(INITIAL_SHADES);
  const [owners, setOwners] = useState<Owner[]>(INITIAL_OWNERS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>(INITIAL_MESSAGES);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedSimShadeId, setSelectedSimShadeId] = useState('');

  // Direct Billing from Shade link state
  const [preselectedShadeId, setPreselectedShadeId] = useState<string | null>(null);

  // Simulation Date state
  const [currentDate, setCurrentDate] = useState<string>('2026-05-16');

  // Transfer Trigger Shade Link
  const [transferShadeId, setTransferShadeId] = useState<string | null>(null);

  // Co-Admin role switcher
  const [currentAdmin, setCurrentAdmin] = useState<AdminRole>(ADMINS[0]);

  // Admin Requests state
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Supabase Loading state & useEffect load data
  const [isLoading, setIsLoading] = useState(true);

  // Alert/Toast states
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'info' | 'error'; text: string }[]>([]);

  const addToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, type, text }]);
  };

  const addAuditLog = (
    action: AuditLog['action'],
    entity: string,
    details?: string
  ) => {
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      entity,
      performedBy: currentAdmin.name,
      role: currentAdmin.role,
      timestamp: new Date().toISOString(),
      details
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // Check if settings table is populated
        const { data: dbSettings, error: errSettings } = await supabase
          .from('system_settings')
          .select('*');

        if (errSettings) throw errSettings;

        if (!dbSettings || dbSettings.length === 0) {
          // DATABASE IS EMPTY, LET'S SEED IT!
          addToast('Empty database detected. Initializing with mock data...', 'info');

          // Seed system settings (fallback without new columns if they don't exist yet)
          {
            const { error: settErr } = await supabase.from('system_settings').insert([mapSettingsToDB(INITIAL_SETTINGS)]);
            if (settErr) {
              const { id: _id, invoice_title: _it, invoice_prefix: _ip, invoice_notes: _in, reminder_days: _rd, ...baseSettings } = mapSettingsToDB(INITIAL_SETTINGS);
              await supabase.from('system_settings').insert([{ id: 1, ...baseSettings }]);
            }
          }

          // Seed owners (fallback without address if column doesn't exist yet)
          {
            const { error: ownerErr } = await supabase.from('owners').insert(INITIAL_OWNERS.map(mapOwnerToDB));
            if (ownerErr) {
              await supabase.from('owners').insert(INITIAL_OWNERS.map(o => { const { address: _a, ...base } = mapOwnerToDB(o); return base; }));
            }
          }

          // Seed shades (fallback without penalty_disabled if column doesn't exist yet)
          {
            const { error: shadeErr } = await supabase.from('shades').insert(INITIAL_SHADES.map(mapShadeToDB));
            if (shadeErr) {
              await supabase.from('shades').insert(INITIAL_SHADES.map(s => { const { penalty_disabled: _pd, ...base } = mapShadeToDB(s); return base; }));
            }
          }

          // Seed invoices
          await supabase.from('invoices').insert(INITIAL_INVOICES.map(mapInvoiceToDB));

          // Seed payments
          await supabase.from('payments').insert(INITIAL_PAYMENTS.map(mapPaymentToDB));

          // Seed messages
          await supabase.from('whatsapp_messages').insert(INITIAL_MESSAGES.map(mapMessageToDB));

          // Refresh states
          setSettings(INITIAL_SETTINGS);
          setOwners(INITIAL_OWNERS);
          setShades(INITIAL_SHADES);
          setInvoices(INITIAL_INVOICES);
          setPayments(INITIAL_PAYMENTS);
          setMessages(INITIAL_MESSAGES);
          setFines([]);
          setChangeRequests([]);
        } else {
          // Fetch everything from Supabase with auto-migration for legacy entries
          let loadedSettings = mapSettingsFromDB(dbSettings[0]);
          if (loadedSettings.societyName.includes('Shade') || loadedSettings.societyName.includes('Society') || loadedSettings.societyName.includes('Ledger')) {
            loadedSettings = {
              ...loadedSettings,
              societyName: 'Fortune Industrial Park',
              societyAddress: '',
              upiId: '',
              qrImageUrl: ''
            };
            try {
              await supabase.from('system_settings').update(mapSettingsToDB(loadedSettings)).eq('id', 1);
            } catch (err) {
              console.warn('Update failed, probably missing columns. Using localStorage fallback.', err);
            }
          }
          // Merge custom settings from localStorage if present
          const localSettingsJson = localStorage.getItem('fortune_park_settings');
          if (localSettingsJson) {
            try {
              const localSettings = JSON.parse(localSettingsJson);
              loadedSettings = {
                ...loadedSettings,
                invoiceTitle: localSettings.invoiceTitle || loadedSettings.invoiceTitle,
                invoicePrefix: localSettings.invoicePrefix || loadedSettings.invoicePrefix,
                invoiceNotes: localSettings.invoiceNotes || loadedSettings.invoiceNotes
              };
            } catch (e) {
              console.error('Error parsing localStorage settings:', e);
            }
          }
          setSettings(loadedSettings);

          const { data: dbOwners } = await supabase.from('owners').select('*');
          if (dbOwners) setOwners(dbOwners.map(mapOwnerFromDB));

          const { data: dbShades } = await supabase.from('shades').select('*');
          if (dbShades) {
            let mappedShades = dbShades.map(mapShadeFromDB);
            let needsShadeWaterUpdate = false;
            const updatedMappedShades = mappedShades.map(s => {
              if (s.hasWaterSupply === false) {
                needsShadeWaterUpdate = true;
                return { ...s, hasWaterSupply: true };
              }
              return s;
            });
            if (needsShadeWaterUpdate) {
              await supabase.from('shades').update({ has_water_supply: true }).neq('id', 'dummy');
              mappedShades = updatedMappedShades;
            }
            setShades(mappedShades);
          }

          const { data: dbInvoices } = await supabase.from('invoices').select('*');
          if (dbInvoices) setInvoices(dbInvoices.map(mapInvoiceFromDB));

          const { data: dbPayments } = await supabase.from('payments').select('*');
          if (dbPayments) setPayments(dbPayments.map(mapPaymentFromDB));

          const { data: dbFines } = await supabase.from('fines').select('*');
          if (dbFines) setFines(dbFines.map(mapFineFromDB));

          const { data: dbMessages } = await supabase.from('whatsapp_messages').select('*');
          if (dbMessages) setMessages(dbMessages.map(mapMessageFromDB));

          const { data: dbRequests } = await supabase.from('change_requests').select('*');
          if (dbRequests) setChangeRequests(dbRequests.map(mapRequestFromDB));
        }
      } catch (err) {
        console.error('Error loading Supabase data:', err);
        addToast(`Error loading data from Supabase: ${err instanceof Error ? err.message : String(err)}`, 'error');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCreateChangeRequest = async (
    type: 'edit_shade' | 'update_settings' | 'reset_db',
    details: string,
    data: unknown
  ) => {
    const newReq: ChangeRequest = {
      id: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      requesterRole: currentAdmin.role,
      requesterName: currentAdmin.name,
      type,
      details,
      data: JSON.stringify(data),
      status: 'pending',
      date: currentDate
    };

    try {
      const { error } = await supabase.from('change_requests').insert([mapRequestToDB(newReq)]);
      if (error) throw error;

      setChangeRequests(prev => [newReq, ...prev]);
      addToast(`Change request submitted to Admin for approval.`, 'info');
    } catch (err) {
      addToast(`Error submitting request: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleResolveRequest = async (id: string, status: 'approved' | 'rejected') => {
    const req = changeRequests.find(r => r.id === id);
    if (!req) return;
    const updatedReq = { ...req, status };

    try {
      const { error: reqErr } = await supabase
        .from('change_requests')
        .update(mapRequestToDB(updatedReq))
        .eq('id', id);
      if (reqErr) throw reqErr;

      setChangeRequests(prev => prev.map(r => r.id === id ? updatedReq : r));

      if (status === 'approved') {
        const payload = JSON.parse(req.data);
        if (req.type === 'edit_shade') {
          const { error: shadeErr } = await supabase
            .from('shades')
            .update(mapShadeToDB(payload))
            .eq('id', payload.id);
          if (shadeErr) throw shadeErr;

          setShades(prevShades => prevShades.map(s => s.id === payload.id ? payload : s));
          addToast(`Registry edit for Shade ${payload.id} approved and applied!`, 'success');
        } else if (req.type === 'update_settings') {
          const { error: settingsErr } = await supabase
            .from('system_settings')
            .update(mapSettingsToDB(payload))
            .eq('id', 1);
          if (settingsErr) throw settingsErr;

          setSettings(payload);
          addToast(`System configurations approved and updated!`, 'success');
        } else if (req.type === 'reset_db') {
          await handleResetDatabase();
          addToast(`Simulation database reset approved and executed!`, 'success');
        }
      } else {
        addToast(`Change request was rejected.`, 'info');
      }
    } catch (err) {
      addToast(`Error resolving request: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Run dynamic fine logic when time advances or app loads
  useEffect(() => {
    let invoicesUpdated = false;
    const updatedInvoices = invoices.map(inv => {
      if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'draft') {
        return inv;
      }

      // Calculate days elapsed between currentDate and due date
      const due = new Date(inv.dueDate);
      const curr = new Date(currentDate);
      const diffTime = curr.getTime() - due.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      // Overdue applies after the grace period of 5 days
      if (diffDays > settings.gracePeriodDays) {
        const activeFineDays = diffDays - settings.gracePeriodDays;
        const newFineAmount = activeFineDays * settings.finePerDay;

        if (inv.fineAmount !== newFineAmount) {
          invoicesUpdated = true;
          const originalBase = inv.maintenanceFee + inv.waterUsageCharge + inv.otherMaintenanceCharge + inv.transferFee;

          // Generate automated WhatsApp notifications
          const messageId = `MSG-AUTO-${inv.id}-${activeFineDays}`;
          const messageExists = messages.some(m => m.id === messageId);
          if (!messageExists) {
            const timeStr = new Date(currentDate).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions);

            const textContent = `⚠️ OVERDUE PENALTY ALERT ⚠️\n\nDear member,\n\nInvoice ${inv.id} for Shade ${inv.shadeId} is now ${diffDays} days past its due date.\n\n• Base Maintenance & Charges: ${formatCurrency(originalBase)}\n• Fine Accrued: ${formatCurrency(newFineAmount)} (₹100/day)\n• Total Outstanding: ${formatCurrency(originalBase + newFineAmount)}\n\nPlease clear your ledger immediately.`;

            const newMsgs: WhatsAppMessage[] = [
              {
                id: `${messageId}-renter`,
                phone: inv.renterPhone || inv.ownerPhone,
                timestamp: `${currentDate} ${timeStr}`,
                messageType: 'overdue_fine',
                content: textContent,
                sent: true,
                invoiceId: inv.id
              }
            ];

            if (inv.renterId && inv.ownerPhone !== inv.renterPhone) {
              newMsgs.push({
                id: `${messageId}-owner`,
                phone: inv.ownerPhone,
                timestamp: `${currentDate} ${timeStr}`,
                messageType: 'overdue_fine',
                content: textContent,
                sent: true,
                invoiceId: inv.id
              });
            }

            supabase.from('whatsapp_messages').insert(newMsgs.map(mapMessageToDB)).then(({ error }) => {
              if (!error) {
                setMessages(prev => [...prev, ...newMsgs]);
              }
            });
          }

          return {
            ...inv,
            status: 'overdue' as const,
            fineAmount: newFineAmount,
            totalAmount: originalBase + newFineAmount
          };
        }
      }
      return inv;
    });

    if (invoicesUpdated) {
      const changedInvoices = updatedInvoices.filter((inv, idx) => inv !== invoices[idx]);
      Promise.all(changedInvoices.map(inv =>
        supabase.from('invoices').update(mapInvoiceToDB(inv)).eq('id', inv.id)
      )).then(() => {
        setInvoices(updatedInvoices);
        addToast('Late fees processed. Fines updated in database.', 'info');
      }).catch(err => {
        console.error('Error syncing overdue invoices:', err);
      });
    }
  }, [currentDate, invoices, settings, messages]);

  // 2. Generate Invoices - Individual
  const handleGenerateSingleInvoice = async (
    shadeId: string,
    dueDateStr: string,
    newWater: number,
    otherName: string,
    otherCharge: number,
    months: number
  ) => {
    const shade = shades.find(s => s.id === shadeId);
    if (!shade || shade.status !== 'occupied' || !shade.ownerId) {
      addToast('Cannot bill shade. Must be occupied.', 'error');
      return;
    }

    const owner = owners.find(o => o.id === shade.ownerId);
    const renter = shade.renterId ? owners.find(o => o.id === shade.renterId) : null;
    if (!owner) return;

    const oldWater = shade.hasWaterSupply !== false ? shade.lastWaterReading : 0;
    const resolvedNewWater = shade.hasWaterSupply !== false ? newWater : 0;
    const waterUnits = shade.hasWaterSupply !== false ? (resolvedNewWater - oldWater) : 0;
    const waterCost = waterUnits > 0 ? waterUnits * settings.waterRate : 0;

    // Maintenance calculated based on months multiplier (700 base is for 2 months, so 350 per month)
    const baseMaintenance = Math.round((shade.fixedMaintenance / 2) * months);
    const tFee = shade.transferFeeTriggered ? settings.transferFee : 0;

    // Subtotal excluding GST
    const totalVal = baseMaintenance + waterCost + otherCharge + tFee;

    const prefix = settings.invoicePrefix || 'INV-';
    const invoiceId = `${prefix}2026-0${invoices.length + 1}`;

    const newInv: Invoice = {
      id: invoiceId,
      shadeId: shade.id,
      ownerId: owner.id,
      ownerName: owner.name,
      ownerPhone: owner.phone,
      renterId: renter ? renter.id : null,
      renterName: renter ? renter.name : null,
      renterPhone: renter ? renter.phone : null,
      maintenanceFee: baseMaintenance,
      billingMonths: months,
      oldWaterReading: oldWater,
      newWaterReading: resolvedNewWater,
      waterUsageCharge: waterCost,
      otherMaintenanceName: otherName || '',
      otherMaintenanceCharge: otherCharge,
      transferFee: tFee,
      fineAmount: 0,
      totalAmount: totalVal,
      generatedDate: currentDate,
      dueDate: dueDateStr,
      status: 'draft',
      paymentMethod: null,
      paymentDate: null
    };

    try {
      const { error: invErr } = await supabase.from('invoices').insert([mapInvoiceToDB(newInv)]);
      if (invErr) throw invErr;

      // Update shade readings
      const updatedShade = {
        ...shade,
        lastWaterReading: shade.hasWaterSupply !== false ? resolvedNewWater : 0,
        currentWaterReading: shade.hasWaterSupply !== false ? resolvedNewWater : 0,
        transferFeeTriggered: false
      };

      const { error: shadeErr } = await supabase
        .from('shades')
        .update(mapShadeToDB(updatedShade))
        .eq('id', shadeId);
      if (shadeErr) throw shadeErr;

      setInvoices(prev => [...prev, newInv]);
      setShades(prev => prev.map(s => s.id === shadeId ? updatedShade : s));

      addAuditLog('invoice_created', `Invoice ${invoiceId}`, `Shade ${shadeId} | Amount ₹${totalVal}`);
      addToast(`Generated Invoice ${invoiceId} for Shade ${shadeId}.`, 'success');
    } catch (err) {
      addToast(`Error generating invoice: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 4. Dispatch Invoice via WhatsApp Simulation (Dual Delivery)
  const handleSendWhatsApp = async (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const updatedInv = { ...inv, status: 'sent' as const };

    try {
      const { error: invErr } = await supabase
        .from('invoices')
        .update(mapInvoiceToDB(updatedInv))
        .eq('id', invoiceId);
      if (invErr) throw invErr;

      setInvoices(prev => prev.map(i => i.id === invoiceId ? updatedInv : i));

      const timeStr = new Date(currentDate).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions);
      const combMaint = inv.maintenanceFee + inv.waterUsageCharge + inv.otherMaintenanceCharge + inv.transferFee;
      const content = `Dear member,\n\nYour Shade ${inv.shadeId} maintenance invoice ${inv.id} has been generated.\n\n• Maintenance + Water: ${formatCurrency(combMaint)}\n• Total Due: ${formatCurrency(inv.totalAmount)}\n• Due Date: ${inv.dueDate}\n\nPlease scan the QR code to clear payments. [UPI QR Code]`;

      const renterMsg: WhatsAppMessage = {
        id: `MSG-REN-${Date.now()}`,
        phone: inv.renterPhone || inv.ownerPhone,
        timestamp: `${currentDate} ${timeStr}`,
        messageType: 'invoice_sent',
        content: content.replace('Dear member', `Dear ${inv.renterName || inv.ownerName}`),
        sent: true,
        invoiceId
      };

      const newMsgs = [renterMsg];

      if (inv.renterId && inv.ownerPhone !== inv.renterPhone) {
        const ownerMsg: WhatsAppMessage = {
          id: `MSG-OWN-${Date.now()}`,
          phone: inv.ownerPhone,
          timestamp: `${currentDate} ${timeStr}`,
          messageType: 'invoice_sent',
          content: content.replace('Dear member', `Dear Owner ${inv.ownerName}`),
          sent: true,
          invoiceId
        };
        newMsgs.push(ownerMsg);
      }

      const { error: msgErr } = await supabase.from('whatsapp_messages').insert(newMsgs.map(mapMessageToDB));
      if (msgErr) throw msgErr;

      setMessages(prev => [...prev, ...newMsgs]);
      addToast(`Invoice WhatsApp dispatched to ${inv.renterName ? 'both Tenant & Owner' : 'Owner'}.`, 'success');
    } catch (err) {
      addToast(`Error dispatching WhatsApp invoice: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleUpdateInvoiceStatus = async (
    invoiceId: string,
    status: Invoice['status'],
    paymentMethod?: Invoice['paymentMethod'],
    details?: string
  ) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const updatedInv = {
      ...inv,
      status,
      paymentMethod: paymentMethod || null,
      paymentDate: status === 'paid' ? currentDate : null,
      transactionDetails: details || ''
    };

    try {
      const { error: invErr } = await supabase
        .from('invoices')
        .update(mapInvoiceToDB(updatedInv))
        .eq('id', invoiceId);
      if (invErr) throw invErr;

      setInvoices(prev => prev.map(i => i.id === invoiceId ? updatedInv : i));

      // If paid, create a payment log transaction
      if (status === 'paid') {
        const pId = `PAY-${Date.now()}`;
        const newPayRecord: Payment = {
          id: pId,
          date: currentDate,
          invoiceId: invoiceId,
          tenantName: updatedInv.renterName || updatedInv.ownerName,
          shadeId: updatedInv.shadeId,
          amount: updatedInv.totalAmount,
          method: paymentMethod === 'online' ? 'UPI' : paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'cheque' ? 'Cheque' : 'Bank Transfer',
          reference: details || 'Office Collection'
        };

        const { error: payErr } = await supabase.from('payments').insert([mapPaymentToDB(newPayRecord)]);
        if (payErr) throw payErr;
        setPayments(prev => [newPayRecord, ...prev]);

        // WhatsApp payment receipt
        const timeStr = new Date(currentDate).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions);
        const confMsg: WhatsAppMessage = {
          id: `MSG-PAID-${Date.now()}`,
          phone: updatedInv.renterPhone || updatedInv.ownerPhone,
          timestamp: `${currentDate} ${timeStr}`,
          messageType: 'invoice_sent',
          content: `✅ PAYMENT RECEIVED ✅\n\nDear ${updatedInv.renterName || updatedInv.ownerName},\n\nThank you! We have received payment of ${formatCurrency(updatedInv.totalAmount)} for Invoice ${updatedInv.id} (Shade ${updatedInv.shadeId}).\n\n• Method: ${paymentMethod?.toUpperCase()}\n• Receipt Ref: ${details || 'Logged'}\n\nYour society ledger is currently clear.`,
          sent: true,
          invoiceId
        };

        const newMsgs = [confMsg];

        if (updatedInv.renterId && updatedInv.ownerPhone !== updatedInv.renterPhone) {
          const ownerConf: WhatsAppMessage = {
            id: `MSG-PAID-OWN-${Date.now()}`,
            phone: updatedInv.ownerPhone,
            timestamp: `${currentDate} ${timeStr}`,
            messageType: 'invoice_sent',
            content: `✅ PAYMENT RECEIVED NOTICE ✅\n\nDear Owner ${updatedInv.ownerName},\n\nPayment of ${formatCurrency(updatedInv.totalAmount)} has been cleared by tenant for Invoice ${updatedInv.id} (Shade ${updatedInv.shadeId}).\n\nLedger status: Paid.`,
            sent: true,
            invoiceId
          };
          newMsgs.push(ownerConf);
        }

        const { error: msgErr } = await supabase.from('whatsapp_messages').insert(newMsgs.map(mapMessageToDB));
        if (msgErr) throw msgErr;
        setMessages(prev => [...prev, ...newMsgs]);
      }

      addAuditLog(
        status === 'paid' ? 'payment_marked' : 'invoice_voided',
        `Invoice ${invoiceId}`,
        `Status → ${status}${paymentMethod ? ` via ${paymentMethod}` : ''}`
      );
      addToast(`Invoice ${invoiceId} marked as ${status}.`, 'success');
    } catch (err) {
      addToast(`Error updating invoice status: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 6. Delete/Cancel Invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    const cancelledInv = { ...inv, status: 'cancelled' as const };

    try {
      const { error } = await supabase
        .from('invoices')
        .update(mapInvoiceToDB(cancelledInv))
        .eq('id', invoiceId);
      if (error) throw error;

      setInvoices(prev => prev.map(i => i.id === invoiceId ? cancelledInv : i));
      addAuditLog('invoice_deleted', `Invoice ${invoiceId}`);
      addToast(`Invoice ${invoiceId} has been cancelled.`, 'info');
    } catch (err) {
      addToast(`Error cancelling invoice: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 7. Manual chat send simulator (unused in production)
  /*
  const handleSendMessage = async (phone: string, text: string) => {
    const timeStr = new Date(currentDate).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions);
    const newMsg: WhatsAppMessage = {
      id: `MSG-USER-${Date.now()}`,
      phone,
      timestamp: `${currentDate} ${timeStr}`,
      messageType: 'invoice_sent',
      content: text,
      sent: true,
      invoiceId: ''
    };

    try {
      const { error: sendErr } = await supabase.from('whatsapp_messages').insert([mapMessageToDB(newMsg)]);
      if (sendErr) throw sendErr;
      setMessages(prev => [...prev, newMsg]);

      setTimeout(async () => {
        const replyMsg: WhatsAppMessage = {
          id: `MSG-REPLY-${Date.now()}`,
          phone,
          timestamp: `${currentDate} ${timeStr}`,
          messageType: 'invoice_sent',
          content: `Hello, this is an automated response from Fortune Industrial Park Office. For payment queries or cheque deposits, please visit our registry office. Thank you.`,
          sent: false,
          invoiceId: ''
        };
        await supabase.from('whatsapp_messages').insert([mapMessageToDB(replyMsg)]);
        setMessages(prev => [...prev, replyMsg]);
      }, 1000);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };
  */

  const isColumnMissingError = (err: unknown) => {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code;
      return code === '42703' || code === 'PGRST204';
    }
    if (err && typeof err === 'object' && 'message' in err) {
      const msg = (err as { message: string }).message;
      return msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('column');
    }
    return false;
  };

  // Add / Update Shade (persisted, with column fallback)
  const handleAddShade = async (ns: Omit<Shade, 'currentWaterReading'>) => {
    const fullShade: Shade = { ...ns, currentWaterReading: ns.lastWaterReading };
    try {
      let { error } = await supabase.from('shades').insert([mapShadeToDB(fullShade)]);
      if (error && isColumnMissingError(error)) {
        // Retry without new optional columns
        const { penalty_disabled: _pd, ...basePayload } = mapShadeToDB(fullShade);
        const retry = await supabase.from('shades').insert([basePayload]);
        error = retry.error;
      }
      if (error) throw error;
      setShades(prev => [...prev, fullShade]);
      addAuditLog('shade_added', `Shade ${ns.id}`, `${ns.block} · ${ns.floor}`);
      addToast(`Shade ${ns.id} registered.`, 'success');
    } catch (err) {
      addToast(`Error saving shade: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleUpdateShade = async (us: Shade) => {
    try {
      let { error } = await supabase.from('shades').update(mapShadeToDB(us)).eq('id', us.id);
      if (error && isColumnMissingError(error)) {
        const { penalty_disabled: _pd, ...basePayload } = mapShadeToDB(us);
        const retry = await supabase.from('shades').update(basePayload).eq('id', us.id);
        error = retry.error;
      }
      if (error) throw error;
      setShades(prev => prev.map(s => s.id === us.id ? us : s));
      addAuditLog('shade_updated', `Shade ${us.id}`);
      addToast(`Shade ${us.id} updated.`, 'success');
    } catch (err) {
      addToast(`Error updating shade: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Add / Update Owner (persisted, with column fallback)
  const handleAddOwner = async (no: Owner) => {
    try {
      let { error } = await supabase.from('owners').insert([mapOwnerToDB(no)]);
      if (error && isColumnMissingError(error)) {
        const { address: _addr, ...basePayload } = mapOwnerToDB(no);
        const retry = await supabase.from('owners').insert([basePayload]);
        error = retry.error;
      }
      if (error) throw error;
      setOwners(prev => [...prev, no]);
      addAuditLog(no.type === 'renter' ? 'tenant_added' : 'owner_added', `${no.type === 'renter' ? 'Tenant' : 'Owner'} ${no.name}`);
      addToast(`Contact ${no.name} registered.`, 'success');
    } catch (err) {
      addToast(`Error saving contact: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleUpdateOwner = async (uo: Owner) => {
    try {
      let { error } = await supabase.from('owners').update(mapOwnerToDB(uo)).eq('id', uo.id);
      if (error && isColumnMissingError(error)) {
        const { address: _addr, ...basePayload } = mapOwnerToDB(uo);
        const retry = await supabase.from('owners').update(basePayload).eq('id', uo.id);
        error = retry.error;
      }
      if (error) throw error;
      setOwners(prev => prev.map(o => o.id === uo.id ? uo : o));
      addAuditLog(uo.type === 'renter' ? 'tenant_updated' : 'owner_updated', `${uo.type === 'renter' ? 'Tenant' : 'Owner'} ${uo.name}`);
      addToast(`Contact ${uo.name} details updated.`, 'success');
    } catch (err) {
      addToast(`Error updating contact: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 8. Owner Transfer Fee and update registry
  const handleTransferOwner = async (shadeId: string, newOwnerId: string, applyFee: boolean) => {
    const originalShade = shades.find(s => s.id === shadeId);
    if (!originalShade) return;

    const updatedShade = { ...originalShade };
    const owner = owners.find(o => o.id === newOwnerId);
    if (owner && owner.type === 'owner') {
      updatedShade.ownerId = newOwnerId;
      updatedShade.status = 'occupied';
      updatedShade.transferFeeTriggered = applyFee;
    } else if (owner && owner.type === 'renter') {
      updatedShade.renterId = newOwnerId;
      updatedShade.status = 'occupied';
      updatedShade.transferFeeTriggered = applyFee;
    }

    try {
      const { error } = await supabase.from('shades').update(mapShadeToDB(updatedShade)).eq('id', shadeId);
      if (error) throw error;

      setShades(prev => prev.map(s => s.id === shadeId ? updatedShade : s));
      addAuditLog('shade_transferred', `Shade ${shadeId}`, `Assigned ${owner?.name || 'member'} as ${owner?.type === 'owner' ? 'owner' : 'renter'}`);
      addToast(`Shade ${shadeId} successfully transferred to ${owner?.name || 'new member'}.`, 'success');
    } catch (err) {
      addToast(`Error transferring shade: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleBulkImportShades = async (newShadesData: Omit<Shade, 'currentWaterReading'>[]) => {
    const fullNewShades: Shade[] = newShadesData.map(ns => ({
      ...ns,
      currentWaterReading: ns.lastWaterReading,
      renterId: null
    }));

    try {
      const { error } = await supabase.from('shades').upsert(fullNewShades.map(mapShadeToDB));
      if (error) throw error;

      setShades(prev => {
        const filtered = prev.filter(p => !fullNewShades.some(f => f.id === p.id));
        return [...filtered, ...fullNewShades].sort((a, b) => a.id.localeCompare(b.id));
      });

      addToast(`Successfully imported ${newShadesData.length} shades.`, 'success');
    } catch (err) {
      addToast(`Error importing shades: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleBulkImportOwners = async (newOwnersData: Owner[]) => {
    try {
      const { error } = await supabase.from('owners').upsert(newOwnersData.map(mapOwnerToDB));
      if (error) throw error;

      setOwners(prev => {
        const filtered = prev.filter(p => !newOwnersData.some(f => f.id === p.id));
        return [...filtered, ...newOwnersData].sort((a, b) => a.id.localeCompare(b.id));
      });

      addToast(`Successfully imported ${newOwnersData.length} members.`, 'success');
    } catch (err) {
      addToast(`Error importing members: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleGenerateInvoiceForShade = (shadeId: string) => {
    setPreselectedShadeId(shadeId);
    setActiveTab('invoices');
  };

  const handleBulkImportInvoices = async (newInvoicesData: Invoice[]) => {
    try {
      const { error } = await supabase.from('invoices').upsert(newInvoicesData.map(mapInvoiceToDB));
      if (error) throw error;

      setInvoices(prev => {
        const filtered = prev.filter(p => !newInvoicesData.some(f => f.id === p.id));
        return [...filtered, ...newInvoicesData].sort((a, b) => a.id.localeCompare(b.id));
      });

      addToast(`Successfully imported ${newInvoicesData.length} invoices.`, 'success');
    } catch (err) {
      addToast(`Error importing invoices: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 10. Record direct payment (from Payments Tab)
  const handleRecordPayment = async (payData: Omit<Payment, 'id'>) => {
    const pId = `PAY-${Date.now()}`;
    const newRecord: Payment = {
      id: pId,
      ...payData
    };

    try {
      const { error } = await supabase.from('payments').insert([mapPaymentToDB(newRecord)]);
      if (error) throw error;

      setPayments(prev => [newRecord, ...prev]);

      if (payData.invoiceId) {
        await handleUpdateInvoiceStatus(
          payData.invoiceId,
          'paid',
          payData.method === 'UPI' ? 'online' : payData.method === 'Cash' ? 'cash' : payData.method === 'Cheque' ? 'cheque' : 'bank_transfer',
          payData.reference
        );
      } else {
        addToast(`Direct Payment of ${formatCurrency(payData.amount)} logged for Shade ${payData.shadeId}.`, 'success');
      }
    } catch (err) {
      addToast(`Error recording payment: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleDeletePayment = async (pId: string) => {
    try {
      const { error } = await supabase.from('payments').delete().eq('id', pId);
      if (error) throw error;

      setPayments(prev => prev.filter(p => p.id !== pId));
      addToast('Payment record removed.', 'info');
    } catch (err) {
      addToast(`Error deleting payment: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 10b. Update Invoice details
  const handleUpdateInvoice = async (oldId: string, updatedInvoice: Invoice) => {
    const total =
      updatedInvoice.maintenanceFee +
      updatedInvoice.waterUsageCharge +
      updatedInvoice.otherMaintenanceCharge +
      updatedInvoice.transferFee +
      updatedInvoice.fineAmount;

    const finalInvoice = {
      ...updatedInvoice,
      totalAmount: total
    };

    try {
      const { error: invErr } = await supabase
        .from('invoices')
        .update(mapInvoiceToDB(finalInvoice))
        .eq('id', oldId);
      if (invErr) throw invErr;

      setInvoices(prev => prev.map(inv => inv.id === oldId ? finalInvoice : inv));

      const targetShade = shades.find(s => s.id === finalInvoice.shadeId);
      if (targetShade) {
        const updatedShade = {
          ...targetShade,
          lastWaterReading: finalInvoice.oldWaterReading,
          currentWaterReading: finalInvoice.newWaterReading
        };

        const { error: shadeErr } = await supabase
          .from('shades')
          .update(mapShadeToDB(updatedShade))
          .eq('id', updatedShade.id);
        if (shadeErr) throw shadeErr;

        setShades(prev => prev.map(s => s.id === finalInvoice.shadeId ? updatedShade : s));
      }
      addToast(`Invoice ${finalInvoice.id} details updated.`, 'success');
    } catch (err) {
      addToast(`Error updating invoice: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 11. Fines logic
  const handleAddFine = async (fineData: Omit<FineRecord, 'id'>) => {
    const fId = `FINE-${Date.now()}`;
    const newFine: FineRecord = {
      id: fId,
      ...fineData
    };

    try {
      const { error: fineErr } = await supabase.from('fines').insert([mapFineToDB(newFine)]);
      if (fineErr) throw fineErr;

      setFines(prev => [newFine, ...prev]);
      addAuditLog('fine_added', `Shade ${fineData.shadeId}`, `₹${fineData.amount} — ${fineData.reason}`);

      if (fineData.invoiceId) {
        const inv = invoices.find(i => i.id === fineData.invoiceId);
        if (inv) {
          const originalBase = inv.maintenanceFee + inv.waterUsageCharge + inv.otherMaintenanceCharge + inv.transferFee;
          const newFineAmt = inv.fineAmount + fineData.amount;
          const updatedInv = {
            ...inv,
            fineAmount: newFineAmt,
            totalAmount: originalBase + newFineAmt
          };

          const { error: invErr } = await supabase
            .from('invoices')
            .update(mapInvoiceToDB(updatedInv))
            .eq('id', inv.id);
          if (invErr) throw invErr;

          setInvoices(prev => prev.map(i => i.id === inv.id ? updatedInv : i));
        }
      }

      addToast(`Fine of ${formatCurrency(fineData.amount)} applied to Shade ${fineData.shadeId}.`, 'success');
    } catch (err) {
      addToast(`Error adding fine: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleDeleteFine = async (fId: string) => {
    try {
      const { error } = await supabase.from('fines').delete().eq('id', fId);
      if (error) throw error;

      setFines(prev => prev.filter(f => f.id !== fId));
      addAuditLog('fine_deleted', `Fine ${fId}`);
      addToast('Fine penalty removed.', 'info');
    } catch (err) {
      addToast(`Error deleting fine: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handlePayFine = async (fId: string) => {
    const targetFine = fines.find(f => f.id === fId);
    if (!targetFine) return;
    const paidFine = { ...targetFine, status: 'paid' as const };

    try {
      const { error } = await supabase.from('fines').update(mapFineToDB(paidFine)).eq('id', fId);
      if (error) throw error;

      setFines(prev => prev.map(f => f.id === fId ? paidFine : f));
      addAuditLog('fine_paid', `Fine ${fId}`, `Shade ${targetFine.shadeId} — ₹${targetFine.amount}`);
      addToast('Fine marked as paid.', 'success');
    } catch (err) {
      addToast(`Error marking fine as paid: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 12. Reset database
  const handleResetDatabase = async () => {
    try {
      setIsLoading(true);

      await supabase.from('payments').delete().neq('id', 'dummy');
      await supabase.from('fines').delete().neq('id', 'dummy');
      await supabase.from('whatsapp_messages').delete().neq('id', 'dummy');
      await supabase.from('invoices').delete().neq('id', 'dummy');
      await supabase.from('shades').delete().neq('id', 'dummy');
      await supabase.from('owners').delete().neq('id', 'dummy');
      await supabase.from('change_requests').delete().neq('id', 'dummy');
      await supabase.from('system_settings').delete().neq('id', 0);

      await supabase.from('system_settings').insert([mapSettingsToDB(INITIAL_SETTINGS)]);
      await supabase.from('owners').insert(INITIAL_OWNERS.map(mapOwnerToDB));
      await supabase.from('shades').insert(INITIAL_SHADES.map(mapShadeToDB));
      await supabase.from('invoices').insert(INITIAL_INVOICES.map(mapInvoiceToDB));
      await supabase.from('payments').insert(INITIAL_PAYMENTS.map(mapPaymentToDB));
      await supabase.from('whatsapp_messages').insert(INITIAL_MESSAGES.map(mapMessageToDB));

      setSettings(INITIAL_SETTINGS);
      setOwners(INITIAL_OWNERS);
      setShades(INITIAL_SHADES);
      setInvoices(INITIAL_INVOICES);
      setPayments(INITIAL_PAYMENTS);
      setMessages(INITIAL_MESSAGES);
      setFines([]);
      setChangeRequests([]);
      setAuditLogs([]);
      setCurrentDate('2026-05-16');
      setTransferShadeId(null);

      addToast('Database cleared and reset to defaults.', 'info');
    } catch (err) {
      addToast(`Error resetting database: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Header Counters
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0a1912',
        color: '#ffffff',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13, 90, 52, 0.25) 0%, rgba(0,0,0,0) 70%)',
          top: '-10%',
          left: '-10%',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)',
          bottom: '-10%',
          right: '-10%',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
          animation: 'fadeInUp 0.8s ease-out'
        }}>
          <div style={{
            position: 'relative',
            width: '96px',
            height: '96px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '24px',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              animation: 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <img
              src="/fortune_favicon.avif"
              alt="Fortune Industrial Park Logo"
              style={{
                width: '72px',
                height: '72px',
                objectFit: 'contain',
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                animation: 'logoPulse 2s ease-in-out infinite'
              }}
            />
          </div>

          <h2 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.75px',
            background: 'linear-gradient(135deg, #ffffff 0%, #a7f3d0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}>
            Fortune Industrial Park
          </h2>
          <p style={{
            margin: '8px 0 0 0',
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: '500',
            letterSpacing: '0.5px'
          }}>
            Billing & Payments Portal
          </p>
        </div>

        <div style={{
          width: '240px',
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1
        }}>
          <div style={{
            position: 'absolute',
            height: '100%',
            width: '60%',
            backgroundColor: '#10b981',
            borderRadius: '2px',
            boxShadow: '0 0 10px #10b981, 0 0 20px rgba(16, 185, 129, 0.5)',
            animation: 'loadingSpray 1.5s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite'
          }} />
        </div>

        <span style={{
          fontSize: '12px',
          color: '#64748b',
          zIndex: 1,
          letterSpacing: '0.5px',
          animation: 'pulseText 1.5s ease-in-out infinite'
        }}>
          Connecting to secure server...
        </span>

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulseRing {
            0% {
              transform: scale(0.95);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
            100% {
              transform: scale(0.95);
              opacity: 0.5;
            }
          }
          @keyframes logoPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes loadingSpray {
            0% {
              left: -60%;
            }
            100% {
              left: 100%;
            }
          }
          @keyframes pulseText {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)',
            zIndex: 999, display: 'block'
          }}
        />
      )}

      {/* SIDEBAR PANEL */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
            <div className="brand-icon">
              <LayoutDashboard size={20} />
            </div>
            <div className="brand-info">
              <h2>Fortune Industrial Park</h2>
              <span>Billing & Payments Pro</span>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              background: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'none', // Overridden in CSS media queries to show on mobile
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-main)'
            }}
            title="Close Menu"
          >
            <ArrowLeft size={16} />
          </button>
        </div>

        {/* User Profile / Admin Switcher placed here (Upward) */}
        <div className="user-profile-switcher-card" style={{ margin: '0 16px 16px 16px', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="profile-avatar" style={{ backgroundColor: 'var(--primary)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
            {currentAdmin.avatar}
          </div>
          <div className="profile-info" style={{ flexGrow: 1 }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>{currentAdmin.name}</h4>
            <select
              value={currentAdmin.id}
              onChange={(e) => {
                const sel = ADMINS.find(a => a.id === e.target.value);
                if (sel) {
                  setCurrentAdmin(sel);
                  addToast(`Switched view to co-admin: ${sel.name} (${sel.role})`, 'info');
                }
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', padding: 0, cursor: 'pointer', outline: 'none', width: '100%', fontWeight: '600' }}
            >
              {ADMINS.map(a => (
                <option key={a.id} value={a.id} style={{ backgroundColor: '#ffffff', color: 'var(--text-primary)' }}>{a.role}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="sidebar-status">
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span>LIVE</span>
          </div>
          <span className="status-date">May 2026</span>
        </div>

        <ul className="sidebar-menu">
          <li className="menu-section-label">Overview</li>
          <li>
            <button
              className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('dashboard');
                setIsMobileMenuOpen(false);
              }}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
          </li>

          <li className="menu-section-label">Management</li>
          <li>
            <button
              className={`menu-item ${activeTab === 'shades' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('shades');
                setIsMobileMenuOpen(false);
              }}
            >
              <Grid size={18} />
              <span>Units & Shades</span>
            </button>
          </li>
          <li>
            <button
              className={`menu-item ${activeTab === 'owners' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('owners');
                setIsMobileMenuOpen(false);
              }}
            >
              <Users size={18} />
              <span>Owners & Renters</span>
            </button>
          </li>

          <li className="menu-section-label">Billing</li>
          <li>
            <button
              className={`menu-item ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('invoices');
                setIsMobileMenuOpen(false);
              }}
            >
              <FileText size={18} />
              <span>Invoices</span>
              {invoices.filter(i => i.status === 'draft').length > 0 && (
                <span className="menu-item-badge">
                  {invoices.filter(i => i.status === 'draft').length}
                </span>
              )}
            </button>
          </li>
          <li>
            <button
              className={`menu-item ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('payments');
                setIsMobileMenuOpen(false);
              }}
            >
              <DollarSign size={18} />
              <span>Payments</span>
            </button>
          </li>
          <li>
            <button
              className={`menu-item ${activeTab === 'fines' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('fines');
                setIsMobileMenuOpen(false);
              }}
            >
              <AlertTriangle size={18} />
              <span>Fines</span>
            </button>
          </li>
          <li>
            <button
              className={`menu-item ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('simulator');
                setIsMobileMenuOpen(false);
              }}
            >
              <MessageSquare size={18} />
              <span>WhatsApp Demo</span>
            </button>
          </li>


          <li className="menu-section-label">Analytics</li>
          <li>
            <button
              className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('reports');
                setIsMobileMenuOpen(false);
              }}
            >
              <BarChart2 size={18} />
              <span>Reports</span>
            </button>
          </li>
          <li>
            <button
              className={`menu-item ${activeTab === 'auditlog' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('auditlog');
                setIsMobileMenuOpen(false);
              }}
            >
              <ClipboardList size={18} />
              <span>Audit Log</span>
            </button>
          </li>

          <li className="menu-section-label">Configuration</li>
          <li>
            <button
              className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('settings');
                setIsMobileMenuOpen(false);
              }}
            >
              <SettingsIcon size={18} />
              <span>Settings</span>
            </button>
          </li>
          {currentAdmin.role === 'Admin' && (
            <li>
              <button
                className={`menu-item ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('requests');
                  setIsMobileMenuOpen(false);
                }}
              >
                <ShieldAlert size={18} />
                <span>Requests</span>
                {changeRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="menu-item-badge">
                    {changeRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            </li>
          )}
        </ul>

        {/* Sidebar Footer - Occupancy only */}
        <div className="sidebar-footer">
          <div className="occupancy-card">
            <div className="occupancy-header">
              <span>Occupancy</span>
              <span>{shades.length > 0 ? Math.round((shades.filter(s => s.status === 'occupied').length / shades.length) * 100) : 0}%</span>
            </div>
            <div className="occupancy-bar">
              <div
                className="occupancy-fill"
                style={{ width: `${shades.length > 0 ? Math.round((shades.filter(s => s.status === 'occupied').length / shades.length) * 100) : 0}%` }}
              ></div>
            </div>
            <div className="occupancy-sub">
              {shades.filter(s => s.status === 'occupied').length} of {shades.length} units active
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="main-content">
        {/* Main Header */}
        <header className="main-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <button
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                background: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '8px',
                display: 'none', // Overridden in CSS media queries to show on mobile
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)'
              }}
              title="Open Menu"
            >
              <Menu size={20} />
            </button>
            <div className="header-title">
              <h1>
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'shades' && 'Units & Shades Directory'}
                {activeTab === 'owners' && 'Owners & Renters Registry'}
                {activeTab === 'invoices' && 'Invoices Registry'}
                {activeTab === 'payments' && 'Payments History'}
                {activeTab === 'fines' && 'Fines & Penalties Log'}

                {activeTab === 'settings' && 'Global Configurations'}
                {activeTab === 'requests' && 'Co-Admin Change Requests'}
                {activeTab === 'reports' && 'Financial Reports'}
                {activeTab === 'auditlog' && 'Audit Log'}
                {activeTab === 'simulator' && 'WhatsApp Demo'}
              </h1>
              <p style={{ margin: 0 }}>
                {activeTab === 'dashboard' && 'Property overview & KPIs'}
                {activeTab === 'shades' && 'Manage Fortune Industrial Park units and shades'}
                {activeTab === 'owners' && 'Member registry, contact directory, and transfers'}
                {activeTab === 'invoices' && 'Maintenance and utility billing records'}
                {activeTab === 'payments' && 'Direct cash/cheque collected receipts'}
                {activeTab === 'fines' && 'Late payment fees and society penalties'}
                {activeTab === 'settings' && 'Adjust default rates, grace periods, and late fees'}
                {activeTab === 'requests' && 'Review and approve/reject database modification requests'}
                {activeTab === 'reports' && 'Monthly collection, penalty trends, and payment performance'}
                {activeTab === 'auditlog' && 'All actions performed in the system'}
                {activeTab === 'simulator' && 'Interactive WhatsApp automation preview — no API key needed'}
              </p>
            </div>
          </div>

          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification bell */}
            <div
              className="header-btn-icon"
              title={`${overdueCount} Overdue Invoices`}
              onClick={() => setActiveTab('invoices')}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <Bell size={18} style={{ color: overdueCount > 0 ? 'var(--color-danger)' : 'inherit' }} />
              {overdueCount > 0 && <span className="badge-dot"></span>}
            </div>

            {/* User Profile Card */}
            <div
              className="user-profile-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginLeft: '12px',
                paddingLeft: '12px',
                borderLeft: '1px solid var(--border-color)'
              }}
            >
              <div
                className="profile-avatar"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--color-success))',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '13px'
                }}
              >
                {currentAdmin.avatar}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: '700', lineHeight: '1.2' }}>{currentAdmin.name}</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{currentAdmin.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* View Canvas Container */}
        <section className="view-canvas">
          {activeTab === 'dashboard' && (
            <DashboardView
              shades={shades}
              invoices={invoices}
              owners={owners}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'shades' && (
            <ShadesView
              shades={shades}
              owners={owners}
              settings={settings}
              invoices={invoices}
              onAddShade={handleAddShade}
              onUpdateShade={handleUpdateShade}
              onBulkImportShades={handleBulkImportShades}
              onOpenOwnerTransferModal={(sId) => {
                setTransferShadeId(sId);
                setActiveTab('owners');
              }}
              currentRole={currentAdmin.role}
              onSubmitRequest={handleCreateChangeRequest}
              onGenerateInvoice={handleGenerateInvoiceForShade}
            />
          )}

          {activeTab === 'owners' && (
            <OwnersView
              owners={owners}
              shades={shades}
              onAddOwner={handleAddOwner}
              onUpdateOwner={handleUpdateOwner}
              onTransferOwner={handleTransferOwner}
              setActiveTab={setActiveTab}
              transferShadeId={transferShadeId}
              onCloseTransferModal={() => setTransferShadeId(null)}
              onBulkImportOwners={handleBulkImportOwners}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              shades={shades}
              owners={owners}
              settings={settings}
              onGenerateSingleInvoice={handleGenerateSingleInvoice}
              onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
              onDeleteInvoice={handleDeleteInvoice}
              onSendWhatsApp={handleSendWhatsApp}
              onUpdateInvoice={handleUpdateInvoice}
              preselectedShadeId={preselectedShadeId}
              clearPreselectedShadeId={() => setPreselectedShadeId(null)}
              onBulkImportInvoices={handleBulkImportInvoices}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              payments={payments}
              invoices={invoices}
              onRecordPayment={handleRecordPayment}
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeTab === 'fines' && (
            <FinesView
              fines={fines}
              shades={shades}
              invoices={invoices}
              onAddFine={handleAddFine}
              onDeleteFine={handleDeleteFine}
              onPayFine={handlePayFine}
            />
          )}



          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={async (us) => {
                try {
                  const dbPayload = mapSettingsToDB(us);
                  const { error } = await supabase
                    .from('system_settings')
                    .update(dbPayload)
                    .eq('id', 1);

                  if (error) {
                    if (error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('schema cache'))) {
                      console.warn('Custom invoice settings columns not found in DB. Saving without them to DB and using localStorage fallback.');
                      const fallbackPayload = {
                        id: 1,
                        default_maintenance: us.defaultMaintenance,
                        water_rate: us.waterRate,
                        transfer_fee: us.transferFee,
                        grace_period_days: us.gracePeriodDays,
                        fine_per_day: us.finePerDay,
                        upi_id: us.upiId,
                        qr_image_url: us.qrImageUrl,
                        society_name: us.societyName,
                        society_address: us.societyAddress,
                        society_phone: us.societyPhone,
                        society_bank_details: us.societyBankDetails
                      };
                      const { error: retryError } = await supabase
                        .from('system_settings')
                        .update(fallbackPayload)
                        .eq('id', 1);
                      if (retryError) throw retryError;
                    } else {
                      throw error;
                    }
                  }

                  // Write the custom settings to local storage as fallback
                  localStorage.setItem('fortune_park_settings', JSON.stringify({
                    invoiceTitle: us.invoiceTitle,
                    invoicePrefix: us.invoicePrefix,
                    invoiceNotes: us.invoiceNotes
                  }));

                  setSettings(us);
                  addAuditLog('settings_changed', 'System Settings', `Maintenance ₹${us.defaultMaintenance}, Water ₹${us.waterRate}/unit`);
                  addToast('Billing parameters and configurations saved successfully.', 'success');
                } catch (err) {
                  addToast(`Error saving settings: ${err instanceof Error ? err.message : String(err)}`, 'error');
                }
              }}
              onResetDatabase={handleResetDatabase}
              currentRole={currentAdmin.role}
              onSubmitRequest={handleCreateChangeRequest}
            />
          )}

          {activeTab === 'requests' && currentAdmin.role === 'Admin' && (
            <AdminRequestsView
              requests={changeRequests}
              onResolveRequest={handleResolveRequest}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              invoices={invoices}
              payments={payments}
              fines={fines}
              shades={shades}
              owners={owners}
            />
          )}

          {activeTab === 'auditlog' && (
            <AuditLogView logs={auditLogs} />
          )}

          {activeTab === 'simulator' && (
            <WhatsappSimulator
              shades={shades}
              owners={owners}
              invoices={invoices}
              messages={messages}
              settings={settings}
              onSendMessage={(phone, text) => {
                setMessages(prev => [...prev, {
                  id: `msg-${Date.now()}-${phone}`,
                  phone,
                  timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                  messageType: 'invoice_sent' as const,
                  content: text,
                  sent: true,
                  invoiceId: ''
                }]);
              }}
              onSimulatePayment={(invoiceId) => {
                setInvoices(prev => prev.map(inv =>
                  inv.id === invoiceId ? { ...inv, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] } : inv
                ));
              }}
              selectedShadeId={selectedSimShadeId}
              setSelectedShadeId={setSelectedSimShadeId}
            />
          )}
        </section>
      </main>

      {/* Backdrop overlay for mobile menu drawer */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-overlay-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 99
          }}
        />
      )}

      {/* TOAST SYSTEM CODES */}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem
            key={t.id}
            id={t.id}
            type={t.type}
            text={t.text}
            onClose={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
          />
        ))}
      </div>
    </div>
  );
}
