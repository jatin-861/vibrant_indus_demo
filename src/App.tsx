import { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Users,
  FileText,
  Settings as SettingsIcon,
  Bell,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
  DollarSign,
  ShieldAlert,
  Menu,
  ArrowLeft,
  BarChart2,
  ClipboardList
} from 'lucide-react';
import type { Shade, Owner, Invoice, SystemSettings, AdminRole, Payment, ChangeRequest, AuditLog } from './types';
import { DashboardView } from './components/DashboardView';
import { ShadesView } from './components/ShadesView';
import { OwnersView } from './components/OwnersView';
import { InvoicesView } from './components/InvoicesView';
import { PaymentsView } from './components/PaymentsView';
import { SettingsView } from './components/SettingsView';
import { AdminRequestsView } from './components/AdminRequestsView';
import { ReportsView } from './components/ReportsView';
import { AuditLogView } from './components/AuditLogView';
import { supabase } from './supabaseClient';
import { INITIAL_SETTINGS, INITIAL_INVOICES, INITIAL_PAYMENTS } from './demoData';

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
  transferFeeTriggered: db.transfer_fee_triggered,
  documents: db.documents ? (typeof db.documents === 'string' ? JSON.parse(db.documents) : db.documents) : []
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
  transfer_fee_triggered: s.transferFeeTriggered,
  documents: JSON.stringify(s.documents || [])
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
  otherMaintenanceName: db.other_maintenance_name,
  otherMaintenanceCharge: db.other_maintenance_charge,
  transferFee: db.transfer_fee,
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
  other_maintenance_name: i.otherMaintenanceName || null,
  other_maintenance_charge: i.otherMaintenanceCharge,
  transfer_fee: i.transferFee,
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
const mapSettingsFromDB = (db: any): SystemSettings => ({
  defaultMaintenance: db.default_maintenance,
  transferFee: db.transfer_fee,
  upiId: db.upi_id,
  qrImageUrl: db.qr_image_url,
  societyName: db.society_name,
  societyAddress: db.society_address,
  societyPhone: db.society_phone,
  societyBankDetails: db.society_bank_details,
  invoiceTitle: db.invoice_title || '',
  invoicePrefix: db.invoice_prefix || 'INV-',
  invoiceNotes: db.invoice_notes || '',
  reminderDays: db.reminder_days || [3, 1],
  analyticsYear: db.analytics_year || new Date().getFullYear()
});

