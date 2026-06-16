import React, { useState } from 'react';
import {
  Search,
  Trash2,
  CheckSquare,
  Plus,
  MessageSquare,
  Printer,
  Edit2,
  FileText,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Invoice, Shade, Owner, SystemSettings } from '../types';

interface InvoicesViewProps {
  invoices: Invoice[];
  shades: Shade[];
  owners: Owner[];
  settings: SystemSettings;
  onGenerateSingleInvoice: (
    shadeId: string, 
    dueDate: string,
    newWaterReading: number,
    otherName: string,
    otherCharge: number,
    billingMonths: number
  ) => void;
  onUpdateInvoiceStatus: (invoiceId: string, status: Invoice['status'], paymentMethod?: Invoice['paymentMethod'], details?: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onSendWhatsApp: (invoiceId: string) => void;
  onUpdateInvoice: (oldId: string, updatedInvoice: Invoice) => void;
  preselectedShadeId?: string | null;
  clearPreselectedShadeId?: () => void;
  onBulkImportInvoices?: (invoices: Invoice[]) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  shades,
  owners,
  settings,
  onGenerateSingleInvoice,
  onUpdateInvoiceStatus,
  onDeleteInvoice,
  onSendWhatsApp,
  onUpdateInvoice,
  preselectedShadeId,
  clearPreselectedShadeId,
  onBulkImportInvoices
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isSingleGenOpen, setIsSingleGenOpen] = useState(false);
  const [paymentLogInvoice, setPaymentLogInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  
  // Edit Invoice Dialog States
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [originalInvoiceId, setOriginalInvoiceId] = useState('');

  // Individual Form states
  const [selectedShadeId, setSelectedShadeId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [newWaterReading, setNewWaterReading] = useState<number>(0);
  const [otherName, setOtherName] = useState('');
  const [otherCharge, setOtherCharge] = useState<number>(0);
  const [billingMonths, setBillingMonths] = useState<number>(2);
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque' | 'online' | 'bank_transfer'>('cash');
  const [transactionRef, setTransactionRef] = useState('');

  const handleShadeChange = (sId: string) => {
    setSelectedShadeId(sId);
    if (!sId) {
      setNewWaterReading(0);
      return;
    }
    const shade = shades.find(s => s.id === sId);
    if (shade) {
      setNewWaterReading(shade.currentWaterReading || shade.lastWaterReading);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (preselectedShadeId) {
      handleShadeChange(preselectedShadeId);
      setIsSingleGenOpen(true);
      if (clearPreselectedShadeId) {
        clearPreselectedShadeId();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedShadeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredInvoices = invoices.filter(inv => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      inv.id.toLowerCase().includes(search) ||
      inv.ownerName.toLowerCase().includes(search) ||
      (inv.renterName && inv.renterName.toLowerCase().includes(search)) ||
      inv.shadeId.toLowerCase().includes(search);
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && inv.status === statusFilter;
  });

  const handleSingleGenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShadeId) return;

    onGenerateSingleInvoice(
      selectedShadeId, 
      dueDate, 
      newWaterReading, 
      otherName, 
      otherCharge, 
      billingMonths
    );
    
    // Reset Form
    setSelectedShadeId('');
    setNewWaterReading(0);
    setOtherName('');
    setOtherCharge(0);
    setBillingMonths(2);
    setIsSingleGenOpen(false);
  };


  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentLogInvoice) return;

    onUpdateInvoiceStatus(
      paymentLogInvoice.id, 
      'paid', 
      paymentMethod, 
      transactionRef || (paymentMethod === 'cheque' ? 'Cheque Payment Logged' : 'Office Cash Payment')
    );
    
    setPaymentLogInvoice(null);
    setTransactionRef('');
  };

  const handleEditInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    // Recalculate water usage charge just in case reading values changed
    const oldWater = editingInvoice.oldWaterReading;
    const newWater = editingInvoice.newWaterReading;
    const waterUnits = newWater - oldWater;
    const waterCost = waterUnits > 0 ? waterUnits * settings.waterRate : 0;

    const updatedInvoiceWithWaterCost = {
      ...editingInvoice,
      waterUsageCharge: waterCost
    };

    onUpdateInvoice(originalInvoiceId, updatedInvoiceWithWaterCost);
    setEditingInvoice(null);
  };

