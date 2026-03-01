import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';

const MultiSelect = ({ label, options, value = [], onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        let newValue;
        if (value.includes(optionValue)) {
            newValue = value.filter(v => v !== optionValue);
        } else {
            newValue = [...value, optionValue];
        }
        onChange(newValue);
    };

    const handleRemove = (e, optionValue) => {
        e.stopPropagation();
        const newValue = value.filter(v => v !== optionValue);
        onChange(newValue);
    };
    
    const handleClear = (e) => {
        e.stopPropagation();
        onChange([]);
    }

    const selectedOptions = options.filter(opt => value.includes(opt.value));

    return (
        <div className="adv-field" ref={wrapperRef} style={{position: 'relative'}}>
            <label>{label}</label>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    border: '1px solid transparent',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    minHeight: '40px',
                    backgroundColor: isOpen ? 'white' : '#f0f2f5',
                    cursor: 'pointer',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    boxShadow: isOpen ? '0 0 0 2px rgba(25, 118, 210, 0.2)' : 'none'
                }}
            >
                <div style={{display:'flex', flexWrap:'wrap', gap:'6px', flex:1}}>
                    {selectedOptions.length === 0 && <span style={{color: '#666', fontSize:'0.9rem'}}>Seleziona...</span>}
                    
                    {selectedOptions.map(option => (
                        <span key={option.value} style={{
                            backgroundColor: '#e3f2fd',
                            color: '#1565c0',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 500
                        }}>
                            {option.label}
                            <X size={14} style={{cursor: 'pointer'}} onClick={(e) => handleRemove(e, option.value)} />
                        </span>
                    ))}
                </div>
                 
                 <div style={{display:'flex', alignItems:'center', marginLeft:'8px', color: '#757575'}}>
                     {value.length > 0 ? (
                        <div onClick={handleClear} style={{display:'flex', alignItems:'center', cursor:'pointer', padding:'4px', borderRadius:'50%'}}>
                             <X size={16} />
                        </div>
                     ) : (
                        <ChevronDown size={16} />
                     )}
                 </div>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    padding: '8px 0'
                }}>
                    {options.map(option => {
                        const isSelected = value.includes(option.value);
                        return (
                            <div 
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                style={{
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    backgroundColor: 'transparent',
                                    color: isSelected ? '#1976d2' : '#333',
                                    fontWeight: isSelected ? 500 : 400,
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background-color 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isSelected ? 'rgba(25, 118, 210, 0.08)' : '#f5f5f5';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                {option.label}
                                {isSelected && <span style={{fontSize:'1.1rem'}}>✓</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
