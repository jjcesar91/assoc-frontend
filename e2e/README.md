# Test end-to-end (Playwright)

Test nel browser (Chromium) di registrazione pubblica, licenze ed email del
Backoffice, eseguiti **solo su dev** (la configurazione rifiuta gli indirizzi
delle produzioni).

## Prima volta

```bash
cd e2e
cp .env.example .env        # e compila E2E_SUPERUSER_PASSWORD
npm install
npx playwright install chromium
```

## Esecuzione

```bash
npm test                    # headless
npm run test:headed         # con il browser visibile
npm run report              # report HTML dell'ultima esecuzione
```

## Cosa verificano

- `01-registrazione`: campi evidenziati, dati conservati dopo un errore,
  maiuscolo (tranne l'email), comune con CAP/provincia collegati e non
  modificabili, assenza della password, campo trappola, Turnstile, CSRF e
  tempo minimo lato server.
- `02-flusso-licenza`: registrazione → login bloccato → attivazione dal
  Backoffice con esito dell'email → imposta password (controlli e ritorno al
  login) → primo accesso con i limiti del piano Free.
- `03-backoffice-email`: destinatari CCN, le tre email, anteprima.

Su dev le email non partono davvero: le intercetta **Mailpit** (pagina
`http://<host-dev>:8025`, credenziali in `E2E_MAILPIT_AUTH`). I test leggono da lì
le tre email (registrazione ricevuta, attivazione, benvenuto) e usano il link
"imposta password" contenuto nell'email di attivazione. `helpers/server.js` usa
SSH per interrogare Mailpit e per cancellare i dati di prova alla fine
(`delete-societa.js`).
