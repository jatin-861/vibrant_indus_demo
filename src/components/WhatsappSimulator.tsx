import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Phone, Video, MoreVertical, ArrowLeft,
  CheckCheck, PlayCircle, SkipForward, RotateCcw,
  FileText, AlertTriangle, Clock, CheckCircle2, Circle, Zap
} from 'lucide-react';
import type { Shade, Owner, Invoice, WhatsAppMessage, SystemSettings } from '../types';

interface WhatsappSimulatorProps {
  shades: Shade[];
  owners: Owner[];
  invoices: Invoice[];
  messages: WhatsAppMessage[];
  settings?: SystemSettings;
  onSendMessage: (phone: string, text: string) => void;
  onSimulatePayment: (invoiceId: string) => void;
  selectedShadeId: string;
  setSelectedShadeId: (id: string) => void;
}

interface SimStep {
  id: number;
  day: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  toOwner: boolean;
  toRenter: boolean;
  hasQR?: boolean;
  hasPDF?: boolean;
  buildMessage: (name: string, inv: Invoice | null, shade: Shade | null, penaltyPerDay: number, graceDays: number) => string;
}

const buildSimSteps = (graceDays: number, penaltyPerDay: number, reminderDaysBefore: number[]): SimStep[] => {
  const r0 = reminderDaysBefore[0] ?? 3;
  const r1 = reminderDaysBefore[1] ?? 1;
  return [
    {
      id: 1, day: 'Day 1', label: 'Invoice Dispatched',
      sublabel: 'Bill + QR code sent to Owner & Renter',
      icon: <FileText size={14} />, color: '#3b82f6', bgColor: '#eff6ff',
      toOwner: true, toRenter: true, hasQR: true,
      buildMessage: (name, inv, shade, _p, gd) =>
        `🏭 *Fortune Industrial Park*\n\nDear *${name}*,\n\nYour maintenance bill for *${shade?.id || 'Shade'} — ${shade?.block || ''}* has been generated.\n\n📋 Invoice: *${inv?.id || 'KIN-2026-0001'}*\n📅 Due Date: ${inv?.dueDate || `Within ${gd} days`}\n\n💰 *Bill Breakdown:*\n├ Maintenance: ₹${inv?.maintenanceAmount || inv?.maintenanceFee || 720}\n├ Water Charges: ₹${inv?.waterAmount || 0}${(inv?.transferFee || 0) > 0 ? `\n├ Transfer Fee: ₹${inv?.transferFee}` : ''}\n└ *Total Due: ₹${inv?.totalAmount || 720}*\n\nScan the QR code below to pay online instantly, or visit the office.\n\n_Fortune Industrial Park · Society Office_`
    },
    {
      id: 2, day: `Day ${graceDays - r0}`, label: `${r0}-Day Reminder`,
      sublabel: `Sent ${r0} days before due date`,
      icon: <Clock size={14} />, color: '#f59e0b', bgColor: '#fffbeb',
      toOwner: true, toRenter: true,
      buildMessage: (name, inv, _sh, penaltyPerDay) =>
        `🏭 *Fortune Industrial Park*\n\nDear *${name}*,\n\nFriendly reminder — your maintenance payment is due in *${r0} days*.\n\n📋 Invoice: *${inv?.id || 'KIN-2026-0001'}*\n💰 Amount Due: *₹${inv?.totalAmount || 720}*\n📅 Due Date: ${inv?.dueDate || `In ${r0} days`}\n\n⚠️ After due date, a late fine of *₹${penaltyPerDay}/day* will apply.\n\n💳 Pay via UPI, online, or office (Cash/Cheque).\n\n_Fortune Industrial Park_`
    },
    {
      id: 3, day: `Day ${graceDays - r1}`, label: '1-Day Reminder',
      sublabel: 'Urgent alert — due tomorrow',
      icon: <AlertTriangle size={14} />, color: '#ef4444', bgColor: '#fef2f2',
      toOwner: true, toRenter: true,
      buildMessage: (name, inv, _sh, penaltyPerDay) =>
        `🏭 *Fortune Industrial Park*\n⚠️ *Payment Due TOMORROW*\n\nDear *${name}*,\n\nYour maintenance payment is due *tomorrow*. Please clear it today to avoid penalty.\n\n📋 Invoice: *${inv?.id || 'KIN-2026-0001'}*\n💰 Amount Due: *₹${inv?.totalAmount || 720}*\n\n❌ A fine of *₹${penaltyPerDay}/day* will start from tomorrow if unpaid.\n\n📲 Pay now via UPI or visit the office.\n\n_Fortune Industrial Park_`
    },
    {
      id: 4, day: `Day ${graceDays + 1}`, label: 'Overdue — Day 1 Fine',
      sublabel: `₹${penaltyPerDay} penalty charged`,
      icon: <AlertTriangle size={14} />, color: '#dc2626', bgColor: '#fef2f2',
      toOwner: true, toRenter: true,
      buildMessage: (name, inv, _sh, penaltyPerDay) =>
        `🏭 *Fortune Industrial Park*\n🚨 *OVERDUE NOTICE*\n\nDear *${name}*,\n\nYour invoice is now *overdue*. A late penalty has been added to your account.\n\n📋 Invoice: *${inv?.id || 'KIN-2026-0001'}*\n💰 Original Amount: ₹${inv?.totalAmount || 720}\n🔴 Late Fine (1 day): *₹${penaltyPerDay}*\n💰 *Total Now Payable: ₹${(inv?.totalAmount || 720) + penaltyPerDay}*\n\nPenalty increases by *₹${penaltyPerDay} every day* until payment is received.\n\nPlease pay immediately.\n\n_Fortune Industrial Park_`
    },
    {
      id: 5, day: `Day ${graceDays + 5}`, label: 'Overdue — Day 5 Fine',
      sublabel: `₹${penaltyPerDay * 5} accumulated penalty`,
      icon: <AlertTriangle size={14} />, color: '#991b1b', bgColor: '#fef2f2',
      toOwner: true, toRenter: false,
      buildMessage: (name, inv, _sh, penaltyPerDay) =>
        `🏭 *Fortune Industrial Park*\n🚨 *FINAL WARNING — OVERDUE 5 DAYS*\n\nDear *${name}*,\n\nYour invoice is now *5 days overdue*. Total accumulated penalty is significant.\n\n📋 Invoice: *${inv?.id || 'KIN-2026-0001'}*\n💰 Original: ₹${inv?.totalAmount || 720}\n🔴 Accumulated Fine (5 × ₹${penaltyPerDay}): *₹${penaltyPerDay * 5}*\n💰 *Total Payable: ₹${(inv?.totalAmount || 720) + penaltyPerDay * 5}*\n\nPlease contact the office immediately.\n📞 +91 98765 43210\n\n_Fortune Industrial Park_`
    },
    {
      id: 6, day: 'On Payment', label: 'Payment Receipt Sent',
      sublabel: 'PDF receipt dispatched instantly',
      icon: <CheckCircle2 size={14} />, color: '#16a34a', bgColor: '#f0fdf4',
      toOwner: true, toRenter: true, hasPDF: true,
      buildMessage: (name, inv) =>
        `🏭 *Fortune Industrial Park*\n✅ *Payment Confirmed*\n\nDear *${name}*,\n\nWe have received your payment. Your account is now clear.\n\n📋 Invoice: *${inv?.id || 'KIN-2026-0001'}*\n💰 Amount Paid: *₹${inv?.totalAmount || 720}*\n📅 Payment Date: ${new Date().toLocaleDateString('en-IN')}\n🧾 Receipt No: KIN-RCP-${String(Math.floor(Math.random() * 9000) + 1000)}\n\nThank you for your prompt payment! 🙏\n\n_Fortune Industrial Park_`
    }
  ];
};

