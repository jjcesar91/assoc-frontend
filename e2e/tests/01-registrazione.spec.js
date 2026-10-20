// Form pubblico di registrazione: validazione, maiuscolo, comune collegato, protezioni
const { test, expect } = require('@playwright/test');
const { campo, scegliComune, attendiTokenTurnstile } = require('../helpers/pagine');

test.describe('Registrazione: form', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/registrazione');
        await expect(page.getByRole('heading', { name: 'Registra la tua associazione' })).toBeVisible();
    });

    test('invio a vuoto: i campi obbligatori vengono evidenziati', async ({ page }) => {
        await page.getByRole('button', { name: 'Registrati' }).click();
        for (const nome of ['associazione', 'codice_fiscale', 'email', 'telefono', 'indirizzo', 'comune', 'presidente_nome', 'presidente_cognome']) {
            await expect(page.locator(`[data-field="${nome}"]`), `campo ${nome}`).toHaveClass(/reg-field--error/);
        }
        await expect(page.locator('.reg-privacy')).toHaveClass(/reg-field--error/);
    });

    test('i dati inseriti restano dopo un errore', async ({ page }) => {
        await campo(page, 'associazione').fill('asd dati conservati');
        await page.getByRole('button', { name: 'Registrati' }).click();
        await expect(campo(page, 'associazione')).toHaveValue('ASD DATI CONSERVATI');
        await expect(page.locator('[data-field="email"]')).toHaveClass(/reg-field--error/);
    });

    test('tutti i campi in maiuscolo tranne l\'email', async ({ page }) => {
        await campo(page, 'associazione').fill('asd aquile');
        await campo(page, 'presidente_nome').fill('mario');
        await campo(page, 'indirizzo').fill('via roma 1');
        await campo(page, 'email').fill('Info@Aquile.it');
        await expect(campo(page, 'associazione')).toHaveValue('ASD AQUILE');
        await expect(campo(page, 'presidente_nome')).toHaveValue('MARIO');
        await expect(campo(page, 'indirizzo')).toHaveValue('VIA ROMA 1');
        await expect(campo(page, 'email')).toHaveValue('Info@Aquile.it');
    });

    test('comune dall\'elenco: CAP e provincia compilati e non modificabili', async ({ page }) => {
        await scegliComune(page, 'Treviso');
        await expect(campo(page, 'comune')).toHaveValue('TREVISO');
        await expect(campo(page, 'cap')).toHaveValue('31100');
        await expect(campo(page, 'provincia')).toHaveValue('TV');
        await expect(campo(page, 'cap')).toHaveAttribute('readonly', '');
        await expect(campo(page, 'provincia')).toHaveAttribute('readonly', '');
    });

    test('modificando il comune a mano CAP e provincia si svuotano', async ({ page }) => {
        await scegliComune(page, 'Treviso');
        await campo(page, 'comune').fill('TREVISOX');
        await expect(campo(page, 'cap')).toHaveValue('');
        await expect(campo(page, 'provincia')).toHaveValue('');
        await page.getByRole('button', { name: 'Registrati' }).click();
        await expect(page.locator('[data-field="comune"] .reg-error')).toHaveText(/Seleziona il comune dall'elenco/);
    });

    test('comune con più CAP: il CAP si sceglie tra quelli del comune', async ({ page }) => {
        await scegliComune(page, 'Roma');
        const cap = page.locator('[data-field="cap"] select');
        await expect(cap).toBeVisible();
        expect(await cap.locator('option').count()).toBeGreaterThan(10);
        await expect(campo(page, 'provincia')).toHaveValue('RM');
    });

    test('nessun campo password nel form', async ({ page }) => {
        await expect(page.locator('input[type="password"]')).toHaveCount(0);
        await expect(page.getByText('La password la imposterai')).toBeVisible();
    });

    test('campo trappola anti-bot presente ma nascosto', async ({ page }) => {
        const trappola = page.locator('input[name="website"]');
        await expect(trappola).toHaveCount(1);
        const box = await trappola.boundingBox();
        expect(box === null || box.x < 0 || box.width <= 1).toBeTruthy();
    });

    test('widget Turnstile presente e verifica completata', async ({ page }) => {
        await expect(page.locator('.reg-turnstile')).toBeVisible();
        await attendiTokenTurnstile(page);
    });
});

test.describe('Registrazione: protezioni lato server', () => {
    test('invio senza sessione CSRF rifiutato', async ({ request }) => {
        const res = await request.post('/users/api/public/registrazione', { data: { associazione: 'X' } });
        expect(res.status()).toBe(403);
        expect((await res.json()).code).toBe('CSRF');
    });

    test('invio immediato dopo l\'apertura rifiutato (tempo minimo)', async ({ request }) => {
        const s = await (await request.get('/users/api/public/registrazione/sessione')).json();
        const res = await request.post('/users/api/public/registrazione', {
            headers: { 'X-CSRF-Token': s.csrfToken }, data: { associazione: 'X' },
        });
        expect(res.status()).toBe(403);
        expect((await res.json()).error).toMatch(/troppo rapido/);
    });
});
