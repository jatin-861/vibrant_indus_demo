import React, { useState } from 'react';
import { 
  Save, 
  RefreshCw, 
  Copy,
  Check
} from 'lucide-react';
import type { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  onResetDatabase: () => void;
  currentRole: 'Admin' | 'Secretary' | 'Treasurer';
  onSubmitRequest: (type: 'edit_shade' | 'update_settings' | 'reset_db', details: string, data: unknown) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetDatabase,
  currentRole,
  onSubmitRequest
}) => {
  const [defaultMaintenance, setDefaultMaintenance] = useState(settings.defaultMaintenance);
  const [waterRate, setWaterRate] = useState(settings.waterRate);
  const [transferFee, setTransferFee] = useState(settings.transferFee);
  const [gracePeriodDays, setGracePeriodDays] = useState(settings.gracePeriodDays);
  const [finePerDay, setFinePerDay] = useState(settings.finePerDay);
  const [upiId, setUpiId] = useState(settings.upiId);
  
  const [societyName, setSocietyName] = useState(settings.societyName || '');
  const [societyAddress, setSocietyAddress] = useState(settings.societyAddress || '');
  const [societyPhone, setSocietyPhone] = useState(settings.societyPhone || '');
  const [societyBankDetails, setSocietyBankDetails] = useState(settings.societyBankDetails || '');

  // Invoice settings
  const [invoiceTitle, setInvoiceTitle] = useState(settings.invoiceTitle || '');
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || '');
  const [invoiceNotes, setInvoiceNotes] = useState(settings.invoiceNotes || '');

  const [reminderDays, setReminderDays] = useState<string>(
    (settings.reminderDays || [3, 1]).join(', ')
  );

  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [requestSubmittedMsg, setRequestSubmittedMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedReminderDays = reminderDays
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

    const payload = {
      defaultMaintenance,
      waterRate,
      transferFee,
      gracePeriodDays,
      finePerDay,
      upiId,
      qrImageUrl: settings.qrImageUrl,
      societyName,
      societyAddress,
      societyPhone,
      societyBankDetails,
      invoiceTitle,
      invoicePrefix,
      invoiceNotes,
      reminderDays: parsedReminderDays.length > 0 ? parsedReminderDays : [3, 1]
    };

    if (currentRole === 'Admin') {
      onUpdateSettings(payload);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } else {
      onSubmitRequest(
        'update_settings',
        `Update billing params: Maint ₹${defaultMaintenance}, Water Rate ₹${waterRate}, Transfer Fee ₹${transferFee}, Grace Period ${gracePeriodDays} days, Fine ₹${finePerDay}/day`,
        payload
      );
      setRequestSubmittedMsg(true);
      setTimeout(() => setRequestSubmittedMsg(false), 4000);
    }
  };

  const copyTemplateData = () => {
    const csvContent = 
`Shade ID,Block,Floor,Size (SqFt),Status,Maintenance Rate,Last Water Reading
SH-001,Block A,Ground Floor,500,occupied,700,1050
SH-002,Block A,First Floor,450,occupied,700,820
SH-003,Block B,Ground Floor,600,vacant,700,0
SH-004,Block B,First Floor,400,occupied,700,310`;

    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="settings-view" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
      {/* Left Column: Config Panel */}
      <div>
        <div className="card">
          <div className="card-header">
            <h3>Global Billing Configuration</h3>
          </div>
          <div className="card-body">
            {successMsg && (
              <div style={{ padding: '12px', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success)', color: 'var(--color-success)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                ✓ Settings saved successfully! New rates and society details will apply to invoices.
              </div>
            )}

            {requestSubmittedMsg && (
              <div style={{ padding: '12px', backgroundColor: 'var(--color-pending-bg)', border: '1px solid var(--color-pending)', color: 'var(--color-pending)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                ✓ Configuration change request submitted to Amit Shah (Admin) for approval.
              </div>
            )}

            <form onSubmit={handleSave}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px', color: 'var(--primary)' }}>Invoice Header & Company Profile Settings</h4>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Society / Company Name*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={societyName}
                    onChange={(e) => setSocietyName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone Number*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={societyPhone}
                    onChange={(e) => setSocietyPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Society Address*</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={societyAddress}
                  onChange={(e) => setSocietyAddress(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Society Bank Account Details (Shown on Invoice)*</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={societyBankDetails}
                  onChange={(e) => setSocietyBankDetails(e.target.value)}
                  required
                />
              </div>

              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Invoice Title (e.g. Demand Invoice / Bill)*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Invoice Prefix ID (e.g. INV- or FTN-)*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Invoice Footer Notes / Disclaimer*</label>
                <textarea 
                  className="form-control"
                  style={{ minHeight: '60px', resize: 'vertical', width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 'inherit' }}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  required
                />
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px', marginTop: '24px', color: 'var(--primary)' }}>Billing Parameters</h4>

              <div className="form-row">
                <div className="form-group">
                  <label>Default Maintenance Fee (per 2 months)*</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={defaultMaintenance}
                    onChange={(e) => setDefaultMaintenance(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Water Rate (₹ per unit)*</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={waterRate}
                    onChange={(e) => setWaterRate(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>One-time Owner Transfer Fee (₹)*</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={transferFee}
                    onChange={(e) => setTransferFee(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Late Fee Grace Period (days)*</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Late Payment Penalty (₹ per day)*</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={finePerDay}
                    onChange={(e) => setFinePerDay(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Community Society UPI ID*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px', marginTop: '24px', color: 'var(--primary)' }}>WhatsApp Reminder Schedule</h4>

              <div className="form-group">
                <label>Send Reminders (days before due date)*</label>
                <input
                  type="text"
                  className="form-control"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value)}
                  placeholder="e.g., 3, 1"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Enter comma-separated days. Example: <strong>3, 1</strong> sends reminders 3 days and 1 day before due date.
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
                <Save size={16} /> {currentRole === 'Admin' ? 'Save Configurations' : 'Submit Config Request to Admin'}
              </button>
            </form>
          </div>
        </div>

        {/* Database Reset */}
        <div className="card">
          <div className="card-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ color: 'var(--color-danger)' }}>Database Reset</h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Reset all database configurations to clean defaults. This clears all readings, invoices, and resets all data.
            </p>
            <button 
              className="btn btn-danger"
              type="button"
              onClick={() => {
                if (currentRole === 'Admin') {
                  if (confirm('Are you sure you want to reset all data? This clears all invoices and readings.')) {
                    onResetDatabase();
                  }
                } else {
                  onSubmitRequest(
                    'reset_db',
                    'Requested a complete system database reset to clean default values.',
                    {}
                  );
                  alert('Database reset request submitted to Admin for approval.');
                }
              }}
            >
              <RefreshCw size={16} /> {currentRole === 'Admin' ? 'Reset Database' : 'Submit Reset Request to Admin'}
            </button>
          </div>
        </div>
      </div>

        <div className="card">
          <div className="card-header">
            <h3>Excel / CSV Import Helper</h3>
          </div>
          <div className="card-body" style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              Use this structure to format your Excel sheets. Select columns and copy-paste directly into the Shade Importer tool.
            </p>
            
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', position: 'relative' }}>
              <pre style={{ fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
{`Shade ID,Block,Floor,Size,Status,Rate,Reading
SH-001,Block A,Ground,500,occupied,700,1050
SH-002,Block A,First,450,occupied,700,820`}
              </pre>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={copyTemplateData}
                style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px' }}
              >
                {copied ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
              </button>
            </div>
            
            <p>
              Copying data in this layout allows instant recognition of shade IDs, floor levels, maintenance rates, and initial water meters.
            </p>
          </div>
        </div>
      </div>
  );
};
