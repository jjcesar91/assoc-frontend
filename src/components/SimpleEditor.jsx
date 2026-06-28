import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link, Type, Plus } from 'lucide-react';

const SimpleEditor = ({ value, onChange, style, insertFields = [] }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        // Sincronizza il DOM con il valore esterno (caricamento da DB, cambio
        // società, "Ripristina testo predefinito"). Se l'editor ha il focus
        // l'utente sta scrivendo: in quel caso non sovrascriviamo, altrimenti
        // perderemmo il contenuto digitato e la posizione del cursore.
        const incoming = value || '';
        if (editor.innerHTML !== incoming && document.activeElement !== editor) {
            editor.innerHTML = incoming;
        }
    }, [value]);

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        // FORCE update parent
        if (editorRef.current && onChange) {
            onChange({
                target: {
                    value: editorRef.current.innerHTML
                }
            });
        }
    };

    const handleInput = () => {
        if (editorRef.current && onChange) {
            onChange({
                target: {
                    value: editorRef.current.innerHTML
                }
            });
        }
    };

    const insertField = (token) => {
        const editor = editorRef.current;
        if (!editor) return;
        // Assicura che il caret sia dentro l'editor: se la selezione corrente
        // non è nell'editor, la posiziona alla fine del contenuto.
        const selection = window.getSelection();
        const hasSelectionInside =
            selection.rangeCount > 0 && editor.contains(selection.anchorNode);
        editor.focus();
        if (!hasSelectionInside) {
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        document.execCommand('insertText', false, token);
        handleInput();
    };

    const ToolbarButton = ({ icon: Icon, command, arg, title }) => (
        <button
            type="button"
            className="toolbar-btn"
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent losing focus from editor
                execCommand(command, arg);
            }}
            title={title}
            style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)'
            }}
        >
            <Icon size={16} />
        </button>
    );

    return (
        <div className="simple-editor-container" style={{
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            ...style
        }}>
            <div className="editor-toolbar" style={{
                display: 'flex',
                gap: '4px',
                padding: '8px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--surface-1)',
                flexWrap: 'wrap'
            }}>
                <ToolbarButton icon={Bold} command="bold" title="Grassetto" />
                <ToolbarButton icon={Italic} command="italic" title="Corsivo" />
                <ToolbarButton icon={Underline} command="underline" title="Sottolineato" />
                <div style={{width: '1px', background: 'var(--border-color)', margin: '0 4px'}}></div>
                <ToolbarButton icon={List} command="insertUnorderedList" title="Elenco puntato" />
                <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Elenco numerato" />
                <div style={{width: '1px', background: 'var(--border-color)', margin: '0 4px'}}></div>
                {/* <ToolbarButton icon={Link} command="createLink" arg={prompt('URL link:')} title="Link (non implementato completamente)" /> */}
                <button 
                  onMouseDown={(e) => {
                      e.preventDefault();
                      execCommand('removeFormat');
                  }}
                  style={{border:'none', background:'none', cursor:'pointer', fontSize:'12px', color:'var(--text-secondary)'}}
                >
                    Clear
                </button>
                {insertFields.length > 0 && (
                    <>
                        <div style={{width: '1px', background: 'var(--border-color)', margin: '0 4px'}}></div>
                        {insertFields.map((field) => (
                            <button
                                key={field.token}
                                type="button"
                                className="toolbar-btn toolbar-field-btn"
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Mantieni il focus/selezione nell'editor
                                    insertField(field.token);
                                }}
                                title={field.title || `Inserisci ${field.label}`}
                                style={{
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    color: 'var(--primary)'
                                }}
                            >
                                <Plus size={13} /> {field.label}
                            </button>
                        ))}
                    </>
                )}
            </div>
            
            <div
                ref={editorRef}
                contentEditable
                className="editor-content"
                onInput={handleInput}
                suppressContentEditableWarning={true}
                tabIndex={0}
                style={{
                    padding: '12px',
                    minHeight: '150px',
                    outline: 'none',
                    overflowY: 'auto',
                    flex: 1
                }}
            />
            <style jsx>{`
                .toolbar-btn:hover {
                    background-color: var(--border-color) !important;
                    color: var(--text-primary) !important;
                }
            `}</style>
        </div>
    );
};

export default SimpleEditor;
