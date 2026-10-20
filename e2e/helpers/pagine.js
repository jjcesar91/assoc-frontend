// Azioni ricorrenti nelle pagine dell'app
const { expect } = require('@playwright/test');

const campo = (page, nome) => page.locator(`[data-field="${nome}"] input`).first();

// Compila il form di registrazione (comune scelto dall'autocompletamento)
async function compilaRegistrazione(page, dati) {
    await page.goto('/registrazione');
    await expect(page.getByRole('heading', { name: 'Registra la tua associazione' })).toBeVisible();
    const t0 = Date.now();
    for (const [nome, valore] of Object.entries({
        associazione: dati.associazione,
        codice_fiscale: dati.codiceFiscale,
        email: dati.email,
        telefono: dati.telefono || '0422 000000',
        indirizzo: dati.indirizzo || 'via delle prove 1',
        presidente_nome: dati.presidenteNome || 'mario',
        presidente_cognome: dati.presidenteCognome || 'rossi',
    })) {
        await campo(page, nome).fill(valore);
    }
    await scegliComune(page, dati.comune || 'Treviso');
    await page.locator('.reg-privacy input[type="checkbox"]').check();
    // Turnstile (su dev chiavi di test): se il widget è attivo, attende il suo token
    if (await page.locator('.reg-turnstile').count()) await attendiTokenTurnstile(page);
    // Il server scarta gli invii fatti meno di 3 secondi dopo l'apertura del modulo
    const attesa = 3500 - (Date.now() - t0);
    if (attesa > 0) await page.waitForTimeout(attesa);
}

// Il widget Turnstile vive in uno shadow DOM chiuso: si verifica il token che
// scrive nel campo nascosto cf-turnstile-response del form
async function attendiTokenTurnstile(page) {
    await page.locator('.reg-turnstile').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
        const el = document.querySelector('.reg-turnstile [name="cf-turnstile-response"]');
        return !!el && el.value.length > 0;
    }, null, { timeout: 30 * 1000 });
}

async function scegliComune(page, nome) {
    const input = campo(page, 'comune');
    await input.fill(nome.slice(0, 4));
    const voce = page.locator('.city-autocomplete-dropdown li', { hasText: new RegExp(`^${nome}\\b`, 'i') }).first();
    await voce.waitFor({ timeout: 20 * 1000 });
    await voce.click();
}

async function login(page, email, password) {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Accedi', exact: true }).click();
}

module.exports = { campo, compilaRegistrazione, scegliComune, attendiTokenTurnstile, login };
