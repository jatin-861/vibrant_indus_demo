import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Search, ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
  sortMode?: 'default' | 'alpha' | 'numeric-id';
  showAlphabetSidebar?: boolean;
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function numericIdKey(label: string | number): number {
  const m = String(label).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  selectedValue,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  required = false,
  style,
  sortMode = 'default',
  showAlphabetSidebar = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleClose = (e: MouseEvent) => {
      const target = e.target as Node;
      const portal = document.getElementById('custom-dropdown-portal');
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        portal && !portal.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => updatePosition();
    document.addEventListener('mousedown', handleClose);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === selectedValue);

  const sortedOptions = useMemo(() => {
    if (sortMode === 'numeric-id') return [...options].sort((a, b) => numericIdKey(a.label) - numericIdKey(b.label));
    if (sortMode === 'alpha') return [...options].sort((a, b) => a.label.localeCompare(b.label));
    return options;
  }, [options, sortMode]);

  const filteredOptions = useMemo(() =>
    sortedOptions.filter(opt =>
      String(opt.label).toLowerCase().includes(search.toLowerCase()) ||
      (opt.subLabel && String(opt.subLabel).toLowerCase().includes(search.toLowerCase()))
    ),
  [sortedOptions, search]);

  const availableLetters = useMemo(() => {
    if (!showAlphabetSidebar) return new Set<string>();
    return new Set(filteredOptions.map(o => String(o.label)[0]?.toUpperCase()).filter(Boolean));
  }, [filteredOptions, showAlphabetSidebar]);

  const jumpToLetter = (letter: string) => {
    setActiveLetter(letter);
    if (!listRef.current) return;
    const items = Array.from(listRef.current.querySelectorAll<HTMLDivElement>('[data-letter]'));
    for (const el of items) {
      if (el.dataset.letter === letter) { el.scrollIntoView({ block: 'nearest' }); break; }
    }
  };

  const dropdownEl = isOpen ? ReactDOM.createPortal(
    <div
      id="custom-dropdown-portal"
      className="custom-select-dropdown"
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 99999,
        maxHeight: '320px',
      }}
    >
      <div className="custom-select-search-container">
        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          className="custom-select-search-input"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveLetter(''); }}
          onClick={e => e.stopPropagation()}
          autoFocus
        />
      </div>

      <div style={{ display: 'flex' }}>
        <div className="custom-select-options-list" ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => {
              const isSelected = selectedValue === opt.value;
              const letter = String(opt.label)[0]?.toUpperCase() || '';
              return (
                <div
                  key={opt.value}
                  data-letter={letter}
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                >
                  <span className="option-text">{opt.label}</span>
                  {opt.subLabel && (
                    <span className="option-subtext" style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>
                      {opt.subLabel}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No results found
            </div>
          )}
        </div>

        {showAlphabetSidebar && (
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', padding: '4px 2px', gap: '1px', overflowY: 'auto', backgroundColor: 'var(--bg-main)' }}>
            {ALPHA.map(letter => {
              const available = availableLetters.has(letter);
              const active = activeLetter === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => available && jumpToLetter(letter)}
                  style={{ width: '20px', height: '16px', border: 'none', background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : available ? 'var(--primary)' : 'var(--text-muted)', fontSize: '9px', fontWeight: available ? '700' : '400', cursor: available ? 'pointer' : 'default', borderRadius: '3px', padding: 0, lineHeight: 1 }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="custom-select-wrapper" ref={wrapperRef} style={{ ...style, position: 'relative', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => { setIsOpen(prev => !prev); setSearch(''); setActiveLetter(''); }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', width: '100%', cursor: 'pointer', background: '#fff', border: '1px solid var(--border-color)' }}
      >
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '8px' }}>
          {selectedOption ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="selected-label" style={{ fontWeight: '600', fontSize: '13px' }}>{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="selected-sublabel" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {selectedOption.subLabel}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--text-secondary)' }} />
      </button>

      {dropdownEl}

      {required && (
        <input type="text" value={selectedValue} onChange={() => {}} required style={{ position: 'absolute', width: '100%', height: '0px', opacity: 0, pointerEvents: 'none' }} />
      )}
    </div>
  );
};
