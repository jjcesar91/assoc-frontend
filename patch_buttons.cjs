const fs = require('fs');

// Patch RicercaSocioModal.jsx
const file1 = './src/pages/RicercaSocioModal.jsx';
let content1 = fs.readFileSync(file1, 'utf8');
content1 = content1.replace(
    '<button className="btn-scheda-rm">',
    `<button className="btn-scheda-rm" onClick={() => window.open(\`/soci?apriSocioPath=\${socio.id}\`, '_blank')}>`
);
fs.writeFileSync(file1, content1);

// Patch NuovoPagamento.jsx
const file2 = './src/pages/NuovoPagamento.jsx';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(
    '<button className="np-btn np-btn-green">',
    `<button className="np-btn np-btn-green" onClick={() => window.open(\`/soci?apriSocioPath=\${selectedSocio.id}\`, '_blank')}>`
);
fs.writeFileSync(file2, content2);
console.log("Patched buttons!");
