import React, { useState } from 'react';
import { Search, Plus, FileText, Download, Upload, Edit2, Trash2 } from 'lucide-react';
import type { Payment, Invoice } from '../types';

interface PaymentsViewProps {
  payments: Payment[];
  invoices: Invoice[];
  currentDate: string;
  onRecordPayment: (payment: Omit<Payment, 'id'>) => void;
  onDeletePayment: (paymentId: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  invoices,
  currentDate,
  onRecordPayment,
  onDeletePayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form states
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [tenantName, setTenantName] = useState('');
  const [shadeId, setShadeId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'Cash' | 'Cheque' | 'Bank Transfer' | 'UPI'>('Cash');
  const [reference, setReference] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Populate form if invoice selected
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) {
      setTenantName('');
      setShadeId('');
      setAmount(0);
      return;
    }
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setTenantName(inv.renterName || inv.ownerName);
      setShadeId(inv.shadeId);
      setAmount(inv.totalAmount);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim() || !shadeId.trim() || amount <= 0) {
      alert('Please fill out all fields correctly.');
      return;
    }

    onRecordPayment({
      date: paymentDate,
      invoiceId: selectedInvoiceId || null,
      tenantName,
      shadeId,
      amount,
      method,
      reference: reference || '—'
    });

    // Reset
    setSelectedInvoiceId('');
    setTenantName('');
    setShadeId('');
    setAmount(0);
    setMethod('Cash');
    setReference('');
    setIsRecordModalOpen(false);
  };

  // Calculations for stats cards
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const avgPayment = payments.length > 0 ? Math.round(totalCollected / payments.length) : 0;
  
  const currentMonthPrefix = currentDate.slice(0, 7);
  const thisMonthPayments = payments
    .filter(p => p.date.startsWith(currentMonthPrefix))
    .reduce((sum, p) => sum + p.amount, 0);
  const currentMonthLabel = new Date(currentDate).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const filteredPayments = payments.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.tenantName.toLowerCase().includes(search) ||
      p.shadeId.toLowerCase().includes(search) ||
      (p.invoiceId && p.invoiceId.toLowerCase().includes(search)) ||
      p.reference.toLowerCase().includes(search) ||
      p.method.toLowerCase().includes(search)
    );
  });

  return (
    <div className="payments-view">
      {/* Top Header stats */}
      <div className="tools-bar" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Payments</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {payments.length} transactions • linked to invoices
          </p>
        </div>
        
        <div className="tools-actions">
          <button className="btn btn-secondary btn-sm" title="Template helper"><FileText size={14} /> Template</button>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-secondary btn-sm"><Upload size={14} /> Import</button>
          <button className="btn btn-primary" onClick={() => setIsRecordModalOpen(true)}>
            <Plus size={16} /> Receipt Payment
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card metric-emerald">
          <div className="metric-header">
            <span className="metric-title">Total Collected</span>
            <div className="metric-icon-box">
              <Download size={20} />
            </div>
          </div>
          <div className="metric-value">{formatCurrency(totalCollected)}</div>
          <div className="metric-trend up">
            <span>{payments.length} transactions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Avg Per Payment</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="metric-value">{formatCurrency(avgPayment)}</div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>Across all registry bills</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderColor: 'var(--primary)' }}>
          <div className="metric-header">
            <span className="metric-title">This Month</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Download size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>{formatCurrency(thisMonthPayments)}</div>
          <div className="metric-trend up" style={{ color: 'var(--primary)' }}>
            <span>{currentMonthLabel} Collected</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="tools-bar">
        <div className="search-input-wrapper" style={{ maxWidth: '100%' }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by tenant, invoice, reference..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>INVOICE</th>
              <th>TENANT</th>
              <th>SHADE</th>
              <th>AMOUNT</th>
              <th>METHOD</th>
              <th>REFERENCE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map(p => (
              <tr key={p.id}>
                <td>{p.date}</td>
                <td>
                  {p.invoiceId ? (
                    <strong style={{ color: 'var(--primary)' }}>{p.invoiceId}</strong>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td><strong>{p.tenantName}</strong></td>
                <td>Shade {p.shadeId}</td>
                <td>
                  <strong style={{ color: 'var(--color-success)' }}>
                    +{formatCurrency(p.amount)}
                  </strong>
                </td>
                <td>
                  <span className={`badge badge-${
                    p.method === 'Cash' ? 'active' :
                    p.method === 'Cheque' ? 'pending' :
                    p.method === 'Bank Transfer' ? 'sent' : 'occupied'
                  }`}>
                    {p.method}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{p.reference}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      title="Edit Transaction Receipt"
                      onClick={() => alert('Editing logged transaction...')}
                      style={{ padding: '4px' }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm text-danger"
                      title="Delete Transaction Receipt"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this payment receipt? This does not alter invoice state.')) {
                          onDeletePayment(p.id);
                        }
                      }}
                      style={{ padding: '4px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No payment transactions found in database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Payment Modal */}
      {isRecordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Generate Payment Receipt</h3>
              <button className="modal-close" onClick={() => setIsRecordModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Date*</label>
                    <input 
                      type="date"
                      className="form-control"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Link to Unpaid Invoice</label>
                    <select 
                      className="form-control"
                      value={selectedInvoiceId}
                      onChange={(e) => handleInvoiceChange(e.target.value)}
                    >
                      <option value="">-- None (Advance/Direct) --</option>
                      {invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').map(i => (
                        <option key={i.id} value={i.id}>
                          {i.id} - {i.shadeId} ({i.renterName || i.ownerName}) - {formatCurrency(i.totalAmount)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Payer Name*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Sunita Sharma"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Shade ID*</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="e.g. SH-001"
                      value={shadeId}
                      onChange={(e) => setShadeId(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount Collected (₹)*</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                      required
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Method*</label>
                    <select 
                      className="form-control"
                      value={method}
                      onChange={(e) => setMethod(e.target.value as Payment['method'])}
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="Cheque">✍️ Cheque</option>
                      <option value="Bank Transfer">🏦 Bank Transfer</option>
                      <option value="UPI">⚡ UPI</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Reference Details</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Cheque No, UPI Ref or Receipt ID"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRecordModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
