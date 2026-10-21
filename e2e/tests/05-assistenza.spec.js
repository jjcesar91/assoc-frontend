// Assistenza: ticket dal cliente al supporto (Backoffice → Ticket) e ritorno.
// Prepara una licenza attiva con un amministratore, prima Free (menu bloccato) poi Pro.
const { test, expect } = require('@playwright/test');
const { compilaRegistrazione, login } = require('../helpers/pagine');
const server = require('../helpers/server');

const ID = Date.now().toString(36).toUpperCase();
const ASSOCIAZIONE = `ASD E2E TICKET ${ID}`;
const EMAIL = `e2e.ticket.${ID.toLowerCase()}@example.com`;
const PASSWORD = `E2e-Ticket-${ID}-2026!`;
const SUPPORTO = `e2e.supporto.${ID.toLowerCase()}@example.com`;
const OGGETTO = `Stampa ricevuta non funziona ${ID}`;
const OGGETTO_2 = `Domanda sul bilancio ${ID}`;
const NOTA = `Nota interna riservata ${ID}`;
// auth tiene in cache lo stato delle licenze per 15 secondi
const CACHE_LICENZE_MS = 16 * 1000;

let licenzaId = null;
let ticketId = null;
let ccnPrecedente = null; // destinatari dell'avviso al supporto prima del test

const setPiano = (piano) => server.psql('users', `update licenze set piano = $$${piano}$$ where id = ${Number(licenzaId)}`);

async function accediCliente(page) {
    await login(page, EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/soci/, { timeout: 20 * 1000 });
}

