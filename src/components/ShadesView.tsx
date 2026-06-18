import React, { useState, useEffect } from 'react';
import {
  Plus,
  Upload,
  Search,
  Edit2,
  Droplet,
  Maximize2,
  FileText,
  Crown,
  Building,
  RefreshCw,
  Eye,
  Paperclip,
  X,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Shade, Owner, SystemSettings, Invoice, ShadeDocument } from '../types';
import { CustomDropdown } from './CustomDropdown';

interface ShadesViewProps {
  shades: Shade[];
  owners: Owner[];
  settings?: SystemSettings;
  invoices?: Invoice[];
  onAddShade: (shade: Omit<Shade, 'currentWaterReading'>) => void;
  onUpdateShade: (shade: Shade) => void;
  onBulkImportShades: (shades: Omit<Shade, 'currentWaterReading'>[]) => void;
  onOpenOwnerTransferModal: (shadeId: string) => void;
  currentRole: 'Admin' | 'Secretary' | 'Treasurer';
  onSubmitRequest: (type: 'edit_shade' | 'update_settings' | 'reset_db', details: string, data: unknown) => void;
  onGenerateInvoice?: (shadeId: string) => void;
}

export const ShadesView: React.FC<ShadesViewProps> = ({
  shades,
  owners,
  settings,
  invoices,
  onAddShade,
  onUpdateShade,
  onBulkImportShades,
  onOpenOwnerTransferModal,
  currentRole,
  onSubmitRequest,
  onGenerateInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingShade, setEditingShade] = useState<Shade | null>(null);
  const [viewingShade, setViewingShade] = useState<Shade | null>(null);
  const [newDocuments, setNewDocuments] = useState<ShadeDocument[]>([]);

  // Form states
  const [shadeId, setShadeId] = useState('');
  const [block, setBlock] = useState('Block A');
  const [floor, setFloor] = useState('Ground Floor');
  const [sqFt, setSqFt] = useState(500);
  const [status, setStatus] = useState<'vacant' | 'occupied' | 'maintenance'>('vacant');
  const [ownerId, setOwnerId] = useState<string>('');
  const [renterId, setRenterId] = useState<string>('');
  const [fixedMaintenance, setFixedMaintenance] = useState(settings?.defaultMaintenance || 700);
  const [lastWaterReading, setLastWaterReading] = useState(0);

  // Sync default maintenance when settings change
  useEffect(() => {
    if (settings?.defaultMaintenance) setFixedMaintenance(settings.defaultMaintenance);
  }, [settings?.defaultMaintenance]);

  // Bulk import state
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Water reading updates
  const [updatingWaterShade, setUpdatingWaterShade] = useState<Shade | null>(null);
  const [newWaterVal, setNewWaterVal] = useState(0);

  const readFilesAsDocuments = (files: FileList): Promise<ShadeDocument[]> => {
    const today = new Date().toISOString().split('T')[0];
    return Promise.all(
      Array.from(files).map(file => new Promise<ShadeDocument>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: file.type,
          dataUrl: reader.result as string,
          uploadedDate: today
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }))
    );
  };

  const getOwnerName = (oId: string | null) => {
    if (!oId) return 'N/A';
    const owner = owners.find(o => o.id === oId);
    return owner ? owner.name : 'Unknown';
  };

  const filteredShades = shades.filter(s => {
    const ownerName = getOwnerName(s.ownerId).toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(search) ||
      s.block.toLowerCase().includes(search) ||
      s.floor.toLowerCase().includes(search) ||
      ownerName.includes(search)
    );
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shadeId.trim()) return;

    onAddShade({
      id: shadeId.toUpperCase(),
      block,
      floor,
      sqFt,
      status,
      ownerId: ownerId || null,
      renterId: renterId || null,
      fixedMaintenance,
      lastWaterReading,
      transferFeeTriggered: false,
      documents: newDocuments
    });

    // Reset
    setShadeId('');
    setBlock('Block A');
    setFloor('Ground Floor');
    setSqFt(500);
    setStatus('vacant');
    setOwnerId('');
    setRenterId('');
    setFixedMaintenance(settings?.defaultMaintenance || 700);
    setLastWaterReading(0);
    setNewDocuments([]);
    setIsAddModalOpen(false);
  };

  const handleNewDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const docs = await readFilesAsDocuments(files);
    setNewDocuments(prev => [...prev, ...docs]);
    e.target.value = '';
  };

  const handleEditDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingShade) return;
    const docs = await readFilesAsDocuments(files);
    setEditingShade({ ...editingShade, documents: [...(editingShade.documents || []), ...docs] });
    e.target.value = '';
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShade) return;

    if (currentRole === 'Admin') {
      onUpdateShade(editingShade);
    } else {
      const original = shades.find(s => s.id === editingShade.id);
      const changesList: string[] = [];
      if (original) {
        if (original.lastWaterReading !== editingShade.lastWaterReading) {
          changesList.push(`Previous Water Reading: ${original.lastWaterReading} → ${editingShade.lastWaterReading}`);
        }
        if (original.fixedMaintenance !== editingShade.fixedMaintenance) {
          changesList.push(`Maintenance Rate: ₹${original.fixedMaintenance} → ₹${editingShade.fixedMaintenance}`);
        }
        if (original.ownerId !== editingShade.ownerId) {
          changesList.push(`Owner: ${getOwnerName(original.ownerId)} → ${getOwnerName(editingShade.ownerId)}`);
        }
        if (original.renterId !== editingShade.renterId) {
          changesList.push(`Tenant: ${getOwnerName(original.renterId)} → ${getOwnerName(editingShade.renterId)}`);
        }
        if (original.status !== editingShade.status) {
          changesList.push(`Status: ${original.status} → ${editingShade.status}`);
        }
      }

      onSubmitRequest(
        'edit_shade',
        changesList.length > 0 ? changesList.join('\n') : 'No field changes detected',
        editingShade
      );
      alert(`Request submitted to Admin for approval. The unit details will update once approved.`);
    }
    setEditingShade(null);
  };

  const handleExportCSV = () => {
    const headers = 'Shade ID,Block,Floor,Size (SqFt),Status,Maintenance Rate,Last Water Reading\n';
    const rows = shades.map(s =>
      `"${s.id}","${s.block}","${s.floor}",${s.sqFt},"${s.status}",${s.fixedMaintenance},${s.lastWaterReading}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shade_registry_export_${new Date().toISOString().split('T')[0]}.csv`);
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
      const parsedShades: Omit<Shade, 'currentWaterReading'>[] = [];

      const headerRow = rows[0].toLowerCase();
      const hasHeader = headerRow.includes('shade') || headerRow.includes('block') || headerRow.includes('floor') || headerRow.includes('id');
      
      let startIdx = 0;
      let idIdx = 0;
      let blockIdx = 1;
      let floorIdx = 2;
      let sqFtIdx = 3;
      let statusIdx = 4;
      let maintIdx = 5;
      let waterIdx = 6;

      if (hasHeader) {
        startIdx = 1;
        const cols = rows[0].includes('\t') ? rows[0].split('\t') : rows[0].split(',');
        cols.forEach((col, idx) => {
          const name = col.trim().toLowerCase();
          if (name.includes('id') || name.includes('shade')) idIdx = idx;
          else if (name.includes('block')) blockIdx = idx;
          else if (name.includes('floor')) floorIdx = idx;
          else if (name.includes('size') || name.includes('sq')) sqFtIdx = idx;
          else if (name.includes('status')) statusIdx = idx;
          else if (name.includes('rate') || name.includes('maint')) maintIdx = idx;
          else if (name.includes('reading') || name.includes('water')) waterIdx = idx;
        });
      }

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        const cols = row.includes('\t') ? row.split('\t') : row.split(',');
        const cleanCols = cols.map(c => c.replace(/^["']|["']$/g, '').trim());
        
        if (cleanCols.length < 4) {
          throw new Error(`Row ${i + 1} does not have enough columns. Minimum required: Shade ID, Block, Floor, Size.`);
        }

        const id = cleanCols[idIdx]?.toUpperCase();
        if (!id) continue;

        const blockName = cleanCols[blockIdx] || 'Block A';
        const floorName = cleanCols[floorIdx] || 'Ground Floor';
        const size = parseInt(cleanCols[sqFtIdx]) || 500;
        const occStatus = (cleanCols[statusIdx]?.toLowerCase() as 'vacant' | 'occupied' | 'maintenance') || 'vacant';
        const maintenanceRate = parseInt(cleanCols[maintIdx]) || 700;
        const waterVal = parseInt(cleanCols[waterIdx]) || 0;

        parsedShades.push({
          id,
          block: blockName,
          floor: floorName,
          sqFt: size,
          status: occStatus,
          ownerId: null,
          renterId: null,
          fixedMaintenance: maintenanceRate,
          lastWaterReading: waterVal,
          transferFeeTriggered: false
        });
      }

      onBulkImportShades(parsedShades);
      setImportText('');
      setImportError('');
      setIsImportModalOpen(false);
      alert(`Imported ${parsedShades.length} shades successfully.`);
    } catch (err) {
      setImportError(`Parsing error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleWaterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingWaterShade) return;

    if (newWaterVal < updatingWaterShade.lastWaterReading) {
      alert('Error: New water meter reading cannot be less than the previous reading.');
      return;
    }

    onUpdateShade({
      ...updatingWaterShade,
      currentWaterReading: newWaterVal
    });

    setUpdatingWaterShade(null);
  };

  const downloadSampleTemplate = () => {
    const csvContent = "Shade ID,Block,Floor,Size (SqFt),Status,Maintenance Rate,Last Water Reading\n" +
      "SH-001,Block A,Ground Floor,500,occupied,700,1050\n" +
      "SH-002,Block A,First Floor,450,occupied,700,820\n" +
      "SH-003,Block B,Ground Floor,600,vacant,700,0\n" +
      "SH-004,Block B,First Floor,400,occupied,700,310\n" +
      "SH-005,Block C,Ground Floor,550,maintenance,700,0";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "shade_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="shades-view">
      {/* Search and Action Toolbar */}
      <div className="tools-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by shade number, block, floor, owner..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="tools-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Upload size={16} style={{ transform: 'rotate(180deg)' }} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)}>
            <Upload size={16} /> Import Excel / CSV
          </button>
          <button className="btn btn-primary" onClick={() => { setNewDocuments([]); setIsAddModalOpen(true); }}>
            <Plus size={16} /> Add Shade
          </button>
        </div>
      </div>

      {/* Grid of Shades */}
      <div className="shade-grid">
        {filteredShades.map(s => {
          const owner = owners.find(o => o.id === s.ownerId);
          const renter = owners.find(o => o.id === s.renterId);
          return (
            <div key={s.id} className={`shade-card ${s.status}`} style={{ borderColor: s.status === 'occupied' ? '#3b82f6' : s.status === 'maintenance' ? '#8b5cf6' : '#10b981' }}>
              <div className="shade-card-header">
                <div>
                  <h4 className="shade-title">{s.id}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {s.block} • {s.floor}
                  </span>
                </div>
                <span className={`badge badge-${s.status}`}>
                  {s.status}
                </span>
              </div>

              <div className="shade-card-body">
                <div className="shade-info-row">
                  <Maximize2 size={14} />
                  <span>Size: <strong>{s.sqFt} Sq Ft</strong></span>
                </div>
                
                <div className="shade-info-row">
                  <Crown size={14} style={{ color: '#eab308' }} />
                  <span>
                    Owner: <strong>{owner ? owner.name : 'Unassigned'}</strong>
                  </span>
                </div>

                {renter && (
                  <div className="shade-info-row">
                    <Building size={14} style={{ color: '#64748b' }} />
                    <span>
                      Tenant: <strong>{renter.name}</strong>
                    </span>
                  </div>
                )}

                <div className="shade-info-row">
                  <Droplet size={14} style={{ color: 'var(--color-info)' }} />
                  <span>
                    Water Reading: <strong>{s.lastWaterReading} units</strong>
                    {s.currentWaterReading > s.lastWaterReading && (
                      <span className="text-success" style={{ marginLeft: '6px' }}>
                        (Next: {s.currentWaterReading})
                      </span>
                    )}
                  </span>
                </div>

                {s.transferFeeTriggered && (
                  <div className="shade-info-row" style={{ color: 'var(--color-danger)', fontWeight: '600', fontSize: '11px', marginTop: '4px' }}>
                    ⚠️ One-time Transfer Fee (₹2,500) pending in next bill
                  </div>
                )}
              </div>

              <div className="shade-card-footer" style={{ display: 'block' }}>
                <div className="shade-rate" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="shade-rate-label">Maintenance</span>
                  <span className="shade-rate-val">
                    {s.currentWaterReading > s.lastWaterReading && settings ? (
                      <>₹{settings.defaultMaintenance} + ₹{(s.currentWaterReading - s.lastWaterReading) * (settings.waterRate || 30)}<span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>(water)</span></>
                    ) : (
                      <>₹{settings?.defaultMaintenance || s.fixedMaintenance}</>
                    )}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '12px', width: '100%' }}>
                  {s.status === 'occupied' && (
                    <button
                      className="btn btn-primary btn-sm"
                      title="Generate Invoice for this unit"
                      onClick={() => onGenerateInvoice && onGenerateInvoice(s.id)}
                      style={{ backgroundColor: 'var(--primary)', borderColor: 'var(--primary)', justifyContent: 'center' }}
                    >
                      <FileText size={12} /> Bill
                    </button>
                  )}
                  {s.status === 'occupied' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      title="Log water meter reading"
                      onClick={() => {
                        setUpdatingWaterShade(s);
                        setNewWaterVal(s.currentWaterReading || s.lastWaterReading);
                      }}
                      style={{ justifyContent: 'center' }}
                    >
                      <Droplet size={12} /> Meter
                    </button>
                  )}
                  {s.status === 'occupied' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      title="Transfer Ownership or Renter"
                      onClick={() => onOpenOwnerTransferModal(s.id)}
                      style={{ justifyContent: 'center' }}
                    >
                      <RefreshCw size={12} /> Transfer
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    title="View shade details"
                    onClick={() => setViewingShade(s)}
                    style={{ justifyContent: 'center', gridColumn: s.status === 'occupied' ? undefined : '1 / -1' }}
                  >
                    <Eye size={12} /> Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredShades.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            No shades match your search query. Try typing something else or click "Add Shade".
          </div>
        )}
      </div>

      {/* MODAL 1: Add Shade */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Shade</h3>
              <button className="modal-close" onClick={() => { setIsAddModalOpen(false); setNewDocuments([]); }}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Shade Number / ID*</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g., SH-006" 
                    required 
                    value={shadeId}
                    onChange={(e) => setShadeId(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Block / Area*</label>
                    <select 
                      className="form-control"
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                    >
                      <option>Block A</option>
                      <option>Block B</option>
                      <option>Block C</option>
                      <option>Block D</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Floor*</label>
                    <select 
                      className="form-control"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                    >
                      <option>Ground Floor</option>
                      <option>First Floor</option>
                      <option>Second Floor</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Size (Sq Ft)*</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={sqFt}
                      onChange={(e) => setSqFt(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Status*</label>
                    <select 
                      className="form-control"
                      value={status}
                      onChange={(e) => {
                        const newStat = e.target.value as Shade['status'];
                        setStatus(newStat);
                        if (newStat === 'vacant') {
                          setOwnerId('');
                        }
                      }}
                    >
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Under Maintenance</option>
                    </select>
                  </div>
                </div>

                {status !== 'vacant' && (
                  <>
                    <div className="form-group">
                      <label>Assign Owner</label>
                      <CustomDropdown
                        options={[{ value: '', label: '-- Select Owner --' }, ...owners.filter(o => o.type === 'owner').map(o => ({ value: o.id, label: o.name, subLabel: o.phone || undefined }))]}
                        selectedValue={ownerId}
                        onChange={setOwnerId}
                        placeholder="-- Select Owner --"
                        searchPlaceholder="Search owner..."
                        sortMode="alpha"
                        showAlphabetSidebar
                      />
                    </div>

                    <div className="form-group">
                      <label>Assign Tenant / Renter</label>
                      <CustomDropdown
                        options={[{ value: '', label: '-- Select Renter (Optional) --' }, ...owners.filter(o => o.type === 'renter').map(o => ({ value: o.id, label: o.name, subLabel: o.phone || undefined }))]}
                        selectedValue={renterId}
                        onChange={setRenterId}
                        placeholder="-- Select Renter (Optional) --"
                        searchPlaceholder="Search renter..."
                        sortMode="alpha"
                        showAlphabetSidebar
                      />
                    </div>
                  </>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>2-Month Maintenance Rate (₹)*</label>
                    <input
                      type="number"
                      className="form-control"
                      value={fixedMaintenance}
                      onChange={(e) => setFixedMaintenance(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Initial Water Reading (Units)*</label>
                    <input
                      type="number"
                      className="form-control"
                      value={lastWaterReading}
                      onChange={(e) => setLastWaterReading(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Attach Documents (PDF or Image)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={handleNewDocumentSelect}
                    className="form-control"
                    style={{ padding: '8px' }}
                  />
                  {newDocuments.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {newDocuments.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '6px 10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                          <Paperclip size={12} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                          <button
                            type="button"
                            onClick={() => setNewDocuments(prev => prev.filter(d => d.id !== doc.id))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex' }}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); setNewDocuments([]); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Shade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Shade Details */}
      {viewingShade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Shade Details — {viewingShade.id}</h3>
              <button className="modal-close" onClick={() => setViewingShade(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                  <span className={`badge badge-${viewingShade.status}`}>{viewingShade.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Block / Floor</span>
                  <strong>{viewingShade.block} • {viewingShade.floor}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Size</span>
                  <strong>{viewingShade.sqFt} Sq Ft</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Owner</span>
                  <strong>{getOwnerName(viewingShade.ownerId)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tenant / Renter</span>
                  <strong>{getOwnerName(viewingShade.renterId)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>2-Month Maintenance Rate</span>
                  <strong>₹{viewingShade.fixedMaintenance}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Last Water Reading</span>
                  <strong>{viewingShade.lastWaterReading} units</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Late Fines</span>
                  <strong style={{ color: viewingShade.penaltyDisabled ? 'var(--color-pending)' : 'inherit' }}>
                    {viewingShade.penaltyDisabled ? `Paused${viewingShade.penaltyDisabledReason ? ' — ' + viewingShade.penaltyDisabledReason : ''}` : 'Active'}
                  </strong>
                </div>
                {viewingShade.transferFeeTriggered && (
                  <div style={{ color: 'var(--color-danger)', fontWeight: '600', fontSize: '11px' }}>
                    ⚠️ One-time Transfer Fee (₹2,500) pending in next bill
                  </div>
                )}
              </div>

              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px' }}>
                  Attached Documents
                </h4>
                {(viewingShade.documents || []).length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No documents attached yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(viewingShade.documents || []).map(doc => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '8px 10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <Paperclip size={14} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{doc.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Uploaded {doc.uploadedDate}</div>
                        </div>
                        <a
                          href={doc.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={doc.name}
                          className="btn btn-secondary btn-sm"
                          title="View / Download document"
                        >
                          <Download size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewingShade(null)}>Close</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { setEditingShade(viewingShade); setViewingShade(null); }}
              >
                <Edit2 size={14} /> Edit Shade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Shade */}
      {editingShade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Shade {editingShade.id}</h3>
              <button className="modal-close" onClick={() => setEditingShade(null)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Block</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingShade.block}
                      onChange={(e) => setEditingShade({ ...editingShade, block: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Floor</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editingShade.floor}
                      onChange={(e) => setEditingShade({ ...editingShade, floor: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Size (Sq Ft)</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={editingShade.sqFt}
                      onChange={(e) => setEditingShade({ ...editingShade, sqFt: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select 
                      className="form-control"
                      value={editingShade.status}
                      onChange={(e) => {
                        const newStat = e.target.value as Shade['status'];
                        setEditingShade({
                          ...editingShade,
                          status: newStat,
                          ownerId: newStat === 'vacant' ? null : editingShade.ownerId
                        });
                      }}
                    >
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Under Maintenance</option>
                    </select>
                  </div>
                </div>

                {editingShade.status !== 'vacant' && (
                  <>
                    <div className="form-group">
                      <label>Assigned Owner</label>
                      <CustomDropdown
                        options={[{ value: '', label: '-- Unassigned --' }, ...owners.filter(o => o.type === 'owner').map(o => ({ value: o.id, label: o.name, subLabel: o.phone || undefined }))]}
                        selectedValue={editingShade.ownerId || ''}
                        onChange={(val) => setEditingShade({ ...editingShade, ownerId: val || null })}
                        placeholder="-- Unassigned --"
                        searchPlaceholder="Search owner..."
                        sortMode="alpha"
                        showAlphabetSidebar
                      />
                    </div>

                    <div className="form-group">
                      <label>Assigned Tenant / Renter</label>
                      <CustomDropdown
                        options={[{ value: '', label: '-- Unassigned --' }, ...owners.filter(o => o.type === 'renter').map(o => ({ value: o.id, label: o.name, subLabel: o.phone || undefined }))]}
                        selectedValue={editingShade.renterId || ''}
                        onChange={(val) => setEditingShade({ ...editingShade, renterId: val || null })}
                        placeholder="-- Unassigned --"
                        searchPlaceholder="Search renter..."
                        sortMode="alpha"
                        showAlphabetSidebar
                      />
                    </div>
                  </>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>2-Month Maintenance Rate (₹)</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={editingShade.fixedMaintenance}
                      onChange={(e) => setEditingShade({ ...editingShade, fixedMaintenance: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Water Reading (Units)</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={editingShade.lastWaterReading}
                      onChange={(e) => setEditingShade({ ...editingShade, lastWaterReading: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                {editingShade.penaltyDisabled && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                    Late fines are paused for this shade{editingShade.penaltyDisabledReason ? ` — ${editingShade.penaltyDisabledReason}` : ''}. Manage this from the Fines module.
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label>Attach Documents (PDF or Image)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={handleEditDocumentSelect}
                    className="form-control"
                    style={{ padding: '8px' }}
                  />
                  {(editingShade.documents || []).length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(editingShade.documents || []).map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '6px 10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                          <Paperclip size={12} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
                          <a href={doc.dataUrl} target="_blank" rel="noreferrer" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--primary)' }}>
                            {doc.name}
                          </a>
                          <button
                            type="button"
                            onClick={() => setEditingShade({ ...editingShade, documents: (editingShade.documents || []).filter(d => d.id !== doc.id) })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex' }}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Water Reading History from past invoices */}
                {invoices && (() => {
                  const shadeInvoices = invoices
                    .filter(inv => inv.shadeId === editingShade.id && (inv.oldWaterReading > 0 || inv.newWaterReading > 0))
                    .sort((a, b) => b.generatedDate.localeCompare(a.generatedDate));
                  if (shadeInvoices.length === 0) return null;
                  return (
                    <div style={{ marginTop: '8px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px' }}>
                        Water Meter History
                      </h4>
                      <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Invoice</th>
                              <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Old</th>
                              <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>New</th>
                              <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Usage</th>
                              <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Charge</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shadeInvoices.map(inv => (
                              <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '5px 10px', fontWeight: '600' }}>{inv.id}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right' }}>{inv.oldWaterReading}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right' }}>{inv.newWaterReading}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: '600' }}>{inv.newWaterReading - inv.oldWaterReading}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--primary)' }}>₹{inv.waterUsageCharge}</td>
                                <td style={{ padding: '5px 10px', fontSize: '10px', color: 'var(--text-secondary)' }}>{inv.generatedDate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingShade(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {currentRole === 'Admin' ? 'Save Changes' : 'Submit Edit Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Excel Import */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Bulk Import Shades from Excel / CSV</h3>
              <button className="modal-close" onClick={() => setIsImportModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleImportSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p>
                    Paste columns directly from an Excel spreadsheet or a CSV file. Each row should contain a single shade entry.
                  </p>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    Columns structure: <code>Shade ID, Block, Floor, Size, [Status], [MaintenanceRate], [WaterReading]</code>
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
                    placeholder="SH-101,Block A,Ground Floor,500,occupied,700,420,true&#10;SH-102,Block A,First Floor,450,occupied,700,1200,true&#10;SH-103,Block B,Ground Floor,600,vacant,700,0,false"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  {importError && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '6px', fontWeight: '600' }}>
                      {importError}
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--color-info-bg)', border: '1px solid var(--primary-light)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--primary)' }}>
                  <strong>💡 Tip:</strong> Status can be: <code>vacant</code>, <code>occupied</code>, or <code>maintenance</code>. Water supply default is <strong>true</strong>.
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

      {/* MODAL 4: Water Meter Input */}
      {updatingWaterShade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Water Reading for {updatingWaterShade.id}</h3>
              <button className="modal-close" onClick={() => setUpdatingWaterShade(null)}>×</button>
            </div>
            <form onSubmit={handleWaterSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  Previous logged reading: <strong>{updatingWaterShade.lastWaterReading} units</strong>
                </div>

                <div className="form-group">
                  <label>Current Water Reading (New Meter Reading)*</label>
                  <input 
                    type="number"
                    className="form-control"
                    value={newWaterVal}
                    onChange={(e) => setNewWaterVal(parseInt(e.target.value) || 0)}
                    min={updatingWaterShade.lastWaterReading}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    Calculated consumption: <strong>{Math.max(0, newWaterVal - updatingWaterShade.lastWaterReading)} units</strong>. Total water billing: <strong>₹{Math.max(0, newWaterVal - updatingWaterShade.lastWaterReading) * (settings?.waterRate || 30)}</strong> (at ₹{settings?.waterRate || 30}/unit).
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setUpdatingWaterShade(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Reading</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
