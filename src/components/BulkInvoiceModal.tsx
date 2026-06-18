import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Check, AlertTriangle, Droplet, X } from 'lucide-react';
import type { Shade, Owner, Invoice, SystemSettings } from '../types';

interface ShadeEntry {
  shade: Shade;
  newWaterReading: number;
  waterSkipped: boolean;
  otherName: string;
  otherCharge: number;
}

type BulkStep = 'select' | 'fill' | 'review';

interface BulkInvoiceModalProps {
  shades: Shade[];
  owners: Owner[];
  settings: SystemSettings;
  invoices: Invoice[];
  onClose: () => void;
  onGenerateSingleInvoice: (
    shadeId: string,
    dueDate: string,
    newWaterReading: number,
    otherName: string,
    otherCharge: number,
    billingMonths: number,
    silent?: boolean
  ) => Promise<void> | void;
}

const sortShadesByNumber = (shades: Shade[]) =>
  [...shades].sort((a, b) => {
    const n = (id: string) => parseInt(id.replace(/\D/g, ''), 10) || 0;
    return n(a.id) - n(b.id);
  });

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export const BulkInvoiceModal: React.FC<BulkInvoiceModalProps> = ({
  shades, owners, settings, invoices, onClose, onGenerateSingleInvoice
}) => {
  const occupiedShades = useMemo(() =>
    sortShadesByNumber(shades.filter(s => s.status === 'occupied' && s.ownerId)),
  [shades]);

  const [step, setStep] = useState<BulkStep>('select');
  const [selectionMode, setSelectionMode] = useState<'all' | 'custom'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<ShadeEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + settings.gracePeriodDays);
    return d.toISOString().split('T')[0];
  });
  const [dueDateInput, setDueDateInput] = useState(dueDate);
  const [billingMonths, setBillingMonths] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Shades with a non-cancelled invoice generated within the chosen billing window
  const recentlyBilledIds = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - billingMonths * 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return new Set(
      invoices
        .filter(inv => inv.status !== 'cancelled' && inv.generatedDate >= cutoffStr)
        .map(inv => inv.shadeId)
    );
  }, [invoices, billingMonths]);

  const unbilledShades = useMemo(() =>
    occupiedShades.filter(s => !recentlyBilledIds.has(s.id)),
  [occupiedShades, recentlyBilledIds]);

  // Sync "all" selection when billing months change — only on the select step
  useEffect(() => {
    if (selectionMode === 'all' && step === 'select') {
      setSelectedIds(new Set(unbilledShades.map(s => s.id)));
    }
  }, [unbilledShades, selectionMode, step]);

  const chosenShades = useMemo(() =>
    sortShadesByNumber(occupiedShades.filter(s => selectedIds.has(s.id))),
  [occupiedShades, selectedIds]);

  const getOwnerName = (shade: Shade) => {
    const o = owners.find(x => x.id === shade.ownerId);
    return o?.name || '—';
  };

  const toggleShade = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startFillStep = () => {
    if (selectedIds.size === 0) return;
    const initial: ShadeEntry[] = chosenShades.map(shade => ({
      shade,
      newWaterReading: shade.currentWaterReading || shade.lastWaterReading,
      waterSkipped: false,
      otherName: '',
      otherCharge: 0,
    }));
    setEntries(initial);
    setCurrentIdx(0);
    setStep('fill');
  };

  const updateEntry = (idx: number, patch: Partial<ShadeEntry>) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const tryNext = () => {
    const e = entries[currentIdx];
    if (e.newWaterReading <= e.shade.lastWaterReading && !e.waterSkipped) {
      setShowSkipConfirm(true);
      return;
    }
    moveNext();
  };

  const moveNext = () => {
    setShowSkipConfirm(false);
    if (currentIdx < entries.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setStep('review');
    }
  };

  const handleSkipAndNext = () => {
    updateEntry(currentIdx, { waterSkipped: true });
    moveNext();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    let failed = 0;
    for (const entry of entries) {
      const waterVal = entry.waterSkipped
        ? entry.shade.lastWaterReading
        : entry.newWaterReading;
      try {
        await onGenerateSingleInvoice(
          entry.shade.id,
          dueDateInput,
          waterVal,
          entry.otherName,
          entry.otherCharge,
          billingMonths,
          true // silent — suppress per-invoice toast
        );
      } catch {
        failed += 1;
      }
    }
    setGenerating(false);
    if (failed > 0) {
      setGenerateError(`${entries.length - failed} succeeded, ${failed} failed. Check the toast for details.`);
    } else {
      setGenerated(true);
    }
  };

  const current = entries[currentIdx];
  const maintenance = Math.round((settings.defaultMaintenance / 2) * billingMonths);
  const skippedCount = entries.filter(e => e.waterSkipped).length;

  const modal = (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '680px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Bulk Invoice Generation
            {step === 'fill' && (
              <span style={{ fontSize: '13px', fontWeight: '400', color: 'var(--text-secondary)' }}>
                — Shade {currentIdx + 1} of {entries.length}
              </span>
            )}
          </h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* ── Step Progress Bar ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)' }}>
          {(['select', 'fill', 'review'] as BulkStep[]).map((s, i) => {
            const done = step === 'review' || (step === 'fill' && s === 'select') || (step !== 'select' && i < ['select', 'fill', 'review'].indexOf(step));
            const active = step === s;
            const labels = ['1. Select Shades', '2. Enter Readings', '3. Review & Generate'];
            return (
              <div key={s} style={{ flex: 1, padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: active ? '700' : '500', color: active ? 'var(--primary)' : done ? '#16a34a' : 'var(--text-muted)', borderBottom: active ? '2px solid var(--primary)' : done ? '2px solid #16a34a' : '2px solid transparent', backgroundColor: active ? 'var(--primary-light)' : 'transparent' }}>
                {done && !active ? '✓ ' : ''}{labels[i]}
              </div>
            );
          })}
        </div>

        <div className="modal-body">

          {/* ── STEP 1: SELECT ── */}
          {step === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setSelectionMode('all'); setSelectedIds(new Set(unbilledShades.map(s => s.id))); }}
                  className={`btn ${selectionMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '16px', flexDirection: 'column', alignItems: 'center', gap: '6px', display: 'flex', height: 'auto' }}
                >
                  <span style={{ fontSize: '24px' }}>🏭</span>
                  <span style={{ fontWeight: '700' }}>All Pending Shades</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>
                    {unbilledShades.length} of {occupiedShades.length} shades not yet billed
                    {recentlyBilledIds.size > 0 && ` · ${recentlyBilledIds.size} already billed`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectionMode('custom'); setSelectedIds(new Set()); }}
                  className={`btn ${selectionMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '16px', flexDirection: 'column', alignItems: 'center', gap: '6px', display: 'flex', height: 'auto' }}
                >
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <span style={{ fontWeight: '700' }}>Custom Selection</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>Pick specific shades manually</span>
                </button>
              </div>

              {selectionMode === 'custom' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Select shades to bill:</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set(unbilledShades.map(s => s.id)))}>Pending Only</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set(occupiedShades.map(s => s.id)))}>Select All</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>Clear</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', maxHeight: '300px', overflowY: 'auto', padding: '4px' }}>
                    {occupiedShades.map(shade => {
                      const checked = selectedIds.has(shade.id);
                      const alreadyBilled = recentlyBilledIds.has(shade.id);
                      return (
                        <div
                          key={shade.id}
                          onClick={() => toggleShade(shade.id)}
                          style={{ padding: '10px 12px', border: `2px solid ${checked ? 'var(--primary)' : alreadyBilled ? '#fde68a' : 'var(--border-color)'}`, borderRadius: '8px', cursor: 'pointer', backgroundColor: checked ? 'var(--primary-light)' : alreadyBilled ? '#fefce8' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
                        >
                          <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${checked ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: checked ? 'var(--primary)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {checked && <Check size={11} color="#fff" />}
                          </div>
                          <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '12px', color: checked ? 'var(--primary)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                              {shade.id}
                              {alreadyBilled && <span style={{ fontSize: '9px', backgroundColor: '#f59e0b', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: '600' }}>BILLED</span>}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getOwnerName(shade)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '140px' }}>
                  <label>Due Date</label>
                  <input type="date" className="form-control" value={dueDateInput} onChange={e => setDueDateInput(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0, minWidth: '130px' }}>
                  <label>Billing Months</label>
                  <select className="form-control" value={billingMonths} onChange={e => setBillingMonths(Number(e.target.value))}>
                    <option value={1}>1 Month</option>
                    <option value={2}>2 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                  </select>
                </div>
              </div>

              {selectedIds.size > 0 ? (
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                  {selectedIds.size} shade{selectedIds.size > 1 ? 's' : ''} selected · Maintenance: {formatCurrency(maintenance)} per shade
                </div>
              ) : (
                <div style={{ padding: '10px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {unbilledShades.length === 0 ? 'All occupied shades have been billed for this period.' : 'No shades selected.'}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: FILL ── */}
          {step === 'fill' && current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Progress bar */}
              <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
                {entries.map((e, i) => (
                  <div key={e.shade.id} style={{ flex: 1, borderRadius: '3px', backgroundColor: i < currentIdx ? 'var(--primary)' : i === currentIdx ? '#3b82f6' : 'var(--border-color)' }} />
                ))}
              </div>

              {/* Shade info card */}
              <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '20px', color: 'var(--primary)' }}>{current.shade.id}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{current.shade.block} · {current.shade.floor}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{getOwnerName(current.shade)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Maintenance: {formatCurrency(maintenance)}</div>
                </div>
              </div>

              {/* Water reading section */}
              <div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '140px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Droplet size={14} style={{ color: '#3b82f6' }} />
                        Last Reading: <strong>{current.shade.lastWaterReading} units</strong>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder={`Enter new reading (above ${current.shade.lastWaterReading})`}
                        value={current.newWaterReading || ''}
                        onChange={e => updateEntry(currentIdx, { newWaterReading: parseInt(e.target.value) || 0, waterSkipped: false })}
                        min={current.shade.lastWaterReading}
                        style={{ borderColor: current.waterSkipped ? '#f59e0b' : undefined }}
                      />
                    </div>
                    {current.newWaterReading > current.shade.lastWaterReading && (
                      <div style={{ padding: '8px 12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '12px', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                        +{current.newWaterReading - current.shade.lastWaterReading} units<br />
                        <strong>{formatCurrency((current.newWaterReading - current.shade.lastWaterReading) * settings.waterRate)}</strong>
                      </div>
                    )}
                  </div>
                  {current.waterSkipped && (
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#d97706', backgroundColor: '#fefce8', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                      <AlertTriangle size={13} />
                      Water reading skipped — will bill without water charge
                    </div>
                  )}
              </div>

              {/* Other charges */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0, flex: 2, minWidth: '160px' }}>
                  <label>Other Charge Name <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(optional)</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Electrical repair"
                    value={current.otherName}
                    onChange={e => updateEntry(currentIdx, { otherName: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '120px' }}>
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={current.otherCharge || ''}
                    onChange={e => updateEntry(currentIdx, { otherCharge: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>

              {/* Skip confirm popup */}
              {showSkipConfirm && (
                <div style={{ padding: '14px', backgroundColor: '#fefce8', border: '2px solid #f59e0b', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#92400e' }}>Water reading not entered</div>
                      <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                        {current.shade.id} has water supply. You haven't entered a new reading.<br />
                        If you continue, <strong>water will not be charged</strong> on this invoice.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSkipConfirm(false)}>
                      Go Back & Enter Reading
                    </button>
                    <button type="button" className="btn btn-sm" style={{ backgroundColor: '#f59e0b', border: 'none', color: '#fff', fontWeight: '700' }} onClick={handleSkipAndNext}>
                      Generate Without Water
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: REVIEW ── */}
          {step === 'review' && !generated && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {generateError && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#dc2626', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  {generateError}
                </div>
              )}
              {skippedCount > 0 && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#92400e' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span><strong>{skippedCount} shade{skippedCount > 1 ? 's' : ''}</strong> will be billed without a water reading.</span>
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>SHADE</th>
                      <th>OWNER</th>
                      <th>MAINTENANCE</th>
                      <th>WATER</th>
                      <th>OTHER</th>
                      <th>TOTAL</th>
                      <th>NOTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => {
                      const waterUnits = !entry.waterSkipped
                        ? Math.max(0, entry.newWaterReading - entry.shade.lastWaterReading)
                        : 0;
                      const waterCharge = waterUnits * settings.waterRate;
                      const total = maintenance + waterCharge + entry.otherCharge;
                      return (
                        <tr key={entry.shade.id}>
                          <td><strong style={{ color: 'var(--primary)' }}>{entry.shade.id}</strong></td>
                          <td>{getOwnerName(entry.shade)}</td>
                          <td>{formatCurrency(maintenance)}</td>
                          <td style={{ color: waterCharge > 0 ? '#1d4ed8' : 'var(--text-muted)' }}>
                            {waterCharge > 0 ? formatCurrency(waterCharge) : '—'}
                          </td>
                          <td style={{ color: entry.otherCharge > 0 ? '#d97706' : 'var(--text-muted)' }}>
                            {entry.otherCharge > 0 ? formatCurrency(entry.otherCharge) : '—'}
                          </td>
                          <td><strong>{formatCurrency(total)}</strong></td>
                          <td>
                            {entry.waterSkipped && (
                              <span style={{ color: '#d97706', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle size={10} /> No reading
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: 'var(--bg-main)', fontWeight: '700' }}>
                      <td colSpan={5} style={{ textAlign: 'right', padding: '10px 12px' }}>Grand Total ({entries.length} invoices):</td>
                      <td style={{ padding: '10px 12px' }}>
                        {formatCurrency(entries.reduce((sum, entry) => {
                          const waterUnits = !entry.waterSkipped
                            ? Math.max(0, entry.newWaterReading - entry.shade.lastWaterReading) : 0;
                          return sum + maintenance + (waterUnits * settings.waterRate) + entry.otherCharge;
                        }, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', color: '#1e40af' }}>
                Due date: <strong>{dueDateInput}</strong> · Billing period: <strong>{billingMonths} month{billingMonths > 1 ? 's' : ''}</strong> · Status: <strong>Draft</strong>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {generated && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={32} color="#16a34a" />
              </div>
              <h3 style={{ color: '#16a34a', marginBottom: '8px' }}>{entries.length} invoices generated!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>All draft invoices created. Go to the Invoices tab to review and send them.</p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="modal-footer">
          {!generated && (
            <>
              {step === 'select' && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={selectedIds.size === 0}
                    onClick={startFillStep}
                  >
                    Next: Enter Readings <ChevronRight size={16} />
                  </button>
                </>
              )}
              {step === 'fill' && (
                <>
                  <button type="button" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => {
                    setShowSkipConfirm(false);
                    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
                    else setStep('select');
                  }}>
                    <ChevronLeft size={16} /> Back
                  </button>
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={tryNext}
                  >
                    {currentIdx < entries.length - 1 ? (
                      <>Next Shade <ChevronRight size={16} /></>
                    ) : (
                      <>Review All <ChevronRight size={16} /></>
                    )}
                  </button>
                </>
              )}
              {step === 'review' && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => { setCurrentIdx(entries.length - 1); setStep('fill'); }}>
                    <ChevronLeft size={16} /> Edit Readings
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {generating ? (
                      <>Generating…</>
                    ) : (
                      <><Check size={16} /> Confirm &amp; Generate {entries.length} Invoices</>
                    )}
                  </button>
                </>
              )}
            </>
          )}
          {generated && (
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};
