// Backoffice → Comunicazioni (superuser): le tre email configurabili, CCN e anteprima
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/pagine');

test.describe('Backoffice → Comunicazioni', () => {
    test.beforeEach(async ({ page }) => {
        await login(page, process.env.E2E_SUPERUSER_EMAIL, process.env.E2E_SUPERUSER_PASSWORD);
        await expect(page).not.toHaveURL(/\/login/);
        await page.goto('/backoffice/email');
    });

    test('tre comunicazioni, ognuna con i propri destinatari CCN', async ({ page }) => {
        for (const nome of ['Registrazione ricevuta', 'Attivazione licenza', 'Benvenuto e primi passi']) {
            const scheda = page.locator('.table-card', { has: page.getByRole('heading', { name: nome }) });
            await expect(scheda.getByText('Amministratori in copia nascosta (CCN)')).toBeVisible();
            await expect(scheda.locator('textarea')).toHaveCount(1);
        }
        await expect(page.getByRole('button', { name: 'Salva destinatari' })).toHaveCount(0);
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
        const scheda = page.locator('.table-card', { has: page.getByRole('heading', { name: 'Benvenuto e primi passi' }) });
        const area = scheda.locator('textarea');
        await area.fill('non-una-email');
        await scheda.getByRole('button', { name: 'Salva' }).click();
        await expect(scheda.getByText('Indirizzi non validi: non-una-email')).toBeVisible();
    });
});