  const handleExportCSV = () => {
    const header = "id,shadeId,ownerName,renterName,maintenanceFee,waterUsageCharge,otherMaintenanceCharge,otherMaintenanceName,transferFee,fineAmount,totalAmount,generatedDate,dueDate,status,paymentMethod,paymentDate\n";
    const csvContent = invoices.map(i => 
      `${i.id},${i.shadeId},"${i.ownerName || ''}","${i.renterName || ''}",${i.maintenanceFee},${i.waterUsageCharge},${i.otherMaintenanceCharge},"${i.otherMaintenanceName || ''}",${i.transferFee},${i.fineAmount},${i.totalAmount},${i.generatedDate},${i.dueDate},${i.status},${i.paymentMethod || ''},${i.paymentDate || ''}`
    ).join("\n");
    
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const parseRows = (rows: string[][]): Invoice[] => {
      const newInvoices: Invoice[] = [];
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].map(c => String(c ?? '').trim());
        if (cols.length < 10) continue;
        const sId = cols[1];
        const shade = shades.find(s => s.id === sId);
        const oId = shade?.ownerId || '';
        const owner = owners.find(o => o.id === oId);
        const rId = shade?.renterId || null;
        const renter = rId ? owners.find(o => o.id === rId) : null;
        newInvoices.push({
          id: cols[0],
          shadeId: sId,
          ownerId: oId,
          ownerName: cols[2] || owner?.name || '',
          ownerPhone: owner?.phone || '',
          renterId: rId,
          renterName: cols[3] || renter?.name || null,
          renterPhone: renter?.phone || null,
          maintenanceFee: parseFloat(cols[4]) || 0,
          waterUsageCharge: parseFloat(cols[5]) || 0,
          oldWaterReading: 0,
          newWaterReading: 0,
          otherMaintenanceCharge: parseFloat(cols[6]) || 0,
          otherMaintenanceName: cols[7] || '',
          transferFee: parseFloat(cols[8]) || 0,
          fineAmount: parseFloat(cols[9]) || 0,
          totalAmount: parseFloat(cols[10]) || 0,
          generatedDate: cols[11] || '',
          dueDate: cols[12] || '',
          status: (cols[13] as Invoice['status']) || 'draft',
          paymentMethod: (cols[14] as Invoice['paymentMethod']) || null,
          paymentDate: cols[15] || null,
          billingMonths: 2,
        });
      }
      return newInvoices;
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let rows: string[][];
        if (isXlsx) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        } else {
          const text = event.target?.result as string;
          rows = text.split('\n').filter(l => l.trim()).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        }
        const newInvoices = parseRows(rows);
        if (newInvoices.length > 0 && onBulkImportInvoices) {
          onBulkImportInvoices(newInvoices);
        } else if (newInvoices.length === 0) {
          alert('No valid rows found. Ensure the file matches the expected format.');
        }
      } catch {
        alert('Error parsing file. Please check the format and try again.');
      }
    };
    if (isXlsx) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
    e.target.value = '';
  };

  // Helper values for preview
  const previewShade = shades.find(s => s.id === selectedShadeId);
  const previewOwner = previewShade ? owners.find(o => o.id === previewShade.ownerId) : null;
  const previewRenter = previewShade && previewShade.renterId ? owners.find(o => o.id === previewShade.renterId) : null;
  
  const previewOldWater = previewShade ? previewShade.lastWaterReading : 0;
  const previewWaterUnits = Math.max(0, newWaterReading - previewOldWater);
  const previewWaterCharge = previewWaterUnits * settings.waterRate;
  
  const previewFixedMaintenance = previewShade ? Math.round((previewShade.fixedMaintenance / 2) * billingMonths) : 0;
  const previewTransferFee = previewShade && previewShade.transferFeeTriggered ? settings.transferFee : 0;
  const previewTotal = previewFixedMaintenance + previewWaterCharge + otherCharge + previewTransferFee;

  return (
    <div className="invoices-view">
      {/* Search and Action Toolbar */}
      <div className="tools-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by invoice #, tenant, owner, shade..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="tools-actions">
          <select 
            className="form-control" 
            style={{ width: '140px', padding: '8px 12px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent (WhatsApp)</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button className="btn btn-secondary" onClick={handleExportCSV}>
            Export CSV
          </button>

          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
            Import Excel / CSV
            <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleImportCSV} />
          </label>

          <button className="btn btn-primary" onClick={() => setIsSingleGenOpen(true)}>
            <Plus size={16} /> Individual Invoice
          </button>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>INVOICE #</th>
              <th>TENANT / MEMBER</th>
              <th>SHADE</th>
              <th>MAINTENANCE</th>
              <th>LATE FINE</th>
              <th>TOTAL DUE</th>
              <th>DUE DATE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(inv => {
              // Combined maintenance column = maintenanceFee + waterUsageCharge + otherMaintenanceCharge + transferFee
              const combinedMaintenance = inv.maintenanceFee + inv.waterUsageCharge + inv.otherMaintenanceCharge + inv.transferFee;
              const tenantDisplay = inv.renterName || inv.ownerName;
              return (
                <tr key={inv.id}>
                  <td><strong>{inv.id}</strong></td>
                  <td>
                    <div>
                      <strong>{tenantDisplay}</strong>
                      {inv.renterName && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>
                          Owner: {inv.ownerName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td><strong>{inv.shadeId}</strong></td>
                  <td>
                    {combinedMaintenance > 0 ? (
                      <span title={`Base: ${inv.maintenanceFee}, Water: ${inv.waterUsageCharge}, Other: ${inv.otherMaintenanceCharge}, Transfer: ${inv.transferFee}`}>
                        {formatCurrency(combinedMaintenance)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>₹0</span>
                    )}
                  </td>
                  <td>
                    {inv.fineAmount > 0 ? (
                      <span className="text-danger" style={{ fontWeight: '600' }}>
                        {formatCurrency(inv.fineAmount)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td><strong>{formatCurrency(inv.totalAmount)}</strong></td>
                  <td>{inv.dueDate}</td>
                  <td>
                    <span className={`badge badge-${inv.status}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button 
                          className="btn btn-success btn-sm"
                          title="Record Cash/Cheque Payment"
                          onClick={() => setPaymentLogInvoice(inv)}
                          style={{ padding: '4px 8px' }}
                        >
                          <CheckSquare size={12} /> Log
                        </button>
                      )}
                      
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          title="Dispatch WhatsApp Invoice & QR Link"
                          onClick={() => onSendWhatsApp(inv.id)}
                          style={{ color: '#075e54', borderColor: '#075e54', padding: '4px 8px' }}
                        >
                          <MessageSquare size={12} /> Send
                        </button>
                      )}

                      <button 
                        className="btn btn-secondary btn-sm"
                        title="Print / View Invoice Details"
                        onClick={() => setViewingInvoice(inv)}
                        style={{ padding: '4px 8px' }}
                      >
                        <FileText size={12} /> View
                      </button>

                      <button 
                        className="btn btn-secondary btn-sm"
                        title="Edit Invoice Details"
                        onClick={() => {
                          setEditingInvoice(inv);
                          setOriginalInvoiceId(inv.id);
                        }}
                        style={{ padding: '4px 8px' }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>

                      <button 
                        className="btn btn-secondary btn-sm text-danger"
                        title="Cancel Invoice"
                        onClick={() => {
                          if (confirm(`Are you sure you want to cancel invoice ${inv.id}?`)) {
                            onDeleteInvoice(inv.id);
                          }
                        }}
                        style={{ padding: '4px 8px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No invoices found matching the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Individual Invoice Generation (with Live Preview) */}
      {isSingleGenOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: selectedShadeId ? '1000px' : '520px', width: '95%' }}>
            <div className="modal-header">
              <h3>Generate Individual Maintenance Invoice</h3>
              <button className="modal-close" onClick={() => setIsSingleGenOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSingleGenSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: selectedShadeId ? '1.2fr 1fr' : '1fr', gap: '32px', padding: '32px' }}>
                
                {/* Form Side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label>Select Shade / Unit*</label>
                    <select 
                      className="form-control"
                      required
                      value={selectedShadeId}
                      onChange={(e) => handleShadeChange(e.target.value)}
                    >
                      <option value="">-- Choose Shade --</option>
                      {shades.filter(s => s.status === 'occupied').map(s => (
                        <option key={s.id} value={s.id}>
                          {s.id} (Owner: {owners.find(o => o.id === s.ownerId)?.name || 'Unassigned'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedShadeId && (
                    <>
                      {previewShade && previewShade.hasWaterSupply !== false ? (
                        <>
                          <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                              <label>Old Water Reading (Units)</label>
                              <input 
                                type="number"
                                className="form-control"
                                readOnly
                                value={previewOldWater}
                              />
                            </div>

                            <div className="form-group" style={{ flex: 1 }}>
                              <label>New Water Reading (Units)*</label>
                              <input 
                                type="number"
                                className="form-control"
                                required
                                min={previewOldWater}
                                value={newWaterReading}
                                onChange={(e) => setNewWaterReading(parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>

                          <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-info-bg)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-info)', fontWeight: '500', marginBottom: '12px' }}>
                            Calculated consumption: <strong>{previewWaterUnits} units</strong> (₹30/unit = ₹{previewWaterCharge})
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '10px 14px', backgroundColor: '#f1f5f9', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                          💧 No Water Supply registered for this unit. Water supply billing is bypassed.
                        </div>
                      )}

                      <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Other Maintenance Name</label>
                          <input 
                            type="text"
                            className="form-control"
                            placeholder="plumbing, wiring, cleaning, etc."
                            value={otherName}
                            onChange={(e) => setOtherName(e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Other Maintenance Charges (₹)</label>
                          <input 
                            type="number"
                            className="form-control"
                            value={otherCharge || ''}
                            onChange={(e) => setOtherCharge(parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Billing Period*</label>
                          <select 
                            className="form-control"
                            value={billingMonths}
                            onChange={(e) => setBillingMonths(parseInt(e.target.value) || 2)}
                          >
                            <option value="1">1 Month</option>
                            <option value="2">2 Months (Default)</option>
                            <option value="3">3 Months</option>
                            <option value="4">4 Months</option>
                            <option value="6">6 Months</option>
                            <option value="12">1 Year</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Due Date*</label>
                          <input 
                            type="date"
                            className="form-control"
                            required
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Live Preview Side */}
                {selectedShadeId && previewShade && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ margin: '0', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Live Invoice Mockup</h4>
                    
                    {/* Paper Mimicry */}
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', fontSize: '12px', flex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '12px' }}>
                        <div>
                          <h4 style={{ margin: '0', color: 'var(--primary)', fontWeight: '800' }}>{settings.societyName}</h4>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{settings.societyAddress}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ display: 'block' }}>DRAFT INVOICE</strong>
                          <span style={{ fontSize: '10px' }}>Shade Unit: {selectedShadeId}</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '9px', display: 'block', textTransform: 'uppercase' }}>Billed To:</span>
                          <strong>{previewRenter ? previewRenter.name : previewOwner?.name}</strong><br />
                          Phone: {previewRenter ? previewRenter.phone : previewOwner?.phone}<br />
                          {previewRenter && <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Owner: {previewOwner?.name}</span>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '9px', display: 'block', textTransform: 'uppercase' }}>Timeline:</span>
                          Generated: Today<br />
                          Due Date: <strong>{dueDate}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                        {previewFixedMaintenance > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Maintenance Fee ({billingMonths} month(s)):</span>
                            <strong>{formatCurrency(previewFixedMaintenance)}</strong>
                          </div>
                        )}
                        {previewWaterCharge > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Water Charge ({previewWaterUnits} units × ₹30):</span>
                            <strong>{formatCurrency(previewWaterCharge)}</strong>
                          </div>
                        )}
                        {otherCharge > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Other Charges ({otherName || 'plumbing/wiring'}):</span>
                            <strong>{formatCurrency(otherCharge)}</strong>
                          </div>
                        )}
                        {previewTransferFee > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                            <span>One-time Transfer Fee:</span>
                            <strong>{formatCurrency(previewTransferFee)}</strong>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        <span>Grand Total:</span>
                        <span>{formatCurrency(previewTotal)}</span>
                      </div>

                      <div style={{ marginTop: '12px', fontSize: '9px', color: 'var(--text-muted)', borderTop: '1px solid #f1f5f9', paddingTop: '6px', textAlign: 'center' }}>
                        No GST is collected. Click "Generate" to commit bill.
                      </div>
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSingleGenOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!selectedShadeId}>Generate Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Log Payment Modal */}
      {paymentLogInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Payment Receipt - {paymentLogInvoice.id}</h3>
              <button className="modal-close" onClick={() => setPaymentLogInvoice(null)}>×</button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  Total Invoice Amount to Collect: <strong>{formatCurrency(paymentLogInvoice.totalAmount)}</strong>
                </div>

                <div className="form-group">
                  <label>Payment Method*</label>
                  <select 
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'cheque' | 'online' | 'bank_transfer')}
                  >
                    <option value="cash">💵 Cash (Collected at Office)</option>
                    <option value="cheque">✍️ Cheque (Deposit Details)</option>
                    <option value="online">⚡ UPI (Simulated Payment)</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Transaction Reference / Cheque Number*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder={paymentMethod === 'cheque' ? "e.g., SBI Cheque No. 238190" : "e.g., UTR, UPI Ref ID, or receipt number"}
                    required
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPaymentLogInvoice(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Verify & Log Paid</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Invoice Modal */}
      {editingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>Edit Invoice Configuration ({originalInvoiceId})</h3>
              <button className="modal-close" onClick={() => setEditingInvoice(null)}>×</button>
            </div>
            <form onSubmit={handleEditInvoiceSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <h4 style={{ margin: '0', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', color: 'var(--primary)' }}>General Properties</h4>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Invoice Number / ID*</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingInvoice.id}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, id: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Shade Unit ID*</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingInvoice.shadeId}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, shadeId: e.target.value })}
                      required
                      readOnly
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Owner Name*</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingInvoice.ownerName}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, ownerName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Owner Phone*</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingInvoice.ownerPhone}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, ownerPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Renter Name (Tenant)</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingInvoice.renterName || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, renterName: e.target.value || null })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Renter Phone</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingInvoice.renterPhone || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, renterPhone: e.target.value || null })}
                    />
                  </div>
                </div>

                <h4 style={{ margin: '12px 0 0 0', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', color: 'var(--primary)' }}>Charges & Items</h4>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Base Maintenance (₹)*</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={editingInvoice.maintenanceFee}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, maintenanceFee: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                {(() => {
                  const editShade = shades.find(s => s.id === editingInvoice.shadeId);
                  if (editShade && editShade.hasWaterSupply !== false) {
                    return (
                      <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Old Water Reading*</label>
                          <input 
                            type="number" 
                            className="form-control"
                            value={editingInvoice.oldWaterReading}
                            onChange={(e) => setEditingInvoice({ ...editingInvoice, oldWaterReading: parseInt(e.target.value) || 0 })}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>New Water Reading*</label>
                          <input 
                            type="number" 
                            className="form-control"
                            value={editingInvoice.newWaterReading}
                            onChange={(e) => setEditingInvoice({ ...editingInvoice, newWaterReading: parseInt(e.target.value) || 0 })}
                            required
                          />
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div style={{ padding: '10px', backgroundColor: '#f1f5f9', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        💧 No Water Supply registered for this unit. Water supply billing is bypassed.
                      </div>
                    );
                  }
                })()}

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Other Maintenance Name</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingInvoice.otherMaintenanceName}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, otherMaintenanceName: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Other Maintenance Charges (₹)</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={editingInvoice.otherMaintenanceCharge}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, otherMaintenanceCharge: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Transfer Fee (₹)</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={editingInvoice.transferFee}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, transferFee: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Late Penalty fine (₹)</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={editingInvoice.fineAmount}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, fineAmount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <h4 style={{ margin: '12px 0 0 0', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', color: 'var(--primary)' }}>Billing Schedule & Status</h4>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Generated Date (YYYY-MM-DD)*</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={editingInvoice.generatedDate}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, generatedDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Due Date (YYYY-MM-DD)*</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={editingInvoice.dueDate}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Billing Months*</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={editingInvoice.billingMonths}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, billingMonths: parseInt(e.target.value) || 2 })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Invoice Status*</label>
                    <select 
                      className="form-control"
                      value={editingInvoice.status}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, status: e.target.value as Invoice['status'] })}
                      required
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {editingInvoice.status === 'paid' && (
                  <div style={{ padding: '12px', border: '1px solid #10b981', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h5 style={{ margin: '0', color: 'var(--color-success)', fontSize: '13px' }}>Payment Cleared Information</h5>
                    <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Payment Method</label>
                        <select 
                          className="form-control"
                          value={editingInvoice.paymentMethod || 'online'}
                          onChange={(e) => setEditingInvoice({ ...editingInvoice, paymentMethod: e.target.value as Invoice['paymentMethod'] })}
                        >
                          <option value="online">⚡ UPI / Online</option>
                          <option value="cash">💵 Cash</option>
                          <option value="cheque">✍️ Cheque</option>
                          <option value="bank_transfer">🏦 Bank Transfer</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Cleared Date</label>
                        <input 
                          type="date" 
                          className="form-control"
                          value={editingInvoice.paymentDate || ''}
                          onChange={(e) => setEditingInvoice({ ...editingInvoice, paymentDate: e.target.value || null })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Reference Details (Cheque # or UPI Transaction UTR)</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="e.g. UPI Ref 382910398 or Cheque 893122"
                        value={editingInvoice.transactionDetails || ''}
                        onChange={(e) => setEditingInvoice({ ...editingInvoice, transactionDetails: e.target.value })}
                      />
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingInvoice(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Config Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: View Invoice Details (Print Simulator Letterhead) */}
      {viewingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content large" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3>Society Invoice Detail Print Panel</h3>
              <button className="modal-close" onClick={() => setViewingInvoice(null)}>×</button>
            </div>
            <div className="modal-body" style={{ backgroundColor: '#eaeef2', padding: '24px' }}>
              {/* Paper Invoice Mockup (Letterhead style) */}
              <div id="printable-area" style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '40px', borderRadius: '4px', boxShadow: '0 8px 16px rgba(0,0,0,0.06)', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', position: 'relative' }}>
                
                {/* Ribbon decoration for status */}
                <div style={{ position: 'absolute', top: '0', right: '40px', padding: '6px 16px', background: viewingInvoice.status === 'paid' ? '#10b981' : viewingInvoice.status === 'overdue' ? '#ef4444' : '#64748b', color: 'white', fontSize: '11px', fontWeight: '800', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {viewingInvoice.status}
                </div>

                {/* Society Letterhead Title block */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px double #cbd5e1', paddingBottom: '16px', marginBottom: '24px' }}>
                  <div>
                    <h1 style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '24px', margin: '0', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
                      {settings.societyName}
                    </h1>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '500' }}>
                      {settings.societyAddress} | Office Tel: {settings.societyPhone}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                     <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#64748b', letterSpacing: '1px' }}>{settings.invoiceTitle || 'DEMAND INVOICE'}</h3>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace' }}>{viewingInvoice.id}</span>
                  </div>
                </div>

                {/* Member / Date Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '32px', fontSize: '12px', lineHeight: '1.6' }}>
                  <div>
                    <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '9px', fontWeight: '700', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>Member Occupant Details:</span>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{viewingInvoice.renterName || viewingInvoice.ownerName}</strong><br />
                    Shade Unit ID: <strong style={{ color: 'var(--primary)' }}>{viewingInvoice.shadeId}</strong><br />
                    WhatsApp Contacts: {viewingInvoice.renterPhone || viewingInvoice.ownerPhone}<br />
                    {viewingInvoice.renterId && (
                      <div style={{ marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase', display: 'block' }}>Primary Registered Landlord:</span>
                        <strong>{viewingInvoice.ownerName}</strong> ({viewingInvoice.ownerPhone})
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '9px', fontWeight: '700', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>Invoice Timeline:</span>
                    <div>Billing Cycle Period: <strong>{viewingInvoice.billingMonths} month(s)</strong></div>
                    <div>Generation Date: <strong>{viewingInvoice.generatedDate}</strong></div>
                    <div>Due Payment Date: <strong style={{ textDecoration: 'underline', color: 'var(--color-danger)' }}>{viewingInvoice.dueDate}</strong></div>
                  </div>
                </div>

                {/* Itemized Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '28px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', fontWeight: '700', color: '#475569' }}>
                      <th style={{ padding: '10px 8px', width: '50%' }}>Description of Maintenance / Lease Charges</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Billing Logic</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', width: '20%' }}>Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>


                    {/* 2. Fixed Maintenance */}
                    {viewingInvoice.maintenanceFee > 0 && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <strong>Fixed Infrastructure Maintenance</strong><br />
                          <span style={{ fontSize: '10px', color: '#64748b' }}>Common area facilities fee (₹350/month base multiplier)</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#64748b' }}>{viewingInvoice.billingMonths} mo × ₹350</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(viewingInvoice.maintenanceFee)}</td>
                      </tr>
                    )}
                    
                    {/* 3. Water Meter Charge */}
                    {viewingInvoice.newWaterReading > viewingInvoice.oldWaterReading && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <strong>Water Meter Supply Charge</strong><br />
                          <span style={{ fontSize: '10px', color: '#64748b' }}>Meter: {viewingInvoice.oldWaterReading} to {viewingInvoice.newWaterReading} units</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#64748b' }}>
                          {viewingInvoice.newWaterReading - viewingInvoice.oldWaterReading} units × ₹30
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(viewingInvoice.waterUsageCharge)}</td>
                      </tr>
                    )}

                    {/* 4. Other Custom Maintenance */}
                    {viewingInvoice.otherMaintenanceCharge > 0 && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <strong>Custom Maintenance ({viewingInvoice.otherMaintenanceName || 'Repair Works'})</strong><br />
                          <span style={{ fontSize: '10px', color: '#64748b' }}>Approved on-site repairs or services</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#64748b' }}>Direct charge</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(viewingInvoice.otherMaintenanceCharge)}</td>
                      </tr>
                    )}

                    {/* 5. Transfer Fee */}
                    {viewingInvoice.transferFee > 0 && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <strong>One-time Registration / Transfer Fee</strong><br />
                          <span style={{ fontSize: '10px', color: '#64748b' }}>Assigned member record updates</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#64748b' }}>Global rate</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(viewingInvoice.transferFee)}</td>
                      </tr>
                    )}

                    {/* 6. Late Penalty fine */}
                    {viewingInvoice.fineAmount > 0 && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: 'var(--color-danger)' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <strong>Late Payment Fines & Accrued Penalties</strong><br />
                          <span style={{ fontSize: '10px', color: '#ef4444' }}>Imposed daily rate after grace days limit</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>Accrued penalty</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>+{formatCurrency(viewingInvoice.fineAmount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Total and Bank Details Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px', borderTop: '2px solid #cbd5e1', paddingTop: '16px' }}>
                  
                  {/* Left: Bank Details & UPI QR */}
                  <div style={{ fontSize: '11px', display: 'flex', gap: '16px', borderRight: '1px solid #e2e8f0', paddingRight: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <span style={{ textTransform: 'uppercase', fontWeight: '700', color: '#94a3b8', fontSize: '9px', letterSpacing: '0.5px' }}>Remittance Instructions:</span>
                      <div><strong>Deposit Bank Account:</strong><br />{settings.societyBankDetails}</div>
                      <div><strong>UPI Identifier:</strong><br />{settings.upiId}</div>
                      <div style={{ color: '#64748b', fontSize: '9px', marginTop: '4px' }}>
                        *Please share bank receipts or UTR transaction codes via WhatsApp once payment is made.
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=upi://pay?pa=${settings.upiId}%26pn=${encodeURIComponent(settings.societyName)}%26am=${viewingInvoice.totalAmount}`} 
                        alt="UPI Payment QR Code" 
                        style={{ border: '1px solid #cbd5e1', padding: '4px', background: '#fff', borderRadius: '4px', width: '80px', height: '80px' }}
                      />
                      <span style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px', fontWeight: '700' }}>SCAN TO PAY UPI</span>
                    </div>
                  </div>

                  {/* Right: Totals summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '8px', fontSize: '12px' }}>
                    <div className="flex-between" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                      <span>Amount Due:</span>
                      <span>{formatCurrency(viewingInvoice.totalAmount)}</span>
                    </div>

                    {viewingInvoice.status === 'paid' ? (
                      <div style={{ padding: '8px', border: '1px dashed #10b981', color: '#10b981', borderRadius: '4px', fontSize: '11px', textAlign: 'center', backgroundColor: '#ecfdf5', fontWeight: '600' }}>
                        RECEIVED WITH THANKS<br />
                        <span style={{ fontSize: '9px', fontWeight: 'normal' }}>
                          Cleared on {viewingInvoice.paymentDate} ({viewingInvoice.paymentMethod?.toUpperCase()})<br />
                          Ref: {viewingInvoice.transactionDetails}
                        </span>
                      </div>
                    ) : (
                      <div style={{ padding: '6px', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '4px', fontSize: '10px', textAlign: 'center', backgroundColor: '#fff1f2', fontWeight: '600' }}>
                        PAYMENT PENDING
                      </div>
                    )}
                  </div>
                </div>

                {/* Seal / Signatures row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', fontSize: '10px', color: '#94a3b8' }}>
                   <div>
                     {settings.invoiceNotes || 'System generated invoice. No physical signature required.'}
                   </div>
                  <div style={{ textAlign: 'right', width: '220px' }}>
                    <div style={{ height: '35px' }}></div>
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '4px', fontWeight: '700', color: '#475569' }}>
                      Secretary / Treasurer Seal
                    </div>
                    <span style={{ fontSize: '9px' }}>{settings.societyName}</span>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                const el = document.getElementById('printable-area');
                if (!el) return;
                const win = window.open('', '_blank', 'width=900,height=700');
                if (!win) return;
                win.document.write(`<!DOCTYPE html><html><head><title>Invoice</title>
                  <style>
                    body { font-family: Inter, system-ui, sans-serif; color: #1e293b; margin: 0; padding: 24px; }
                    * { box-sizing: border-box; }
                    table { width: 100%; border-collapse: collapse; }
                    td, th { padding: 8px; }
                    @media print { body { padding: 0; } }
                  </style></head><body>${el.innerHTML}</body></html>`);
                win.document.close();
                win.focus();
                setTimeout(() => { win.print(); win.close(); }, 400);
              }}>
                <Printer size={16} /> Print / Save PDF
              </button>
              <button className="btn btn-secondary" onClick={() => {
                if (!viewingInvoice) return;
                const data = [{
                  'Invoice No': viewingInvoice.id,
                  'Shade': viewingInvoice.shadeId,
                  'Owner': viewingInvoice.ownerName,
                  'Renter': viewingInvoice.renterName || '',
                  'Maintenance (₹)': viewingInvoice.maintenanceFee,
                  'Water Charge (₹)': viewingInvoice.waterUsageCharge,
                  'Other Charge (₹)': viewingInvoice.otherMaintenanceCharge,
                  'Transfer Fee (₹)': viewingInvoice.transferFee,
                  'Fine (₹)': viewingInvoice.fineAmount,
                  'Total (₹)': viewingInvoice.totalAmount,
                  'Due Date': viewingInvoice.dueDate,
                  'Status': viewingInvoice.status,
                  'Payment Method': viewingInvoice.paymentMethod || '',
                  'Payment Date': viewingInvoice.paymentDate || '',
                }];
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
                XLSX.writeFile(wb, `${viewingInvoice.id}.xlsx`);
              }}>
                <Download size={16} /> Export Excel
              </button>
              <button className="btn btn-primary" onClick={() => setViewingInvoice(null)}>Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
