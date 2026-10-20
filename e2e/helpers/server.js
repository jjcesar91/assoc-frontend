// Operazioni sull'host di dev che il browser non può fare da solo:
//  - leggere il link "imposta password" (arriva per email): lo si rigenera
//    dall'endpoint interno di auth;
//  - ripulire i dati creati dai test con lo script ufficiale delete-societa.js.
// Usa il comando SSH in E2E_SSH (vedi .env.example). Solo per dev.
const { execFileSync } = require('child_process');

function ssh(remoteCommand) {
    const parts = (process.env.E2E_SSH || '').split(' ').filter(Boolean);
    if (!parts.length) throw new Error('E2E_SSH non configurato: vedi e2e/.env.example');
    return execFileSync(parts[0], [...parts.slice(1), remoteCommand], { encoding: 'utf8', timeout: 60 * 1000 }).trim();
}

const sqlQuote = (v) => `$$${String(v).replace(/\$/g, '')}$$`;

function psql(db, sql) {
    return ssh(`docker exec ${db}_db psql -U postgres -d ${db}_db -Atc '${sql.replace(/'/g, "'\\''")}'`);
}

// id della licenza della società con questa denominazione (maiuscola)
function licenzaIdDiSocieta(denominazione) {
    const out = psql('users', `select licenza_id from societa where denominazione = ${sqlQuote(denominazione.toUpperCase())}`);
    return out ? Number(out.split('\n')[0]) : null;
}

function licenza(id) {
    const out = psql('users', `select piano || '|' || stato from licenze where id = ${Number(id)}`);
    const [piano, stato] = out.split('|');
    return { piano, stato };
}

// Nuovo link "imposta password" per il primo amministratore della licenza
// (invalida quello inviato per email, come un "Genera nuovo link" del Backoffice)
function linkImpostaPassword(licenzaId, baseURL) {
    const js = `fetch("http://localhost:3000/api/internal/licenze/${Number(licenzaId)}/link-attivazione",{method:"POST",headers:{"x-internal-secret":process.env.INTERNAL_API_SECRET||"internal_secret_change_me"}}).then(r=>r.json()).then(j=>console.log(j[0].token))`;
    const token = ssh(`docker exec auth_ms node -e '${js}'`).split('\n').pop();
    return `${baseURL.replace(/\/$/, '')}/reset-password#t=${encodeURIComponent(token)}`;
}

// Cancellazione definitiva delle società di prova (e di licenze, utenti, dati collegati)
function cancellaSocieta(...denominazioni) {
    const nomi = denominazioni.map(d => d.toUpperCase());
    const esistenti = nomi.filter(n => psql('users', `select count(*) from societa where denominazione = ${sqlQuote(n)}`) !== '0');
    if (!esistenti.length) return;
    const args = esistenti.map(n => `"${n}"`).join(' ');
    ssh(`docker exec users_ms node scripts/delete-societa.js ${args} --execute --confirm="${esistenti.join(',')}"`);
}

module.exports = { ssh, psql, licenzaIdDiSocieta, licenza, linkImpostaPassword, cancellaSocieta };