test.describe.serial('Assistenza: ticket cliente ↔ supporto', () => {
    test.beforeAll(async ({ browser, baseURL }) => {
        // Licenza attiva con amministratore (registrazione dal sito + password dal link)
        const page = await browser.newPage();
        await compilaRegistrazione(page, { associazione: ASSOCIAZIONE.toLowerCase(), codiceFiscale: `8${ID}`.slice(0, 11).padEnd(11, '0'), email: EMAIL });
        await page.getByRole('button', { name: 'Registrati' }).click();
        await expect(page.getByRole('heading', { name: 'Registrazione inviata' })).toBeVisible();
        licenzaId = server.licenzaIdDiSocieta(ASSOCIAZIONE);
        server.psql('users', `update licenze set stato = $$attiva$$, piano = $$free$$ where id = ${Number(licenzaId)}`);
        await page.goto(server.linkImpostaPassword(licenzaId, baseURL));
        await page.locator('input[type="password"]').nth(0).fill(PASSWORD);
        await page.locator('input[type="password"]').nth(1).fill(PASSWORD);
        await page.getByRole('button', { name: 'Imposta password' }).click();
        await expect(page.getByRole('heading', { name: 'Password impostata' })).toBeVisible();
        await page.close();
        await new Promise(r => setTimeout(r, CACHE_LICENZE_MS));

        // Destinatari dell'avviso al supporto per la durata del test
        ccnPrecedente = server.psql('users', 'select coalesce(ccn::text, $$null$$) from email_template where chiave = $$ticket_supporto$$') || null;
        server.psql('users', `insert into email_template (chiave, ccn, "createdAt", "updatedAt") values ($$ticket_supporto$$, $$["${SUPPORTO}"]$$, now(), now())
            on conflict (chiave) do update set ccn = excluded.ccn`);
    });

    test.afterAll(() => {
        if (ccnPrecedente === null) server.psql('users', 'delete from email_template where chiave = $$ticket_supporto$$ and oggetto is null and corpo_html is null');
        else server.psql('users', `update email_template set ccn = ${ccnPrecedente === 'null' ? 'null' : `$$${ccnPrecedente}$$`} where chiave = $$ticket_supporto$$`);
        server.cancellaSocieta(ASSOCIAZIONE);
    });

    test('1. piano Free: Assistenza visibile ma disabilitata', async ({ page }) => {
        await accediCliente(page);
        await page.locator('button:has(svg.lucide-menu)').click();
        const voce = page.locator('.sidebar-item', { hasText: 'Assistenza' });
        await expect(voce).toHaveClass(/sidebar-item--disabled/);
        await expect(voce).toHaveAttribute('title', 'Non incluso nel piano Free');

        await page.goto('/assistenza');
        await expect(page.getByTestId('assistenza-bloccata')).toBeVisible();
        // Il blocco vale anche lato server
        const status = await page.evaluate(async () => (await fetch('/users/api/tickets')).status);
        expect(status).toBe(403);
    });

    test('2. piano Pro: il cliente apre un ticket', async ({ page }) => {
        setPiano('pro');
        await accediCliente(page);
        await page.locator('button:has(svg.lucide-menu)').click();
        await page.locator('.sidebar-item', { hasText: 'Assistenza' }).click();
        await expect(page).toHaveURL(/\/assistenza$/);

        await page.getByRole('button', { name: 'Nuovo ticket' }).click();
        await page.getByRole('button', { name: 'Invia ticket' }).click();
        await expect(page.getByText('Indica l\'oggetto della richiesta.')).toBeVisible();

        await page.getByLabel('Oggetto').fill(OGGETTO);
        await page.getByLabel('Categoria').selectOption('tecnico');
        await page.getByLabel('Priorità').selectOption('alta');
        await page.getByLabel('Descrizione').fill('Quando premo Stampa\nnon succede nulla.');
        await page.getByRole('button', { name: 'Invia ticket' }).click();

        await expect(page).toHaveURL(/\/assistenza\?ticket=\d+/);
        ticketId = Number(new URL(page.url()).searchParams.get('ticket'));
        await expect(page.getByTestId('ticket-stato')).toHaveText('In attesa del supporto');
        await expect(page.getByTestId('ticket-messaggio')).toContainText('non succede nulla.');

        // Il supporto riceve l'avviso in copia nascosta
        const avviso = await server.attendiEmail(SUPPORTO, OGGETTO, { campo: 'bcc' });
        expect(avviso.Text).toContain(ASSOCIAZIONE);
        expect(avviso.Text).toContain(`backoffice/ticket?ticket=${ticketId}`);
    });

    test('3. il supporto aggiunge una nota interna e risponde', async ({ page }) => {
        await login(page, process.env.E2E_SUPERUSER_EMAIL, process.env.E2E_SUPERUSER_PASSWORD);
        await expect(page).not.toHaveURL(/\/login/);
        await page.goto('/backoffice/ticket');
        await page.getByLabel('Cerca').fill(String(ticketId));
        const riga = page.locator('tr', { hasText: OGGETTO });
        await expect(riga).toContainText(ASSOCIAZIONE);
        await expect(riga).toContainText('Alta');
        await riga.click();

        await page.getByRole('checkbox', { name: 'Nota interna' }).check();
        await page.getByLabel('Nota interna (non visibile al cliente)').fill(NOTA);
        await page.getByRole('button', { name: 'Salva nota' }).click();
        await expect(page.locator('.ticket-msg--nota', { hasText: NOTA })).toBeVisible();
        await expect(page.getByTestId('ticket-stato')).toHaveText('Aperto');

        await page.getByRole('checkbox', { name: 'Nota interna' }).uncheck();
        await page.getByLabel('Risposta al cliente').fill('Ciao, prova ad aggiornare il browser.');
        await expect(page.getByLabel('Stato dopo l\'invio')).toHaveValue('in_attesa_cliente');
        await page.getByRole('button', { name: 'Invia risposta' }).click();
        await expect(page.getByTestId('ticket-stato')).toHaveText('In attesa del cliente');
    });

    test('4. il cliente vede la risposta (non la nota) e risponde', async ({ page }) => {
        const email = await server.attendiEmail(EMAIL, 'Nuova risposta');
        expect(email.Text).toContain('prova ad aggiornare il browser');
        expect(email.Text).not.toContain(NOTA);
        expect(email.Text).toContain(`assistenza?ticket=${ticketId}`);

        await accediCliente(page);
        await page.goto('/assistenza');
        const riga = page.getByTestId('lista-ticket').locator('tr', { hasText: OGGETTO });
        await expect(riga).toHaveClass(/ticket-row-nonletto/);
        await expect(riga).toContainText('In attesa di tua risposta');
        await riga.click();

        await expect(page.getByTestId('ticket-thread')).toContainText('prova ad aggiornare il browser');
        await expect(page.getByTestId('ticket-thread')).not.toContainText(NOTA);
        await expect(page.getByTestId('ticket-thread')).toContainText('Supporto GNP');

        await page.getByLabel('Rispondi').fill('Ancora nulla, purtroppo.');
        await page.getByRole('button', { name: 'Invia risposta' }).click();
        await expect(page.getByTestId('ticket-messaggio').last()).toContainText('Ancora nulla');
        await expect(page.getByTestId('ticket-stato')).toHaveText('In attesa del supporto');
    });

    test('5. filtri per stato e ordinamento per data', async ({ page }) => {
        await accediCliente(page);
        await page.goto('/assistenza');
        await page.getByRole('button', { name: 'Nuovo ticket' }).click();
        await page.getByLabel('Oggetto').fill(OGGETTO_2);
        await page.getByLabel('Descrizione').fill('Come si stampa il bilancio?');
        await page.getByRole('button', { name: 'Invia ticket' }).click();
        await expect(page).toHaveURL(/\/assistenza\?ticket=\d+/);
        await page.getByRole('button', { name: 'Problema risolto, chiudi' }).click();
        await page.getByRole('button', { name: 'Chiudi il ticket' }).click();
        await expect(page.getByTestId('ticket-stato')).toHaveText('Chiuso');
        await expect(page.getByLabel('Rispondi')).toHaveCount(0);
        await page.getByRole('button', { name: 'Ticket' }).click();

        const righe = page.getByTestId('lista-ticket').locator('tbody tr');
        // Data creazione: il secondo ticket è il più recente
        await page.getByLabel('Ordina per').selectOption('creazione');
        await expect(righe.first()).toContainText(OGGETTO_2);
        await page.getByLabel('Verso').selectOption('asc');
        await expect(righe.first()).toContainText(OGGETTO);

        await page.getByLabel('Stato').selectOption('chiuso');
        await expect(righe).toHaveCount(1);
        await expect(righe.first()).toContainText(OGGETTO_2);
        await page.getByLabel('Stato').selectOption('aperto');
        await expect(righe).toHaveCount(1);
        await expect(righe.first()).toContainText(OGGETTO);
        await expect(page.getByLabel('Stato').locator('option[value="chiuso"]')).toHaveText(/\(1\)/);
    });

    test('6. il supporto cambia lo stato e i filtri del Backoffice', async ({ page }) => {
        await login(page, process.env.E2E_SUPERUSER_EMAIL, process.env.E2E_SUPERUSER_PASSWORD);
        await expect(page).not.toHaveURL(/\/login/);
        await page.goto('/backoffice/ticket');
        await page.getByLabel('Cerca').fill(ID);
        const righe = page.getByTestId('lista-ticket').locator('tbody tr');
        await expect(righe).toHaveCount(2);

        // Da leggere: l'ultima risposta del cliente nel primo e il secondo mai aperto dal supporto
        await page.getByLabel('Solo da leggere').check();
        await expect(righe).toHaveCount(2);
        await righe.filter({ hasText: OGGETTO }).click();
        // Si attende il dettaglio: anche i filtri della lista hanno un campo "Stato"
        await expect(page.getByTestId('ticket-stato')).toHaveText('Aperto');
        await page.getByLabel('Stato', { exact: true }).selectOption('risolto');
        await expect(page.getByTestId('ticket-stato')).toHaveText('Risolto');
        await page.getByRole('button', { name: 'Ticket' }).click();
        // Aperto dal supporto: non è più da leggere
        await expect(righe).toHaveCount(1);
        await expect(righe.first()).toContainText(OGGETTO_2);

        await page.getByLabel('Solo da leggere').uncheck();
        await page.getByLabel('Stato', { exact: true }).selectOption('risolto');
        await expect(righe).toHaveCount(1);
        await page.getByLabel('Ordina per').selectOption('ultimo_messaggio');
        await page.getByLabel('Stato', { exact: true }).selectOption('');
        await expect(righe.first()).toContainText(OGGETTO);
    });
});
