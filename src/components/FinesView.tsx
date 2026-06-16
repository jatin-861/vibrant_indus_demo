import React, { useState } from 'react';
import { Search, Plus, FileText, Download, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import type { FineRecord, Shade, Invoice } from '../types';

interface FinesViewProps {
  fines: FineRecord[];
  shades: Shade[];
  invoices: Invoice[];
  onAddFine: (fine: Omit<FineRecord, 'id'>) => void;
  onDeleteFine: (fineId: string) => void;
  onPayFine: (fineId: string) => void;
}

export const FinesView: React.FC<FinesViewProps> = ({
  fines,
  shades,
  invoices,
  onAddFine,
  onDeleteFine,
  onPayFine
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Form states
  const [fineDate, setFineDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedShadeId, setSelectedShadeId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('Late payment fee');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleShadeChange = (sId: string) => {
    setSelectedShadeId(sId);
    if (!sId) {
      setMemberName('');
      return;
    }
    const shade = shades.find(s => s.id === sId);
    if (shade) {
      // Find the associated invoice to get owner/tenant name or just fallback
      const relatedInvoice = invoices.find(i => i.shadeId === sId && i.status !== 'paid');
      if (relatedInvoice) {
        setMemberName(relatedInvoice.renterName || relatedInvoice.ownerName);
        setSelectedInvoiceId(relatedInvoice.id);
      } else {
        setMemberName('Member / Occupant');
        setSelectedInvoiceId('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShadeId || !memberName.trim() || amount <= 0 || !reason.trim()) {
      alert('Please fill out all fields correctly.');
      return;
    }

    onAddFine({
      shadeId: selectedShadeId,
      invoiceId: selectedInvoiceId || null,
      ownerName: memberName,
      amount,
      reason,
      date: fineDate,
      status: 'unpaid'
    });

    // Reset
    setSelectedShadeId('');
    setSelectedInvoiceId('');
    setMemberName('');
    setAmount(0);
    setReason('Late payment fee');
    setIsApplyModalOpen(false);
  };

  // Calculations for stats cards
  const totalFinesIssued = fines.reduce((sum, f) => sum + f.amount, 0);
  const unpaidFines = fines.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
  const collectedFines = fines.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);

  const filteredFines = fines.filter(f => {
    const search = searchTerm.toLowerCase();
    return (
      f.ownerName.toLowerCase().includes(search) ||
      f.shadeId.toLowerCase().includes(search) ||
      f.reason.toLowerCase().includes(search) ||
      (f.invoiceId && f.invoiceId.toLowerCase().includes(search))
    );
  });

  return (
    <div className="fines-view">
      {/* Top Header stats */}
      <div className="tools-bar" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Fines & Penalties</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Late payment charges • {fines.length} records
          </p>
        </div>
        
        <div className="tools-actions">
          <button className="btn btn-secondary btn-sm"><FileText size={14} /> Template</button>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-secondary btn-sm"><Upload size={14} /> Import</button>
          <button className="btn btn-danger" onClick={() => setIsApplyModalOpen(true)}>
            <Plus size={16} /> Apply Fine
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card metric-red">
          <div className="metric-header">
            <span className="metric-title">Total Fines Issued</span>
            <div className="metric-icon-box">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-value">{formatCurrency(totalFinesIssued)}</div>
          <div className="metric-trend down">
            <span>{fines.length} records in database</span>
          </div>
        </div>

        <div className="metric-card metric-amber">
          <div className="metric-header">
            <span className="metric-title">Unpaid</span>
            <div className="metric-icon-box">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-value">{formatCurrency(unpaidFines)}</div>
          <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
            <span>{fines.filter(f => f.status === 'unpaid').length} pending collection</span>
          </div>
        </div>

        <div className="metric-card metric-emerald">
          <div className="metric-header">
            <span className="metric-title">Collected</span>
            <div className="metric-icon-box">
              <Download size={20} />
            </div>
          </div>
          <div className="metric-value">{formatCurrency(collectedFines)}</div>
          <div className="metric-trend up">
            <span>{fines.filter(f => f.status === 'paid').length} payments recorded</span>
          </div>
        </div>
      </div>

      {/* Warning Policy Banner */}
      <div className="alert-banner" style={{ backgroundColor: 'var(--color-pending-bg)', borderColor: '#fde68a', color: '#b45309', marginBottom: '24px' }}>
        <div className="alert-content" style={{ color: '#b45309' }}>
          <AlertTriangle size={20} />
          <span>
            <strong>Policy:</strong> 10% of base rent after due date. Applied monthly on unresolved overdue invoices.
          </span>
        </div>
      </div>

      {/* Search Bar */}
      {fines.length > 0 && (
        <div className="tools-bar">
          <div className="search-input-wrapper" style={{ maxWidth: '100%' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search by member, shade, reason..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      {fines.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', minHeight: '300px' }}>
          <AlertTriangle size={48} style={{ color: 'var(--color-pending)', marginBottom: '16px' }} />
          <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No fines recorded</h4>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setIsApplyModalOpen(true)}
            style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
          >
            Apply first fine →
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>SHADE</th>
                <th>INVOICE #</th>
                <th>MEMBER</th>
                <th>FINE AMOUNT</th>
                <th>REASON</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredFines.map(f => (
                <tr key={f.id}>
                  <td>{f.date}</td>
                  <td><strong>Shade {f.shadeId}</strong></td>
                  <td>
                    {f.invoiceId ? (
                      <strong style={{ color: 'var(--primary)' }}>{f.invoiceId}</strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>{f.ownerName}</td>
                  <td>
                    <strong className="text-danger">
                      +{formatCurrency(f.amount)}
                    </strong>
                  </td>
                  <td>{f.reason}</td>
                  <td>
                    <span className={`badge badge-${f.status === 'paid' ? 'paid' : 'overdue'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {f.status === 'unpaid' && (
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => onPayFine(f.id)}
                          style={{ padding: '4px 8px' }}
                        >
                          Mark Paid
                        </button>
                      )}
                      <button 
                        className="btn btn-secondary btn-sm text-danger"
                        title="Delete Fine Penalty"
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this fine entry?')) {
                            onDeleteFine(f.id);
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
              {filteredFines.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No penalty records found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Apply Fine Modal */}
      {isApplyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Apply Penalty / Fine</h3>
              <button className="modal-close" onClick={() => setIsApplyModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Fine Date*</label>
                    <input 
                      type="date"
                      className="form-control"
                      value={fineDate}
                      onChange={(e) => setFineDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Select Shade / Unit*</label>
                    <select 
                      className="form-control"
                      value={selectedShadeId}
                      onChange={(e) => handleShadeChange(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Shade --</option>
                      {shades.filter(s => s.status === 'occupied').map(s => (
                        <option key={s.id} value={s.id}>
                          {s.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Member Name (Auto-fetched or Type)*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fine Amount (₹)*</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                      required
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Link to Unpaid Invoice (Optional)</label>
                    <select 
                      className="form-control"
                      value={selectedInvoiceId}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    >
                      <option value="">-- None (Direct society penalty) --</option>
                      {invoices.filter(i => i.shadeId === selectedShadeId && i.status !== 'paid').map(i => (
                        <option key={i.id} value={i.id}>
                          {i.id} - {formatCurrency(i.totalAmount)} (due {i.dueDate})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason for Fine / Penalty*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Late payment fee, property damage, illegal occupancy, etc."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsApplyModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-danger">Apply Fine</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
