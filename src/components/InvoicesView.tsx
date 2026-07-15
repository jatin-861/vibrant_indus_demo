import React, { useState } from 'react';
import {
  Search,
  Trash2,
  CheckSquare,
  Plus,
  Printer,
  Edit2,
  FileText,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Invoice, Shade, Owner, SystemSettings } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { BulkInvoiceModal } from './BulkInvoiceModal';

interface InvoicesViewProps {
  invoices: Invoice[];
  shades: Shade[];
  owners: Owner[];
  settings: SystemSettings;
  currentDate: string;
  onGenerateSingleInvoice: (
    shadeId: string, 
    dueDate: string,
    otherName: string,
    otherCharge: number,
    billingMonths: number
  ) => void;
  onUpdateInvoiceStatus: (invoiceId: string, status: Invoice['status'], paymentMethod?: Invoice['paymentMethod'], details?: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
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
  currentDate,
  onGenerateSingleInvoice,
  onUpdateInvoiceStatus,
  onDeleteInvoice,
  onUpdateInvoice,
  preselectedShadeId,
  clearPreselectedShadeId,
  onBulkImportInvoices
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isSingleGenOpen, setIsSingleGenOpen] = useState(false);
  const [isBulkGenOpen, setIsBulkGenOpen] = useState(false);
  const [paymentLogInvoice, setPaymentLogInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  
  // Edit Invoice Dialog States
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [originalInvoiceId, setOriginalInvoiceId] = useState('');

  // Export wizard states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'particular' | 'all' | 'custom' | ''>('');
  const [exportShadeId, setExportShadeId] = useState('');
  const [exportCustomShadeIds, setExportCustomShadeIds] = useState<string[]>([]);
  const [exportPeriod, setExportPeriod] = useState<'2' | '4' | '6' | '12' | ''>('');

  // Individual Form states
  const [selectedShadeId, setSelectedShadeId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [otherName, setOtherName] = useState('');
  const [otherCharge, setOtherCharge] = useState<number>(0);
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque' | 'online' | 'bank_transfer'>('cash');
  const [transactionRef, setTransactionRef] = useState('');

  const handleShadeChange = (sId: string) => {
    setSelectedShadeId(sId);
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
      otherName, 
      otherCharge, 
      12
    );
    
    // Reset Form
    setSelectedShadeId('');
    setOtherName('');
    setOtherCharge(0);
    setIsSingleGenOpen(false);
  };


  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentLogInvoice) return;

    const details = transactionRef || (paymentMethod === 'cheque' ? 'Cheque Payment Logged' : 'Office Cash Payment');

    onUpdateInvoiceStatus(paymentLogInvoice.id, 'paid', paymentMethod, details);

    // Build paid snapshot to auto-open receipt immediately
    const receiptSnapshot: Invoice = {
      ...paymentLogInvoice,
      status: 'paid',
      paymentMethod,
      paymentDate: new Date().toISOString().split('T')[0],
      transactionDetails: details
    };

