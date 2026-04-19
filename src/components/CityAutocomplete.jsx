import React, { useState, useEffect, useRef } from 'react';

// Module-level cache
let cachedComuni = null;
let fetchPromise = null;

const fetchAllComuni = async () => {
    if (cachedComuni) return cachedComuni;
    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch('https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json')
        .then(res => {
            if (!res.ok) throw new Error("Network response was not ok");
            return res.json();
        })
        .then(data => {
            cachedComuni = data.map(c => ({
                nome: c.nome,
                cap: Array.isArray(c.cap) ? (c.cap[0] || '') : (c.cap || '')
            }));
            fetchPromise = null;
            return cachedComuni;
        })
        .catch(err => {
            console.error("Failed to fetch comuni list:", err);
            fetchPromise = null;
            return [];
        });
        
    return fetchPromise;
};

const CityAutocomplete = ({ label, value, onChange, onSelect, name, required = false, disabled = false, style }) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dropdownRect, setDropdownRect] = useState(null);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Sync internal state with props
    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Recompute dropdown position on scroll/resize while open
    useEffect(() => {
        if (!isOpen) return;
        const update = () => {
            if (inputRef.current) {
                setDropdownRect(inputRef.current.getBoundingClientRect());
            }
        };
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [isOpen]);

    // Prefetch data on mount
    useEffect(() => {
        fetchAllComuni(); 
    }, []);

    const fetchComuni = async (searchText) => {
        if (!searchText || searchText.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        
        setLoading(true);
        try {
            const allComuni = await fetchAllComuni();
            
            if (!allComuni || allComuni.length === 0) {
                setSuggestions([]);
                setIsOpen(false);
                return;
            }

            const lowerSearch = searchText.toLowerCase();
            const filtered = allComuni.filter(c => 
                c.nome.toLowerCase().includes(lowerSearch)
            ).sort((a, b) => {
                const aStarts = a.nome.toLowerCase().startsWith(lowerSearch);
                const bStarts = b.nome.toLowerCase().startsWith(lowerSearch);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.nome.localeCompare(b.nome);
            }).slice(0, 50);
            
            setSuggestions(filtered);
            if (inputRef.current) {
                setDropdownRect(inputRef.current.getBoundingClientRect());
            }
            setIsOpen(true);
        } catch (error) {
            console.error("Error fetching comuni:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const txt = e.target.value;
        setQuery(txt);
        // Notify parent 
        if(onChange) onChange({ target: { name, value: txt } });
        
        // Debounce search could be added here
        fetchComuni(txt);
    };

    const handleSelect = (comuneObj) => {
        setQuery(comuneObj.nome);
        if(onChange) onChange({ target: { name, value: comuneObj.nome } });
        if(onSelect) onSelect(comuneObj);
        setIsOpen(false);
    };

    return (
        <div 
            className="city-autocomplete-wrapper" 
            ref={wrapperRef} 
            style={{...style, position: 'relative'}}
        >
            {label && <label className="field-label" style={{marginBottom:'6px', display:'block'}}>{label} {required && '*'}</label>}
            <div style={{position:'relative', display: 'flex'}}>
                <input 
                    className="md-input"
                    ref={inputRef}
                    name={name}
                    value={query}
                    onChange={handleInputChange}
                    placeholder="Digita almeno 2 caratteri..."
                    disabled={disabled}
                    required={required}
                    autoComplete="off"
                    style={{width: '100%'}}
                />
                {loading && (
                    <div style={{position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', color:'#999'}}>
                        <small>...</small>
                    </div>
                )}
            </div>

            {isOpen && suggestions.length > 0 && dropdownRect && (
                <ul className="city-autocomplete-dropdown" style={{
                    position: 'fixed',
                    top: dropdownRect.bottom,
                    left: dropdownRect.left,
                    width: dropdownRect.width,
                    backgroundColor: 'var(--surface-color, white)',
                    border: '1px solid var(--border-color, #e0e0e0)',
                    borderTop: 'none',
                    borderRadius: '0 0 4px 4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {suggestions.map((comune, idx) => (
                        <li 
                            key={idx} 
                            onClick={() => handleSelect(comune)}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border-color, #eee)',
                                color: 'var(--text-primary, black)'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-color, #f5f5f5)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            {comune.nome}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CityAutocomplete;
