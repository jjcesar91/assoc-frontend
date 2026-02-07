import React, { useState, useEffect, useRef } from 'react';

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

    const fetchComuni = async (searchText) => {
        if (!searchText || searchText.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        
        setLoading(true);
        try {
            // In a real scenario, you would fetch from your backend or an external API
            // Example:
            // const res = await fetch(`https://axqvoqvbfq.cloudimg.io/v7/https://comuni-ita.js.org/data/json/gi_comuni_cap.json`);
            // const data = await res.json();
            
            // For Demo purposes, we simulate a delay and use a static list
            // You can replace this list with the full JSON of Italian municipalities
            const demoComuni = [
                "Roma", "Milano", "Napoli", "Torino", "Palermo", "Genova", "Bologna", 
                "Firenze", "Bari", "Catania", "Venezia", "Verona", "Messina", "Padova", 
                "Trieste", "Taranto", "Brescia", "Prato", "Parma", "Modena", "Reggio Calabria",
                "Reggio Emilia", "Perugia", "Ravenna", "Livorno", "Cagliari", "Foggia", 
                "Rimini", "Salerno", "Ferrara", "Sassari", "Latina", "Giugliano in Campania",
                "Monza", "Siracusa", "Pescara", "Bergamo", "Forlì", "Trento", "Vicenza", 
                "Terni", "Bolzano", "Novara", "Piacenza", "Ancona", "Andria", "Arezzo", 
                "Udine", "Cesena", "Lecce", "Pesaro", "Barletta", "Alessandria", "La Spezia",
                "Pisa", "Pistoia", "Lucca", "Guidonia Montecelio", "Catanzaro", "Treviso",
                "Como", "Busto Arsizio", "Grosseto", "Sesto San Giovanni", "Pozzuoli", "Varese", 
                "Fiumicino", "Caserta", "Asti", "Cinisello Balsamo", "Aprilia", "Carpi", 
                "Cremona", "Pavia", "Imola", "L'Aquila", "Altamura", "Massa", "Trapani", 
                "Viterbo", "Cosenza", "Potenza", "Castellammare di Stabia", "Crotone", 
                "Afragola", "Vittoria", "Pomezia", "Vigevano", "Carrara", "Viareggio", 
                "Caltanissetta", "Fano", "Savona", "Matera", "Legnano", "Marano di Napoli", 
                "Benevento", "Agrigento", "Faenza", "Cerignola", "Moncalieri", "Foligno", 
                "Manfredonia", "Tivoli", "Avellino", "Bagheria", "Olbia", "Cuneo", "Anzio", 
                "Sanremo", "Teramo", "Modica", "Bisceglie", "Siena", "San Severo", "Ercolano", 
                "Portici", "Trani", "Velletri", "Cava de' Tirreni", "Acireale", "Rovigo", 
                "Civitavecchia", "Gallarate", "Pordenone", "Aversa", "Montesilvano", "Mazara del Vallo", 
                "Ascoli Piceno", "Battipaglia", "Campobasso", "Casoria", "Scafati", "Rho", 
                "Chioggia", "Scandicci", "Collegno"
            ];

            const filtered = demoComuni.filter(c => 
                c.toLowerCase().includes(searchText.toLowerCase())
            );
            
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
        <div className="form-group" ref={wrapperRef} style={{...style, position: 'relative'}}>
            <label style={{marginBottom:'5px', display:'block'}}>{label} {required && '*'}</label>
            <div style={{position:'relative'}}>
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
