import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link, Type } from 'lucide-react';

const SimpleEditor = ({ value, onChange, style }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current) {
            if (value && editorRef.current.innerHTML !== value) {
                // If content is completely different (e.g. loaded from DB), update it.
                // But during typing, value updates causing re-render.
                // We should avoid updating innerHTML if it matches focused state, 
                // but here we are in a simple modal.
                // Let's only set it if it's empty in editor but has value in prop (initial load)
                if (editorRef.current.innerHTML === '' || editorRef.current.innerHTML === '<br>') {
                    editorRef.current.innerHTML = value;
                }
            }
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
