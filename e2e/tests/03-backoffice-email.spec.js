// Backoffice → Email (superuser): le tre email configurabili e l'anteprima
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/pagine');

test.describe('Backoffice → Email', () => {
    test.beforeEach(async ({ page }) => {
        await login(page, process.env.E2E_SUPERUSER_EMAIL, process.env.E2E_SUPERUSER_PASSWORD);
        await expect(page).not.toHaveURL(/\/login/);
        await page.goto('/backoffice/email');
    });

    test('mostra destinatari CCN e le tre email', async ({ page }) => {
        await expect(page.getByText('Amministratori in copia nascosta (CCN)')).toBeVisible();
        for (const nome of ['Registrazione ricevuta', 'Attivazione licenza', 'Benvenuto e primi passi']) {
            await expect(page.getByRole('heading', { name: nome })).toBeVisible();
        }
        await expect(page.locator('textarea')).toHaveCount(3);
    });

    test('anteprima dell\'attivazione con i dati d\'esempio e il pulsante password', async ({ page }) => {
        const scheda = page.locator('.table-card', { has: page.getByRole('heading', { name: 'Attivazione licenza' }) });
        await scheda.getByRole('button', { name: 'Anteprima' }).click();
        await expect(page.getByText('La licenza di ASD AQUILE TREVISO è attiva: imposta la tua password')).toBeVisible();
        const email = page.frameLocator('iframe[title="Anteprima email"]');
        await expect(email.getByRole('link', { name: 'Imposta la password' })).toBeVisible();
        await expect(email.locator('body')).not.toContainText('{{');
    });

    test('destinatario CCN non valido segnalato senza salvare', async ({ page }) => {
        const area = page.locator('textarea').first();
        const prima = await area.inputValue();
        await area.fill('non-una-email');
        await page.getByRole('button', { name: 'Salva destinatari' }).click();
        await expect(page.getByText('Indirizzi non validi: non-una-email')).toBeVisible();
        await area.fill(prima); // nessuna modifica salvata
    });
});
