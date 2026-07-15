export interface ShadeDocument {
  id: string;
  name: string;
  type: string; // mime type, e.g. "application/pdf" or "image/png"
  dataUrl: string; // base64 data URI or public asset path
  uploadedDate: string; // YYYY-MM-DD
}

export interface Shade {
  id: string; // e.g., "SH-001"
  block: string; // e.g., "Block A"
  floor: string; // e.g., "Ground Floor"
  sqFt: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  ownerId: string | null; // references Owner.id (type 'owner')
  renterId: string | null; // references Owner.id (type 'renter')
  fixedMaintenance: number; // e.g., 700 (INR)
  transferFeeTriggered: boolean; // if true, add one-time 2500 INR transfer fee
  documents?: ShadeDocument[]; // attached PDFs / images (lease, ownership proof, etc.)
}

export interface Owner {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  type: 'owner' | 'renter';
  status: 'active' | 'inactive';
  companyName?: string;
}

export interface Invoice {
  id: string; // e.g., "KIN-2026-0001"
  shadeId: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  renterId: string | null;
  renterName: string | null;
  renterPhone: string | null;
  maintenanceFee: number; // calculated base maintenance (adjusted for billingMonths)
  billingMonths: number; // e.g. 1, 2, 3, etc.
  otherMaintenanceName: string; // e.g., "plumbing"
  otherMaintenanceCharge: number;
  transferFee: number; // 2500 or 0
  totalAmount: number; // sum of everything
  generatedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod: 'cash' | 'cheque' | 'online' | 'bank_transfer' | null;
  paymentDate: string | null;
  transactionDetails?: string; // Cheque number, UPI ref, etc.
}

export interface Payment {
  id: string;
  date: string;
  invoiceId: string | null;
  tenantName: string;
  shadeId: string;
  amount: number;
  method: 'Cash' | 'Cheque' | 'Bank Transfer' | 'UPI';
  reference: string;
}


export interface SystemSettings {
  defaultMaintenance: number; // ₹720
  transferFee: number; // ₹2500
  upiId: string; // e.g., "vibrantcommunity@oksbi"
  qrImageUrl: string; // Simulated QR image
  societyName: string;
  societyAddress: string;
  societyPhone: string;
  societyBankDetails: string;
  invoiceTitle: string;
  invoicePrefix: string; // e.g. "KIN" → KIN-2026-0001
  invoiceNotes: string;
  reminderDays: number[]; // e.g. [3, 1] = send 3 days before & 1 day before due date
  analyticsYear: number; // year to show in dashboard analytics
}

export interface AdminRole {
  id: string;
  name: string;
  role: 'Admin' | 'Secretary' | 'Treasurer';
  email: string;
  avatar: string;
}

export interface ChangeRequest {
  id: string;
  requesterRole: string;
  requesterName: string;
  type: 'edit_shade' | 'update_settings' | 'reset_db';
  targetId?: string; // e.g. shadeId
  details: string;
  data: string; // JSON string payload
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export interface AuditLog {
  id: string;
  action: 'invoice_created' | 'invoice_edited' | 'invoice_deleted' | 'invoice_voided' |
          'owner_added' | 'owner_updated' | 'tenant_added' | 'tenant_updated' |
          'payment_marked' | 'payment_deleted' |
          'shade_added' | 'shade_updated' | 'shade_transferred' |
          'settings_changed' | 'database_reset' | 'whatsapp_sent';
  entity: string; // e.g. "Invoice KIN-2026-0001" or "Owner Ramesh Shah"
  performedBy: string; // admin name
  role: string; // admin role
  timestamp: string; // ISO datetime
  details?: string; // extra context
}
