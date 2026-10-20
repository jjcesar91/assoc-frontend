// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configurazione locale in e2e/.env (non versionato, vedi .env.example)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
}

const baseURL = process.env.E2E_BASE_URL || 'https://dev.etspoint.it';

// I test creano e cancellano dati: mai contro le produzioni
if (/nonprofitgest\.it|gestionalenonprofit\.it/i.test(baseURL)) {
    throw new Error(`E2E_BASE_URL punta a una produzione (${baseURL}): i test vanno eseguiti solo su dev.`);
}

module.exports = defineConfig({
    testDir: './tests',
    // Il flusso licenza è sequenziale e condivide dati: un worker, test in ordine
    workers: 1,
    fullyParallel: false,
    timeout: 90 * 1000,
    expect: { timeout: 15 * 1000 },
    retries: 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL,
        locale: 'it-IT',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
