// Prodotti → abbonamento con listino di formule e più corsi inclusi (società 1 di dev)
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/pagine');
const { psql } = require('../helpers/server');

const SOCIETA_ID = 1;
const NOME = `E2E PILATES + PISCINA ${Date.now()}`;
const sqlNome = `$$${NOME}$$`;

const prodottoId = () => Number(psql('products', `select id from "Products" where description = ${sqlNome}`)) || null;
const corsiCollegati = (id) => psql('activities', `select "corsoId" from "CorsoAbbonamenti" where "abbonamentoId" = ${Number(id)} order by "corsoId"`)
    .split('\n').filter(Boolean).map(Number);

test.describe.serial('Abbonamento con listino e corsi inclusi', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(id => localStorage.setItem('selectedSocietaId', String(id)), SOCIETA_ID);
        await login(page, process.env.E2E_SUPERUSER_EMAIL, process.env.E2E_SUPERUSER_PASSWORD);
        await expect(page).not.toHaveURL(/\/login/);
        await page.goto('/prodotti');
        // Il cambio società (risolta dopo il login) chiude le modali: si attende l'elenco caricato
        await page.waitForLoadState('networkidle');
        await expect(page.locator('tbody tr').first()).toBeVisible();
    });

    test.afterAll(() => {
        // Pulizia anche se un test fallisce a metà
        const id = prodottoId();
        if (id) {
            psql('activities', `delete from "CorsoAbbonamenti" where "abbonamentoId" = ${id}`);
            psql('products', `delete from "Products" where id = ${id}`);
        }
    });

    test('crea l\'abbonamento con due tariffe e due corsi', async ({ page }) => {
        await page.getByRole('button', { name: 'Nuovo prodotto' }).click();
        const modale = page.locator('.prodotto-modal');
        await modale.locator('select[name="type"]').selectOption('subscription');
        await modale.locator('input[name="description"]').fill(NOME);
        await expect(modale.getByText('Prezzo base')).toHaveCount(0);

        const righe = modale.getByTestId('riga-listino');
        await righe.nth(0).getByLabel('Descrizione tariffa').fill('Mensile 8 ingressi');
        await righe.nth(0).getByLabel('Durata').selectOption('1_mese');
        await righe.nth(0).getByLabel('Numero ingressi').fill('8');
        await righe.nth(0).getByLabel('Prezzo').fill('40');
        await modale.getByRole('button', { name: 'Aggiungi tariffa' }).click();
        await righe.nth(1).getByLabel('Durata').selectOption('3_mesi');
        await righe.nth(1).getByText('Illimitati').click();
        await righe.nth(1).getByLabel('Prezzo').fill('120,50');

        const corsi = modale.getByTestId('corsi-inclusi').locator('input[type="checkbox"]');
        await corsi.nth(0).check();
        await corsi.nth(1).check();
        await modale.getByRole('button', { name: 'Salva' }).click();
        await expect(modale).toHaveCount(0);

        const riga = page.locator('tr', { hasText: NOME });
        await expect(riga).toContainText('da € 40.00');
        await expect(riga).toContainText('2 tariffe');

        const id = prodottoId();
        const listino = JSON.parse(psql('products', `select listino::text from "Products" where id = ${id}`));
        expect(listino.map(f => [f.descrizione ?? null, f.durata, f.illimitato, f.ingressi, f.prezzo])).toEqual([
            ['Mensile 8 ingressi', '1_mese', false, 8, 40],
            [null, '3_mesi', true, null, 120.5],
        ]);
        expect(corsiCollegati(id)).toHaveLength(2);
    });

    test('tariffa doppia segnalata; con descrizione diversa è ammessa', async ({ page }) => {
        await page.locator('tr', { hasText: NOME }).getByTitle('Modifica').click();
        const modale = page.locator('.prodotto-modal');
        const righe = modale.getByTestId('riga-listino');
        await expect(righe).toHaveCount(2);
        await expect(modale.getByTestId('corsi-inclusi').locator('input:checked')).toHaveCount(2);

        await righe.nth(1).getByLabel('Durata').selectOption('1_mese');
        await righe.nth(1).getByText('Illimitati').click();
        await righe.nth(1).getByLabel('Numero ingressi').fill('8');
        await righe.nth(1).getByLabel('Descrizione tariffa').fill('mensile 8 ingressi');
        await modale.getByRole('button', { name: 'Salva' }).click();
        await expect(modale.getByText('Tariffa già presente con la stessa durata, gli stessi ingressi e la stessa descrizione.')).toBeVisible();

        // Stessa durata e ingressi ma descrizione diversa (es. tariffa ridotta): ammessa
        await righe.nth(1).getByLabel('Descrizione tariffa').fill('Under 18');
        await righe.nth(1).getByLabel('Prezzo').fill('30');
        await modale.getByRole('button', { name: 'Salva' }).click();
        await expect(modale).toHaveCount(0);
        const listino = JSON.parse(psql('products', `select listino::text from "Products" where id = ${prodottoId()}`));
        expect(listino.map(f => [f.descrizione, f.ingressi, f.prezzo])).toEqual([
            ['Mensile 8 ingressi', 8, 40],
            ['Under 18', 8, 30],
        ]);
    });

    test('togliendo un corso dalla scheda prodotto si rimuove il collegamento', async ({ page }) => {
        const id = prodottoId();
        await page.locator('tr', { hasText: NOME }).getByTitle('Modifica').click();
        const modale = page.locator('.prodotto-modal');
        await modale.getByTestId('corsi-inclusi').locator('input[type="checkbox"]').nth(1).uncheck();
        await modale.getByRole('button', { name: 'Salva' }).click();
        await expect(modale).toHaveCount(0);
        await expect.poll(() => corsiCollegati(id).length).toBe(1);
    });

    test('eliminando il prodotto si eliminano i collegamenti con i corsi', async ({ page }) => {
        const id = prodottoId();
        await page.locator('tr', { hasText: NOME }).getByTitle('Elimina').click();
        await page.getByRole('button', { name: /^(Conferma|Sì|Elimina|OK)$/i }).last().click();
        await expect(page.locator('tr', { hasText: NOME })).toHaveCount(0);
        await expect.poll(() => corsiCollegati(id).length).toBe(0);
    });
});
