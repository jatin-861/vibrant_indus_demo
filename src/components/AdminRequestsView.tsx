import React, { useState } from 'react';
import { 
  Check, 
  X, 
  ShieldAlert, 
  Settings, 
  Grid, 
  RefreshCw,
  User
} from 'lucide-react';
import type { ChangeRequest } from '../types';

interface AdminRequestsViewProps {
  requests: ChangeRequest[];
  onResolveRequest: (id: string, status: 'approved' | 'rejected') => void;
}

export const AdminRequestsView: React.FC<AdminRequestsViewProps> = ({
  requests,
  onResolveRequest
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const getRequestIcon = (type: ChangeRequest['type']) => {
    switch (type) {
      case 'update_settings':
        return <Settings size={18} style={{ color: 'var(--primary)' }} />;
      case 'edit_shade':
        return <Grid size={18} style={{ color: 'var(--color-info)' }} />;
      case 'reset_db':
        return <RefreshCw size={18} style={{ color: 'var(--color-danger)' }} />;
      default:
        return <User size={18} />;
    }
  };

  const getRequestTypeName = (type: ChangeRequest['type']) => {
    switch (type) {
      case 'update_settings':
        return 'System Configuration Update';
      case 'edit_shade':
        return 'Shade Directory Registry Edit';
      case 'reset_db':
        return 'Database Reset Simulation';
      default:
        return 'General Request';
    }
  };

  const formatPayload = (req: ChangeRequest) => {
    try {
      const data = JSON.parse(req.data);
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
          {Object.keys(data).map(key => {
            const val = data[key];
            if (val === null || typeof val === 'object') return null;
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{val.toString()}</span>
              </div>
            );
          })}
        </div>
      );
    } catch {
      return <pre style={{ fontSize: '11px', marginTop: '10px' }}>{req.data}</pre>;
    }
  };

  return (
    <div className="admin-requests-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toolbar */}
      <div className="tools-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: 'var(--radius-md)', gap: '4px' }}>
          <button 
            className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 12px', border: 'none', boxShadow: 'none' }}
            onClick={() => setFilter('pending')}
          >
            Pending ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button 
            className={`btn btn-sm ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 12px', border: 'none', boxShadow: 'none' }}
            onClick={() => setFilter('approved')}
          >
            Approved ({requests.filter(r => r.status === 'approved').length})
          </button>
          <button 
            className={`btn btn-sm ${filter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 12px', border: 'none', boxShadow: 'none' }}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({requests.filter(r => r.status === 'rejected').length})
          </button>
          <button 
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 12px', border: 'none', boxShadow: 'none' }}
            onClick={() => setFilter('all')}
          >
            All Requests ({requests.length})
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredRequests.map(req => (
          <div 
            key={req.id} 
            className="card" 
            style={{ 
              margin: 0, 
              borderLeft: `4px solid ${req.status === 'approved' ? 'var(--color-success)' : req.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-pending)'}` 
            }}
          >
            <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                {/* Left side: icon, type, status */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getRequestIcon(req.type)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                      {getRequestTypeName(req.type)}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Requested by <strong>{req.requesterName} ({req.requesterRole})</strong> on {req.date}
                    </span>
                  </div>
                </div>

                {/* Right side: status badge or action buttons */}
                <div>
                  {req.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => onResolveRequest(req.id, 'rejected')}
                        style={{ border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                      >
                        <X size={14} /> Reject
                      </button>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => onResolveRequest(req.id, 'approved')}
                      >
                        <Check size={14} /> Approve & Apply
                      </button>
                    </div>
                  ) : (
                    <span className={`badge badge-${req.status}`}>
                      {req.status === 'approved' ? 'Approved & Executed' : 'Rejected'}
                    </span>
                  )}
                </div>
              </div>

              {/* Request Message details */}
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                <strong>Details:</strong> {req.details}
                {formatPayload(req)}
              </div>
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ShieldAlert size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <div>No change requests found in this category.</div>
          </div>
        )}
      </div>
    </div>
  );
};
