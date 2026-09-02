// Contenuti della sezione FAQ / Guida in-app.
// Struttura di ogni voce (pensata anche per istruire l'assistente AI):
//   - id            : identificatore univoco, stabile nel tempo
//   - domanda       : il quesito così come se lo pone l'utente
//   - percorso      : dove si trova la funzione nel gestionale (breadcrumb di menu)
//   - aCosaServe    : a cosa serve / cosa significa (definizione, scopo)
//   - procedimento  : passi operativi per usarla o per capirla in pratica (array ordinato)
//   - erroriComuni  : errori/fraintendimenti frequenti a cui fare attenzione (array)
//
// Aggiornare questo file (e la costante FAQ_LAST_UPDATE) ad ogni release che introduce
// o modifica funzionalità rilevanti per gli utenti.

export const FAQ_LAST_UPDATE = '2026-08-21';

export const FAQ_CATEGORIES = [
    {
        id: 'soci',
        label: 'Soci',
        items: [
            {
                id: 'soci-iscrizione-vs-tesseramento',
                domanda: 'Che differenza c\'è tra "Iscrizione" e "Tesseramento" nella scheda socio?',
                percorso: 'Soci → apri la scheda di un socio → tab Anagrafica',
                aCosaServe: 'L\'Iscrizione riguarda l\'adesione all\'associazione per l\'anno in corso, il Tesseramento riguarda la tessera (es. affiliazione a un ente/federazione). Sono due stati separati, ciascuno con la propria data di scadenza e i propri colori di stato (REGOLARE, IN SCADENZA, SCADUTO).',
                procedimento: [
                    'Apri la scheda del socio dall\'elenco Soci.',
                    'Nel tab Anagrafica individua la sezione Iscrizione (adesione annuale) e la sezione Tesseramento (tessera/affiliazione), ciascuna con la propria data di scadenza e il proprio stato colorato.',
                    'Se in Configurazione → Società è attiva l\'opzione "Quota associativa e Tesseramento Unico", i due stati vengono fatti coincidere e gestiti come un\'unica cosa.',
                ],
                erroriComuni: [
                    'Aspettarsi che il rinnovo di una delle due scadenze aggiorni automaticamente anche l\'altra, quando l\'opzione "Tesseramento Unico" non è attiva.',
                    'Non controllare quella impostazione prima di segnalare come anomalia il fatto che i due stati non coincidano.',
                ],
            },
            {
                id: 'soci-stati-colore',
                domanda: 'Cosa significano i colori REGOLARE / IN SCADENZA / SCADUTO nell\'elenco soci?',
                percorso: 'Soci → elenco soci (colonna stato) — stesso schema in Scadenziario e Certificato medico',
                aCosaServe: 'Danno un colpo d\'occhio immediato sulla situazione di iscrizione, tesseramento o certificato medico di ogni socio, senza dover aprire la scheda.',
                procedimento: [
                    'Lo stato viene calcolato automaticamente dalla data di scadenza registrata (iscrizione, tesseramento o certificato medico): non è un campo che si imposta manualmente.',
                    'REGOLARE = scadenza lontana, IN SCADENZA = entro la soglia di giorni configurata, SCADUTO = data già passata.',
                    'Lo stesso schema colore è riutilizzato anche nello Scadenzario, per coerenza visiva in tutto il gestionale.',
                ],
                erroriComuni: [
                    'Provare a cambiare direttamente il colore/stato: va invece corretta la data di scadenza da cui è calcolato.',
                    'Non aggiornare la data di scadenza dopo un rinnovo e poi non capire perché il socio risulta ancora IN SCADENZA o SCADUTO.',
                ],
            },
            {
                id: 'soci-iscrizione-senza-ricevuta',
                domanda: 'A cosa serve "Iscrizione senza ricevuta" nel menu Azioni della scheda socio?',
                percorso: 'Soci → apri un socio → menu Azioni → Iscrizione senza ricevuta',
                aCosaServe: 'Registra l\'iscrizione del socio per l\'anno corrente senza generare contestualmente una ricevuta di pagamento: utile ad esempio per iscrizioni gratuite o già contabilizzate altrove.',
                procedimento: [
                    'Apri la scheda del socio e vai nel menu Azioni.',
                    'Seleziona "Iscrizione senza ricevuta": lo stato di iscrizione del socio viene aggiornato per l\'anno corrente.',
                    'Se invece l\'iscrizione richiede anche il movimento contabile/il documento da consegnare al socio, usa "Nuova ricevuta" invece di questa azione.',
                ],
                erroriComuni: [
                    'Usarla per iscrizioni a pagamento: in quel caso non resta traccia contabile del movimento, che va registrato con "Nuova ricevuta".',
                ],
            },
            {
                id: 'soci-revoca-iscrizione',
                domanda: 'Cosa fa "Revoca iscrizione"?',
                percorso: 'Soci → apri un socio → menu Azioni → Revoca iscrizione',
                aCosaServe: 'Annulla l\'iscrizione del socio per l\'anno contabile corrente.',
                procedimento: [
                    'Apri la scheda del socio e vai nel menu Azioni.',
                    'Seleziona "Revoca iscrizione": l\'azione richiede una conferma esplicita perché modifica lo stato del socio.',
                    'Usala solo se l\'iscrizione è stata registrata per errore o il socio ha rinunciato.',
                ],
                erroriComuni: [
                    'Confermarla senza verificare se all\'iscrizione è già collegata una ricevuta: la revoca non elimina automaticamente eventuali ricevute già emesse, che vanno gestite separatamente.',
                ],
            },
            {
                id: 'soci-tab-dinamici',
                domanda: 'Perché la scheda socio mostra tab diversi a seconda del socio?',
                percorso: 'Soci → apri un socio',
                aCosaServe: 'I tab si adattano al tipo di socio, mostrando solo le sezioni pertinenti a quella tipologia.',
                procedimento: [
                    'Se il socio è una "persona fisica" vedi: Anagrafica, Storico, Ricevute, Abbonamenti/Attività, Comunicazioni.',
                    'Se il socio è giuridico (tipo_socio = "associazione") il tab Anagrafica si espande con Associazione e Contatti al posto di Abbonamenti/Attività.',
                ],
                erroriComuni: [
                    'Cercare il tab Abbonamenti/Attività su un socio "associazione": in quel caso non compare, è sostituito da Associazione e Contatti.',
                    'Impostare il tipo socio sbagliato in fase di creazione: cambia l\'intera struttura della scheda, quindi va scelto correttamente da subito.',
                ],
            },
            {
                id: 'soci-certificato-medico',
                domanda: 'Come viene calcolato lo stato del certificato medico?',
                percorso: 'Soci → apri un socio → tab Anagrafica → Certificato medico',
                aCosaServe: 'Segnala in automatico se il certificato medico del socio è ancora valido, in scadenza o scaduto.',
                procedimento: [
                    'Inserisci nella scheda socio la data di scadenza del certificato medico.',
                    'Lo stato (VALIDO / IN SCADENZA / SCADUTO) viene calcolato da quella data, con la stessa logica a soglie usata per iscrizione e tesseramento.',
                ],
                erroriComuni: [
                    'Dimenticare di aggiornare la data dopo un nuovo certificato: lo stato resta SCADUTO finché la data non viene modificata.',
                ],
            },
            {
                id: 'soci-accesso-frontend',
                domanda: 'Cosa fa l\'opzione "Accesso Frontend" nella scheda socio?',
                percorso: 'Soci → apri un socio → tab Anagrafica → Accesso Frontend',
                aCosaServe: 'Abilita per quel socio il login all\'Area Soci, il portale riservato dove può vedere abbonamenti, corsi, ricevute e acquistare prodotti nel Negozio.',
                procedimento: [
                    'Apri la scheda del socio, tab Anagrafica, sezione Accesso Frontend.',
                    'Attiva l\'opzione: al socio viene collegato/creato l\'accesso legato alla sua email.',
                    'Senza questa opzione attiva, il socio non può accedere con le proprie credenziali all\'Area Soci.',
                ],
                erroriComuni: [
                    'Attivare l\'accesso senza che il socio abbia un\'email valida in anagrafica: l\'accesso è legato proprio all\'indirizzo email.',
                    'Non ricordare che, se la stessa email è socio in più società, l\'accesso vale per tutte e il socio passa da una all\'altra dall\'Area Soci.',
                ],
            },
            {
                id: 'soci-codice-fiscale-errore',
                domanda: 'Perché il sistema segnala errori sul codice fiscale del socio?',
                percorso: 'Soci → apri/crea un socio → tab Anagrafica → Codice Fiscale',
                aCosaServe: 'Il codice fiscale viene calcolato/validato automaticamente da nome, cognome, data e luogo di nascita, per evitare di registrare codici fiscali errati o incoerenti.',
                procedimento: [
                    'Compila nome, cognome, data e luogo di nascita del socio.',
                    'Se compare un messaggio come "Il CF non corrisponde al Cognome/Nome" o "Carattere di controllo errato", verifica prima questi dati anagrafici.',
                    'Ricalcola/reinserisci il codice fiscale dopo aver corretto i dati anagrafici.',
                ],
                erroriComuni: [
                    'Correggere manualmente il codice fiscale senza sistemare prima i dati anagrafici da cui deriva: l\'errore si ripresenterà.',
                    'Ignorare l\'avviso pensando sia solo estetico: segnala un\'incoerenza reale tra CF e dati anagrafici.',
                ],
            },
            {
                id: 'soci-import-export',
                domanda: 'Posso importare/esportare l\'elenco soci in Excel?',
                percorso: 'Soci → elenco soci → menu delle azioni in alto (Importa Excel / Importa CSV Odoo / Esporta)',
                aCosaServe: 'Permette di scaricare o caricare in massa l\'anagrafica soci, invece di inserire i soci uno per uno.',
                procedimento: [
                    'Per esportare: usa "Esporta" (elenco completo) oppure l\'export "template", pensato apposta per essere ricompilato e reimportato senza errori di formato.',
                    'Per importare: usa "Importa Excel" per file generici, oppure "Importa CSV Odoo" per un file nel formato di export di Odoo (visibile solo ai Superuser).',
                    'Al termine dell\'import controlla il riepilogo (righe create/saltate/errori) prima di considerare l\'operazione conclusa.',
                ],
                erroriComuni: [
                    'Modificare le intestazioni delle colonne nel file esportato "template": il reimport si basa su quelle intestazioni per riconoscere i campi.',
                    'Cercare "Importa CSV Odoo" con un utente non Superuser: la voce è nascosta a chi non ha quel ruolo.',
                ],
            },
            {
                id: 'soci-etichette',
                domanda: 'A cosa servono le etichette (tag) dei soci?',
                percorso: 'Soci → elenco soci → colonna Etichette / filtro di ricerca',
                aCosaServe: 'Permettono di classificare liberamente i soci (es. per gruppo, categoria, caratteristica) e di usarle come filtro rapido nella ricerca.',
                procedimento: [
                    'Assegna una o più etichette al socio dalla sua scheda.',
                    'Nell\'elenco Soci usa il selettore a chip con autocomplete per filtrare rapidamente per etichetta.',
                ],
                erroriComuni: [
                    'Creare etichette molto simili tra loro (es. per un refuso di battitura) che poi rendono meno efficace il filtro.',
                ],
            },
        ],
    },
    {
        id: 'contabilita',
        label: 'Contabilità',
        items: [
            {
                id: 'contabilita-prima-nota-vs-ricevute',
                domanda: 'Che differenza c\'è tra Prima Nota e Ricevute?',
                percorso: 'Contabilità → Prima Nota  •  Ricevute → Lista ricevute',
                aCosaServe: 'La Prima Nota registra i movimenti contabili liberi dell\'associazione (entrate e uscite non necessariamente legate a un socio, es. spese, bonifici). Le Ricevute registrano invece i pagamenti dei soci (quote, iscrizioni, prodotti) e generano il documento da consegnare al socio.',
                procedimento: [
                    'Per un movimento generico dell\'associazione (spesa, bonifico, entrata non legata a un socio) usa Contabilità → Prima Nota.',
                    'Per un pagamento di un socio che deve generare un documento da consegnargli, usa Ricevute → Nuova ricevuta.',
                ],
                erroriComuni: [
                    'Registrare il pagamento di un socio solo in Prima Nota: non genera il documento ricevuta da consegnargli.',
                    'Registrare una spesa dell\'associazione come ricevuta: le Ricevute sono pensate per gli incassi dai soci, non per le uscite generiche.',
                ],
            },
            {
                id: 'contabilita-riga-annullato',
                domanda: 'Perché in Prima Nota vedo righe barrate con stato "ANNULLATO"?',
                percorso: 'Contabilità → Prima Nota',
                aCosaServe: 'Segnalano un movimento annullato, mantenuto visibile per tracciabilità storica ma escluso dai conteggi.',
                procedimento: [
                    'Una riga il cui stato pagamento inizia con "3." è stata annullata.',
                    'Resta visibile nell\'elenco (barrata) per la storia del movimento, ma non viene conteggiata nei totali/bilancio come movimento valido.',
                ],
                erroriComuni: [
                    'Pensare che una riga barrata sia stata eliminata: è solo annullata, resta nello storico e va distinta dall\'eliminazione vera e propria.',
                    'Includere per errore queste righe in verifiche manuali dei totali, dimenticando che il sistema le esclude già dal bilancio.',
                ],
            },
            {
                id: 'contabilita-bilancio-vuoto',
                domanda: 'Perché il tab "Bilancio" della Contabilità è vuoto o mostra un avviso?',
                percorso: 'Contabilità → Prima Nota → tab Bilancio',
                aCosaServe: 'Il tab Bilancio riepiloga i movimenti in base al piano dei conti (Gruppi e Sottogruppi) configurato.',
                procedimento: [
                    'Se non hai ancora creato Gruppi/Sottogruppi, il sistema mostra l\'avviso "Nessun gruppo configurato".',
                    'Vai in Contabilità → Gruppi/Sottogruppi e crea almeno un gruppo prima di usare il tab Bilancio.',
                ],
                erroriComuni: [
                    'Registrare movimenti in Prima Nota senza prima aver configurato Gruppi/Sottogruppi: il Bilancio resta vuoto finché non lo fai.',
                ],
            },
            {
                id: 'contabilita-gruppi-sottogruppi',
                domanda: 'Come funzionano Gruppi e Sottogruppi?',
                percorso: 'Contabilità → Gruppi/Sottogruppi',
                aCosaServe: 'È il piano dei conti a due livelli usato per classificare i movimenti contabili ai fini del Bilancio.',
                procedimento: [
                    'Crea un Gruppo scegliendo il tipo: Entrata, Uscita o Entrata-Uscita (con una "Sezione" opzionale).',
                    'Crea uno o più Sottogruppi agganciati a quel gruppo genitore.',
                    'Il codice identificativo di ciascuno è generato automaticamente e non è modificabile.',
                ],
                erroriComuni: [
                    'Provare a eliminare le voci predefinite contrassegnate da un lucchetto: non è consentito, sono voci di sistema.',
                    'Cercare di modificare manualmente il codice identificativo: viene generato automaticamente.',
                ],
            },
            {
                id: 'contabilita-conto-predefinito',
                domanda: 'A cosa serve impostare un "Conto predefinito"?',
                percorso: 'Configurazione → Conti',
                aCosaServe: 'Velocizza l\'inserimento dei pagamenti proponendo automaticamente una cassa/conto di destinazione.',
                procedimento: [
                    'Vai in Configurazione → Conti.',
                    'Sul conto che vuoi usare come predefinito, usa il pulsante "Imposta come predefinito" (compare un badge verde nell\'elenco).',
                    'Puoi cambiarlo in qualsiasi momento ripetendo l\'operazione su un altro conto.',
                ],
                erroriComuni: [
                    'Dimenticare di cambiarlo dopo aver aperto un nuovo conto/cassa principale: i nuovi pagamenti continuano a proporre il vecchio conto predefinito finché non lo aggiorni.',
                ],
            },
            {
                id: 'contabilita-scadenzario-stati',
                domanda: 'Come si "paga" una scadenza nello Scadenzario?',
                percorso: 'Scadenziario → dettaglio scadenza → azione Paga',
                aCosaServe: 'Registra il pagamento di una rata/scadenza collegandolo automaticamente a una ricevuta.',
                procedimento: [
                    'Apri il dettaglio della scadenza nello Scadenzario.',
                    'Usa l\'azione "Paga": il pagamento viene collegato a una ricevuta generata contestualmente.',
                    'Nel dettaglio compaiono poi data, operatore, numero e data della ricevuta generata; lo stato della rata passa da IN SCADENZA/SCADUTO a pagata.',
                ],
                erroriComuni: [
                    'Registrare il pagamento altrove (es. solo in Prima Nota) senza usare l\'azione "Paga" dello Scadenzario: la rata non risulterà collegata alla ricevuta e resterà segnata come non pagata.',
                ],
            },
            {
                id: 'contabilita-anno-contabile-tipi',
                domanda: 'Che tipi di Anno Contabile posso scegliere?',
                percorso: 'Configurazione → Anno contabile',
                aCosaServe: 'Determina come vengono raggruppati iscrizioni, ricevute e scadenze per "anno" all\'interno del gestionale.',
                procedimento: [
                    'Solare: 1 gennaio - 31 dicembre.',
                    'Sportivo/associativo: 1 settembre - 31 agosto.',
                    'Personalizzato: con data di inizio libera, scelta da te.',
                ],
                erroriComuni: [
                    'Scegliere il tipo senza considerare che, dopo la prima ricevuta emessa nell\'anno, non sarà più modificabile (vedi FAQ dedicata).',
                ],
            },
            {
                id: 'contabilita-anno-contabile-bloccato',
                domanda: 'Perché non riesco più a modificare il tipo di Anno Contabile?',
                percorso: 'Configurazione → Anno contabile',
                aCosaServe: 'Il blocco garantisce la coerenza della numerazione delle ricevute e dei periodi già contabilizzati.',
                procedimento: [
                    'Il campo si blocca automaticamente non appena viene emessa la prima ricevuta nell\'anno.',
                    'Compare il messaggio "Modifica non consentita... per garantire la coerenza della numerazione delle ricevute".',
                    'Se serve davvero cambiarlo, valuta la situazione prima di emettere ricevute nel nuovo anno contabile.',
                ],
                erroriComuni: [
                    'Provare a forzare la modifica dopo aver già emesso ricevute: creerebbe incongruenze nella numerazione e nei periodi già contabilizzati, per questo il sistema lo impedisce.',
                ],
            },
            {
                id: 'contabilita-fornitori',
                domanda: 'A cosa serve l\'anagrafica Fornitori?',
                percorso: 'Contabilità → Fornitori',
                aCosaServe: 'Censisce i fornitori dell\'associazione così da poterli associare rapidamente ai movimenti di spesa in Prima Nota.',
                procedimento: [
                    'Crea il fornitore in Contabilità → Fornitori.',
                    'Quando registri una spesa in Prima Nota, associala al fornitore già censito invece di reinserire i dati ogni volta.',
                ],
                erroriComuni: [
                    'Creare più schede fornitore leggermente diverse per lo stesso fornitore (es. ragione sociale scritta in modo diverso): rende meno utile la ricerca/riutilizzo.',
                ],
            },
        ],
    },
    {
        id: 'ricevute-pagamenti',
        label: 'Ricevute e Pagamenti',
        items: [
            {
                id: 'ricevute-vs-proforma',
                domanda: 'Che differenza c\'è tra Ricevuta e Proforma?',
                percorso: 'Ricevute → Lista ricevute (colonna Stato)',
                aCosaServe: 'La Proforma è un documento preliminare, non fiscale, generato prima o in attesa del pagamento effettivo; la Ricevuta è il documento definitivo emesso a fronte del pagamento confermato.',
                procedimento: [
                    'Genera la Proforma quando il pagamento non è ancora confermato (es. in attesa di bonifico).',
                    'Nell\'elenco Ricevute, controlla la colonna dedicata allo stato per distinguere le due situazioni.',
                    'Quando il pagamento è confermato, il documento diventa/viene sostituito dalla Ricevuta definitiva.',
                ],
                erroriComuni: [
                    'Consegnare una Proforma al socio come se fosse il documento fiscale definitivo.',
                ],
            },
            {
                id: 'ricevute-annulla-vs-elimina',
                domanda: 'Che differenza c\'è tra "Annulla" ed "Elimina" su una ricevuta?',
                percorso: 'Ricevute → Lista ricevute → azioni sulla riga',
                aCosaServe: '"Annulla" cambia lo stato del pagamento mantenendo la ricevuta visibile nello storico; "Elimina" cancella fisicamente il record.',
                procedimento: [
                    'Usa "Annulla" quando vuoi mantenere traccia storica: lo stato diventa uno stato che inizia con "3." e la ricevuta resta visibile ma esclusa dai conteggi validi.',
                    'Usa "Elimina" solo per correggere un errore di inserimento senza alcun valore storico da conservare: il record viene cancellato definitivamente.',
                ],
                erroriComuni: [
                    'Eliminare una ricevuta reale (es. già consegnata al socio) invece di annullarla: si perde la tracciabilità storica del movimento.',
                    'Confondere una riga "annullata" (barrata, ancora visibile) con una eliminata (non più presente in elenco).',
                ],
            },
            {
                id: 'ricevute-invio-email-disabilitato',
                domanda: 'Perché il pulsante "Invia email" è disabilitato su una ricevuta?',
                percorso: 'Ricevute → Lista ricevute → icona Invia email',
                aCosaServe: 'Protegge da tentativi di invio falliti, mostrando subito quando l\'invio non è possibile.',
                procedimento: [
                    'L\'invio email è disponibile solo se la ricevuta è collegata a un socio con un indirizzo email registrato e in formato valido.',
                    'Se il pagamento non è associato a nessun socio (es. vendita generica) o il socio non ha email valida, l\'icona resta disabilitata/grigia.',
                    'Per abilitarla: apri la scheda del socio e inserisci/correggi l\'indirizzo email in Anagrafica.',
                ],
                erroriComuni: [
                    'Aspettarsi di poter comunque inviare e ricevere solo un errore dopo il click: dalla versione attuale il pulsante è già disabilitato in anticipo proprio per evitare questo.',
                    'Dimenticare di controllare anche l\'email collegata all\'account utente del socio, non solo quella sulla scheda socio: il sistema usa la prima disponibile tra le due.',
                ],
            },
            {
                id: 'ricevute-badge-autoemessa',
                domanda: 'Cosa significa il badge "Ricevuta creata dal socio dall\'area riservata"?',
                percorso: 'Ricevute → Lista ricevute (badge sulla riga)',
                aCosaServe: 'Indica che la ricevuta è nata da un acquisto self-service del socio, non da un\'operazione manuale dello staff.',
                procedimento: [
                    'Il badge compare quando la ricevuta è stata generata automaticamente da un acquisto nel Negozio dell\'Area Soci.',
                    'Se il badge non compare, la ricevuta è stata creata da un operatore staff dal gestionale.',
                ],
                erroriComuni: [
                    'Modificare/annullare una ricevuta con questo badge senza considerare che corrisponde a un ordine reale già effettuato dal socio online.',
                ],
            },
            {
                id: 'ricevute-pagamento-veloce',
                domanda: 'Che cos\'è il "Pagamento veloce" e a cosa serve Carica Quietanza?',
                percorso: 'Ricevute → Pagamento veloce / Carica Quietanza',
                aCosaServe: 'Il Pagamento veloce registra rapidamente un incasso senza passare per il flusso completo di creazione ricevuta; Carica Quietanza allega la scansione/foto della ricevuta cartacea originale.',
                procedimento: [
                    'Usa "Pagamento veloce" quando vuoi registrare un incasso con il minor numero di passaggi possibile.',
                    'Usa "Carica Quietanza" per allegare al pagamento la scansione/foto del documento cartaceo originale, a scopo di archiviazione/prova.',
                ],
                erroriComuni: [
                    'Usare il Pagamento veloce quando servono invece tutti i dettagli del flusso completo (es. collegamento a prodotto/abbonamento specifico): in quel caso conviene "Nuova ricevuta".',
                ],
            },
            {
                id: 'ricevute-footer',
                domanda: 'Dove modifico il testo che compare in fondo alle ricevute stampate?',
                percorso: 'Ricevute → Footer',
                aCosaServe: 'Imposta il testo che appare in calce a ogni ricevuta, ad esempio diciture fiscali come "Fuori campo IVA art. 4...".',
                procedimento: [
                    'Vai in Ricevute → Footer.',
                    'Scrivi/modifica il testo del footer: si applica a tutte le ricevute stampate successivamente.',
                ],
                erroriComuni: [
                    'Cercare questo testo nel Footer di Modulistica: è un testo distinto, dedicato solo alle ricevute (vedi FAQ dedicata sulla differenza tra i due Footer).',
                ],
            },
            {
                id: 'ricevute-import-odoo',
                domanda: 'Posso importare ricevute da un altro gestionale?',
                percorso: 'Ricevute → Importa da Odoo (solo Superuser) / Importa ricevute',
                aCosaServe: 'Permette di popolare massivamente le ricevute a partire da un export di un altro sistema, invece di reinserirle a mano.',
                procedimento: [
                    'Per un file nel formato di export di Odoo, usa "Importa da Odoo".',
                    'Per un\'importazione massiva di movimenti di Prima Nota o di singole voci ricevuta da file, usa "Importa ricevute".',
                ],
                erroriComuni: [
                    '"Importa da Odoo" è visibile solo agli utenti Superuser: se non la vedi, non è un errore ma una restrizione di ruolo.',
                ],
            },
        ],
    },
    {
        id: 'comunicazioni-ricevute',
        label: 'Comunicazioni sulle Ricevute',
        items: [
            {
                id: 'ricevute-comunicazioni-modalita',
                domanda: 'Cosa cambia tra le modalità "Non attiva", "Chiedi" e "Automatica" per l\'invio email ricevute?',
                percorso: 'Configurazione → Comunicazioni',
                aCosaServe: 'Controllano se e come viene inviata automaticamente l\'email al socio quando viene generata una Proforma o confermato un pagamento.',
                procedimento: [
                    '"Non attiva": nessuna email viene inviata.',
                    '"Chiedi": prima di inviare, il sistema chiede conferma all\'operatore.',
                    '"Automatica": l\'email parte da sola non appena la ricevuta/proforma viene generata.',
                    'Configura le due modalità separatamente per Proforma e per Pagamento confermato, perché spesso si vuole automatizzare solo una delle due.',
                ],
                erroriComuni: [
                    'Impostare "Automatica" su entrambe senza aver prima verificato/personalizzato oggetto e testo delle email (vedi FAQ shortcode).',
                    'Aspettarsi che la modalità scelta per la Proforma valga anche per il Pagamento confermato: sono due impostazioni indipendenti.',
                ],
            },
            {
                id: 'ricevute-comunicazioni-shortcode',
                domanda: 'Posso personalizzare oggetto e testo delle email di ricevuta?',
                percorso: 'Configurazione → Comunicazioni → editor oggetto/testo',
                aCosaServe: 'Permette di scrivere email personalizzate che includono automaticamente i dati reali del pagamento (es. nome socio, numero ricevuta).',
                procedimento: [
                    'Vai in Configurazione → Comunicazioni.',
                    'Modifica oggetto e corpo del messaggio usando gli shortcode disponibili (es. nome socio, numero ricevuta).',
                    'Gli shortcode vengono sostituiti automaticamente con i dati reali al momento dell\'invio.',
                ],
                erroriComuni: [
                    'Scrivere uno shortcode in un formato diverso da quello previsto dall\'editor: in quel caso non viene riconosciuto e compare come testo letterale nell\'email inviata.',
                ],
            },
        ],
    },
    {
        id: 'corsi-attivita',
        label: 'Corsi e Attività',
        items: [
            {
                id: 'corsi-abbonamento-obbligatorio',
                domanda: 'Perché non riesco a salvare un corso senza selezionare un Abbonamento?',
                percorso: 'Attività → Calendario → scheda corso → tab Impostazioni',
                aCosaServe: 'L\'Abbonamento è il prodotto che definisce prezzo e tipologia di iscrizione al corso: senza di esso il sistema non saprebbe cosa addebitare agli iscritti.',
                procedimento: [
                    'Apri/crea il corso da Attività → Calendario.',
                    'Nel tab Impostazioni della scheda corso, seleziona l\'Abbonamento collegato (obbligatorio).',
                    'Se l\'Abbonamento giusto non esiste ancora, crealo prima in Prodotti.',
                ],
                erroriComuni: [
                    'Provare a creare il corso prima di aver creato in Prodotti l\'Abbonamento da collegargli.',
                ],
            },
            {
                id: 'corsi-generazione-date',
                domanda: 'Come vengono generate le date delle lezioni di un corso?',
                percorso: 'Attività → Calendario → scheda corso → tab Impostazioni',
                aCosaServe: 'Genera automaticamente il calendario delle lezioni, evitando di inserirle una per una.',
                procedimento: [
                    'Nel tab Impostazioni del corso, imposta il/i giorno/i della settimana e gli orari delle lezioni.',
                    'Il sistema genera automaticamente il calendario delle singole lezioni per tutto il periodo del corso.',
                ],
                erroriComuni: [
                    'Cambiare giorni/orari a corso già iniziato senza verificare l\'effetto sulle lezioni/presenze già generate.',
                ],
            },
            {
                id: 'corsi-iscrizione-tardiva',
                domanda: 'Un socio può iscriversi a un corso già iniziato?',
                percorso: 'Attività → Calendario → scheda corso → Iscrizione tardiva',
                aCosaServe: 'Permette di aggiungere un iscritto a un corso già avviato, gestendo correttamente decorrenza e conteggio di lezioni/presenze.',
                procedimento: [
                    'Apri la scheda del corso già iniziato.',
                    'Usa la funzione di iscrizione tardiva dedicata invece della normale iscrizione.',
                    'Il sistema calcola correttamente decorrenza e conteggio delle lezioni/presenze rispetto agli altri iscritti già presenti.',
                ],
                erroriComuni: [
                    'Usare l\'iscrizione normale invece di quella tardiva su un corso già iniziato: rischia di non allineare correttamente decorrenza e presenze.',
                ],
            },
            {
                id: 'corsi-tab-presenze',
                domanda: 'Come funziona il registro presenze di un corso?',
                percorso: 'Attività → Calendario → scheda corso → tab Presenze',
                aCosaServe: 'Registra le presenze giorno per giorno e produce un foglio presenze stampabile.',
                procedimento: [
                    'Apri il tab Presenze della scheda corso.',
                    'Segna le presenze giorno per giorno in base al calendario lezioni generato.',
                    'Stampa il "Foglio presenze" mensile, pronto per essere usato come registro cartaceo.',
                ],
                erroriComuni: [
                    'Segnare le presenze su una data non presente nel calendario lezioni generato dal corso: verifica prima che il calendario sia corretto (vedi FAQ generazione date).',
                ],
            },
            {
                id: 'corsi-strutture-aree',
                domanda: 'Che differenza c\'è tra Strutture e Aree?',
                percorso: 'Attività → Strutture',
                aCosaServe: 'Le Strutture sono le sedi/impianti dell\'associazione; le Aree sono i sotto-spazi al loro interno (es. singoli campi o sale).',
                procedimento: [
                    'Crea prima la Struttura (sede/impianto).',
                    'Aggiungi una o più Aree al suo interno (es. campo 1, campo 2, sala corsi).',
                    'L\'elenco Strutture mostra quante aree sono state censite per ciascuna sede.',
                ],
                erroriComuni: [
                    'Creare una Area senza aver prima creato la Struttura a cui appartiene.',
                ],
            },
            {
                id: 'corsi-calendario-scadenze',
                domanda: 'A cosa servono le icone "Soci in scadenza" e "Soci scaduti" nel Calendario?',
                percorso: 'Attività → Calendario',
                aCosaServe: 'Sono scorciatoie per contattare rapidamente gli iscritti a un corso/attività la cui iscrizione, tesseramento o certificato medico sta per scadere o è già scaduto.',
                procedimento: [
                    'Apri Attività → Calendario.',
                    'Clicca l\'icona "Soci in scadenza" o "Soci scaduti" sul corso/attività desiderato.',
                    'Si apre direttamente l\'elenco degli iscritti con quella situazione, per contattarli.',
                ],
                erroriComuni: [],
            },
            {
                id: 'corsi-staff-tecnici',
                domanda: 'Dove gestisco l\'anagrafica di istruttori/tecnici?',
                percorso: 'Attività → Staff',
                aCosaServe: 'Censisce tecnici/istruttori dell\'associazione, distinguendo il personale attivo da quello non più in servizio.',
                procedimento: [
                    'Vai in Attività → Staff.',
                    'Usa il filtro "Attualmente impiegato" per vedere solo il personale attivo.',
                ],
                erroriComuni: [
                    'Eliminare la scheda di un tecnico non più in servizio invece di deselezionare "Attualmente impiegato": si perderebbe lo storico collegato.',
                ],
            },
        ],
    },
    {
        id: 'prodotti-negozio',
        label: 'Prodotti e Negozio Soci',
        items: [
            {
                id: 'prodotti-tipologie',
                domanda: 'Che differenza c\'è tra le tipologie di Prodotto (Prodotto generico, Quota periodica, Abbonamento, Iscrizione, Scadenzario)?',
                percorso: 'Prodotti → nuovo/modifica prodotto → campo Tipologia',
                aCosaServe: 'La tipologia determina come il pagamento viene trattato nel resto del gestionale (bilancio, scadenze, iscrizioni).',
                procedimento: [
                    'Prodotto generico: articolo/servizio da vendere senza logiche particolari.',
                    'Quota periodica / Abbonamento: pensati per pagamenti ricorrenti (es. mensilità, corsi).',
                    'Iscrizione: prodotto legato all\'adesione annuale del socio.',
                    'Scadenzario: genera automaticamente un piano di rate/scadenze future collegato al prodotto.',
                ],
                erroriComuni: [
                    'Scegliere "Prodotto generico" per una quota che dovrebbe generare uno Scadenzario di rate: le scadenze non verrebbero create automaticamente.',
                ],
            },
            {
                id: 'prodotti-visibilita-vendibile',
                domanda: 'Cosa cambia tra i flag "Visibile/Obsoleto" e "Vendibile online" di un prodotto?',
                percorso: 'Prodotti → scheda prodotto',
                aCosaServe: 'Sono due controlli indipendenti: uno decide se il prodotto è ancora selezionabile nel gestionale, l\'altro se compare nel Negozio online.',
                procedimento: [
                    'Imposta "Obsoleto" quando un prodotto non deve più essere selezionabile per nuove vendite (resta comunque nello storico).',
                    'Imposta/rimuovi "Vendibile online" per decidere, indipendentemente dal punto precedente, se il prodotto compare nel Negozio dell\'Area Soci per l\'acquisto self-service.',
                ],
                erroriComuni: [
                    'Pensare che rendere un prodotto "Obsoleto" lo tolga automaticamente anche dal Negozio online, o viceversa: sono due flag distinti da controllare entrambi.',
                ],
            },
            {
                id: 'negozio-socio-acquisto',
                domanda: 'Come funziona l\'acquisto di un prodotto dal Negozio dell\'Area Soci?',
                percorso: 'Area Soci → Negozio (lato socio)',
                aCosaServe: 'Permette al socio di acquistare prodotti in autonomia, senza passare da un operatore.',
                procedimento: [
                    'Il socio vede l\'elenco dei prodotti disponibili per l\'acquisto online (quelli con "Vendibile online" attivo).',
                    'Li aggiunge al carrello, con un campo note per eventuali indicazioni all\'associazione.',
                    'Conferma l\'acquisto: riceve conferma "Ricevuta registrata" e la ricevuta viene generata automaticamente lato gestionale.',
                ],
                erroriComuni: [
                    'Aspettarsi che un prodotto compaia nel Negozio se non ha il flag "Vendibile online" attivo (vedi FAQ dedicata).',
                ],
            },
        ],
    },
    {
        id: 'staff-utenti-permessi',
        label: 'Utenti, Staff e Permessi',
        items: [
            {
                id: 'utenti-ruoli',
                domanda: 'Che ruoli utente esistono nel gestionale?',
                percorso: 'Amministrazione → Utenti',
                aCosaServe: 'Definiscono il livello di accesso di ciascun operatore al gestionale.',
                procedimento: [
                    'Utente: accesso operativo standard.',
                    'Amministratore: accesso più ampio, incluse le impostazioni della società.',
                    'Superuser: gestione multi-società e parametri riservati (amministrazione delle società, parametri SMTP, import da Odoo).',
                ],
                erroriComuni: [
                    'Assegnare il ruolo Superuser per abitudine anche quando basterebbe Amministratore: espone funzioni riservate (multi-società, SMTP) non necessarie a quell\'operatore.',
                ],
            },
            {
                id: 'utenti-impersona',
                domanda: 'A cosa serve la funzione "Impersona" nell\'elenco Utenti?',
                percorso: 'Amministrazione → Utenti → azione Impersona',
                aCosaServe: 'Permette a un amministratore di accedere temporaneamente con le credenziali/permessi di un altro utente, per verificare cosa vede o risolvere un problema segnalato.',
                procedimento: [
                    'Dall\'elenco Utenti, usa l\'azione "Impersona" sull\'utente interessato.',
                    'Il ruolo e i permessi correnti dell\'amministratore vengono salvati.',
                    'Usa "Torna al tuo account" per tornare al proprio account con i permessi originali.',
                ],
                erroriComuni: [
                    'Dimenticare di usare "Torna al tuo account" e continuare a operare con i permessi dell\'utente impersonato.',
                ],
            },
            {
                id: 'utenti-funzionalita-vs-ruolo',
                domanda: 'Che differenza c\'è tra i permessi di ruolo e la voce "Funzionalità" di un utente?',
                percorso: 'Amministrazione → Utenti → scheda utente → Funzionalità',
                aCosaServe: 'Il ruolo definisce l\'accesso di base; "Funzionalità" permette di restringere in modo granulare, per singolo utente, quali voci di menu può vedere.',
                procedimento: [
                    'Il ruolo (Utente/Amministratore/Superuser) definisce l\'accesso di base (es. un Amministratore vede tutto il menu tranne l\'Amministrazione riservata al Superuser).',
                    'Se il campo "Funzionalità" dell\'utente non è configurato (valore nullo), l\'utente vede tutto il menu previsto dal suo ruolo.',
                    'Se è configurato, l\'utente vede solo le voci esplicitamente incluse in quella lista.',
                ],
                erroriComuni: [
                    'Impostare "Funzionalità" per limitare l\'accesso e poi dimenticare di includere una voce che l\'utente dovrebbe comunque vedere.',
                ],
            },
            {
                id: 'utenti-reset-password',
                domanda: 'Come faccio a reimpostare la password di un altro utente?',
                percorso: 'Amministrazione → Utenti → azione Reimposta password',
                aCosaServe: 'Permette di sbloccare un utente che non riesce ad accedere, senza che debba gestirsela da solo.',
                procedimento: [
                    'Dall\'elenco Utenti, individua la riga dell\'utente interessato.',
                    'Usa l\'azione "Reimposta password" su quella riga.',
                ],
                erroriComuni: [],
            },
        ],
    },
    {
        id: 'automazioni',
        label: 'Automazioni',
        items: [
            {
                id: 'automazioni-cosa-fanno',
                domanda: 'Cosa fanno le Automazioni?',
                percorso: 'Configurazione → Automazioni',
                aCosaServe: 'Inviano comunicazioni automatiche in prossimità di una scadenza (tesseramento, certificato medico, ecc.), senza bisogno di intervento manuale.',
                procedimento: [
                    'Crea/modifica una regola di automazione in Configurazione → Automazioni.',
                    'Imposta il numero di "Giorni di anticipo" con cui deve partire la comunicazione.',
                    'Per le scadenze fisse annuali, compila anche i campi giorno/mese dedicati.',
                ],
                erroriComuni: [
                    'Impostare "Giorni di anticipo" a 0 pensando invii la comunicazione il giorno stesso della scadenza per tutti i casi: verifica sempre il comportamento con la FAQ sui log invii.',
                ],
            },
            {
                id: 'automazioni-ets-point',
                domanda: 'Perché non vedo la sezione "ETS Point" in Automazioni?',
                percorso: 'Configurazione → Anagrafica (voce "Gestore ETS Point", solo Superuser) → Configurazione → Automazioni',
                aCosaServe: 'La sezione "ETS Point" raggruppa le automazioni sugli adempimenti tipici di un Ente del Terzo Settore (organo di amministrazione, documento del presidente, bilancio, RUNTS, contributi pubblici, CU, attività didattiche): è visibile solo per le società che usano effettivamente questo servizio.',
                procedimento: [
                    'Un Superuser deve attivare la voce "Gestore ETS Point" in Configurazione → Anagrafica per quella società (disattivata di default).',
                    'Una volta attivata, la sezione "ETS Point" compare in Configurazione → Automazioni insieme alla sezione "Associazioni".',
                ],
                erroriComuni: [
                    'Cercare la voce "Gestore ETS Point" da un utente Amministratore: è visibile e modificabile solo dai Superuser.',
                    'Aspettarsi che le automazioni ETS Point partano anche a sezione nascosta: finché "Gestore ETS Point" non è attivo, quelle automazioni non sono applicabili e non inviano email, non solo nascoste in UI.',
                ],
            },
            {
                id: 'automazioni-log',
                domanda: 'Come verifico se un\'automazione ha effettivamente inviato le comunicazioni?',
                percorso: 'Configurazione → Automazioni → tabella log invii',
                aCosaServe: 'Dà visibilità e tracciabilità su cosa è stato effettivamente inviato dalle regole di automazione.',
                procedimento: [
                    'Vai in Configurazione → Automazioni.',
                    'Sotto l\'elenco delle regole, apri la tabella dei log invii.',
                    'Filtra per Tipo automazione e Data, poi controlla la colonna "Esito" per ogni invio effettuato.',
                ],
                erroriComuni: [
                    'Presumere che una regola non abbia funzionato solo perché il socio non ha ricevuto l\'email, senza controllare prima l\'Esito nei log (potrebbe indicare un errore di invio, es. email mancante).',
                ],
            },
            {
                id: 'automazioni-non-applicabile',
                domanda: 'Perché alcune automazioni mostrano "Non applicabile per questa società" o "Gestito per singolo socio"?',
                percorso: 'Configurazione → Automazioni',
                aCosaServe: 'Segnalano che quella specifica automazione non è globale per l\'associazione.',
                procedimento: [
                    '"Non applicabile per questa società": dipende da un\'impostazione non attiva per quella società specifica.',
                    '"Gestito per singolo socio": viene configurata e attivata a livello di singolo socio anziché come regola generale.',
                ],
                erroriComuni: [
                    'Cercare di attivare a livello globale un\'automazione che va invece configurata sulla singola scheda socio.',
                ],
            },
        ],
    },
    {
        id: 'societa-impostazioni',
        label: 'Società e Configurazione',
        items: [
            {
                id: 'societa-dove-modificare-alias',
                domanda: 'Dove modifico l\'alias mittente di email/SMS?',
                percorso: 'Configurazione → Anagrafica Società  •  Configurazione → Comunicazioni (Parametri SMTP, solo Superuser)',
                aCosaServe: 'L\'alias identifica il mittente delle comunicazioni inviate ai soci.',
                procedimento: [
                    'In Configurazione → Anagrafica Società trovi il dato anagrafico generale.',
                    'In Configurazione → Comunicazioni (Parametri SMTP, riservato ai Superuser) trovi l\'alias legato alla configurazione tecnica di invio.',
                    'Se non vedi coerenza tra i due, verifica entrambi i punti.',
                ],
                erroriComuni: [
                    'Modificare l\'alias in un solo punto aspettandosi che si aggiorni anche nell\'altro: sono due campi distinti.',
                ],
            },
            {
                id: 'societa-parametri-smtp',
                domanda: 'A cosa servono i Parametri SMTP in Comunicazioni Società?',
                percorso: 'Configurazione → Comunicazioni (Parametri SMTP) — solo Superuser',
                aCosaServe: 'Configurano il server email effettivamente usato per inviare le comunicazioni.',
                procedimento: [
                    'Vai in Configurazione → Comunicazioni (visibile solo agli utenti Superuser).',
                    'Compila Host, Porta, Utente, Password e l\'alias mittente.',
                ],
                erroriComuni: [
                    'Cercare questa sezione con un utente Amministratore non Superuser: è nascosta, non è un errore di configurazione.',
                ],
            },
            {
                id: 'societa-logo',
                domanda: 'Come cambio il logo che appare sui documenti stampati?',
                percorso: 'Configurazione → Società',
                aCosaServe: 'Aggiorna il logo usato nei documenti generati dal gestionale (ricevute, modulistica, ecc.).',
                procedimento: [
                    'Vai in Configurazione → Società.',
                    'Carica un nuovo logo: la pagina mostra un\'anteprima "Attuale" (logo in uso) e "Nuovo" (file appena caricato).',
                    'Conferma per sostituire il logo.',
                ],
                erroriComuni: [
                    'Confermare senza controllare l\'anteprima "Nuovo": verifica sempre che il file caricato sia quello corretto prima di salvare.',
                ],
            },
            {
                id: 'societa-affiliazioni',
                domanda: 'A cosa serve la sezione Affiliazioni nell\'Anagrafica Società?',
                percorso: 'Configurazione → Anagrafica → Affiliazioni',
                aCosaServe: 'Registra a quali enti/federazioni l\'associazione è affiliata; questi dati vengono poi usati nella modulistica e nei documenti che li richiedono.',
                procedimento: [
                    'Vai in Configurazione → Anagrafica, sezione Affiliazioni.',
                    'Usa la selezione multipla di Tipo e Affiliazione per registrare tutte le affiliazioni pertinenti.',
                ],
                erroriComuni: [
                    'Non compilare questa sezione e poi trovare campi vuoti nella modulistica che li richiede.',
                ],
            },
            {
                id: 'societa-menu-impostazioni-diviso',
                domanda: 'Perché nel menu "Configurazione" trovo tante voci diverse (Anagrafica, Anno contabile, Società, Conti, Comunicazioni, Automazioni)?',
                percorso: 'Configurazione (menu)',
                aCosaServe: 'Sono raggruppate sotto la stessa voce di menu per comodità di navigazione, ma restano pagine indipendenti.',
                procedimento: [
                    'Anagrafica: dati fiscali della società.',
                    'Anno contabile: periodo contabile di riferimento.',
                    'Società: preferenze generali (es. logo).',
                    'Conti: piano conti/casse.',
                    'Comunicazioni: invio email (Parametri SMTP, solo Superuser).',
                    'Automazioni: regole di invio automatico.',
                ],
                erroriComuni: [
                    'Cercare un\'impostazione nella pagina sbagliata tra queste sei: usa questa mappa per orientarti direttamente.',
                ],
            },
            {
                id: 'societa-superuser-multi',
                domanda: 'Come funziona la gestione multi-società per i Superuser?',
                percorso: 'Amministrazione → Società — solo Superuser',
                aCosaServe: 'Dà ai Superuser una visione e gestione centralizzata di tutte le società/associazioni presenti sull\'istanza.',
                procedimento: [
                    'Vai in Amministrazione → Società (visibile solo ai Superuser).',
                    'Usa il filtro per Tipo per orientarti nell\'elenco.',
                    'Puoi creare rapidamente una società con dati casuali a scopo di test.',
                ],
                erroriComuni: [
                    'Usare la creazione rapida con dati casuali in un ambiente di produzione invece che solo a scopo di test.',
                ],
            },
            {
                id: 'societa-tipo-associazione',
                domanda: 'Che differenza fa scegliere ASD o APS come Tipo Associazione?',
                percorso: 'Configurazione → Anagrafica → Tipo Associazione',
                aCosaServe: 'Determina alcuni dati e diciture fiscali richiesti in anagrafica e nei documenti generati, in linea con la normativa applicabile a quella forma associativa.',
                procedimento: [
                    'Vai in Configurazione → Anagrafica.',
                    'Scegli ASD (Associazione Sportiva Dilettantistica) o APS (Associazione di Promozione Sociale) in base alla forma giuridica reale dell\'associazione.',
                ],
                erroriComuni: [
                    'Scegliere il tipo sbagliato: incide su diciture fiscali richieste su documenti e ricevute, quindi va verificato con attenzione.',
                ],
            },
        ],
    },
    {
        id: 'altro',
        label: 'Modulistica e altre funzioni',
        items: [
            {
                id: 'modulistica-editor',
                domanda: 'Come creo un modulo/documento personalizzato in Modulistica?',
                percorso: 'Modulistica → Moduli → editor',
                aCosaServe: 'Permette di scrivere e stampare documenti personalizzati (es. moduli, liberatorie) direttamente dal gestionale.',
                procedimento: [
                    'Vai in Modulistica → Moduli e crea/apri un modulo.',
                    'Scrivi il contenuto con l\'editor di testo semplice (Grassetto, Corsivo, Sottolineato, Elenco puntato, dimensione carattere da "Molto piccolo" a "Enorme").',
                    'Alla stampa, scegli la data da riportare sul documento generato in PDF.',
                ],
                erroriComuni: [],
            },
            {
                id: 'modulistica-da-scheda-socio',
                domanda: 'Posso stampare un modulo precompilato con i dati di un socio specifico?',
                percorso: 'Soci → apri un socio → menu Azioni → stampa modulo',
                aCosaServe: 'Evita di ricopiare a mano i dati anagrafici del socio sul modulo.',
                procedimento: [
                    'Apri la scheda del socio.',
                    'Dal menu Azioni genera direttamente la modulistica già precompilata con i dati anagrafici di quel socio, invece di passare dalla sezione Modulistica generale.',
                ],
                erroriComuni: [],
            },
            {
                id: 'template-stampa-vs-footer-ricevuta',
                domanda: 'Che differenza c\'è tra il "Footer" di Modulistica e il "Footer" di Ricevute?',
                percorso: 'Modulistica → Footer  •  Ricevute → Footer',
                aCosaServe: 'Nel menu compaiono due voci "Footer" distinte, ciascuna pensata per un contesto diverso.',
                procedimento: [
                    'Il Footer di Modulistica è il testo generico usato in calce alla modulistica e alle stampe generali (es. sede legale, PEC).',
                    'Il Footer di Ricevute è un testo distinto, pensato specificamente per le diciture da riportare in calce alle ricevute (es. dicitura fiscale IVA).',
                ],
                erroriComuni: [
                    'Modificare il Footer nella sezione sbagliata (Modulistica invece di Ricevute, o viceversa) pensando siano lo stesso testo: vanno impostati separatamente, uno per sezione.',
                ],
            },
            {
                id: 'ricerca-socio-riuso',
                domanda: 'Perché la stessa finestra di ricerca socio compare in più punti del gestionale (corsi, ricevute...)?',
                percorso: 'Componente condiviso — compare ovunque serva selezionare un socio esistente (Corsi, Ricevute, ecc.)',
                aCosaServe: 'Garantisce la stessa esperienza di ricerca socio in tutta l\'applicazione, invece di reinventarla in ogni sezione.',
                procedimento: [
                    'La stessa finestra di ricerca viene richiamata in tutti i punti dove serve selezionare un socio esistente (es. iscrizione a un corso, creazione di una ricevuta).',
                ],
                erroriComuni: [],
            },
        ],
    },
];