// ── Phone screen component ──────────────────────────────────────────────
const PhoneScreen: React.FC<{
  personName: string;
  personType: 'Owner' | 'Renter';
  chatMessages: WhatsAppMessage[];
  typedMessage: string;
  setTypedMessage: (v: string) => void;
  onSend: (e: React.FormEvent) => void;
  onPayClick: (invoiceId: string) => void;
  ownerInvoice: Invoice | null;
}> = ({ personName, personType, chatMessages, typedMessage, setTypedMessage, onSend, onPayClick, ownerInvoice }) => {
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [chatMessages]);

  const typeColor = personType === 'Owner' ? '#eab308' : '#6366f1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* Label above phone */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: personType === 'Owner' ? '#fefce8' : '#eef2ff', border: `1px solid ${typeColor}33`, borderRadius: '20px' }}>
        <span style={{ fontSize: '16px' }}>{personType === 'Owner' ? '👑' : '🏢'}</span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '12px', color: typeColor }}>{personType}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{personName}</div>
        </div>
      </div>

      {/* Phone frame */}
      <div className="phone-frame" style={{ transform: 'scale(0.88)', transformOrigin: 'top center', marginTop: '-8px' }}>
        <div className="phone-speaker" />
        <div className="phone-screen">
          {/* WA Header — shows Fortune as the contact */}
          <div className="whatsapp-header">
            <ArrowLeft size={14} style={{ cursor: 'pointer', opacity: 0.7 }} />
            <div className="wa-avatar" style={{ backgroundColor: '#25d366', fontSize: '9px', fontWeight: '800' }}>FIP</div>
            <div className="wa-contact-info">
              <span className="wa-contact-name" style={{ fontSize: '11px' }}>Fortune Industrial Park</span>
              <span className="wa-contact-status" style={{ fontSize: '9px' }}>Business Account</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', opacity: 0.8 }}>
              <Video size={13} />
              <Phone size={13} />
              <MoreVertical size={13} />
            </div>
          </div>

          {/* Chat body */}
          <div className="whatsapp-chat-body" ref={chatBodyRef} style={{ fontSize: '9.5px' }}>
            {chatMessages.length === 0 ? (
              <div style={{ alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.85)', padding: '6px 12px', borderRadius: '10px', fontSize: '9px', color: '#666', textAlign: 'center', margin: '30px 8px 0' }}>
                🔒 End-to-end encrypted<br />
                <span style={{ color: '#aaa', fontSize: '8px' }}>No messages yet — run a timeline step</span>
              </div>
            ) : (
              chatMessages.map(m => {
                const hasQR = m.content.includes('[UPI QR Code]');
                const hasPDF = m.content.includes('[PDF Receipt]');
                const text = m.content.replace('[UPI QR Code]', '').replace('[PDF Receipt]', '');
                return (
                  <div key={m.id} className="wa-msg-bubble incoming">
                    <div className="wa-msg-text" style={{ whiteSpace: 'pre-wrap', fontSize: '9.5px', lineHeight: '1.5' }}>
                      {text}
                    </div>
                    {hasQR && (
                      <div style={{ marginTop: '6px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontSize: '7px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Scan to Pay</div>
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '9px', color: '#64748b', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                          📱<br />UPI QR
                        </div>
                        <button
                          onClick={() => onPayClick(m.invoiceId || ownerInvoice?.id || '')}
                          style={{ width: '100%', padding: '5px', backgroundColor: '#1259c3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '8px' }}
                        >
                          Pay ₹{ownerInvoice?.totalAmount || '—'} Online
                        </button>
                      </div>
                    )}
                    {hasPDF && (
                      <div style={{ marginTop: '6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '22px', height: '22px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '7px', flexShrink: 0 }}>PDF</div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '8px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Payment-Receipt.pdf</div>
                          <div style={{ fontSize: '7px', color: 'var(--text-secondary)' }}>142 KB</div>
                        </div>
                        <button onClick={() => alert('Receipt PDF (Simulated)')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '8px', fontWeight: '700' }}>Open</button>
                      </div>
                    )}
                    <span className="wa-msg-time" style={{ fontSize: '7px' }}>
                      {m.timestamp} <CheckCheck size={9} style={{ color: '#53bdeb', display: 'inline', marginLeft: '2px', verticalAlign: 'middle' }} />
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer input */}
          <form className="whatsapp-footer" onSubmit={onSend} style={{ gap: '6px' }}>
            <input type="text" placeholder="Type a message" className="wa-input-box" style={{ fontSize: '10px' }} value={typedMessage} onChange={e => setTypedMessage(e.target.value)} />
            <button type="submit" className="wa-send-btn"><Send size={12} /></button>
          </form>
        </div>
      </div>
    </div>
  );
};


// ── Main Simulator ──────────────────────────────────────────────────────
export const WhatsappSimulator: React.FC<WhatsappSimulatorProps> = ({
  shades, owners, invoices, messages, settings,
  onSendMessage, onSimulatePayment,
  selectedShadeId, setSelectedShadeId
}) => {
  const graceDays = settings?.gracePeriodDays ?? 5;
  const penaltyPerDay = settings?.finePerDay ?? 100;
  const reminderDaysBefore = settings?.reminderDays ?? [3, 1];
  const SIM_STEPS = buildSimSteps(graceDays, penaltyPerDay, reminderDaysBefore);

  const [ownerTyped, setOwnerTyped] = useState('');
  const [renterTyped, setRenterTyped] = useState('');
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [razorpayTab, setRazorpayTab] = useState<'methods' | 'upi' | 'card' | 'netbanking'>('methods');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Auto-select first occupied shade
  useEffect(() => {
    if (!selectedShadeId && shades.length > 0) {
      const first = shades.find(s => s.status === 'occupied') || shades[0];
      setSelectedShadeId(first.id);
    }
  }, [shades, selectedShadeId, setSelectedShadeId]);

  const selectedShade = shades.find(s => s.id === selectedShadeId) || shades[0] || null;
  const ownerPerson = selectedShade?.ownerId ? owners.find(o => o.id === selectedShade.ownerId) || null : null;
  const renterPerson = selectedShade?.renterId ? owners.find(o => o.id === selectedShade.renterId) || null : null;
  const shadeInvoice = invoices.find(i => i.shadeId === selectedShade?.id && i.status !== 'paid' && i.status !== 'cancelled') ||
    invoices.find(i => i.shadeId === selectedShade?.id) || null;

  const ownerMessages = messages.filter(m => ownerPerson && m.phone === ownerPerson.phone);
  const renterMessages = messages.filter(m => renterPerson && m.phone === renterPerson.phone);

  const fireStep = async (stepIndex: number) => {
    const step = SIM_STEPS[stepIndex];
    if (!step || !selectedShade) return;

    const buildMsg = (name: string) =>
      (step.hasQR ? '[UPI QR Code]' : '') +
      (step.hasPDF ? '[PDF Receipt]' : '') +
      step.buildMessage(name, shadeInvoice, selectedShade, penaltyPerDay, graceDays);

    if (step.toOwner && ownerPerson) onSendMessage(ownerPerson.phone, buildMsg(ownerPerson.name));
    if (step.toRenter && renterPerson) {
      await new Promise<void>(res => setTimeout(() => {
        onSendMessage(renterPerson.phone, buildMsg(renterPerson.name));
        res();
      }, 400));
    }
    if (step.hasPDF && shadeInvoice) {
      setTimeout(() => onSimulatePayment(shadeInvoice.id), 800);
    }
    setCompletedSteps(prev => new Set(prev).add(step.id));
    setSimStep(stepIndex + 1);
  };

  const handleAutoPlay = async () => {
    if (isAutoPlaying) return;
    setIsAutoPlaying(true);
    for (let i = simStep; i < SIM_STEPS.length; i++) {
      if (i > simStep) await new Promise<void>(res => setTimeout(res, 2000));
      await fireStep(i);
    }
    setIsAutoPlaying(false);
  };

  const resetSim = () => { setSimStep(0); setCompletedSteps(new Set()); setIsAutoPlaying(false); };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const openCheckout = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId) || shadeInvoice;
    if (inv) { setCheckoutInvoice(inv); setRazorpayTab('methods'); setUpiIdInput(''); setCardNo(''); setCardExpiry(''); setCardCvv(''); setCardName(''); setSelectedBank(''); setIsProcessing(false); }
  };

  const executePayment = () => {
    if (!checkoutInvoice) return;
    setIsProcessing(true);
    setTimeout(() => {
      onSimulatePayment(checkoutInvoice.id);
      const receipt = `KIN-RCP-${Math.floor(Math.random() * 9000) + 1000}`;
      const msg = (name: string) => `[PDF Receipt]🏭 *Fortune Industrial Park*\n✅ *Payment Confirmed*\n\nDear *${name}*,\nAmount Paid: *${formatCurrency(checkoutInvoice.totalAmount)}*\n📅 ${new Date().toLocaleDateString('en-IN')}\n🧾 Receipt: ${receipt}\n\nYour account is now clear! 🙏\n\n_Fortune Industrial Park_`;
      if (ownerPerson) onSendMessage(ownerPerson.phone, msg(ownerPerson.name));
      if (renterPerson) setTimeout(() => onSendMessage(renterPerson.phone, msg(renterPerson.name)), 400);
      setIsProcessing(false);
      setCheckoutInvoice(null);
    }, 1500);
  };

  const allDone = simStep >= SIM_STEPS.length;
  const nextStep = !allDone ? SIM_STEPS[simStep] : null;

  const occupiedShades = shades.filter(s => s.status === 'occupied');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Shade Selector ── */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: '1', minWidth: '220px' }}>
            <label style={{ fontWeight: '700' }}>Select Shade to Simulate:</label>
            <select
              className="form-control"
              value={selectedShadeId}
              onChange={e => { setSelectedShadeId(e.target.value); resetSim(); }}
            >
              {(occupiedShades.length > 0 ? occupiedShades : shades).map(s => {
                const owner = owners.find(o => o.id === s.ownerId);
                const renter = s.renterId ? owners.find(o => o.id === s.renterId) : null;
                return (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.block} · {s.floor}{owner ? `  |  Owner: ${owner.name}` : ''}{renter ? `  ·  Renter: ${renter.name}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Info chips */}
          {selectedShade && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '2px' }}>
              <div style={{ padding: '4px 10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#1d4ed8' }}>
                📐 {selectedShade.sqFt} Sq Ft
              </div>
              {ownerPerson && (
                <div style={{ padding: '4px 10px', backgroundColor: '#fefce8', border: '1px solid #fde68a', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#92400e' }}>
                  👑 {ownerPerson.name} · {ownerPerson.phone}
                </div>
              )}
              {renterPerson && (
                <div style={{ padding: '4px 10px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#4338ca' }}>
                  🏢 {renterPerson.name} · {renterPerson.phone}
                </div>
              )}
              {!renterPerson && (
                <div style={{ padding: '4px 10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  No renter assigned
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Grid: Timeline + Two Phones ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'start' }}>

        {/* Left: Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#f59e0b' }} />
                <div>
                  <h3 style={{ margin: 0 }}>Virtual Timeline Simulation</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Sends to both Owner & Renter phones simultaneously — watch the screens light up
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                {!allDone && (
                  <button className="btn btn-primary btn-sm" onClick={handleAutoPlay} disabled={isAutoPlaying} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PlayCircle size={14} />{isAutoPlaying ? 'Playing…' : 'Auto-Play All'}
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={resetSim} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {SIM_STEPS.map((step, idx) => {
                  const done = completedSteps.has(step.id);
                  const active = simStep === idx;
                  const locked = simStep < idx;
                  return (
                    <div key={step.id} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '26px', flexShrink: 0 }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: done ? step.color : active ? step.bgColor : 'var(--bg-main)', border: `2px solid ${done || active ? step.color : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? '#fff' : active ? step.color : 'var(--text-muted)', flexShrink: 0, transition: 'all 0.3s', zIndex: 1 }}>
                          {done ? <CheckCircle2 size={13} /> : locked ? <Circle size={11} /> : step.icon}
                        </div>
                        {idx < SIM_STEPS.length - 1 && (
                          <div style={{ width: '2px', flex: 1, minHeight: '16px', backgroundColor: done ? step.color : 'var(--border-color)', margin: '2px 0' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, padding: '8px 12px', marginBottom: '6px', borderRadius: 'var(--radius-md)', backgroundColor: active ? step.bgColor : done ? `${step.bgColor}88` : 'var(--bg-main)', border: `1px solid ${active ? step.color : done ? `${step.color}44` : 'var(--border-color)'}`, opacity: locked ? 0.45 : 1, transition: 'all 0.3s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '10px', fontWeight: '700', color: step.color, textTransform: 'uppercase' }}>{step.day}</span>
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', gap: '3px' }}>
                                {step.toOwner && <span style={{ background: '#fefce8', color: '#92400e', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }}>👑 Owner</span>}
                                {step.toRenter && <span style={{ background: '#eef2ff', color: '#4338ca', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }}>🏢 Renter</span>}
                              </span>
                              {done && <span style={{ fontSize: '9px', color: step.color, fontWeight: '700' }}>✓ Sent</span>}
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>{step.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{step.sublabel}</div>
                          </div>
                          {active && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => fireStep(idx)}
                              disabled={isAutoPlaying}
                              style={{ backgroundColor: step.color, borderColor: step.color, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                            >
                              <SkipForward size={12} /> Send
                            </button>
                          )}
                        </div>
                        {active && selectedShade && (ownerPerson || renterPerson) && (
                          <div style={{ marginTop: '8px', padding: '7px 9px', backgroundColor: '#fff', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', fontSize: '9.5px', color: 'var(--text-secondary)', lineHeight: '1.5', maxHeight: '72px', overflowY: 'auto' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Preview: </strong>
                            {step.buildMessage(ownerPerson?.name || 'Member', shadeInvoice, selectedShade, penaltyPerDay, graceDays).slice(0, 200)}…
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {allDone && (
                <div style={{ textAlign: 'center', padding: '14px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--radius-md)', marginTop: '8px' }}>
                  <CheckCircle2 size={26} style={{ color: '#16a34a', marginBottom: '4px' }} />
                  <div style={{ fontWeight: '700', color: '#16a34a', fontSize: '14px' }}>Full billing cycle complete!</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>Both owner and renter received all messages.</div>
                  <button className="btn btn-secondary btn-sm" onClick={resetSim} style={{ marginTop: '10px' }}><RotateCcw size={12} /> Run Again</button>
                </div>
              )}
              {!allDone && nextStep && (
                <div style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <strong>Next:</strong> "{nextStep.label}" — click <strong>Send</strong> or use <strong>Auto-Play All</strong>
                </div>
              )}
            </div>
          </div>

          {/* PRD feature coverage */}
          <div className="card">
            <div className="card-header"><h3>Automation Coverage</h3></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { icon: '📄', title: 'Invoice Dispatch', desc: 'Bill + QR code on generation' },
                  { icon: '⏰', title: `${reminderDaysBefore[0] ?? 3}-Day Reminder`, desc: 'Before due date alert' },
                  { icon: '⚠️', title: '1-Day Urgent', desc: 'Final alert before due' },
                  { icon: '🚨', title: 'Overdue Alerts', desc: 'Daily notices after due date' },
                  { icon: '💸', title: 'Penalty Tracking', desc: `₹${penaltyPerDay}/day after ${graceDays}-day grace` },
                  { icon: '🧾', title: 'Receipt on Payment', desc: 'Sent to Owner + Renter instantly' },
                ].map(f => (
                  <div key={f.title} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{f.icon}</span>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '11px', color: 'var(--text-primary)' }}>{f.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: '#fefce8', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', fontSize: '11px', color: '#92400e' }}>
                📌 Connect <strong>WhatsApp Business API</strong> in Settings to activate real delivery. Grace period, penalty rate & reminder schedule are all configurable in Settings.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Dual Phone Screens */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Owner phone */}
          {ownerPerson ? (
            <PhoneScreen
              personName={ownerPerson.name}
              personType="Owner"
              chatMessages={ownerMessages}
              typedMessage={ownerTyped}
              setTypedMessage={setOwnerTyped}
              onSend={e => { e.preventDefault(); if (ownerTyped.trim()) { onSendMessage(ownerPerson.phone, ownerTyped); setOwnerTyped(''); } }}
              onPayClick={openCheckout}
              ownerInvoice={shadeInvoice}
            />
          ) : (
            <div style={{ width: '200px', textAlign: 'center', padding: '40px 16px', backgroundColor: 'var(--bg-main)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '12px' }}>
              👑<br />No owner assigned<br />to this shade
            </div>
          )}

          {/* Renter phone */}
          {renterPerson ? (
            <PhoneScreen
              personName={renterPerson.name}
              personType="Renter"
              chatMessages={renterMessages}
              typedMessage={renterTyped}
              setTypedMessage={setRenterTyped}
              onSend={e => { e.preventDefault(); if (renterTyped.trim()) { onSendMessage(renterPerson.phone, renterTyped); setRenterTyped(''); } }}
              onPayClick={openCheckout}
              ownerInvoice={shadeInvoice}
            />
          ) : (
            <div style={{ width: '200px', textAlign: 'center', padding: '40px 16px', backgroundColor: 'var(--bg-main)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '12px' }}>
              🏢<br />No renter assigned<br />to this shade
            </div>
          )}
        </div>
      </div>

      {/* ── Razorpay Checkout Modal ── */}
      {checkoutInvoice && (
        <div className="modal-overlay" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '380px', borderRadius: '10px', overflow: 'hidden', padding: 0, border: 'none' }}>
            <div style={{ backgroundColor: '#0f1c3f', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Gateway</div>
                <div style={{ fontSize: '15px', fontWeight: '800' }}>Fortune Industrial Park</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>Ref: {checkoutInvoice.id}</div>
              </div>
              <button onClick={() => setCheckoutInvoice(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ backgroundColor: '#17274f', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#fff' }}>
              <span style={{ opacity: 0.7 }}>Amount to Pay:</span>
              <strong style={{ fontSize: '15px', color: '#3395ff' }}>{formatCurrency(checkoutInvoice.totalAmount)}</strong>
            </div>

            {isProcessing ? (
              <div className="modal-body" style={{ padding: '40px 24px', textAlign: 'center', minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ border: '4px solid rgba(51,149,255,0.15)', borderTop: '4px solid #3395ff', borderRadius: '50%', width: '44px', height: '44px', animation: 'logoPulse 1s linear infinite', marginBottom: '14px' }} />
                <div style={{ fontWeight: '700', fontSize: '15px' }}>Authorizing Payment…</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>Securely connecting to bank…</div>
              </div>
            ) : (
              <div className="modal-body" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  <span>👤 {checkoutInvoice.ownerName}</span><span>📞 {checkoutInvoice.ownerPhone}</span>
                </div>

                {razorpayTab === 'methods' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Choose Payment Method</div>
                    {[
                      { tab: 'upi' as const, icon: '⚡', title: 'UPI / QR Code', sub: 'Google Pay, PhonePe, Paytm, BHIM' },
                      { tab: 'card' as const, icon: '💳', title: 'Debit / Credit Card', sub: 'Visa, MasterCard, RuPay' },
                      { tab: 'netbanking' as const, icon: '🏦', title: 'Net Banking', sub: 'All Indian banks supported' },
                    ].map(opt => (
                      <button key={opt.tab} onClick={() => setRazorpayTab(opt.tab)} style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: '18px' }}>{opt.icon}</span>
                        <div><strong style={{ fontSize: '13px', display: 'block' }}>{opt.title}</strong><span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{opt.sub}</span></div>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>›</span>
                      </button>
                    ))}
                    <button className="btn btn-secondary" onClick={() => setCheckoutInvoice(null)} style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}>Cancel</button>
                  </div>
                )}

                {razorpayTab === 'upi' && (
                  <div>
                    <button onClick={() => setRazorpayTab('methods')} style={{ border: 'none', background: 'none', color: '#1351b6', cursor: 'pointer', fontWeight: '700', fontSize: '12px', marginBottom: '12px' }}>← Back</button>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#fff', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '90px', height: '90px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '11px', color: '#64748b', textAlign: 'center', border: '1px dashed #cbd5e1' }}>📱<br />QR Code<br />(UPI)</div>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: '700' }}>SCAN TO PAY</span>
                      </div>
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} /><span>OR</span><span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
                      </div>
                      <input type="text" className="form-control" placeholder="yourname@upi" value={upiIdInput} onChange={e => setUpiIdInput(e.target.value)} style={{ width: '100%' }} />
                      <button className="btn btn-primary" onClick={executePayment} style={{ width: '100%', justifyContent: 'center', backgroundColor: '#1351b6', padding: '12px' }}>Pay {formatCurrency(checkoutInvoice.totalAmount)}</button>
                    </div>
                  </div>
                )}

                {razorpayTab === 'card' && (
                  <div>
                    <button onClick={() => setRazorpayTab('methods')} style={{ border: 'none', background: 'none', color: '#1351b6', cursor: 'pointer', fontWeight: '700', fontSize: '12px', marginBottom: '12px' }}>← Back</button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-group" style={{ margin: 0 }}><label style={{ fontSize: '11px', fontWeight: '600' }}>Card Number</label><input type="text" className="form-control" placeholder="4312 •••• •••• 9812" value={cardNo} onChange={e => setCardNo(e.target.value)} maxLength={19} /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group" style={{ margin: 0 }}><label style={{ fontSize: '11px', fontWeight: '600' }}>Expiry</label><input type="text" className="form-control" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} maxLength={5} /></div>
                        <div className="form-group" style={{ margin: 0 }}><label style={{ fontSize: '11px', fontWeight: '600' }}>CVV</label><input type="password" className="form-control" placeholder="•••" value={cardCvv} onChange={e => setCardCvv(e.target.value)} maxLength={3} /></div>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}><label style={{ fontSize: '11px', fontWeight: '600' }}>Name on Card</label><input type="text" className="form-control" placeholder="Name on Card" value={cardName} onChange={e => setCardName(e.target.value)} /></div>
                      <button className="btn btn-primary" onClick={executePayment} disabled={!cardNo || !cardExpiry || !cardCvv} style={{ width: '100%', justifyContent: 'center', backgroundColor: '#1351b6', padding: '12px', marginTop: '4px' }}>Pay {formatCurrency(checkoutInvoice.totalAmount)}</button>
                    </div>
                  </div>
                )}

                {razorpayTab === 'netbanking' && (
                  <div>
                    <button onClick={() => setRazorpayTab('methods')} style={{ border: 'none', background: 'none', color: '#1351b6', cursor: 'pointer', fontWeight: '700', fontSize: '12px', marginBottom: '12px' }}>← Back</button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[{ key: 'hdfc', name: '🏦 HDFC' }, { key: 'sbi', name: '🏦 SBI' }, { key: 'icici', name: '🏦 ICICI' }, { key: 'axis', name: '🏦 Axis' }].map(b => (
                          <button key={b.key} onClick={() => setSelectedBank(b.key)} style={{ padding: '10px', fontSize: '11px', fontWeight: '600', borderRadius: '6px', border: selectedBank === b.key ? '2px solid #1351b6' : '1px solid var(--border-color)', backgroundColor: selectedBank === b.key ? '#f0f6ff' : '#fff', color: selectedBank === b.key ? '#1351b6' : 'var(--text-primary)', cursor: 'pointer' }}>{b.name}</button>
                        ))}
                      </div>
                      <select className="form-control" value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
                        <option value="">— Other Bank —</option>
                        <option value="kotak">Kotak Mahindra</option>
                        <option value="pnb">Punjab National Bank</option>
                        <option value="bob">Bank of Baroda</option>
                        <option value="yes">Yes Bank</option>
                      </select>
                      <button className="btn btn-primary" onClick={executePayment} disabled={!selectedBank} style={{ width: '100%', justifyContent: 'center', backgroundColor: '#1351b6', padding: '12px' }}>Pay {formatCurrency(checkoutInvoice.totalAmount)}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
              🔒 Secured payment by <strong style={{ color: '#0f1c3f' }}>Razorpay</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
