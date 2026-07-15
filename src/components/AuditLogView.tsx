import React, { useState } from 'react';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
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

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

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

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  return (
    <div className="view-container">
      <div className="view-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="view-title">Audit Log</h2>
          <p className="view-subtitle">{logs.length} total actions recorded</p>
        </div>
        <button className="btn btn-secondary" onClick={exportToExcel}>
          <Download size={15} /> Export Excel
        </button>
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
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
