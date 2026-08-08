import React, { useMemo, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { FAQ_CATEGORIES, FAQ_LAST_UPDATE } from '../data/faqData';
import { formatDateIT } from '../utils/dateUtils';

const Faq = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [openItems, setOpenItems] = useState(() => new Set());

    const term = searchTerm.trim().toLowerCase();

    const filteredCategories = useMemo(() => {
        if (!term) return FAQ_CATEGORIES;
        return FAQ_CATEGORIES
            .map(category => ({
                ...category,
                items: category.items.filter(item =>
                    item.question.toLowerCase().includes(term) ||
                    item.answer.toLowerCase().includes(term) ||
                    category.label.toLowerCase().includes(term)
                ),
            }))
            .filter(category => category.items.length > 0);
    }, [term]);

    const isOpen = (itemId) => term ? true : openItems.has(itemId);

    const toggleItem = (itemId) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const scrollToCategory = (categoryId) => {
        const el = document.getElementById(`faq-cat-${categoryId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div style={{ padding: '20px', backgroundColor: 'white', color: '#333', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '4px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>FAQ / Guida</h2>
            <p style={{ marginTop: 0, marginBottom: '20px', fontSize: '0.85rem', color: '#888' }}>
                Domande frequenti sulle funzionalità del gestionale, organizzate per area.
            </p>

            {/* Search Bar */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', marginBottom: '16px' }}>
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                <input
                    type="text"
                    placeholder="Cerca una domanda (es. ricevuta, scadenza, prodotto...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md-input"
                    style={{ width: '100%', padding: '8px 12px 8px 35px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
            </div>

            {/* Category quick nav */}
            {!term && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                    {FAQ_CATEGORIES.map(category => (
                        <button
                            key={category.id}
                            onClick={() => scrollToCategory(category.id)}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '999px',
                                border: '1px solid #ddd',
                                backgroundColor: '#f5f5f5',
                                color: '#555',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                            }}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Categories & items */}
            {filteredCategories.length === 0 && (
                <p style={{ color: '#888', fontSize: '0.9rem' }}>Nessuna domanda trovata per "{searchTerm}".</p>
            )}

            {filteredCategories.map(category => (
                <div key={category.id} id={`faq-cat-${category.id}`} style={{ marginBottom: '28px', scrollMarginTop: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '10px' }}>
                        {category.label}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {category.items.map(item => {
                            const open = isOpen(item.id);
                            return (
                                <div key={item.id} style={{ border: '1px solid #eee', borderRadius: '6px', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => toggleItem(item.id)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 14px',
                                            backgroundColor: '#fafafa',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            color: '#333',
                                        }}
                                    >
                                        <span>{item.question}</span>
                                        <ChevronDown
                                            size={16}
                                            style={{ flexShrink: 0, color: '#888', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                                        />
                                    </button>
                                    {open && (
                                        <div style={{ padding: '12px 14px', fontSize: '0.87rem', lineHeight: 1.5, color: '#555', borderTop: '1px solid #eee' }}>
                                            {item.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <p style={{ marginTop: '12px', fontSize: '0.75rem', color: '#aaa' }}>
                Ultimo aggiornamento contenuti: {formatDateIT(FAQ_LAST_UPDATE)}
            </p>
        </div>
    );
};

export default Faq;
