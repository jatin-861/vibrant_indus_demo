import React from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  AlertCircle,
  Home,
  CheckCircle,
  Shield,
  Wrench,
  ArrowUpRight,
  Plus,
  CalendarDays
} from 'lucide-react';
import type { Shade, Invoice, SystemSettings, FineRecord } from '../types';

interface DashboardViewProps {
  shades: Shade[];
  invoices: Invoice[];
  fines: FineRecord[];
  currentDate: string;
  settings?: SystemSettings;
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shades,
  invoices,
  fines,
  currentDate,
  settings,
  setActiveTab
}) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const analyticsYear = settings?.analyticsYear || new Date(currentDate).getFullYear();

  // Admin-selectable analytics range for the KPI cards & trend chart
  type RangeMode = 'year' | '6m' | '1y' | 'total';
  const [rangeMode, setRangeMode] = React.useState<RangeMode>('year');
  const [selectedYear, setSelectedYear] = React.useState<number>(analyticsYear);

  // Keep the year selector in sync once settings/currentDate finish loading
  React.useEffect(() => {
    setSelectedYear(analyticsYear);
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [analyticsYear]);

  // Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // All non-cancelled invoices (for unit stats and the operational overdue banner)
  const activeInvoices = invoices.filter(inv => inv.status !== 'cancelled');

  const availableYears = Array.from(
    new Set([...invoices.map(inv => parseInt(inv.generatedDate.slice(0, 4), 10)), selectedYear])
  ).filter(y => !isNaN(y)).sort((a, b) => b - a);

  // Invoices/fines scoped to the admin's selected analytics range (year / 6mo / 1yr / total)
  const filteredInvoices = (() => {
    if (rangeMode === 'year') return activeInvoices.filter(inv => inv.generatedDate.startsWith(String(selectedYear)));
    if (rangeMode === 'total') return activeInvoices;
    const months = rangeMode === '6m' ? 6 : 12;
    const start = new Date(currentDate);
    start.setMonth(start.getMonth() - months);
    const startStr = start.toISOString().split('T')[0];
    return activeInvoices.filter(inv => inv.generatedDate >= startStr && inv.generatedDate <= currentDate);
  })();

  const filteredFines = (() => {
    if (rangeMode === 'year') return fines.filter(f => f.date.startsWith(String(selectedYear)));
    if (rangeMode === 'total') return fines;
    const months = rangeMode === '6m' ? 6 : 12;
    const start = new Date(currentDate);
    start.setMonth(start.getMonth() - months);
    const startStr = start.toISOString().split('T')[0];
    return fines.filter(f => f.date >= startStr && f.date <= currentDate);
  })();

  const totalBilled = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalCollected = filteredInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const pendingAmount = filteredInvoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'draft')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const unpaidFinesTotal = filteredFines.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
  const unpaidFinesCount = filteredFines.filter(f => f.status === 'unpaid').length;

  // Always all-time/current — this is an actionable operational alert, not a historical metric
  const overdueInvoices = activeInvoices.filter(inv => inv.status === 'overdue');
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Range-scoped overdue, used by the donut & quick-stats (matches the selected analytics window)
  const rangeOverdueInvoices = filteredInvoices.filter(inv => inv.status === 'overdue');
  const rangeOverdueAmount = rangeOverdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalUnitsCount = shades.length;
  const occupiedShades = shades.filter(s => s.status === 'occupied');
  const occupiedCount = occupiedShades.length;
  const vacantCount = shades.filter(s => s.status === 'vacant').length;
  const maintenanceCount = shades.filter(s => s.status === 'maintenance').length;
  const occupancyPercentage = totalUnitsCount ? Math.round((occupiedCount / totalUnitsCount) * 100) : 0;

  // Collection trend bars — shape depends on the selected range
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTrend = (() => {
    if (rangeMode === 'year') {
      return MONTH_LABELS.map((label, idx) => {
        const prefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
        const monthInvs = activeInvoices.filter(inv => inv.generatedDate.startsWith(prefix));
        const billed = monthInvs.reduce((s, inv) => s + inv.totalAmount, 0);
        const collected = monthInvs.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.totalAmount, 0);
        return { label, billed, collected };
      });
    }

    if (rangeMode === 'total') {
      const years = Array.from(new Set(activeInvoices.map(inv => inv.generatedDate.slice(0, 4)))).sort();
      return years.map(yr => {
        const yearInvs = activeInvoices.filter(inv => inv.generatedDate.startsWith(yr));
        const billed = yearInvs.reduce((s, inv) => s + inv.totalAmount, 0);
        const collected = yearInvs.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.totalAmount, 0);
        return { label: yr, billed, collected };
      });
    }

    // Rolling window (6 or 12 calendar months) ending at the app's current simulated month
    const months = rangeMode === '6m' ? 6 : 12;
    const anchor = new Date(currentDate);
    const bars: { label: string; billed: number; collected: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthInvs = activeInvoices.filter(inv => inv.generatedDate.startsWith(prefix));
      const billed = monthInvs.reduce((s, inv) => s + inv.totalAmount, 0);
      const collected = monthInvs.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.totalAmount, 0);
      bars.push({ label: `${MONTH_LABELS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`, billed, collected });
    }
    return bars;
  })();
  const maxMonthly = Math.max(...monthlyTrend.map(m => m.billed), 1);

  const rangeSubtitle = rangeMode === 'year'
    ? `Billed vs. Collected — ${selectedYear}`
    : rangeMode === 'total'
      ? 'Billed vs. Collected — All Time (by year)'
      : `Billed vs. Collected — Last ${rangeMode === '6m' ? '6 Months' : '1 Year'}`;

  // Collection status for donut
  const paidPct = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
  const overduePct = totalBilled > 0 ? (rangeOverdueAmount / totalBilled) * 100 : 0;
  const pendingPct = Math.max(0, 100 - paidPct - overduePct);

  return (
    <div className="dashboard-view">
      {/* Overdue Alert Banner */}
      {overdueInvoices.length > 0 && (
        <div className="alert-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div className="alert-content">
            <AlertTriangle size={20} />
            <span className="alert-tag">Overdue</span>
            <span>
              <strong>{overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? 's' : ''}</strong> totaling {formatCurrency(overdueAmount)} detected. Auto-fines of ₹{settings?.finePerDay ?? 100}/day are currently active.
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('invoices')}>
            View Invoices
          </button>
        </div>
      )}

      {/* Greetings section */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Good morning 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            {totalUnitsCount} units • {occupancyPercentage}% occupied
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '3px', gap: '2px' }}>
            {([
              { v: '6m', l: '6 Months' },
              { v: '1y', l: '1 Year' },
              { v: 'year', l: 'Year-wise' },
              { v: 'total', l: 'Total' }
            ] as { v: RangeMode; l: string }[]).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setRangeMode(opt.v)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: rangeMode === opt.v ? '#1d4ed8' : 'transparent',
                  color: rangeMode === opt.v ? '#fff' : '#1d4ed8'
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
          {rangeMode === 'year' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              style={{ padding: '6px 10px', borderRadius: '20px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              {availableYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* 4 Large KPI Metrics Cards in Donezo layout */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        {/* Card 1: Highlight Forest Green Gradient */}
        <div className="metric-card metric-highlight">
          <div className="metric-header">
            <span className="metric-title">Total Billed</span>
            <div className="metric-icon-box" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('invoices')}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="metric-value">{formatCurrency(totalBilled)}</div>
          <div className="metric-trend" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignSelf: 'flex-start' }}>
            <span>Active invoices: {filteredInvoices.length}</span>
          </div>
        </div>

        {/* Card 2: Standard White Card */}
        <div className="metric-card metric-standard">
          <div className="metric-header">
            <span className="metric-title">Collected</span>
            <div className="metric-icon-box" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('payments')}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>{formatCurrency(totalCollected)}</div>
          <div className="metric-trend up" style={{ backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignSelf: 'flex-start' }}>
            <TrendingUp size={12} />
            <span style={{ fontSize: '11px', color: '#047857', fontWeight: '600' }}>
              Payments: {filteredInvoices.filter(inv => inv.status === 'paid').length} collected
            </span>
          </div>
        </div>

        {/* Card 3: Standard White Card */}
        <div className="metric-card metric-standard">
          <div className="metric-header">
            <span className="metric-title">Pending Collection</span>
            <div className="metric-icon-box" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('invoices')}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--color-pending)' }}>{formatCurrency(pendingAmount)}</div>
          <div className="metric-trend" style={{ backgroundColor: '#fffbeb', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignSelf: 'flex-start' }}>
            <Clock size={12} style={{ color: '#b45309' }} />
            <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600', marginLeft: '4px' }}>
              Unpaid: {filteredInvoices.filter(inv => inv.status !== 'paid').length} invoices
            </span>
          </div>
        </div>

        {/* Card 4: Standard White Card */}
        <div className="metric-card metric-standard">
          <div className="metric-header">
            <span className="metric-title">Overdue Fines</span>
            <div className="metric-icon-box" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('fines')}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(unpaidFinesTotal)}</div>
          <div className="metric-trend" style={{ backgroundColor: '#fff5f5', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignSelf: 'flex-start' }}>
            <AlertCircle size={12} style={{ color: '#b91c1c' }} />
            <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600', marginLeft: '4px' }}>
              {unpaidFinesCount > 0 ? `${unpaidFinesCount} pending collection` : 'Late penalty policy active'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Small Sub-Stat Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Home size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a', lineHeight: '1.1' }}>{totalUnitsCount}</div>
            <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Total Units</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#064e3b', lineHeight: '1.1' }}>{occupiedCount}</div>
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: '600', textTransform: 'uppercase' }}>Occupied</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#78350f', lineHeight: '1.1' }}>{vacantCount}</div>
            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: '600', textTransform: 'uppercase' }}>Vacant</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={18} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#4c1d95', lineHeight: '1.1' }}>{maintenanceCount}</div>
            <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: '600', textTransform: 'uppercase' }}>Maintenance</div>
          </div>
        </div>
      </div>
      {/* Donezo Layout Grid */}
      <div className="dashboard-layout">
        {/* Left Column: Analytics Chart and Resident Registry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Monthly Collection Trend Chart */}
          <div className="card">
            <div className="card-header" style={{ padding: '20px 24px 16px' }}>
              <div>
                <h3 style={{ margin: '0 0 3px', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Monthly Collection Trend</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CalendarDays size={12} /> {rangeSubtitle}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: '600' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: 'var(--primary-light)', borderRadius: '20px', color: 'var(--primary)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: 'var(--primary)', display: 'inline-block' }}></span> Collected
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#f1f5f9', borderRadius: '20px', color: '#475569' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'repeating-linear-gradient(-45deg,#cbd5e1 0,#cbd5e1 1.5px,#f8fafc 1.5px,#f8fafc 4px)', border: '1px solid #cbd5e1', display: 'inline-block' }}></span> Billed
                </span>
              </div>
            </div>
            <div className="card-body" style={{ padding: '8px 20px 4px' }}>
              {/* Consolidated single capsule bar chart matching Image 2 */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '14px', paddingTop: '24px', height: '180px' }}>
                {monthlyTrend.map((m, i) => {
                  const TRACK_H = 160;
                  const MIN_H = 48; // minimum height for active bars to look chunky
                  const billedFill = maxMonthly > 0 ? Math.round((m.billed / maxMonthly) * (TRACK_H - MIN_H)) + MIN_H : 0;
                  const collectionRate = m.billed > 0 ? (m.collected / m.billed) * 100 : 0;
                  const isHov = hoveredIndex === i;
                  const hasData = m.billed > 0;

                  // Define dynamic styling classes based on collection rate
                  let fillClass = '';
                  let dotClass = '';
                  if (collectionRate >= 99.9) {
                    fillClass = 'fill-100';
                    dotClass = 'dot-100';
                  } else if (collectionRate >= 50) {
                    fillClass = 'fill-mid';
                    dotClass = 'dot-mid';
                  } else if (collectionRate > 0) {
                    fillClass = 'fill-low';
                    dotClass = 'dot-low';
                  }

                  // Determine if we show the boundary dot: only if collected is between 0% and 100%
                  const showBoundaryDot = collectionRate > 0 && collectionRate < 99.9;

                  return (
                    <div
                      key={i}
                      className="trend-bar-wrapper"
                      onMouseEnter={() => hasData && setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Premium tooltip */}
                      {isHov && hasData && (
                        <div className="trend-tooltip" style={{ bottom: `${Math.max(billedFill, 24) + 12}px` }}>
                          <div className={`trend-tooltip-badge ${
                            collectionRate >= 99.9 ? 'badge-100' : collectionRate >= 50 ? 'badge-mid' : 'badge-low'
                          }`}>
                            {Math.round(collectionRate)}% Collected
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Billed:</span>
                            <strong>{formatCurrency(m.billed)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Collected:</span>
                            <strong style={{ color: 'var(--primary)' }}>{formatCurrency(m.collected)}</strong>
                          </div>
                          {m.billed - m.collected > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Unpaid:</span>
                              <strong style={{ color: 'var(--color-danger)' }}>{formatCurrency(m.billed - m.collected)}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Capsule track (active or placeholder) */}
                      {hasData ? (
                        <div 
                          className="trend-capsule-track" 
                          style={{ 
                            height: `${billedFill}px`,
                          }}
                        >
                          {/* Collected solid fill */}
                          {collectionRate > 0 && (
                            <div 
                              className={`trend-capsule-fill ${fillClass}`}
                              style={{ 
                                height: `${collectionRate}%` 
                              }} 
                            />
                          )}

                          {/* Boundary dot indicator */}
                          {showBoundaryDot && (
                            <div 
                              className={`trend-capsule-dot ${dotClass}`}
                              style={{ 
                                bottom: `calc(${collectionRate}% - 3px)`
                              }} 
                            />
                          )}
                        </div>
                      ) : (
                        /* Faint placeholder capsule bar for months with 0 billed data, to keep the grid full and premium */
                        <div 
                          className="trend-capsule-track placeholder" 
                          style={{ 
                            height: '36px'
                          }}
                        />
                      )}

                      {/* Month label */}
                      <span style={{ fontSize: '10px', fontWeight: isHov ? '700' : '500', color: isHov ? 'var(--text-primary)' : '#94a3b8', transition: 'all 0.2s', userSelect: 'none' }}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Divider line */}
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px', display: 'flex', gap: '24px' }}>
                {/* Collection donut */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', width: '54px', height: '54px', flexShrink: 0 }}>
                    <div style={{
                      width: '54px', height: '54px', borderRadius: '50%',
                      background: `conic-gradient(#10b981 0% ${paidPct}%, #ef4444 ${paidPct}% ${paidPct + overduePct}%, #f59e0b ${paidPct + overduePct}% 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary)' }}>{Math.round(paidPct)}%</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Collected</span>
                      <span style={{ fontWeight: '700', color: '#064e3b' }}>{Math.round(paidPct)}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Overdue</span>
                      <span style={{ fontWeight: '700', color: '#991b1b' }}>{Math.round(overduePct)}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
                      <span style={{ fontWeight: '700', color: '#78350f' }}>{Math.round(pendingPct)}%</span>
                    </div>
                  </div>
                </div>
                {/* Quick stats */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '8px 10px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#065f46' }}>{filteredInvoices.filter(i => i.status === 'paid').length}</div>
                    <div style={{ fontSize: '10px', color: '#047857', fontWeight: '600' }}>Paid Invoices</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#fff5f5', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>{rangeOverdueInvoices.length}</div>
                    <div style={{ fontSize: '10px', color: '#b91c1c', fontWeight: '600' }}>Overdue</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#78350f' }}>{filteredInvoices.filter(i => i.status === 'sent').length}</div>
                    <div style={{ fontSize: '10px', color: '#b45309', fontWeight: '600' }}>Awaiting</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>{filteredInvoices.filter(i => i.status === 'draft').length}</div>
                    <div style={{ fontSize: '10px', color: '#15803d', fontWeight: '600' }}>Draft</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Reminders, Occupancy Arc, Recent Invoices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          


          {/* Project Progress: Semi-circular SVG Gauge */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header" style={{ padding: '20px 24px' }}>
              <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700' }}>Society Progress</h3>
            </div>
            <div className="card-body" style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* SVG Semi-Circular Arc */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '180px', height: '100px', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <svg viewBox="0 0 100 55" style={{ width: '100%', height: '100%' }}>
                  {/* Background Arc */}
                  <path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke="#e2e8f0" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                  />
                  {/* Active Occupied Arc */}
                  <path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    strokeDasharray="125.6" 
                    strokeDashoffset={125.6 * (1 - occupancyPercentage / 100)} 
                  />
                </svg>
                {/* Center text inside semi-circle */}
                <div style={{ position: 'absolute', bottom: '0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{occupancyPercentage}%</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Occupied</span>
                </div>
              </div>

              {/* Legend below progress */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', marginTop: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--primary)', borderRadius: '50%' }}></span>
                  Occupied ({occupiedCount})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-success)', borderRadius: '50%' }}></span>
                  Maint ({maintenanceCount})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <span style={{ width: '8px', height: '8px', display: 'inline-block', borderRadius: '50%', border: '1.5px dashed #94a3b8', backgroundColor: '#e2e8f0' }}></span>
                  Vacant ({vacantCount})
                </span>
              </div>
            </div>
          </div>

          {/* Project List: Outstanding Invoices list */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header" style={{ padding: '20px 24px' }}>
              <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700' }}>Invoices</h3>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setActiveTab('invoices')}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border-color)', color: 'var(--primary)' }}
              >
                <Plus size={12} /> New
              </button>
            </div>
            <div className="card-body" style={{ padding: '0 24px 16px' }}>
              <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                {invoices.filter(i => i.status !== 'cancelled').slice(-3).reverse().map(inv => (
                  <li key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)' }}>{inv.renterName || inv.ownerName}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Shade {inv.shadeId} • Due {inv.dueDate}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge badge-${inv.status}`} style={{ fontSize: '9px', padding: '1px 6px' }}>{inv.status}</span>
                      <strong style={{ fontSize: '13px' }}>{formatCurrency(inv.totalAmount)}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
