const fs = require('fs');

const file = '/home/dave/management-software/frontend/src/pages/NuovoPagamento.jsx';
let content = fs.readFileSync(file, 'utf8');

const scontiDropdown = `                            <select className="np-select" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '13px', minWidth: '160px', color: '#333' }}>
                                <option>Nessuno sconto</option>
                                <option>10%</option>
                                <option>20%</option>
                            </select>`;

content = content.replace(scontiDropdown, '');
fs.writeFileSync(file, content);
console.log("Sconti rimosso!");
