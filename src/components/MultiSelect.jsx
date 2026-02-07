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
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    minHeight: '38px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    alignItems: 'center',
                    position: 'relative'
                }}
            >
                {selectedOptions.length === 0 && <span style={{color: '#888'}}>Seleziona...</span>}
                
                {selectedOptions.map(option => (
                    <span key={option.value} style={{
                        backgroundColor: '#e0e7ff',
                        color: '#3730a3',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.9rem'
                    }}>
                        {option.label}
                        <X size={14} style={{cursor: 'pointer'}} onClick={(e) => handleRemove(e, option.value)} />
                    </span>
                ))}
                
                 <div style={{flex: 1}}></div>
                 
                 {value.length > 0 && (
                    <div onClick={handleClear} style={{display:'flex', alignItems:'center', marginRight:'4px'}}>
                         <X size={16} color="#666"/>
                    </div>
                 )}
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {options.map(option => {
                        const isSelected = value.includes(option.value);
                        return (
                            <div 
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#4f46e5' : 'transparent',
                                    color: isSelected ? 'white' : 'inherit',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if(!isSelected) e.currentTarget.style.backgroundColor = '#f3f4f6';
                                }}
                                onMouseLeave={(e) => {
                                    if(!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                {option.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
