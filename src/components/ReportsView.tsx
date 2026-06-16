import React, { useState, useMemo } from 'react';
import { Download, FileText, TrendingUp, AlertTriangle, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Invoice, Payment, FineRecord, Shade, Owner } from '../types';

interface ReportsViewProps {
  invoices: Invoice[];
  payments: Payment[];
  fines: FineRecord[];
  shades: Shade[];
  owners: Owner[];
}

type ReportType = 'monthly_collection' | 'penalty' | 'additional_charges' | 'payment_performance';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ReportsView: React.FC<ReportsViewProps> = ({ invoices, payments: _payments, fines, shades, owners: _owners }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('monthly_collection');
  const [monthFilter, setMonthFilter] = useState('');

  const activeInvoices = invoices.filter(i => i.status !== 'cancelled');

  // ─── Monthly Collection Report ───────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; billed: number; collected: number; pending: number; overdue: number; count: number }> = {};
    activeInvoices.forEach(inv => {
      const month = inv.generatedDate?.slice(0, 7) || 'Unknown';
      if (!map[month]) map[month] = { month, billed: 0, collected: 0, pending: 0, overdue: 0, count: 0 };
      map[month].billed += inv.totalAmount;
      map[month].count += 1;
      if (inv.status === 'paid') map[month].collected += inv.totalAmount;
      else if (inv.status === 'overdue') map[month].overdue += inv.totalAmount;
      else map[month].pending += inv.totalAmount;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [activeInvoices]);

  const filteredMonthly = monthFilter ? monthlyData.filter(r => r.month === monthFilter) : monthlyData;

  // ─── Penalty Report ───────────────────────────────────────────────────────
  const penaltyData = useMemo(() => {
    return fines.map(f => {
      const shade = shades.find(s => s.id === f.shadeId);
      return { ...f, shadeLabel: shade ? `${shade.block}-${shade.floor}` : f.shadeId };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [fines, shades]);

  const totalPenaltyCollected = fines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
  const totalPenaltyOutstanding = fines.filter(f => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0);

  // ─── Additional Charges Report ───────────────────────────────────────────
  const additionalData = useMemo(() => {
    const rows: { invoiceId: string; shadeId: string; shadeLabel: string; waterCharge: number; transferFee: number; otherName: string; otherCharge: number; date: string }[] = [];
    activeInvoices.forEach(inv => {
      const shade = shades.find(s => s.id === inv.shadeId);
      const shadeLabel = shade ? `${shade.block}-${shade.floor}` : inv.shadeId;
      if (inv.waterUsageCharge > 0 || inv.transferFee > 0 || inv.otherMaintenanceCharge > 0) {
        rows.push({
          invoiceId: inv.id,
          shadeId: inv.shadeId,
          shadeLabel,
          waterCharge: inv.waterUsageCharge,
          transferFee: inv.transferFee,
          otherName: inv.otherMaintenanceName || '',
          otherCharge: inv.otherMaintenanceCharge,
          date: inv.generatedDate,
        });
      }
    });
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [activeInvoices, shades]);

  const totalWater = additionalData.reduce((s, r) => s + r.waterCharge, 0);
  const totalTransfer = additionalData.reduce((s, r) => s + r.transferFee, 0);
  const totalOther = additionalData.reduce((s, r) => s + r.otherCharge, 0);

  // ─── Payment Performance Report ──────────────────────────────────────────
  const performanceData = useMemo(() => {
    return activeInvoices.map(inv => {
      const dueDate = new Date(inv.dueDate);
      const paidDate = inv.paymentDate ? new Date(inv.paymentDate) : null;
      let performance: 'paid_on_time' | 'paid_late' | 'unpaid' = 'unpaid';
      if (inv.status === 'paid' && paidDate) {
        performance = paidDate <= dueDate ? 'paid_on_time' : 'paid_late';
      }
      const shade = shades.find(s => s.id === inv.shadeId);
      return {
        invoiceId: inv.id,
        shadeLabel: shade ? `${shade.block}-${shade.floor}` : inv.shadeId,
        ownerName: inv.ownerName,
        totalAmount: inv.totalAmount,
        dueDate: inv.dueDate,
        paymentDate: inv.paymentDate,
        performance,
        status: inv.status,
      };
    }).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [activeInvoices, shades]);

  const paidOnTime = performanceData.filter(r => r.performance === 'paid_on_time').length;
  const paidLate = performanceData.filter(r => r.performance === 'paid_late').length;
  const unpaid = performanceData.filter(r => r.performance === 'unpaid').length;

  // ─── Export helpers ───────────────────────────────────────────────────────
  const exportToExcel = () => {
    let data: Record<string, unknown>[];
    let sheetName: string;

    if (activeReport === 'monthly_collection') {
      sheetName = 'Monthly Collection';
      data = filteredMonthly.map(r => ({
        Month: r.month,
        'Total Billed (₹)': r.billed,
        'Collected (₹)': r.collected,
        'Pending (₹)': r.pending,
        'Overdue (₹)': r.overdue,
        'Invoice Count': r.count,
      }));
    } else if (activeReport === 'penalty') {
      sheetName = 'Penalty Report';
      data = penaltyData.map(r => ({
        'Fine ID': r.id,
        Shade: r.shadeLabel,
        'Owner Name': r.ownerName,
        'Amount (₹)': r.amount,
        Reason: r.reason,
        Date: r.date,
        Status: r.status,
      }));
    } else if (activeReport === 'additional_charges') {
      sheetName = 'Additional Charges';
      data = additionalData.map(r => ({
        'Invoice ID': r.invoiceId,
        Shade: r.shadeLabel,
        Date: r.date,
        'Water Charge (₹)': r.waterCharge,
        'Transfer Fee (₹)': r.transferFee,
        'Other Charge Name': r.otherName,
        'Other Charge (₹)': r.otherCharge,
      }));
    } else {
      sheetName = 'Payment Performance';
      data = performanceData.map(r => ({
        'Invoice ID': r.invoiceId,
        Shade: r.shadeLabel,
        Owner: r.ownerName,
        'Amount (₹)': r.totalAmount,
        'Due Date': r.dueDate,
        'Payment Date': r.paymentDate || '-',
        Performance: r.performance === 'paid_on_time' ? 'Paid On Time' : r.performance === 'paid_late' ? 'Paid Late' : 'Unpaid',
        Status: r.status,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportToPDF = () => {
    window.print();
  };

  const REPORT_TABS: { key: ReportType; label: string; icon: React.ReactNode }[] = [
    { key: 'monthly_collection', label: 'Monthly Collection', icon: <TrendingUp size={15} /> },
    { key: 'penalty', label: 'Penalty Report', icon: <AlertTriangle size={15} /> },
    { key: 'additional_charges', label: 'Additional Charges', icon: <DollarSign size={15} /> },
    { key: 'payment_performance', label: 'Payment Performance', icon: <CheckCircle size={15} /> },
  ];

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="view-title">Reports</h2>
          <p className="view-subtitle">Financial summaries and performance analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <Download size={15} /> Export Excel
          </button>
          <button className="btn btn-secondary" onClick={exportToPDF}>
            <FileText size={15} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {REPORT_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveReport(tab.key)}
            className={`btn ${activeReport === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Monthly Collection ── */}
      {activeReport === 'monthly_collection' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Billed</div>
              <div className="stat-value">{formatCurrency(activeInvoices.reduce((s, i) => s + i.totalAmount, 0))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Collected</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(activeInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Pending</div>
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                {formatCurrency(activeInvoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + i.totalAmount, 0))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Overdue</div>
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
                {formatCurrency(activeInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter by month:</label>
            <input
              type="month"
              className="form-control"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              style={{ width: 'auto' }}
            />
            {monthFilter && <button className="btn btn-secondary btn-sm" onClick={() => setMonthFilter('')}>Clear</button>}
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Invoices</th>
                  <th>Total Billed</th>
                  <th>Collected</th>
                  <th>Pending</th>
                  <th>Overdue</th>
                  <th>Collection %</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthly.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No data</td></tr>
                ) : filteredMonthly.map(r => (
                  <tr key={r.month}>
                    <td><strong>{r.month}</strong></td>
                    <td>{r.count}</td>
                    <td>{formatCurrency(r.billed)}</td>
                    <td style={{ color: 'var(--color-success)' }}>{formatCurrency(r.collected)}</td>
                    <td style={{ color: 'var(--color-warning)' }}>{formatCurrency(r.pending)}</td>
                    <td style={{ color: 'var(--color-danger)' }}>{formatCurrency(r.overdue)}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {r.billed > 0 ? Math.round((r.collected / r.billed) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Penalty Report ── */}
      {activeReport === 'penalty' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Penalties Raised</div>
              <div className="stat-value">{formatCurrency(fines.reduce((s, f) => s + f.amount, 0))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Collected</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(totalPenaltyCollected)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Outstanding</div>
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(totalPenaltyOutstanding)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Fines</div>
              <div className="stat-value">{fines.length}</div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Fine ID</th><th>Shade</th><th>Owner</th><th>Amount</th><th>Reason</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {penaltyData.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No fines recorded</td></tr>
                ) : penaltyData.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.id}</td>
                    <td>{r.shadeLabel}</td>
                    <td>{r.ownerName}</td>
                    <td style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{formatCurrency(r.amount)}</td>
                    <td>{r.reason}</td>
                    <td>{r.date}</td>
                    <td>
                      <span className={`status-badge status-${r.status === 'paid' ? 'paid' : 'overdue'}`}>
                        {r.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Additional Charges Report ── */}
      {activeReport === 'additional_charges' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Water Charges</div>
              <div className="stat-value">{formatCurrency(totalWater)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Transfer Fees Collected</div>
              <div className="stat-value">{formatCurrency(totalTransfer)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Other Charges</div>
              <div className="stat-value">{formatCurrency(totalOther)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Grand Total</div>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>{formatCurrency(totalWater + totalTransfer + totalOther)}</div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Invoice</th><th>Shade</th><th>Date</th><th>Water</th><th>Transfer Fee</th><th>Other</th><th>Other Type</th></tr>
              </thead>
              <tbody>
                {additionalData.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No additional charges found</td></tr>
                ) : additionalData.map(r => (
                  <tr key={r.invoiceId}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.invoiceId}</td>
                    <td>{r.shadeLabel}</td>
                    <td>{r.date}</td>
                    <td>{r.waterCharge > 0 ? formatCurrency(r.waterCharge) : '—'}</td>
                    <td>{r.transferFee > 0 ? formatCurrency(r.transferFee) : '—'}</td>
                    <td>{r.otherCharge > 0 ? formatCurrency(r.otherCharge) : '—'}</td>
                    <td>{r.otherName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payment Performance ── */}
      {activeReport === 'payment_performance' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Paid On Time
              </div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{paidOnTime}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} style={{ color: 'var(--color-warning)' }} /> Paid Late
              </div>
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{paidLate}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={14} style={{ color: 'var(--color-danger)' }} /> Unpaid
              </div>
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{unpaid}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">On-Time Rate</div>
              <div className="stat-value">
                {performanceData.length > 0
                  ? `${Math.round((paidOnTime / performanceData.length) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Invoice</th><th>Shade</th><th>Owner</th><th>Amount</th><th>Due Date</th><th>Paid Date</th><th>Performance</th></tr>
              </thead>
              <tbody>
                {performanceData.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No invoices</td></tr>
                ) : performanceData.map(r => (
                  <tr key={r.invoiceId}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.invoiceId}</td>
                    <td>{r.shadeLabel}</td>
                    <td>{r.ownerName}</td>
                    <td>{formatCurrency(r.totalAmount)}</td>
                    <td>{r.dueDate}</td>
                    <td>{r.paymentDate || '—'}</td>
                    <td>
                      {r.performance === 'paid_on_time' && (
                        <span className="status-badge status-paid" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          <CheckCircle size={12} /> On Time
                        </span>
                      )}
                      {r.performance === 'paid_late' && (
                        <span className="status-badge status-sent" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', backgroundColor: '#fff3cd', color: '#856404' }}>
                          <Clock size={12} /> Late
                        </span>
                      )}
                      {r.performance === 'unpaid' && (
                        <span className="status-badge status-overdue" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          <XCircle size={12} /> Unpaid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
