// Flusso completo dal browser: registrazione → login bloccato → attivazione dal
// Backoffice (superuser) → imposta password dal link → login → limiti Free.
const { test, expect } = require('@playwright/test');
const { compilaRegistrazione, login } = require('../helpers/pagine');
const server = require('../helpers/server');

const ID = Date.now().toString(36).toUpperCase();
const ASSOCIAZIONE = `ASD E2E FLUSSO ${ID}`;
const EMAIL = `e2e.flusso.${ID.toLowerCase()}@example.com`;
const PASSWORD = `E2e-Flusso-${ID}-2026!`;
// auth tiene in cache lo stato delle licenze per 15 secondi
const CACHE_LICENZE_MS = 16 * 1000;
let attivataAlle = 0;

test.describe.serial('Licenza: dalla registrazione al primo accesso', () => {
    test.afterAll(() => server.cancellaSocieta(ASSOCIAZIONE));

    test('1. registrazione dal sito', async ({ page }) => {
        await compilaRegistrazione(page, { associazione: ASSOCIAZIONE.toLowerCase(), codiceFiscale: `9${ID}`.slice(0, 11).padEnd(11, '0'), email: EMAIL });
        await page.getByRole('button', { name: 'Registrati' }).click();
        await expect(page.getByRole('heading', { name: 'Registrazione inviata' })).toBeVisible();
        await expect(page.getByText(EMAIL)).toBeVisible();

        const licenzaId = server.licenzaIdDiSocieta(ASSOCIAZIONE);
        expect(licenzaId, 'licenza creata').toBeTruthy();
        expect(server.licenza(licenzaId)).toEqual({ piano: 'free', stato: 'in_attesa' });
    });

    test('2. prima dell\'attivazione l\'accesso è bloccato', async ({ page }) => {
        await login(page, EMAIL, 'Qualsiasi-Password-2026!');
        await expect(page.locator('.login-message--error')).toBeVisible();
        await expect(page).toHaveURL(/\/login/);
    });

    test('3. il superuser attiva la licenza dal Backoffice', async ({ page }) => {
        await login(page, process.env.E2E_SUPERUSER_EMAIL, process.env.E2E_SUPERUSER_PASSWORD);
        await expect(page).not.toHaveURL(/\/login/);
        await page.goto('/backoffice/iscrizioni');
        await page.getByPlaceholder('Cerca').fill(ASSOCIAZIONE);
        const riga = page.locator('tr', { hasText: ASSOCIAZIONE });
        await expect(riga.getByText('In attesa')).toBeVisible();
        await riga.click();

        await expect(page.getByText('in attesa di attivazione')).toBeVisible();
        await page.getByRole('button', { name: 'Attiva licenza' }).click();
        await expect(page.getByText(`Email di attivazione inviata a: ${EMAIL}`)).toBeVisible({ timeout: 30 * 1000 });
        attivataAlle = Date.now();

        expect(server.licenza(server.licenzaIdDiSocieta(ASSOCIAZIONE)).stato).toBe('attiva');
    });

    test('4. imposta password dal link: controlli e ritorno al login', async ({ page }) => {
        const link = server.linkImpostaPassword(server.licenzaIdDiSocieta(ASSOCIAZIONE), test.info().project.use.baseURL);
        await page.goto(link);
        await expect(page.getByText(`Account: ${EMAIL}`)).toBeVisible();
        // il token non resta nella barra degli indirizzi
        expect(page.url()).not.toContain('#t=');

        const [nuova, conferma] = [page.locator('input[type="password"]').nth(0), page.locator('input[type="password"]').nth(1)];
        await nuova.fill('debole');
        await conferma.fill('debole');
        await page.getByRole('button', { name: 'Imposta password' }).click();
        await expect(page.locator('.login-message--error')).toContainText('almeno 14 caratteri');

        await nuova.fill(PASSWORD);
        await conferma.fill(`${PASSWORD}x`);
        await page.getByRole('button', { name: 'Imposta password' }).click();
        await expect(page.locator('.login-message--error')).toContainText('non coincidono');

        await conferma.fill(PASSWORD);
        await page.getByRole('button', { name: 'Imposta password' }).click();
        await expect(page.getByRole('heading', { name: 'Password impostata' })).toBeVisible();
        await page.waitForURL(/\/login$/, { timeout: 10 * 1000 });
    });

    test('5. primo accesso dell\'amministratore con i limiti Free', async ({ page }) => {
        const attesa = attivataAlle + CACHE_LICENZE_MS - Date.now();
        if (attesa > 0) await page.waitForTimeout(attesa);
        await login(page, EMAIL, PASSWORD);
        await expect(page).toHaveURL(/\/soci/, { timeout: 20 * 1000 });
        await expect(page.getByText(/Soci della licenza:\s*0\s*\/\s*50/)).toBeVisible();

        await page.goto('/contabilita/operazioni');
        await expect(page.getByRole('button', { name: 'Bilancio' })).toBeDisabled();

        await page.goto('/amministrazione/utenti');
        await expect(page.getByRole('button', { name: 'Nuovo utente' })).toBeDisabled();
    });
});