const mapSettingsToDB = (s: SystemSettings) => ({
  id: 1,
  default_maintenance: s.defaultMaintenance,
  transfer_fee: s.transferFee,
  upi_id: s.upiId,
  qr_image_url: s.qrImageUrl,
  society_name: s.societyName,
  society_address: s.societyAddress,
  society_phone: s.societyPhone,
  society_bank_details: s.societyBankDetails,
  invoice_title: s.invoiceTitle,
  invoice_prefix: s.invoicePrefix,
  invoice_notes: s.invoiceNotes,
  reminder_days: s.reminderDays || [3, 1],
  analytics_year: s.analyticsYear || new Date().getFullYear()
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAuditLogFromDB = (db: any): AuditLog => ({
  id: db.id,
  action: db.action,
  entity: db.entity,
  performedBy: db.performed_by,
  role: db.role,
  timestamp: db.timestamp,
  details: db.details || undefined
});

const mapAuditLogToDB = (l: AuditLog) => ({
  id: l.id,
  action: l.action,
  entity: l.entity,
  performed_by: l.performedBy,
  role: l.role,
  timestamp: l.timestamp,
  details: l.details || null
});

// Initial Mock Data (aligned with screenshots)
// Settings and seed data are imported from demoData.ts

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
  { id: 'SH-001', block: 'Block A', floor: 'Ground Floor', sqFt: 1200, status: 'occupied', ownerId: 'OWN-001', renterId: 'REN-001', fixedMaintenance: 8400, transferFeeTriggered: false, documents: [{ id: 'DOC-SH001-1', name: 'Ownership Agreement.pdf', type: 'application/pdf', dataUrl: '/demo-document.pdf', uploadedDate: '2026-01-05' }] },
  { id: 'SH-002', block: 'Block A', floor: 'Ground Floor', sqFt: 1500, status: 'occupied', ownerId: 'OWN-002', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false, documents: [{ id: 'DOC-SH002-1', name: 'Lease Agreement.pdf', type: 'application/pdf', dataUrl: '/demo-document.pdf', uploadedDate: '2026-01-10' }] },
  { id: 'SH-003', block: 'Block A', floor: 'Ground Floor', sqFt: 1800, status: 'occupied', ownerId: 'OWN-003', renterId: 'REN-002', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-004', block: 'Block A', floor: 'Ground Floor', sqFt: 1200, status: 'vacant', ownerId: 'OWN-004', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-005', block: 'Block A', floor: 'First Floor', sqFt: 1000, status: 'occupied', ownerId: 'OWN-005', renterId: 'REN-003', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-006', block: 'Block A', floor: 'First Floor', sqFt: 1400, status: 'occupied', ownerId: 'OWN-006', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-007', block: 'Block A', floor: 'First Floor', sqFt: 900, status: 'maintenance', ownerId: 'OWN-007', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-008', block: 'Block B', floor: 'Ground Floor', sqFt: 2000, status: 'occupied', ownerId: 'OWN-008', renterId: 'REN-004', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-009', block: 'Block B', floor: 'Ground Floor', sqFt: 1600, status: 'occupied', ownerId: 'OWN-009', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-010', block: 'Block B', floor: 'Ground Floor', sqFt: 1200, status: 'occupied', ownerId: 'OWN-010', renterId: 'REN-005', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-011', block: 'Block B', floor: 'Ground Floor', sqFt: 1800, status: 'vacant', ownerId: 'OWN-011', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-012', block: 'Block B', floor: 'First Floor', sqFt: 1100, status: 'occupied', ownerId: 'OWN-012', renterId: 'REN-006', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-013', block: 'Block B', floor: 'First Floor', sqFt: 1300, status: 'occupied', ownerId: 'OWN-013', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-014', block: 'Block B', floor: 'First Floor', sqFt: 1700, status: 'occupied', ownerId: 'OWN-014', renterId: 'REN-007', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-015', block: 'Block B', floor: 'First Floor', sqFt: 950, status: 'maintenance', ownerId: 'OWN-015', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-016', block: 'Block C', floor: 'Ground Floor', sqFt: 2200, status: 'occupied', ownerId: 'OWN-001', renterId: 'REN-008', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-017', block: 'Block C', floor: 'Ground Floor', sqFt: 1500, status: 'occupied', ownerId: 'OWN-002', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-018', block: 'Block C', floor: 'Ground Floor', sqFt: 1100, status: 'occupied', ownerId: 'OWN-003', renterId: 'REN-009', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-019', block: 'Block C', floor: 'Ground Floor', sqFt: 1900, status: 'vacant', ownerId: 'OWN-004', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-020', block: 'Block C', floor: 'First Floor', sqFt: 1350, status: 'occupied', ownerId: 'OWN-005', renterId: 'REN-010', fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-021', block: 'Block C', floor: 'First Floor', sqFt: 1250, status: 'occupied', ownerId: 'OWN-006', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-022', block: 'Block C', floor: 'First Floor', sqFt: 1600, status: 'occupied', ownerId: 'OWN-007', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-023', block: 'Block D', floor: 'Ground Floor', sqFt: 1800, status: 'occupied', ownerId: 'OWN-008', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-024', block: 'Block D', floor: 'Ground Floor', sqFt: 1400, status: 'vacant', ownerId: 'OWN-009', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
  { id: 'SH-025', block: 'Block D', floor: 'Ground Floor', sqFt: 2100, status: 'occupied', ownerId: 'OWN-010', renterId: null, fixedMaintenance: 8400, transferFeeTriggered: false },
];
// INITIAL_INVOICES, INITIAL_PAYMENTS, INITIAL_FINES, INITIAL_MESSAGES imported from demoData.ts

const ADMINS: AdminRole[] = [
  { id: 'ADM-1', name: 'jatin', role: 'Admin', email: 'amit@vibrantindustrialpark.com', avatar: 'AS' },
  { id: 'ADM-2', name: 'saral', role: 'Treasurer', email: 'rajesh@vibrantindustrialpark.com', avatar: 'RP' },
  { id: 'ADM-3', name: 'example', role: 'Secretary', email: 'vikram@vibrantindustrialpark.com', avatar: 'VS' }
];

// Toast Item with progress bar and close button
const ToastItem: React.FC<{
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
  onClose: () => void;
}> = ({ type, text, onClose }) => {
  const [progress, setProgress] = useState(100);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const startTime = Date.now();
    const duration = 3000; // 3 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        clearInterval(interval);
        onCloseRef.current();
      }
    }, 30);

    return () => clearInterval(interval);
  }, []); // empty deps — timer starts once and uses ref for latest onClose

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const invoiceCountRef = useRef(0);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Direct Billing from Shade link state
  const [preselectedShadeId, setPreselectedShadeId] = useState<string | null>(null);

  // Simulation Date state — aligned with demo data (Jan/Feb/Mar 2026 billing cycle)
  const [currentDate, setCurrentDate] = useState<string>('2026-03-10');

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
    supabase.from('audit_logs').insert([mapAuditLogToDB(log)]).then(({ error }) => {
      if (error) console.warn('Failed to persist audit log (run migrate_add_missing_columns.sql to create the audit_logs table):', error.message);
    });
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

          // Seed shades (fallback without documents if columns don't exist yet)
          {
            const { error: shadeErr } = await supabase.from('shades').insert(INITIAL_SHADES.map(mapShadeToDB));
            if (shadeErr) {
              await supabase.from('shades').insert(INITIAL_SHADES.map(s => { const { documents: _docs, ...base } = mapShadeToDB(s); return base; }));
            }
          }

          // Refresh states (no demo invoice seeding — start clean)
          setSettings(INITIAL_SETTINGS);
          setOwners(INITIAL_OWNERS);
          setShades(INITIAL_SHADES);
          setInvoices([]);
          setPayments([]);
          setChangeRequests([]);
          invoiceCountRef.current = 0;
        } else {
          // Fetch everything from Supabase with auto-migration for legacy entries
          let loadedSettings = mapSettingsFromDB(dbSettings[0]);
          // Auto-fill default values or auto-migrate Fortune -> Vibrant
          const isFortune = loadedSettings.societyName === 'Fortune Industrial Park';
          const needsDefaultFill = !loadedSettings.societyName || loadedSettings.defaultMaintenance === 0 || isFortune;
          if (needsDefaultFill) {
            loadedSettings = {
              ...INITIAL_SETTINGS,
              // preserve any values the user already customised (non-empty overrides default)
              societyName: isFortune ? INITIAL_SETTINGS.societyName : (loadedSettings.societyName || INITIAL_SETTINGS.societyName),
              societyAddress: isFortune ? INITIAL_SETTINGS.societyAddress : (loadedSettings.societyAddress || INITIAL_SETTINGS.societyAddress),
              societyPhone: loadedSettings.societyPhone || INITIAL_SETTINGS.societyPhone,
              societyBankDetails: isFortune ? INITIAL_SETTINGS.societyBankDetails : (loadedSettings.societyBankDetails || INITIAL_SETTINGS.societyBankDetails),
              upiId: isFortune ? INITIAL_SETTINGS.upiId : (loadedSettings.upiId || INITIAL_SETTINGS.upiId),
              invoiceTitle: loadedSettings.invoiceTitle || INITIAL_SETTINGS.invoiceTitle,
              invoicePrefix: isFortune ? INITIAL_SETTINGS.invoicePrefix : (loadedSettings.invoicePrefix || INITIAL_SETTINGS.invoicePrefix),
              invoiceNotes: isFortune ? INITIAL_SETTINGS.invoiceNotes : (loadedSettings.invoiceNotes || INITIAL_SETTINGS.invoiceNotes),
              defaultMaintenance: loadedSettings.defaultMaintenance || INITIAL_SETTINGS.defaultMaintenance,
              transferFee: loadedSettings.transferFee || INITIAL_SETTINGS.transferFee,
            };
            try {
              await supabase.from('system_settings').update(mapSettingsToDB(loadedSettings)).eq('id', 1);
            } catch (err) {
              console.warn('Settings update failed, using merged defaults.', err);
            }
          }
          // Merge custom settings from localStorage if present
          const localSettingsJson = localStorage.getItem('vibrant_park_settings');
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

          const [
            resOwners,
            resShades,
            resInvoices,
            resPayments,
            resRequests,
            resAuditLogs
          ] = await Promise.all([
            supabase.from('owners').select('*'),
            supabase.from('shades').select('*'),
            supabase.from('invoices').select('*'),
            supabase.from('payments').select('*'),
            supabase.from('change_requests').select('*'),
            supabase.from('audit_logs').select('*').order('timestamp', { ascending: false })
          ]);

          const dbOwners = resOwners.data;
          const dbShades = resShades.data;
          const dbInvoices = resInvoices.data;
          const dbPayments = resPayments.data;
          const dbRequests = resRequests.data;
          const dbAuditLogs = resAuditLogs.data;

          if (dbOwners) setOwners(dbOwners.map(mapOwnerFromDB));
          if (dbPayments) setPayments(dbPayments.map(mapPaymentFromDB));
          if (dbAuditLogs) setAuditLogs(dbAuditLogs.map(mapAuditLogFromDB));
          else if (resAuditLogs.error) console.warn('audit_logs table not found yet — run migrate_add_missing_columns.sql to enable persistent audit history:', resAuditLogs.error.message);

          if (dbShades) {
            const mappedShades = dbShades.map(mapShadeFromDB);
            setShades(mappedShades);
          }

          if (dbInvoices) {
            // Remove any demo invoices (FIP- prefix) that were auto-seeded previously
            const demoIds = dbInvoices
              .filter((inv: any) => typeof inv.id === 'string' && inv.id.startsWith('FIP-'))
              .map((inv: any) => inv.id as string);

            if (demoIds.length > 0) {
              await supabase.from('invoices').delete().in('id', demoIds);
              // Also remove payments that referenced those invoices
              await supabase.from('payments').delete().in('invoice_id', demoIds);
              addToast(`Removed ${demoIds.length} demo invoices. Only real data shown now.`, 'info');
            }

            // Re-fetch everything after cleanup so state is accurate
            const [cleanInv, cleanPay] = await Promise.all([
              supabase.from('invoices').select('*'),
              supabase.from('payments').select('*')
            ]);

            const realInvoices = cleanInv.data ?? [];
            setInvoices(realInvoices.map(mapInvoiceFromDB));
            invoiceCountRef.current = realInvoices.length;
            if (cleanPay.data) setPayments(cleanPay.data.map(mapPaymentFromDB));
          }
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



  // Transition sent invoices to overdue when time advances
  useEffect(() => {
    let invoicesUpdated = false;
    const updatedInvoices = invoices.map(inv => {
      if (inv.status !== 'sent') return inv;
      const due = new Date(inv.dueDate);
      const curr = new Date(currentDate);
      if (curr > due) {
        invoicesUpdated = true;
        return {
          ...inv,
          status: 'overdue' as const
        };
      }
      return inv;
    });

    if (invoicesUpdated) {
      const changedInvoices = updatedInvoices.filter((inv, idx) => inv !== invoices[idx]);
      Promise.all(changedInvoices.map(inv =>
        supabase.from('invoices').update(mapInvoiceToDB(inv)).eq('id', inv.id)
      )).then(() => {
        setInvoices(updatedInvoices);
        addToast('Invoice statuses updated to overdue.', 'info');
      }).catch(err => {
        console.error('Error syncing overdue invoices:', err);
      });
    }
  }, [currentDate, invoices]);

  // 2. Generate Invoices - Individual
  const handleGenerateSingleInvoice = async (
    shadeId: string,
    dueDateStr: string,
    otherName: string,
    otherCharge: number,
    _months: number,
    silent = false
  ) => {
    const shade = shades.find(s => s.id === shadeId);
    if (!shade || shade.status !== 'occupied' || !shade.ownerId) {
      addToast('Cannot bill shade. Must be occupied.', 'error');
      return;
    }

    const owner = owners.find(o => o.id === shade.ownerId);
    const renter = shade.renterId ? owners.find(o => o.id === shade.renterId) : null;
    if (!owner) return;

    // Fixed to 1 Year (12 months)
    const billingMonths = 12;
    const baseMaintenance = settings.defaultMaintenance;
    const tFee = shade.transferFeeTriggered ? settings.transferFee : 0;

    const totalVal = baseMaintenance + otherCharge + tFee;

    const prefix = settings.invoicePrefix || 'INV-';
    const invoiceSeq = String(invoiceCountRef.current + 1).padStart(3, '0');
    const invoiceId = `${prefix}${new Date().getFullYear()}-${invoiceSeq}`;

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
      billingMonths: billingMonths,
      otherMaintenanceName: otherName || '',
      otherMaintenanceCharge: otherCharge,
      transferFee: tFee,
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

      // Update shade transfer trigger flag if any
      const updatedShade = {
        ...shade,
        transferFeeTriggered: false
      };

      const { error: shadeErr } = await supabase
        .from('shades')
        .update(mapShadeToDB(updatedShade))
        .eq('id', shadeId);
      if (shadeErr) throw shadeErr;

      invoiceCountRef.current += 1;
      setInvoices(prev => [...prev, newInv]);
      setShades(prev => prev.map(s => s.id === shadeId ? updatedShade : s));

      addAuditLog('invoice_created', `Invoice ${invoiceId}`, `Shade ${shadeId} | Amount ₹${totalVal}`);
      if (!silent) addToast(`Generated Invoice ${invoiceId} for Shade ${shadeId}.`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message || JSON.stringify(err);
      addToast(`Error generating invoice: ${msg}`, 'error');
    }
  };

  // 4. Dispatch Invoice via WhatsApp Simulation (Dual Delivery)


  const handleUpdateInvoiceStatus = async (
    invoiceId: string,
    status: Invoice['status'],
    paymentMethod?: Invoice['paymentMethod'],
    details?: string
  ) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    // Under 3 months discount check helper
    const isUnder3Months = (genDateStr: string, payDateStr: string) => {
      const gen = new Date(genDateStr);
      const pay = new Date(payDateStr);
      const months = (pay.getFullYear() - gen.getFullYear()) * 12 + pay.getMonth() - gen.getMonth();
      if (months < 3) return true;
      if (months === 3) return pay.getDate() < gen.getDate();
      return false;
    };

    let finalTotal = inv.totalAmount;
    let finalMaintenance = inv.maintenanceFee;
    if (status === 'paid') {
      const payDate = currentDate;
      if (isUnder3Months(inv.generatedDate, payDate)) {
        const discount = Math.round(inv.maintenanceFee * 0.1);
        finalMaintenance = inv.maintenanceFee - discount;
        finalTotal = finalMaintenance + inv.otherMaintenanceCharge + inv.transferFee;
      }
    }

    const updatedInv = {
      ...inv,
      status,
      maintenanceFee: finalMaintenance,
      totalAmount: finalTotal,
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

  // Optional shade columns that may not exist yet on older DBs, stripped one at a time
  // (newest/least-critical first) so a single missing column doesn't also drop fields
  // that DO exist, like penalty_disabled, from the write.
  const OPTIONAL_SHADE_COLUMNS = ['penalty_disabled_reason', 'documents', 'penalty_disabled'] as const;

  const writeShadeWithFallback = async (
    payload: Record<string, unknown>,
    performWrite: (p: Record<string, unknown>) => Promise<{ error: unknown }>
  ) => {
    let currentPayload = payload;
    let { error } = await performWrite(currentPayload);
    for (const col of OPTIONAL_SHADE_COLUMNS) {
      if (!error || !isColumnMissingError(error) || !(col in currentPayload)) continue;
      const rest = { ...currentPayload };
      delete rest[col];
      currentPayload = rest;
      ({ error } = await performWrite(currentPayload));
    }
    return error;
  };

  // Add / Update Shade (persisted, with column fallback)
  const handleAddShade = async (ns: Shade) => {
    try {
      const error = await writeShadeWithFallback(
        mapShadeToDB(ns),
        async (p) => await supabase.from('shades').insert([p])
      );
      if (error) throw error;
      setShades(prev => [...prev, ns]);
      addAuditLog('shade_added', `Shade ${ns.id}`, `${ns.block} · ${ns.floor}`);
      addToast(`Shade ${ns.id} registered.`, 'success');
    } catch (err) {
      addToast(`Error saving shade: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleUpdateShade = async (us: Shade) => {
    try {
      const error = await writeShadeWithFallback(
        mapShadeToDB(us),
        async (p) => await supabase.from('shades').update(p).eq('id', us.id)
      );
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

  const handleBulkImportShades = async (newShadesData: Shade[]) => {
    const fullNewShades: Shade[] = newShadesData.map(ns => ({
      ...ns,
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
    try {
      if (payData.invoiceId) {
        // Invoice-linked payment: let handleUpdateInvoiceStatus create the payment record
        // to avoid creating two payment records for the same transaction
        await handleUpdateInvoiceStatus(
          payData.invoiceId,
          'paid',
          payData.method === 'UPI' ? 'online' : payData.method === 'Cash' ? 'cash' : payData.method === 'Cheque' ? 'cheque' : 'bank_transfer',
          payData.reference
        );
      } else {
        // Advance/direct payment without an invoice: insert manually
        const pId = `PAY-${Date.now()}`;
        const newRecord: Payment = { id: pId, ...payData };
        const { error } = await supabase.from('payments').insert([mapPaymentToDB(newRecord)]);
        if (error) throw error;
        setPayments(prev => [newRecord, ...prev]);
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

  const handleUpdateAuditLog = async (updatedLog: AuditLog) => {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .update(mapAuditLogToDB(updatedLog))
        .eq('id', updatedLog.id);
      if (error) throw error;

      setAuditLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
      addToast(`Audit log entry ${updatedLog.id} updated.`, 'success');
    } catch (err) {
      addToast(`Error updating audit log: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleDeleteAuditLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .eq('id', logId);
      if (error) throw error;

      setAuditLogs(prev => prev.filter(l => l.id !== logId));
      addToast(`Audit log entry ${logId} deleted.`, 'info');
    } catch (err) {
      addToast(`Error deleting audit log: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleBulkImportAuditLogs = async (importedLogs: AuditLog[]) => {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .upsert(importedLogs.map(mapAuditLogToDB));
      if (error) throw error;

      setAuditLogs(prev => {
        const filtered = prev.filter(p => !importedLogs.some(f => f.id === p.id));
        return [...filtered, ...importedLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      });
      addToast(`Successfully imported ${importedLogs.length} audit log entries.`, 'success');
    } catch (err) {
      addToast(`Error importing audit logs: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleBulkImportPayments = async (newPaymentsData: Omit<Payment, 'id'>[]) => {
    try {
      const importedPayments: Payment[] = newPaymentsData.map((np, idx) => ({
        id: `PAY-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        ...np
      }));

      // Insert payments into Supabase
      const { error } = await supabase.from('payments').insert(importedPayments.map(mapPaymentToDB));
      if (error) throw error;

      // Sync invoices linked to these payments
      const linkedInvoiceIds = importedPayments
        .map(p => p.invoiceId)
        .filter((id): id is string => !!id);

      if (linkedInvoiceIds.length > 0) {
        const updatedInvoices = invoices.map(inv => {
          if (linkedInvoiceIds.includes(inv.id) && inv.status !== 'paid') {
            const matchedPayment = importedPayments.find(p => p.invoiceId === inv.id);
            return {
              ...inv,
              status: 'paid' as const,
              paymentMethod: matchedPayment ? (matchedPayment.method === 'UPI' ? 'online' as const : matchedPayment.method === 'Cash' ? 'cash' as const : matchedPayment.method === 'Cheque' ? 'cheque' as const : 'bank_transfer' as const) : null,
              paymentDate: matchedPayment?.date || currentDate,
              transactionDetails: matchedPayment?.reference || 'Excel Import'
            };
          }
          return inv;
        });

        // Sync database for updated invoices
        const dbInvoicesToUpdate = updatedInvoices.filter((inv, idx) => inv !== invoices[idx]);
        await Promise.all(dbInvoicesToUpdate.map(inv => 
          supabase.from('invoices').update(mapInvoiceToDB(inv)).eq('id', inv.id)
        ));

        setInvoices(updatedInvoices);
      }

      setPayments(prev => [...importedPayments, ...prev]);
      addToast(`Successfully imported ${importedPayments.length} payment records.`, 'success');
      addAuditLog('payment_marked', `Bulk Import`, `Imported ${importedPayments.length} payments`);
    } catch (err) {
      addToast(`Error importing payments: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 10b. Update Invoice details
  const handleUpdateInvoice = async (oldId: string, updatedInvoice: Invoice) => {
    const total =
      updatedInvoice.maintenanceFee +
      updatedInvoice.otherMaintenanceCharge +
      updatedInvoice.transferFee;

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
      addToast(`Invoice ${finalInvoice.id} details updated.`, 'success');
    } catch (err) {
      addToast(`Error updating invoice: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // 12. Reset database
  const handleResetDatabase = async () => {
    try {
      setIsLoading(true);

      await supabase.from('payments').delete().neq('id', 'dummy');
      await supabase.from('invoices').delete().neq('id', 'dummy');
      await supabase.from('shades').delete().neq('id', 'dummy');
      await supabase.from('owners').delete().neq('id', 'dummy');
      await supabase.from('change_requests').delete().neq('id', 'dummy');
      await supabase.from('audit_logs').delete().neq('id', 'dummy');
      await supabase.from('system_settings').delete().neq('id', 0);

      await supabase.from('system_settings').insert([mapSettingsToDB(INITIAL_SETTINGS)]);
      await supabase.from('owners').insert(INITIAL_OWNERS.map(mapOwnerToDB));
      await supabase.from('shades').insert(INITIAL_SHADES.map(mapShadeToDB));
      await supabase.from('invoices').insert(INITIAL_INVOICES.map(mapInvoiceToDB));
      await supabase.from('payments').insert(INITIAL_PAYMENTS.map(mapPaymentToDB));

      setSettings(INITIAL_SETTINGS);
      setOwners(INITIAL_OWNERS);
      setShades(INITIAL_SHADES);
      setInvoices(INITIAL_INVOICES);
      setPayments(INITIAL_PAYMENTS);
      setChangeRequests([]);
      setAuditLogs([]);
      setCurrentDate('2026-03-10');
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
              src="/favicon.png"
              alt="Vibrant Industrial Park Logo"
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
            Vibrant Industrial Park
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
            <div className="brand-icon" style={{ padding: 0, overflow: 'hidden', background: 'none', boxShadow: 'none', border: '1px solid var(--border-color)' }}>
              <img src="/favicon.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }} />
            </div>
            <div className="brand-info">
              <h2>Vibrant Industrial Park</h2>
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
          <span className="status-date">
            {new Date(currentDate).toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
          </span>
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
                {activeTab === 'settings' && 'Global Configurations'}
                {activeTab === 'requests' && 'Co-Admin Change Requests'}
                {activeTab === 'reports' && 'Financial Reports'}
                {activeTab === 'auditlog' && 'Audit Log'}
              </h1>
              <p style={{ margin: 0 }}>
                {activeTab === 'dashboard' && 'Property overview & KPIs'}
                {activeTab === 'shades' && 'Manage Vibrant Industrial Park units and shades'}
                {activeTab === 'owners' && 'Member registry, contact directory, and transfers'}
                {activeTab === 'invoices' && 'Maintenance and utility billing records'}
                {activeTab === 'payments' && 'Direct cash/cheque collected receipts'}
                {activeTab === 'settings' && 'Adjust default rates, grace periods, and late fees'}
                {activeTab === 'requests' && 'Review and approve/reject database modification requests'}
                {activeTab === 'reports' && 'Monthly collection, penalty trends, and payment performance'}
                {activeTab === 'auditlog' && 'All actions performed in the system'}
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

            {/* User Profile Card with Role Switcher */}
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
                  fontSize: '13px',
                  flexShrink: 0
                }}
              >
                {currentAdmin.avatar}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: '700', lineHeight: '1.2' }}>{currentAdmin.name}</strong>
                <select
                  value={currentAdmin.id}
                  onChange={(e) => {
                    const sel = ADMINS.find(a => a.id === e.target.value);
                    if (sel) {
                      setCurrentAdmin(sel);
                      addToast(`Switched to: ${sel.name} (${sel.role})`, 'info');
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '11px',
                    padding: 0,
                    cursor: 'pointer',
                    outline: 'none',
                    fontWeight: '600',
                    color: currentAdmin.role === 'Admin' ? 'var(--color-success)' :
                           currentAdmin.role === 'Secretary' ? 'var(--color-info)' : 'var(--color-pending)'
                  }}
                >
                  {ADMINS.map(a => (
                    <option key={a.id} value={a.id} style={{ backgroundColor: '#ffffff', color: 'var(--text-primary)' }}>
                      {a.name} — {a.role}
                    </option>
                  ))}
                </select>
              </div>
              {/* Role badge */}
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: currentAdmin.role === 'Admin' ? 'var(--color-success-bg)' :
                                 currentAdmin.role === 'Secretary' ? 'var(--color-info-bg)' : 'var(--color-pending-bg)',
                color: currentAdmin.role === 'Admin' ? 'var(--color-success)' :
                       currentAdmin.role === 'Secretary' ? 'var(--color-info)' : 'var(--color-pending)',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap'
              }}>
                {currentAdmin.role}
              </span>
            </div>
          </div>
        </header>

        {/* View Canvas Container */}
        <section className="view-canvas">
          {activeTab === 'dashboard' && (
            <DashboardView
              shades={shades}
              invoices={invoices}
              currentDate={currentDate}
              settings={settings}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'shades' && (
            <ShadesView
              shades={shades}
              owners={owners}
              settings={settings}
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
              currentRole={currentAdmin.role}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              shades={shades}
              owners={owners}
              settings={settings}
              currentDate={currentDate}
              onGenerateSingleInvoice={handleGenerateSingleInvoice}
              onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
              onDeleteInvoice={handleDeleteInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              preselectedShadeId={preselectedShadeId}
              clearPreselectedShadeId={() => setPreselectedShadeId(null)}
              onBulkImportInvoices={handleBulkImportInvoices}
              currentRole={currentAdmin.role}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              payments={payments}
              invoices={invoices}
              currentDate={currentDate}
              onRecordPayment={handleRecordPayment}
              onDeletePayment={handleDeletePayment}
              onBulkImportPayments={handleBulkImportPayments}
              currentRole={currentAdmin.role}
            />
          ) }





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
                        transfer_fee: us.transferFee,
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
                  localStorage.setItem('vibrant_park_settings', JSON.stringify({
                    invoiceTitle: us.invoiceTitle,
                    invoicePrefix: us.invoicePrefix,
                    invoiceNotes: us.invoiceNotes
                  }));

                  // When the global maintenance rate changes, sync all shades
                  if (us.defaultMaintenance !== settings.defaultMaintenance) {
                    await supabase
                      .from('shades')
                      .update({ fixed_maintenance: us.defaultMaintenance });
                    setShades(prev => prev.map(s => ({ ...s, fixedMaintenance: us.defaultMaintenance })));
                  }
                  setSettings(us);
                  addAuditLog('settings_changed', 'System Settings', `Maintenance ₹${us.defaultMaintenance}`);
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
              shades={shades}
              owners={owners}
              settings={settings}
            />
          )}

          {activeTab === 'auditlog' && (
            <AuditLogView
              logs={auditLogs}
              onUpdateLog={handleUpdateAuditLog}
              onDeleteLog={handleDeleteAuditLog}
              onBulkImportLogs={handleBulkImportAuditLogs}
              currentRole={currentAdmin.role}
            />
          )}


        </section>
      </main>

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