    setPaymentLogInvoice(null);
    setTransactionRef('');
    setViewingInvoice(receiptSnapshot); // auto-open receipt
  };

  const handleEditInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    onUpdateInvoice(originalInvoiceId, editingInvoice);
    setEditingInvoice(null);
  };

  const resetExportWizard = () => {
    setIsExportModalOpen(false);
    setExportScope('');
    setExportShadeId('');
    setExportCustomShadeIds([]);
    setExportPeriod('');
  };

  const handleConfirmExport = () => {
    if (!exportScope || !exportPeriod) return;

    // Anchor on the app's simulated business date, not the real system clock —
    // demo/seeded invoices are dated against currentDate, not "today" in the real world.
    const cutoff = new Date(currentDate);
    cutoff.setMonth(cutoff.getMonth() - parseInt(exportPeriod, 10));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const scopedInvoices = invoices.filter(i => {
      if (exportScope === 'particular' && i.shadeId !== exportShadeId) return false;
      if (exportScope === 'custom' && !exportCustomShadeIds.includes(i.shadeId)) return false;
      return i.generatedDate >= cutoffStr;
    });

    // Build a real .xlsx (not a raw .csv) — Excel auto-converts ISO date strings in CSVs
    // into its internal date type and mis-sizes the column, showing "########".
    // Setting explicit column widths on a proper worksheet avoids that entirely.
    const data = scopedInvoices.map(i => ({
      'Invoice No': i.id,
      'Shade': i.shadeId,
      'Owner': i.ownerName,
      'Renter': i.renterName || '',
      'Maintenance (₹)': i.maintenanceFee,
      'Other Charge (₹)': i.otherMaintenanceCharge,
      'Other Charge Name': i.otherMaintenanceName || '',
      'Transfer Fee (₹)': i.transferFee,
      'Total (₹)': i.totalAmount,
      'Generated Date': i.generatedDate,
      'Due Date': i.dueDate,
      'Status': i.status,
      'Payment Method': i.paymentMethod || '',
      'Payment Date': i.paymentDate || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 16 }, { wch: 10 }, { wch: 20 }, { wch: 20 },
      { wch: 14 }, { wch: 14 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    const scopeLabel = exportScope === 'particular' ? exportShadeId : exportScope === 'custom' ? `custom-${exportCustomShadeIds.length}shades` : 'all-shades';
    XLSX.writeFile(wb, `invoices_export_${scopeLabel}_${exportPeriod}mo_${new Date().toISOString().split('T')[0]}.xlsx`);

    resetExportWizard();
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
          otherMaintenanceCharge: parseFloat(cols[5]) || 0,
          otherMaintenanceName: cols[6] || '',
          transferFee: parseFloat(cols[7]) || 0,
          totalAmount: parseFloat(cols[8]) || 0,
          generatedDate: cols[9] || '',
          dueDate: cols[10] || '',
          status: (cols[11] as Invoice['status']) || 'draft',
          paymentMethod: (cols[12] as Invoice['paymentMethod']) || null,
          paymentDate: cols[13] || null,
          billingMonths: 12,
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
  
  const previewFixedMaintenance = previewShade ? settings.defaultMaintenance : 0;
  const previewTransferFee = previewShade && previewShade.transferFeeTriggered ? settings.transferFee : 0;
  const previewTotal = previewFixedMaintenance + otherCharge + previewTransferFee;
  const paymentMethodOptions = [
    { value: 'cash', label: '💵 Cash', subLabel: 'Collected at Office' },
    { value: 'cheque', label: '✍️ Cheque', subLabel: 'Deposit Details' },
    { value: 'online', label: '⚡ UPI', subLabel: 'Simulated Payment' },
    { value: 'bank_transfer', label: '🏦 Bank Transfer', subLabel: 'Direct Bank Deposit' }
  ];

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

          <button className="btn btn-secondary" onClick={() => setIsExportModalOpen(true)}>
            <Download size={16} /> Export Invoices
          </button>

          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
            Import Excel / CSV
            <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleImportCSV} />
          </label>

          <button className="btn btn-secondary" onClick={() => setIsBulkGenOpen(true)}>
            <Plus size={16} /> Bulk Generate
          </button>
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
              <th>TOTAL DUE</th>
              <th>GENERATED</th>
              <th>DUE DATE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No invoices found matching the search criteria.
                </td>
              </tr>
            ) : (() => {
              // Sort newest-first then group by year
              const idOrder = (id: string) => {
                const m = id.match(/(\d{4})-0*(\d+)$/);
                return m ? parseInt(m[1]) * 10000 + parseInt(m[2]) : 0;
              };
              const sorted = [...filteredInvoices].sort((a, b) => idOrder(b.id) - idOrder(a.id));
              const groups: { year: number; invoices: typeof sorted }[] = [];
              for (const inv of sorted) {
                const yr = parseInt(inv.generatedDate.split('-')[0]);
                const g = groups.find(x => x.year === yr);
                if (g) g.invoices.push(inv); else groups.push({ year: yr, invoices: [inv] });
              }
              return groups.map((group, groupIdx) => (
                <React.Fragment key={group.year}>
                  {/* Year header / divider row */}
                  <tr>
                    <td colSpan={9} style={{ padding: 0, border: 'none', backgroundColor: 'var(--bg-main)' }}>
                      {groupIdx === 0 ? (
                        <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px', padding: '2px 10px', fontSize: '12px', fontWeight: '800' }}>{group.year}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{group.invoices.length} invoice{group.invoices.length !== 1 ? 's' : ''}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 16px 6px' }}>
                          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            Year {group.year} · {group.invoices.length} invoice{group.invoices.length !== 1 ? 's' : ''}
                          </span>
                          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
                        </div>
                      )}
                    </td>
                  </tr>
                  {group.invoices.map(inv => {
                    const combinedMaintenance = inv.maintenanceFee + inv.otherMaintenanceCharge + inv.transferFee;
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
                            <span title={`Base: ${inv.maintenanceFee}, Other: ${inv.otherMaintenanceCharge}, Transfer: ${inv.transferFee}`}>
                              {formatCurrency(combinedMaintenance)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>₹0</span>
                          )}
                        </td>
                        <td><strong>{formatCurrency(inv.totalAmount)}</strong></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{inv.generatedDate}</td>
                        <td>{inv.dueDate}</td>
                        <td>
                          <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <button
                                className="btn btn-success btn-sm"
                                title="Generate Payment Receipt"
                                onClick={() => setPaymentLogInvoice(inv)}
                                style={{ padding: '4px 8px' }}
                              >
                                <CheckSquare size={12} /> Paid
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
                              onClick={() => { setEditingInvoice(inv); setOriginalInvoiceId(inv.id); }}
                              style={{ padding: '4px 8px' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              className="btn btn-secondary btn-sm text-danger"
                              title="Cancel Invoice"
                              onClick={() => { if (confirm(`Are you sure you want to cancel invoice ${inv.id}?`)) onDeleteInvoice(inv.id); }}
                              style={{ padding: '4px 8px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ));
            })()
            }
          </tbody>
        </table>
      </div>

      {isBulkGenOpen && (
        <BulkInvoiceModal
          shades={shades}
          owners={owners}
          settings={settings}
          invoices={invoices}
          onClose={() => setIsBulkGenOpen(false)}
          onGenerateSingleInvoice={onGenerateSingleInvoice}
        />
      )}

      {/* MODAL: Export Invoices Wizard */}
      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Export Invoices</h3>
              <button className="modal-close" onClick={resetExportWizard}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label>1. Which shades?</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${exportScope === 'particular' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setExportScope('particular')}
                  >
                    Particular Shade
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${exportScope === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setExportScope('all')}
                  >
                    All Shades
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${exportScope === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setExportScope('custom')}
                  >
                    Custom Selection
                  </button>
                </div>
              </div>

              {exportScope === 'particular' && (
                <div className="form-group">
                  <label>Select Shade</label>
                  <CustomDropdown
                    options={shades.map(s => ({ value: s.id, label: s.id }))}
                    selectedValue={exportShadeId}
                    onChange={setExportShadeId}
                    placeholder="-- Choose Shade --"
                    searchPlaceholder="Search shade..."
                    sortMode="numeric-id"
                  />
                </div>
              )}

              {exportScope === 'custom' && (
                <div className="form-group">
                  <label>Select Shades ({exportCustomShadeIds.length} selected)</label>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {shades.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                        <input
                          type="checkbox"
                          checked={exportCustomShadeIds.includes(s.id)}
                          onChange={(e) => {
                            setExportCustomShadeIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id));
                          }}
                          style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                        {s.id} <span style={{ color: 'var(--text-secondary)' }}>({s.block} · {s.floor})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(exportScope === 'all' || (exportScope === 'particular' && exportShadeId) || (exportScope === 'custom' && exportCustomShadeIds.length > 0)) && (
                <div className="form-group">
                  <label>2. Time period</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[{ v: '2', l: 'Last 2 Months' }, { v: '4', l: 'Last 4 Months' }, { v: '6', l: 'Last 6 Months' }, { v: '12', l: 'Last 1 Year' }].map(p => (
                      <button
                        key={p.v}
                        type="button"
                        className={`btn btn-sm ${exportPeriod === p.v ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setExportPeriod(p.v as '2' | '4' | '6' | '12')}
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={resetExportWizard}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!exportPeriod || !exportScope || (exportScope === 'particular' && !exportShadeId) || (exportScope === 'custom' && exportCustomShadeIds.length === 0)}
                onClick={handleConfirmExport}
              >
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Individual Invoice Generation (with Live Preview) */}
      {isSingleGenOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: selectedShadeId ? '1000px' : '520px', width: '95%' }}>
            <div className="modal-header">
              <h3>Generate Individual Maintenance Invoice</h3>
              <button className="modal-close" onClick={() => setIsSingleGenOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSingleGenSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: selectedShadeId ? '1.2fr 1fr' : '1fr', gap: '32px', padding: '32px', minHeight: selectedShadeId ? 'auto' : '420px' }}>
                
                {/* Form Side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label>Select Shade / Unit*</label>
                    <CustomDropdown
                      options={shades.filter(s => s.status === 'occupied').map(s => {
                        const owner = owners.find(o => o.id === s.ownerId);
                        const renter = s.renterId ? owners.find(o => o.id === s.renterId) : null;
                        return {
                          value: s.id,
                          label: s.id,
                          subLabel: renter ? `Tenant: ${renter.name} (Owner: ${owner?.name})` : `Owner: ${owner?.name || 'Unassigned'}`
                        };
                      })}
                      selectedValue={selectedShadeId}
                      onChange={handleShadeChange}
                      placeholder="-- Choose Shade --"
                      searchPlaceholder="Search unit, owner or tenant..."
                      required
                      sortMode="numeric-id"
                    />
                  </div>

                  {selectedShadeId && (
                    <>
                      <div className="form-group">
                        <label>Due Date*</label>
                        <input 
                          type="date"
                          className="form-control"
                          required
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>

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
                            <span>Maintenance Fee (1 Year):</span>
                            <strong>{formatCurrency(previewFixedMaintenance)}</strong>
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
              <h3>Mark Invoice Paid - {paymentLogInvoice.id}</h3>
              <button className="modal-close" onClick={() => setPaymentLogInvoice(null)}>×</button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body" style={{ minHeight: '420px' }}>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  Total Invoice Amount to Collect: <strong>{formatCurrency(paymentLogInvoice.totalAmount)}</strong>
                </div>

                <div className="form-group">
                  <label>Payment Method*</label>
                  <CustomDropdown
                    options={paymentMethodOptions}
                    selectedValue={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as 'cash' | 'cheque' | 'online' | 'bank_transfer')}
                    placeholder="Select payment method"
                    required
                  />
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
                <button type="submit" className="btn btn-primary">Verify & Mark Paid</button>
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

                <div className="form-group">
                  <label>Transfer Fee (₹)</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={editingInvoice.transferFee}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, transferFee: parseInt(e.target.value) || 0 })}
                  />
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
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewingInvoice(null); }}>
          <div className="modal-content large" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Society Invoice Detail Print Panel</h3>
              <button type="button" className="modal-close" onClick={() => setViewingInvoice(null)}>×</button>
            </div>
            <div className="modal-body" style={{ backgroundColor: '#eaeef2', padding: '24px' }}>
              {/* Paper Invoice Mockup (Letterhead style) */}
              <div id="printable-area" style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '32px 36px', borderRadius: '4px', boxShadow: '0 8px 16px rgba(0,0,0,0.06)', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', position: 'relative', maxWidth: '740px', margin: '0 auto' }}>
                
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
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            Common area facilities fee — 1 Year Fixed Rate
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#64748b' }}>
                          1 Year
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(viewingInvoice.maintenanceFee)}</td>
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
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      {settings.upiId ? (
                        <>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${settings.upiId}&pn=${settings.societyName || 'Vibrant Industrial Park'}&am=${viewingInvoice.totalAmount}&cu=INR&tn=Invoice-${viewingInvoice.id}`)}`}
                            alt="UPI Payment QR"
                            style={{ border: '1px solid #cbd5e1', padding: '4px', background: '#fff', borderRadius: '4px', width: '90px', height: '90px' }}
                          />
                          <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '700', textAlign: 'center', lineHeight: '1.3' }}>
                            SCAN & PAY<br />
                            <span style={{ color: '#3b82f6' }}>Opens UPI app with<br />₹{viewingInvoice.totalAmount} pre-filled</span>
                          </span>
                        </>
                      ) : (
                        <div style={{ width: '90px', height: '90px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>
                          Set UPI ID<br />in Settings<br />to enable QR
                        </div>
                      )}
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
              <button type="button" className="btn btn-secondary" onClick={() => {
                const el = document.getElementById('printable-area');
                if (!el) return;

                // Use hidden iframe so main window never loses focus
                // Give it A4 width so scrollHeight measurement is accurate
                const iframe = document.createElement('iframe');
                iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1px;border:0;visibility:hidden;';
                document.body.appendChild(iframe);

                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!doc) { document.body.removeChild(iframe); return; }

                doc.open();
                doc.write(`<!DOCTYPE html><html><head><title>Invoice</title>
                  <style>
                    @page { size: A4 portrait; margin: 14mm 16mm; }
                    * { box-sizing: border-box; }
                    html, body {
                      margin: 0; padding: 0;
                      background: #ffffff !important;
                      font-family: Inter, system-ui, -apple-system, sans-serif;
                      font-size: 13px;
                      line-height: 1.6;
                      color: #1e293b;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }
                    #printable-area {
                      width: 100% !important;
                      max-width: 100% !important;
                      min-height: unset !important;
                      padding: 0 !important;
                      border: none !important;
                      border-radius: 0 !important;
                      box-shadow: none !important;
                      margin: 0 !important;
                      background: #ffffff !important;
                    }
                    h1 { font-size: 22px !important; }
                    h3 { font-size: 14px !important; }
                    table { width: 100%; border-collapse: collapse; }
                    td, th { padding: 10px 8px; font-size: 12px; }
                    th { font-size: 11px; }
                    img { max-width: 100%; }
                    span, div, p { font-size: inherit; }
                  </style>
                </head><body id="printable-area">${el.innerHTML}</body></html>`);
                doc.close();

                iframe.onload = () => {
                  const ibody = iframe.contentDocument?.body;
                  if (ibody) {
                    // A4 content area in px at 96dpi: (297mm - 28mm margins) × 3.7795
                    const a4px = (297 - 28) * 3.7795;
                    const contentH = ibody.scrollHeight;
                    if (contentH > 0) {
                      // Scale to fill page exactly — no cap, always fills A4
                      ibody.style.zoom = String(a4px / contentH);
                    }
                  }
                  iframe.contentWindow?.print();
                  setTimeout(() => document.body.removeChild(iframe), 500);
                };
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
                  'Other Charge (₹)': viewingInvoice.otherMaintenanceCharge,
                  'Transfer Fee (₹)': viewingInvoice.transferFee,
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
