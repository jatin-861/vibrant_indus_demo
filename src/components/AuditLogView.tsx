import React, { useState } from 'react';
import { Search, Download, Upload, Edit2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
  onUpdateLog?: (updatedLog: AuditLog) => void;
  onDeleteLog?: (logId: string) => void;
  onBulkImportLogs?: (importedLogs: AuditLog[]) => void;
  currentRole: 'Admin' | 'Secretary' | 'Treasurer';
}

const ACTION_LABELS: Record<AuditLog['action'], string> = {
  invoice_created: 'Invoice Created',
  invoice_edited: 'Invoice Edited',
  invoice_deleted: 'Invoice Deleted',
  invoice_voided: 'Invoice Voided',
  owner_added: 'Owner Added',
  owner_updated: 'Owner Updated',
  tenant_added: 'Tenant Added',
  tenant_updated: 'Tenant Updated',
  payment_marked: 'Payment Marked',
  payment_deleted: 'Payment Deleted',
  shade_added: 'Shade Added',
  shade_updated: 'Shade Updated',
  shade_transferred: 'Shade Transferred',
  settings_changed: 'Settings Changed',
  database_reset: 'Database Reset',
  whatsapp_sent: 'WhatsApp Sent',
};

const ACTION_COLORS: Record<string, string> = {
  invoice_created: '#22c55e',
  invoice_edited: '#3b82f6',
  invoice_deleted: '#ef4444',
  invoice_voided: '#f97316',
  owner_added: '#22c55e',
  owner_updated: '#3b82f6',
  tenant_added: '#22c55e',
  tenant_updated: '#3b82f6',
  payment_marked: '#22c55e',
  payment_deleted: '#ef4444',
  shade_added: '#22c55e',
  shade_updated: '#3b82f6',
  shade_transferred: '#a855f7',
  settings_changed: '#6366f1',
  database_reset: '#ef4444',
  whatsapp_sent: '#06b6d4',
};

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  onUpdateLog,
  onDeleteLog,
  onBulkImportLogs,
  currentRole
}) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Edit states
  const [editingLog, setEditingLog] = useState<AuditLog | null>(null);
  const [editAction, setEditAction] = useState<AuditLog['action']>('settings_changed');
  const [editEntity, setEditEntity] = useState('');
  const [editUser, setEditUser] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editTimestamp, setEditTimestamp] = useState('');
  const [editDetails, setEditDetails] = useState('');

  const sorted = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const filtered = sorted.filter(log => {
    const matchSearch =
      !search ||
      log.entity.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const exportToExcel = () => {
    const data = filtered.map(log => ({
      'Timestamp': log.timestamp.replace('T', ' ').slice(0, 19),
      'Action': ACTION_LABELS[log.action] || log.action,
      'Entity': log.entity,
      'Performed By': log.performedBy,
      'Role': log.role,
      'Details': log.details || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
    XLSX.writeFile(wb, `Audit_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const parseRows = (rows: string[][]): AuditLog[] => {
      const newLogs: AuditLog[] = [];
      let startIdx = 1;
      let tsIdx = 0;
      let actionIdx = 1;
      let entityIdx = 2;
      let userIdx = 3;
      let roleIdx = 4;
      let detailsIdx = 5;

      const headerRow = rows[0].map(c => String(c ?? '').trim().toLowerCase());
      const hasHeader = headerRow.some(h => h.includes('timestamp') || h.includes('action') || h.includes('entity') || h.includes('performed'));
      if (!hasHeader) {
        startIdx = 0;
      } else {
        headerRow.forEach((col, idx) => {
          if (col.includes('timestamp') || col.includes('time')) tsIdx = idx;
          else if (col.includes('action')) actionIdx = idx;
          else if (col.includes('entity')) entityIdx = idx;
          else if (col.includes('performed') || col.includes('by') || col.includes('user')) userIdx = idx;
          else if (col.includes('role')) roleIdx = idx;
          else if (col.includes('detail')) detailsIdx = idx;
        });
      }

      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i].map(c => String(c ?? '').trim());
        if (cols.length < 3) continue;

        const rawAction = cols[actionIdx] || '';
        let actionKey: AuditLog['action'] = 'settings_changed';
        for (const [key, label] of Object.entries(ACTION_LABELS)) {
          if (label.toLowerCase() === rawAction.toLowerCase() || key.toLowerCase() === rawAction.toLowerCase()) {
            actionKey = key as AuditLog['action'];
            break;
          }
        }

        const timestampStr = cols[tsIdx] ? new Date(cols[tsIdx]).toISOString() : new Date().toISOString();

        newLogs.push({
          id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000000)}-${i}`,
          timestamp: timestampStr,
          action: actionKey,
          entity: cols[entityIdx] || 'System',
          performedBy: cols[userIdx] || 'Admin',
          role: cols[roleIdx] || 'Admin',
          details: cols[detailsIdx] || ''
        });
      }
      return newLogs;
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
        
        const newLogs = parseRows(rows);
        if (newLogs.length > 0 && onBulkImportLogs) {
          onBulkImportLogs(newLogs);
        } else {
          alert('No valid rows found. Ensure the file has columns: Timestamp, Action, Entity, Performed By, Role, Details.');
        }
      } catch (err) {
        alert('Error parsing file. Please check formatting and try again.');
      }
    };

    if (isXlsx) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleEditClick = (log: AuditLog) => {
    setEditingLog(log);
    setEditAction(log.action);
    setEditEntity(log.entity);
    setEditUser(log.performedBy);
    setEditRole(log.role);
    setEditTimestamp(log.timestamp.slice(0, 16));
    setEditDetails(log.details || '');
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !onUpdateLog) return;
    
    onUpdateLog({
      ...editingLog,
      action: editAction,
      entity: editEntity,
      performedBy: editUser,
      role: editRole,
      timestamp: new Date(editTimestamp).toISOString(),
      details: editDetails
    });
    setEditingLog(null);
  };

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const isEditable = currentRole === 'Admin' || currentRole === 'Secretary' || currentRole === 'Treasurer';

  return (
    <div className="view-container">
      <div className="view-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="view-title">Audit Log</h2>
          <p className="view-subtitle">{logs.length} total actions recorded</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onBulkImportLogs && (
            <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Upload size={15} /> Import Excel / CSV
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                style={{ display: 'none' }} 
                onChange={handleImportFile} 
              />
            </label>
          )}
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ color: 'var(--text-secondary)' }} />
          <input
            className="search-input"
            placeholder="Search by entity, user, or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-control"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="all">All Actions</option>
          {uniqueActions.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Performed By</th>
              <th>Role</th>
              <th>Details</th>
              {isEditable && (onUpdateLog || onDeleteLog) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isEditable ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                  {logs.length === 0 ? 'No actions recorded yet. Actions will appear here as you use the system.' : 'No matching records.'}
                </td>
              </tr>
            ) : filtered.map(log => (
              <tr key={log.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {log.timestamp.replace('T', ' ').slice(0, 19)}
                </td>
                <td>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: (ACTION_COLORS[log.action] || '#6b7280') + '20',
                    color: ACTION_COLORS[log.action] || '#6b7280',
                    whiteSpace: 'nowrap',
                  }}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                </td>
                <td style={{ fontSize: '13px' }}>{log.entity}</td>
                <td style={{ fontWeight: 600, fontSize: '13px' }}>{log.performedBy}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.role}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '250px' }}>
                  {log.details || '—'}
                </td>
                {isEditable && (onUpdateLog || onDeleteLog) && (
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {onUpdateLog && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleEditClick(log)}
                          style={{ padding: '4px' }}
                          title="Edit Log Details"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {onDeleteLog && (
                        <button 
                          className="btn btn-secondary btn-sm text-danger" 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this audit log entry?')) {
                              onDeleteLog(log.id);
                            }
                          }}
                          style={{ padding: '4px' }}
                          title="Delete Log Entry"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingLog && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Edit Audit Log Entry</h3>
              <button className="modal-close" onClick={() => setEditingLog(null)}>×</button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Timestamp*</label>
                  <input 
                    type="datetime-local" 
                    className="form-control"
                    value={editTimestamp}
                    onChange={(e) => setEditTimestamp(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Action Category*</label>
                  <select 
                    className="form-control"
                    value={editAction}
                    onChange={(e) => setEditAction(e.target.value as AuditLog['action'])}
                    required
                  >
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Entity / Resource*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={editEntity}
                    onChange={(e) => setEditEntity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Performed By*</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editUser}
                      onChange={(e) => setEditUser(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Admin Role*</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Details / Summary</label>
                  <textarea 
                    className="form-control"
                    style={{ minHeight: '60px', resize: 'vertical', width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 'inherit' }}
                    value={editDetails}
                    onChange={(e) => setEditDetails(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingLog(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
