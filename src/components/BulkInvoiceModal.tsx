import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import type { Shade, Owner, Invoice, SystemSettings } from '../types';

interface ShadeEntry {
  shade: Shade;
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
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [dueDateInput, setDueDateInput] = useState(dueDate);
  const billingMonths = 12;
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Shades with a non-cancelled invoice generated within the chosen billing window (1 year)
  const recentlyBilledIds = useMemo(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return new Set(
      invoices
        .filter(inv => inv.status !== 'cancelled' && inv.generatedDate >= cutoffStr)
        .map(inv => inv.shadeId)
    );
  }, [invoices]);

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
    moveNext();
  };

  const moveNext = () => {
    if (currentIdx < entries.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setStep('review');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    let failed = 0;
    for (const entry of entries) {
      try {
        await onGenerateSingleInvoice(
          entry.shade.id,
          dueDateInput,
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
  const maintenance = settings.defaultMaintenance;

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
            const labels = ['1. Select Shades', '2. Optional Charges', '3. Review & Generate'];
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
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>SHADE</th>
                      <th>OWNER</th>
                      <th>MAINTENANCE</th>
                      <th>OTHER</th>
                      <th>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => {
                      const total = maintenance + entry.otherCharge;
                      return (
                        <tr key={entry.shade.id}>
                          <td><strong style={{ color: 'var(--primary)' }}>{entry.shade.id}</strong></td>
                          <td>{getOwnerName(entry.shade)}</td>
                          <td>{formatCurrency(maintenance)}</td>
                          <td style={{ color: entry.otherCharge > 0 ? '#d97706' : 'var(--text-muted)' }}>
                            {entry.otherCharge > 0 ? formatCurrency(entry.otherCharge) : '—'}
                          </td>
                          <td><strong>{formatCurrency(total)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: 'var(--bg-main)', fontWeight: '700' }}>
                      <td colSpan={4} style={{ textAlign: 'right', padding: '10px 12px' }}>Grand Total ({entries.length} invoices):</td>
                      <td style={{ padding: '10px 12px' }}>
                        {formatCurrency(entries.reduce((sum, entry) => {
                          return sum + maintenance + entry.otherCharge;
                        }, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', color: '#1e40af' }}>
                Due date: <strong>{dueDateInput}</strong> · Billing period: <strong>1 Year</strong> · Status: <strong>Draft</strong>
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
                    Next: Optional Charges <ChevronRight size={16} />
                  </button>
                </>
              )}
              {step === 'fill' && (
                <>
                  <button type="button" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => {
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
                    <ChevronLeft size={16} /> Edit Charges
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
