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
  Plus
} from 'lucide-react';
import type { Shade, Invoice, Owner } from '../types';

interface DashboardViewProps {
  shades: Shade[];
  invoices: Invoice[];
  owners: Owner[];
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shades,
  invoices,
  owners,
  setActiveTab
}) => {
  // Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calculations
  const activeInvoices = invoices.filter(inv => inv.status !== 'cancelled');
  
  const totalBilled = activeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  const totalCollected = activeInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const pendingAmount = activeInvoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'draft')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalFines = activeInvoices.reduce((sum, inv) => sum + inv.fineAmount, 0);

  const overdueInvoices = activeInvoices.filter(inv => inv.status === 'overdue');
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalUnitsCount = shades.length;
  const occupiedShades = shades.filter(s => s.status === 'occupied');
  const occupiedCount = occupiedShades.length;
  const vacantCount = shades.filter(s => s.status === 'vacant').length;
  const maintenanceCount = shades.filter(s => s.status === 'maintenance').length;
  const occupancyPercentage = totalUnitsCount ? Math.round((occupiedCount / totalUnitsCount) * 100) : 0;

  // Dynamic Chart values per Shade
  const billedPerShade = shades.map(s => {
    const shadeInvoices = activeInvoices.filter(i => i.shadeId === s.id);
    const total = shadeInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const paid = shadeInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
    const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
    return { id: s.id, total, paid, rate, status: s.status };
  });

  const maxBilled = billedPerShade.length > 0 ? Math.max(...billedPerShade.map(b => b.total), 1) : 1;

  // Find the shade with highest billing to show the tooltip
  const tooltipShade = billedPerShade.reduce((max, curr) => curr.total > max.total ? curr : max, { id: '', total: -1, rate: 0 });

  return (
    <div className="dashboard-view">
      {/* Overdue Alert Banner */}
      {overdueInvoices.length > 0 && (
        <div className="alert-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div className="alert-content">
            <AlertTriangle size={20} />
            <span className="alert-tag">Overdue</span>
            <span>
              <strong>{overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? 's' : ''}</strong> totaling {formatCurrency(overdueAmount)} detected. Auto-fines of ₹100/day are currently active.
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
            {totalUnitsCount} units • {occupancyPercentage}% occupied • Forest Green UI Live
          </p>
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
            <span>Active invoices: {activeInvoices.length}</span>
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
              Payments: {activeInvoices.filter(inv => inv.status === 'paid').length} collected
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
              Unpaid: {activeInvoices.filter(inv => inv.status !== 'paid').length} invoices
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
          <div className="metric-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(totalFines)}</div>
          <div className="metric-trend" style={{ backgroundColor: '#fff5f5', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignSelf: 'flex-start' }}>
            <AlertCircle size={12} style={{ color: '#b91c1c' }} />
            <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600', marginLeft: '4px' }}>
              Late penalty policy active
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
          
          {/* Project Analytics Card: Visual bar charts */}
          <div className="card">
            <div className="card-header" style={{ padding: '20px 24px' }}>
              <div>
                <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700' }}>Project Analytics</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Billed & Collected Rates per Unit</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: '600' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--primary)', borderRadius: '50%' }}></span> Collected
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-success)', borderRadius: '50%' }}></span> Pending
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', display: 'inline-block', borderRadius: '50%', border: '1.5px dashed #94a3b8', backgroundColor: '#e2e8f0' }}></span> Vacant
                </span>
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px 24px 24px' }}>
              <div className="analytics-bars-row">
                {billedPerShade.map(b => {
                  const heightPercent = maxBilled > 0 ? (b.total / maxBilled) * 100 : 0;
                  const isTooltip = tooltipShade.id === b.id && b.total > 0;
                  
                  // Color selection
                  let barClass = 'striped';
                  if (b.status === 'occupied') {
                    barClass = b.paid === b.total && b.total > 0 ? 'forest' : 'mint';
                  }

                  return (
                    <div key={b.id} className="analytics-bar-container">
                      <div className="analytics-bar-track">
                        {isTooltip && (
                          <>
                            <div className="analytics-tooltip">{b.rate}% Collected</div>
                            <div className="analytics-tooltip-handle" style={{ bottom: `${heightPercent}%` }}></div>
                          </>
                        )}
                        <div className={`analytics-bar-fill ${barClass}`} style={{ height: `${Math.max(heightPercent, 10)}%` }}></div>
                      </div>
                      <span className="analytics-bar-label" style={{ fontWeight: isTooltip ? '700' : 'normal' }}>{b.id.replace('SH-', '')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* WhatsApp Demo Preview Card */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header" style={{ padding: '20px 24px' }}>
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: '700' }}>WhatsApp Automation Preview</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Live preview — connect WhatsApp Business API to send these automatically</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('simulator')} style={{ color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                Open Simulator
              </button>
            </div>
            <div className="card-body" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Phone mockup */}
              <div style={{ flex: '0 0 auto', width: '200px' }}>
                <div style={{ background: '#111', borderRadius: '28px', padding: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                  {/* Notch */}
                  <div style={{ width: '60px', height: '8px', background: '#000', borderRadius: '4px', margin: '0 auto 6px', opacity: 0.8 }} />
                  {/* Screen */}
                  <div style={{ borderRadius: '20px', overflow: 'hidden', background: '#efeae2' }}>
                    {/* WA Header */}
                    <div style={{ background: '#075e54', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>FP</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>Fortune Park</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Society Admin</div>
                      </div>
                    </div>
                    {/* Chat bubbles */}
                    <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '200px' }}>
                      <div style={{ background: '#fff', borderRadius: '8px', borderTopLeftRadius: '2px', padding: '8px 10px', maxWidth: '90%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '10px', lineHeight: '1.4', color: '#1e293b' }}>📋 <strong>Maintenance Due</strong><br />Shade 1 — ₹700<br />Due: 15 Aug 2025</div>
                        <div style={{ fontSize: '8px', color: '#64748b', textAlign: 'right', marginTop: '4px' }}>9:30 AM ✓✓</div>
                      </div>
                      <div style={{ background: '#d9fdd3', borderRadius: '8px', borderTopRightRadius: '2px', padding: '8px 10px', maxWidth: '90%', alignSelf: 'flex-end', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '10px', lineHeight: '1.4', color: '#1e293b' }}>✅ Payment done<br />UPI Ref: 123456</div>
                        <div style={{ fontSize: '8px', color: '#64748b', textAlign: 'right', marginTop: '4px' }}>10:15 AM ✓✓</div>
                      </div>
                      <div style={{ background: '#fff', borderRadius: '8px', borderTopLeftRadius: '2px', padding: '8px 10px', maxWidth: '90%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '10px', lineHeight: '1.4', color: '#1e293b' }}>🧾 Receipt issued!<br />Ledger: <span style={{ color: '#10b981', fontWeight: '700' }}>CLEAR</span></div>
                        <div style={{ fontSize: '8px', color: '#64748b', textAlign: 'right', marginTop: '4px' }}>10:16 AM ✓✓</div>
                      </div>
                    </div>
                  </div>
                  {/* Home bar */}
                  <div style={{ width: '50px', height: '4px', background: '#333', borderRadius: '2px', margin: '6px auto 0' }} />
                </div>
              </div>

              {/* Feature list */}
              <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { icon: '📋', title: 'Bill Reminder', desc: 'Sent X days before due date (configurable in Settings)' },
                  { icon: '⚠️', title: 'Overdue Alert', desc: 'Auto-sent when invoice crosses due date with penalty amount' },
                  { icon: '🧾', title: 'Payment Receipt', desc: 'Instant receipt sent when Admin marks payment received' },
                  { icon: '📎', title: 'PDF Invoice', desc: 'Invoice PDF + QR code for UPI payment attached' },
                ].map(f => (
                  <div key={f.title} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '18px', lineHeight: 1 }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{f.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '4px', padding: '8px 12px', background: 'var(--primary-light)', borderRadius: '6px', fontSize: '11px', color: 'var(--primary)', fontWeight: '600', border: '1px dashed var(--primary)' }}>
                  🔌 Plug in your WhatsApp Business API key in Settings to go live
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
