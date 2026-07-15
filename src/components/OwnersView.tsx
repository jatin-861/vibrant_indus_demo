import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Phone,
  Mail,
  RefreshCw,
  MessageSquare,
  Building,
  User,
  Users,
  Upload,
  FileText,
  MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Owner, Shade } from '../types';

interface OwnersViewProps {
  owners: Owner[];
  shades: Shade[];
  onAddOwner: (owner: Owner) => void;
  onUpdateOwner: (owner: Owner) => void;
  onTransferOwner: (shadeId: string, newOwnerId: string, applyFee: boolean) => void;
  setActiveTab: (tab: string) => void;
  onSelectShadeForChat?: (phone: string) => void;
  transferShadeId: string | null;
  onCloseTransferModal: () => void;
  onBulkImportOwners: (owners: Owner[]) => void;
}

export const OwnersView: React.FC<OwnersViewProps> = ({
  owners,
  shades,
  onAddOwner,
  onUpdateOwner,
  onTransferOwner,
  setActiveTab,
  onSelectShadeForChat,
  transferShadeId,
  onCloseTransferModal,
  onBulkImportOwners
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'occupied' | 'owner_only' | 'maintenance'>('all');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);

  // CSV Bulk Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Add Contact Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'owner' | 'renter'>('owner');
  const [companyName, setCompanyName] = useState('');

  // Transfer Form State
  const [selectedShadeId, setSelectedShadeId] = useState('');
  const [newOwnerId, setNewOwnerId] = useState('');
  const [applyTransferFee, setApplyTransferFee] = useState(true);

  // Trigger modal if transferShadeId was passed from parent
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (transferShadeId) {
      setSelectedShadeId(transferShadeId);
      setIsTransferModalOpen(true);
    }
  }, [transferShadeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    onAddOwner({
      id: 'MEM-' + Date.now().toString().slice(-4),
      name,
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      address: address || undefined,
      type,
      status: 'active',
      companyName: companyName || undefined
    });

    // Reset
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setType('owner');
    setCompanyName('');
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOwner) return;

    onUpdateOwner(editingOwner);
    setEditingOwner(null);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShadeId || !newOwnerId) return;

    const member = owners.find(o => o.id === newOwnerId);
    const memberName = member?.name || 'Unknown';
    const memberType = member?.type === 'owner' ? 'Owner' : 'Renter';
    const feeText = applyTransferFee ? '\nA one-time transfer fee of ₹2,500 will be added to the next invoice.' : '';

    const confirmed = window.confirm(
      `Confirm Transfer:\n\nShade: ${selectedShadeId}\nNew ${memberType}: ${memberName}${feeText}\n\nProceed with this assignment?`
    );
    if (!confirmed) return;

    onTransferOwner(selectedShadeId, newOwnerId, applyTransferFee);
    
    // Reset
    setSelectedShadeId('');
    setNewOwnerId('');
    setApplyTransferFee(true);
    setIsTransferModalOpen(false);
    onCloseTransferModal();
  };

  const closeTransferAndNotify = () => {
    setIsTransferModalOpen(false);
    onCloseTransferModal();
  };

  const handleExportCSV = () => {
    const headers = 'Member ID,Name,Phone,Email,Role Type,Status,Company Name\n';
    const rows = owners.map(o => 
      `"${o.id}","${o.name}","${o.phone}","${o.email}","${o.type}","${o.status}","${o.companyName || ''}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `member_contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    if (isXlsx) {
      reader.onload = (event) => {
        const data = event.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws);
        setImportText(csv);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) setImportText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      setImportError('Please paste some CSV data or select a CSV file first.');
      return;
    }

    try {
      const rows = importText.split('\n').map(row => row.trim()).filter(Boolean);
      const parsedOwners: Owner[] = [];

      const headerRow = rows[0].toLowerCase();
      const hasHeader = headerRow.includes('id') || headerRow.includes('name') || headerRow.includes('phone') || headerRow.includes('type');
      
      let startIdx = 0;
      let idIdx = 0;
      let nameIdx = 1;
      let phoneIdx = 2;
      let emailIdx = 3;
      let typeIdx = 4;
      let statusIdx = 5;
      let companyIdx = 6;

      if (hasHeader) {
        startIdx = 1;
        const cols = rows[0].includes('\t') ? rows[0].split('\t') : rows[0].split(',');
        cols.forEach((col, idx) => {
          const name = col.trim().toLowerCase();
          if (name.includes('id') || name.includes('member')) idIdx = idx;
          else if (name.includes('name')) nameIdx = idx;
          else if (name.includes('phone') || name.includes('tel')) phoneIdx = idx;
          else if (name.includes('email')) emailIdx = idx;
          else if (name.includes('type') || name.includes('role')) typeIdx = idx;
          else if (name.includes('status')) statusIdx = idx;
          else if (name.includes('company')) companyIdx = idx;
        });
      }

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        const cols = row.includes('\t') ? row.split('\t') : row.split(',');
        const cleanCols = cols.map(c => c.replace(/^["']|["']$/g, '').trim());
        
        if (cleanCols.length < 3) continue;

        const mId = cleanCols[idIdx] || 'MEM-' + Math.floor(1000 + Math.random() * 9000);
        const mName = cleanCols[nameIdx];
        if (!mName) continue;

        const mPhone = cleanCols[phoneIdx] || '';
        const mEmail = cleanCols[emailIdx] || `${mName.toLowerCase().replace(/\s+/g, '')}@example.com`;
        const rType = (cleanCols[typeIdx]?.toLowerCase() === 'renter' || cleanCols[typeIdx]?.toLowerCase() === 'tenant') ? 'renter' : 'owner';
        const mStatus = cleanCols[statusIdx]?.toLowerCase() === 'inactive' ? 'inactive' : 'active';
        const company = cleanCols[companyIdx] || '';

        parsedOwners.push({
          id: mId,
          name: mName,
          phone: mPhone,
          email: mEmail,
          type: rType,
          status: mStatus,
          companyName: company || undefined
        });
      }

      onBulkImportOwners(parsedOwners);
      setImportText('');
      setImportError('');
      setIsImportModalOpen(false);
      alert(`Imported ${parsedOwners.length} members successfully.`);
    } catch (err) {
      setImportError(`Parsing error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = "Member ID,Name,Phone,Email,Role Type,Status,Company Name\n" +
      "MEM-006,Sunil Mehta,+919876543219,sunil@example.com,owner,active,Mehta & Sons\n" +
      "MEM-007,Rakesh Patil,+919876543218,rakesh@example.com,renter,active,Patel Logistics";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "member_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter shades and match search term with shade ID, owner name/phone, renter name/phone
  const filteredShades = shades.filter(s => {
    const owner = owners.find(o => o.id === s.ownerId);
    const renter = s.renterId ? owners.find(o => o.id === s.renterId) : null;
    
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      s.id.toLowerCase().includes(search) ||
      (owner && owner.name.toLowerCase().includes(search)) ||
      (owner && owner.phone.includes(search)) ||
      (renter && renter.name.toLowerCase().includes(search)) ||
      (renter && renter.phone.includes(search));
      
    if (!matchesSearch) return false;
    
    if (filterType === 'all') return true;
    if (filterType === 'occupied') return s.status === 'occupied' && s.renterId !== null;
    if (filterType === 'owner_only') return s.renterId === null;
    if (filterType === 'maintenance') return s.status === 'maintenance';
    return true;
  });

  return (
    <div className="owners-view">
      {/* Search and Action Toolbar */}
      <div className="tools-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by Shade ID, Owner/Renter Name, Phone..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="tools-actions">
          <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: 'var(--radius-md)', gap: '4px' }}>
            <button 
              className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', border: 'none', boxShadow: 'none' }}
              onClick={() => setFilterType('all')}
            >
              All Units
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'occupied' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', border: 'none', boxShadow: 'none' }}
              onClick={() => setFilterType('occupied')}
            >
              Occupied (With Tenant)
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'owner_only' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', border: 'none', boxShadow: 'none' }}
              onClick={() => setFilterType('owner_only')}
            >
              Owner Only (Vacant Tenant)
            </button>
            <button 
              className={`btn btn-sm ${filterType === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', border: 'none', boxShadow: 'none' }}
              onClick={() => setFilterType('maintenance')}
            >
              Maintenance
            </button>
          </div>
          
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Upload size={16} style={{ transform: 'rotate(180deg)' }} /> Export CSV
          </button>
          
          <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)}>
            <Upload size={16} /> Import Excel / CSV
          </button>

          <button className="btn btn-danger" onClick={() => setIsTransferModalOpen(true)}>
            <RefreshCw size={16} /> Transfer / Assign Member
          </button>
          
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} /> Add Member Contact
          </button>
        </div>
      </div>

      {/* Grid of Shades with side-by-side Owner & Renter details */}
      <div className="shade-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
        {filteredShades.map(s => {
          const owner = owners.find(o => o.id === s.ownerId);
          const renter = s.renterId ? owners.find(o => o.id === s.renterId) : null;

          return (
            <div key={s.id} className="card shade-group-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: '#ffffff' }}>
              {/* Shade Header details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Building size={20} style={{ color: 'var(--primary)' }} />
                  <div>
                    <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
                      Unit {s.id}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {s.block} • {s.floor} • {s.sqFt} SqFt
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge badge-${s.status}`}>
                    {s.status}
                  </span>
                  
                  <button 
                    className="btn btn-danger btn-sm" 
                    title="Transfer Ownership or Renter"
                    onClick={() => {
                      setSelectedShadeId(s.id);
                      setIsTransferModalOpen(true);
                    }}
                  >
                    <RefreshCw size={12} /> Transfer
                  </button>
                </div>
              </div>

              {/* Owner and Renter columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* OWNER BLOCK */}
                <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.05)', backgroundColor: 'rgba(59, 130, 246, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={16} /> Owner (Landlord)
                    </h4>
                    {owner && (
                      <button 
                        className="btn btn-secondary btn-xs"
                        onClick={() => setEditingOwner(owner)}
                        style={{ padding: '2px 6px', fontSize: '11px' }}
                      >
                        <Edit2 size={10} /> Edit Info
                      </button>
                    )}
                  </div>
                  
                  {owner ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{owner.name}</div>
                      {owner.companyName && (
                        <div style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{owner.companyName}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Phone size={12} /> <span>{owner.phone}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Mail size={12} /> <span>{owner.email}</span>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#25D366', borderColor: '#25D366', width: '100%', display: 'flex', justifyContent: 'center', gap: '6px' }}
                          onClick={() => {
                            const cleanPhone = owner.phone.replace(/[^\d]/g, '');
                            window.open(`https://wa.me/${cleanPhone}`, '_blank');
                          }}
                        >
                          <MessageSquare size={12} /> WhatsApp Owner
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                      No Owner Assigned
                      <button 
                        className="btn btn-primary btn-xs"
                        style={{ marginTop: '8px' }}
                        onClick={() => {
                          setSelectedShadeId(s.id);
                          setIsTransferModalOpen(true);
                        }}
                      >
                        Assign Owner
                      </button>
                    </div>
                  )}
                </div>

                {/* RENTER BLOCK */}
                <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.05)', backgroundColor: 'rgba(16, 185, 129, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '700', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} /> Renter (Tenant)
                    </h4>
                    {renter && (
                      <button 
                        className="btn btn-secondary btn-xs"
                        onClick={() => setEditingOwner(renter)}
                        style={{ padding: '2px 6px', fontSize: '11px' }}
                      >
                        <Edit2 size={10} /> Edit Info
                      </button>
                    )}
                  </div>
                  
                  {renter ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{renter.name}</div>
                      {renter.companyName && (
                        <div style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{renter.companyName}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Phone size={12} /> <span>{renter.phone}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Mail size={12} /> <span>{renter.email}</span>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#25D366', borderColor: '#25D366', width: '100%', display: 'flex', justifyContent: 'center', gap: '6px' }}
                          onClick={() => {
                            const cleanPhone = renter.phone.replace(/[^\d]/g, '');
                            window.open(`https://wa.me/${cleanPhone}`, '_blank');
                          }}
                        >
                          <MessageSquare size={12} /> WhatsApp Tenant
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                      Vacant / No Tenant
                      <button 
                        className="btn btn-primary btn-xs"
                        style={{ marginTop: '8px' }}
                        onClick={() => {
                          setSelectedShadeId(s.id);
                          setIsTransferModalOpen(true);
                        }}
                      >
                        Assign Tenant
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}

        {filteredShades.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            No units or contacts match your query. Click "Add Member Contact" to register someone.
          </div>
        )}
      </div>

      {/* MODAL 1: Add Member Contact */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Community Member</h3>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g., Sunita Sharma"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>WhatsApp Phone Number*</label>
                  <input 
                    type="tel" 
                    className="form-control"
                    placeholder="e.g., +919876543210"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    Include country code (+91) for WhatsApp integration.
                  </span>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g., sunita@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Address (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., 102, Sunshine Apt, MG Road"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Type / Occupancy Role*</label>
                  <select 
                    className="form-control"
                    value={type}
                    onChange={(e) => setType(e.target.value as 'owner' | 'renter')}
                  >
                    <option value="owner">Shade Owner (Landlord)</option>
                    <option value="renter">Shade Tenant (Renter)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Company Name (Optional)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g., Sharma Enterprises"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Member */}
      {editingOwner && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Member Details</h3>
              <button className="modal-close" onClick={() => setEditingOwner(null)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={editingOwner.name}
                    onChange={(e) => setEditingOwner({ ...editingOwner, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>WhatsApp Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-control"
                    value={editingOwner.phone}
                    onChange={(e) => setEditingOwner({ ...editingOwner, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="form-control"
                    value={editingOwner.email}
                    onChange={(e) => setEditingOwner({ ...editingOwner, email: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select 
                      className="form-control"
                      value={editingOwner.type}
                      onChange={(e) => setEditingOwner({ ...editingOwner, type: e.target.value as 'owner' | 'renter' })}
                    >
                      <option value="owner">Owner</option>
                      <option value="renter">Renter</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select 
                      className="form-control"
                      value={editingOwner.status}
                      onChange={(e) => setEditingOwner({ ...editingOwner, status: e.target.value as 'active' | 'inactive' })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingOwner.companyName || ''}
                    onChange={(e) => setEditingOwner({ ...editingOwner, companyName: e.target.value || undefined })}
                  />
                </div>

                <div className="form-group">
                  <label><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., 102, Sunshine Apt, MG Road"
                    value={editingOwner.address || ''}
                    onChange={(e) => setEditingOwner({ ...editingOwner, address: e.target.value || undefined })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingOwner(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Transfer / Assign Member */}
      {isTransferModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Assign / Transfer Shade Member</h3>
              <button className="modal-close" onClick={closeTransferAndNotify}>×</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Assign or change the owner or renter of a shade. This updates the billing log and can trigger a one-time <strong>₹2,500 Transfer Fee</strong> in the next billing cycle.
                </div>

                <div className="form-group">
                  <label>Select Shade to Update*</label>
                  <select 
                    className="form-control"
                    required
                    value={selectedShadeId}
                    onChange={(e) => setSelectedShadeId(e.target.value)}
                  >
                    <option value="">-- Choose Shade --</option>
                    {shades.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.id} (Owner: {shades.find(sh => sh.id === s.id)?.ownerId ? owners.find(o => o.id === shades.find(sh => sh.id === s.id)?.ownerId)?.name : 'None'}, Tenant: {shades.find(sh => sh.id === s.id)?.renterId ? owners.find(o => o.id === shades.find(sh => sh.id === s.id)?.renterId)?.name : 'None'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Select Member to Assign*</label>
                  <select 
                    className="form-control"
                    required
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                  >
                    <option value="">-- Select Member --</option>
                    {owners.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.type === 'owner' ? 'Owner / Landlord' : 'Renter / Tenant'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input 
                    type="checkbox"
                    id="applyFee"
                    checked={applyTransferFee}
                    onChange={(e) => setApplyTransferFee(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="applyFee" style={{ margin: '0', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    Charge One-time Transfer Fee of <strong>₹2,500</strong> in next invoice
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeTransferAndNotify}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: CSV Import for Members */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Bulk Import Members from Excel / CSV</h3>
              <button className="modal-close" onClick={() => setIsImportModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleImportSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p>
                    Paste columns directly from an Excel spreadsheet or a CSV file. Each row should contain a single member contact.
                  </p>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    Columns structure: <code>Member ID, Name, Phone, Email, Role Type (owner/renter), [Status], [CompanyName]</code>
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={downloadSampleTemplate}>
                      <FileText size={12} /> Download Sample template (.csv)
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select CSV / Excel File</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="form-control"
                    style={{ padding: '8px' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Or paste raw spreadsheet data in the textarea below instead.
                  </div>
                </div>

                <div className="form-group">
                  <label>Paste Spreadsheet Data (CSV or Tab-Delimited)</label>
                  <textarea 
                    className="csv-textarea"
                    placeholder="MEM-006,Sunil Mehta,+919876543219,sunil@example.com,owner,active,Mehta & Sons&#10;MEM-007,Rakesh Patil,+919876543218,rakesh@example.com,renter,active,Patel Logistics"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    style={{ minHeight: '120px' }}
                  />
                  {importError && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '6px', fontWeight: '600' }}>
                      {importError}
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--color-info-bg)', border: '1px solid var(--primary-light)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--primary)' }}>
                  <strong>💡 Tip:</strong> Role Type can be: <code>owner</code> or <code>renter</code>. Status defaults to <strong>active</strong>.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsImportModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Import</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
