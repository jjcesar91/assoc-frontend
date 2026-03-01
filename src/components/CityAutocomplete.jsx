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
            // Extract just the names from the objects
            cachedComuni = data.map(c => c.nome);
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

const CityAutocomplete = ({ label, value, onChange, name, required = false, disabled = false, style }) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

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
                c.toLowerCase().includes(lowerSearch)
            ).sort((a, b) => {
                const aStarts = a.toLowerCase().startsWith(lowerSearch);
                const bStarts = b.toLowerCase().startsWith(lowerSearch);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            }).slice(0, 50);
            
            setSuggestions(filtered);
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

    const handleSelect = (city) => {
        setQuery(city);
        if(onChange) onChange({ target: { name, value: city } });
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

            {isOpen && suggestions.length > 0 && (
                <ul className="city-autocomplete-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--surface-color, white)',
                    border: '1px solid var(--border-color, #e0e0e0)',
                    borderTop: 'none',
                    borderRadius: '0 0 4px 4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {suggestions.map((city, idx) => (
                        <li 
                            key={idx} 
                            onClick={() => handleSelect(city)}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border-color, #eee)',
                                color: 'var(--text-primary, black)'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-color, #f5f5f5)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            {city}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CityAutocomplete;
