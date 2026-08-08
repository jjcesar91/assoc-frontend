// Contenuti della sezione FAQ / Guida in-app.
// Aggiornare questo file (e la costante FAQ_LAST_UPDATE) ad ogni release che introduce
// o modifica funzionalità rilevanti per gli utenti.

export const FAQ_LAST_UPDATE = '2026-08-08';

export const FAQ_CATEGORIES = [
    {
        id: 'soci',
        label: 'Soci',
        items: [
            {
                id: 'soci-iscrizione-vs-tesseramento',
                question: 'Che differenza c\'è tra "Iscrizione" e "Tesseramento" nella scheda socio?',
                answer: 'L\'Iscrizione riguarda l\'adesione all\'associazione per l\'anno in corso, il Tesseramento riguarda la tessera (es. affiliazione a un ente/federazione). Sono due stati separati, ciascuno con la propria data di scadenza e i propri colori di stato (REGOLARE, IN SCADENZA, SCADUTO). Se nelle Impostazioni Società è attiva l\'opzione "Quota associativa e Tesseramento Unico", i due stati vengono fatti coincidere e gestiti come un\'unica cosa.',
            },
            {
                id: 'soci-stati-colore',
                question: 'Cosa significano i colori REGOLARE / IN SCADENZA / SCADUTO nell\'elenco soci?',
                answer: 'Sono calcolati automaticamente dalla data di scadenza di iscrizione, tesseramento o certificato medico. REGOLARE = scadenza lontana, IN SCADENZA = entro la soglia di giorni configurata, SCADUTO = data già passata. Lo stesso schema colore è usato anche per lo Scadenzario e per lo stato del certificato medico.',
            },
            {
                id: 'soci-iscrizione-senza-ricevuta',
                question: 'A cosa serve "Iscrizione senza ricevuta" nel menu Azioni della scheda socio?',
                answer: 'Registra l\'iscrizione del socio per l\'anno corrente senza generare contestualmente una ricevuta di pagamento (utile ad esempio per iscrizioni gratuite o già contabilizzate altrove). Se invece serve anche il movimento contabile, usa "Nuova ricevuta".',
            },
            {
                id: 'soci-revoca-iscrizione',
                question: 'Cosa fa "Revoca iscrizione"?',
                answer: 'Annulla l\'iscrizione del socio per l\'anno contabile corrente. L\'azione richiede una conferma esplicita perché modifica lo stato del socio: usala solo se l\'iscrizione è stata registrata per errore o il socio ha rinunciato.',
            },
            {
                id: 'soci-tab-dinamici',
                question: 'Perché la scheda socio mostra tab diversi a seconda del socio?',
                answer: 'I tab si adattano al tipo di socio: se è una "persona fisica" vedi Anagrafica, Storico, Ricevute, Abbonamenti/Attività, Comunicazioni; se è un socio giuridico (tipo_socio = "associazione") il tab Anagrafica si espande con Associazione e Contatti al posto di Abbonamenti/Attività.',
            },
            {
                id: 'soci-certificato-medico',
                question: 'Come viene calcolato lo stato del certificato medico?',
                answer: 'Lo stato (VALIDO / IN SCADENZA / SCADUTO) è calcolato dal campo data di scadenza del certificato inserito in scheda socio, con la stessa logica a soglie usata per iscrizione e tesseramento.',
            },
            {
                id: 'soci-accesso-frontend',
                question: 'Cosa fa l\'opzione "Accesso Frontend" nella scheda socio?',
                answer: 'Abilita per quel socio il login all\'Area Soci (il portale riservato dove può vedere abbonamenti, corsi, ricevute e acquistare prodotti nel Negozio). Senza questa opzione il socio non può accedere con le proprie credenziali.',
            },
            {
                id: 'soci-codice-fiscale-errore',
                question: 'Perché il sistema segnala errori sul codice fiscale del socio?',
                answer: 'Il codice fiscale viene calcolato/validato automaticamente da nome, cognome, data e luogo di nascita. Messaggi come "Il CF non corrisponde al Cognome/Nome" o "Carattere di controllo errato" indicano un\'incoerenza tra il CF inserito e questi dati anagrafici: verifica prima i dati anagrafici, poi ricalcola il codice fiscale.',
            },
            {
                id: 'soci-import-export',
                question: 'Posso importare/esportare l\'elenco soci in Excel?',
                answer: 'Sì. Dall\'elenco Soci puoi esportare in Excel, importare da file Excel oppure importare un CSV nel formato Odoo. È disponibile anche un export "template" pensato apposta per essere ricompilato e reimportato senza errori di formato.',
            },
            {
                id: 'soci-etichette',
                question: 'A cosa servono le etichette (tag) dei soci?',
                answer: 'Le etichette permettono di classificare liberamente i soci (es. per gruppo, categoria, caratteristica) e di usarle come filtro rapido nella ricerca soci, tramite un selettore a chip con autocomplete.',
            },
        ],
    },
    {
        id: 'contabilita',
        label: 'Contabilità',
        items: [
            {
                id: 'contabilita-prima-nota-vs-ricevute',
                question: 'Che differenza c\'è tra Prima Nota e Ricevute?',
                answer: 'La Prima Nota registra i movimenti contabili liberi dell\'associazione (entrate e uscite non necessariamente legate a un socio, es. spese, bonifici). Le Ricevute registrano invece i pagamenti dei soci (quote, iscrizioni, prodotti) e generano il documento da consegnare al socio.',
            },
            {
                id: 'contabilita-riga-annullato',
                question: 'Perché in Prima Nota vedo righe barrate con stato "ANNULLATO"?',
                answer: 'Una riga il cui stato pagamento inizia con "3." è stata annullata: resta visibile nell\'elenco (barrata) per mantenere la tracciabilità storica, ma non viene conteggiata nei totali/bilancio come un movimento valido.',
            },
            {
                id: 'contabilita-bilancio-vuoto',
                question: 'Perché il tab "Bilancio" della Contabilità è vuoto o mostra un avviso?',
                answer: 'Il riepilogo per Bilancio si basa sui Gruppi e Sottogruppi (piano dei conti) configurati. Se non ne hai ancora creati, il sistema mostra l\'avviso "Nessun gruppo configurato": vai in Contabilità → Gruppi/Sottogruppi e crealo prima di usare questo tab.',
            },
            {
                id: 'contabilita-gruppi-sottogruppi',
                question: 'Come funzionano Gruppi e Sottogruppi?',
                answer: 'È il piano dei conti a due livelli usato per classificare i movimenti: i Gruppi hanno tipo Entrata, Uscita o Entrata-Uscita (con una "Sezione" opzionale) e i Sottogruppi sono agganciati a un gruppo genitore. Il codice identificativo è generato automaticamente e non modificabile. Le voci predefinite (contrassegnate da un lucchetto) non possono essere eliminate.',
            },
            {
                id: 'contabilita-conto-predefinito',
                question: 'A cosa serve impostare un "Conto predefinito"?',
                answer: 'Il conto predefinito (badge verde nell\'elenco Conti) viene proposto automaticamente come cassa/conto di destinazione quando registri un nuovo pagamento o movimento, per velocizzare l\'inserimento. Puoi cambiarlo in qualsiasi momento con il pulsante "Imposta come predefinito" su un altro conto.',
            },
            {
                id: 'contabilita-scadenzario-stati',
                question: 'Come si "paga" una scadenza nello Scadenzario?',
                answer: 'Apri il dettaglio della scadenza e usa l\'azione "Paga": il pagamento registrato viene collegato a una ricevuta e nel dettaglio compaiono data, operatore, numero e data della ricevuta generata. Lo stato della rata passa quindi da IN SCADENZA/SCADUTO a pagata.',
            },
            {
                id: 'contabilita-anno-contabile-tipi',
                question: 'Che tipi di Anno Contabile posso scegliere?',
                answer: 'Solare (1 gennaio - 31 dicembre), Sportivo/associativo (1 settembre - 31 agosto) oppure Personalizzato con data di inizio libera. La scelta determina come vengono raggruppati iscrizioni, ricevute e scadenze per "anno".',
            },
            {
                id: 'contabilita-anno-contabile-bloccato',
                question: 'Perché non riesco più a modificare il tipo di Anno Contabile?',
                answer: 'Una volta emessa la prima ricevuta nell\'anno, il campo si blocca automaticamente ("Modifica non consentita... per garantire la coerenza della numerazione delle ricevute"): cambiarlo in corsa creerebbe incongruenze nella numerazione e nei periodi già contabilizzati.',
            },
            {
                id: 'contabilita-fornitori',
                question: 'A cosa serve l\'anagrafica Fornitori?',
                answer: 'Serve a censire i fornitori dell\'associazione così da poterli associare rapidamente ai movimenti di spesa registrati in Prima Nota, evitando di reinserire i dati ogni volta.',
            },
        ],
    },
    {
        id: 'ricevute-pagamenti',
        label: 'Ricevute e Pagamenti',
        items: [
            {
                id: 'ricevute-vs-proforma',
                question: 'Che differenza c\'è tra Ricevuta e Proforma?',
                answer: 'La Proforma è un documento preliminare, non fiscale, generato prima o in attesa del pagamento effettivo; la Ricevuta è il documento definitivo emesso a fronte del pagamento confermato. Nell\'elenco Ricevute una colonna dedicata mostra lo stato del documento per distinguere le due situazioni.',
            },
            {
                id: 'ricevute-annulla-vs-elimina',
                question: 'Che differenza c\'è tra "Annulla" ed "Elimina" su una ricevuta?',
                answer: '"Annulla" cambia lo stato del pagamento (diventa uno stato che inizia con "3.") mantenendo la ricevuta visibile nello storico per tracciabilità, ma esclusa dai conteggi validi. "Elimina" invece cancella fisicamente il record: usalo solo per errori di inserimento senza alcun valore storico da conservare.',
            },
            {
                id: 'ricevute-invio-email-disabilitato',
                question: 'Perché il pulsante "Invia email" è disabilitato su una ricevuta?',
                answer: 'L\'invio email è disponibile solo se la ricevuta è collegata a un socio con un indirizzo email valido in anagrafica. Se il pagamento non è associato a nessun socio (es. vendita generica), l\'azione resta disabilitata.',
            },
            {
                id: 'ricevute-badge-autoemessa',
                question: 'Cosa significa il badge "Ricevuta creata dal socio dall\'area riservata"?',
                answer: 'Indica che la ricevuta è stata generata automaticamente da un acquisto self-service fatto dal socio nel Negozio dell\'Area Soci, e non da un operatore staff dal gestionale.',
            },
            {
                id: 'ricevute-pagamento-veloce',
                question: 'Che cos\'è il "Pagamento veloce" e a cosa serve Carica Quietanza?',
                answer: 'Il Pagamento veloce permette di registrare rapidamente un incasso senza passare per il flusso completo di creazione ricevuta. "Carica Quietanza" consente inoltre di allegare al pagamento la scansione/foto della ricevuta o quietanza cartacea originale.',
            },
            {
                id: 'ricevute-footer',
                question: 'Dove modifico il testo che compare in fondo alle ricevute stampate?',
                answer: 'In Ricevute → Footer (Template di stampa ricevuta) puoi impostare il testo che appare in calce a ogni ricevuta, ad esempio diciture fiscali come "Fuori campo IVA art. 4...". È un template distinto dal "Template di Stampa" generale usato per la modulistica.',
            },
            {
                id: 'ricevute-import-odoo',
                question: 'Posso importare ricevute da un altro gestionale?',
                answer: 'Sì, è disponibile un\'importazione ricevute nel formato di export di Odoo, oltre all\'importazione massiva di movimenti di Prima Nota e di singole voci ricevuta da file.',
            },
        ],
    },
    {
        id: 'comunicazioni-ricevute',
        label: 'Comunicazioni sulle Ricevute',
        items: [
            {
                id: 'ricevute-comunicazioni-modalita',
                question: 'Cosa cambia tra le modalità "Non attiva", "Chiedi" e "Automatica" per l\'invio email ricevute?',
                answer: '"Non attiva" = nessuna email viene inviata; "Chiedi" = prima di inviare, il sistema chiede conferma all\'operatore; "Automatica" = l\'email parte da sola non appena la ricevuta/proforma viene generata. Le due modalità si configurano separatamente per Proforma e per Pagamento confermato, perché spesso si vuole automatizzare solo una delle due.',
            },
            {
                id: 'ricevute-comunicazioni-shortcode',
                question: 'Posso personalizzare oggetto e testo delle email di ricevuta?',
                answer: 'Sì, in Comunicazioni ricevute trovi un editor per oggetto e corpo del messaggio con shortcode che vengono sostituiti automaticamente con i dati reali (es. nome socio, numero ricevuta) al momento dell\'invio.',
            },
        ],
    },
    {
        id: 'corsi-attivita',
        label: 'Corsi e Attività',
        items: [
            {
                id: 'corsi-abbonamento-obbligatorio',
                question: 'Perché non riesco a salvare un corso senza selezionare un Abbonamento?',
                answer: 'Ogni corso deve essere collegato a un Abbonamento (il prodotto che definisce il prezzo/tipologia di iscrizione al corso): è un campo obbligatorio nel tab Impostazioni della scheda corso, perché senza di esso il sistema non saprebbe cosa addebitare agli iscritti.',
            },
            {
                id: 'corsi-generazione-date',
                question: 'Come vengono generate le date delle lezioni di un corso?',
                answer: 'A partire dal/dai giorno/i della settimana e dagli orari impostati nel tab Impostazioni del corso, il sistema genera automaticamente il calendario delle singole lezioni per il periodo del corso.',
            },
            {
                id: 'corsi-iscrizione-tardiva',
                question: 'Un socio può iscriversi a un corso già iniziato?',
                answer: 'Sì, tramite la funzione di iscrizione tardiva dedicata: permette di aggiungere un iscritto a corso già avviato gestendo correttamente decorrenza e conteggio delle lezioni/presenze rispetto agli altri iscritti.',
            },
            {
                id: 'corsi-tab-presenze',
                question: 'Come funziona il registro presenze di un corso?',
                answer: 'Nel tab Presenze della scheda corso puoi segnare le presenze giorno per giorno in base al calendario lezioni generato, e stampare un "Foglio presenze" mensile pronto per essere usato come registro cartaceo.',
            },
            {
                id: 'corsi-strutture-aree',
                question: 'Che differenza c\'è tra Strutture e Aree?',
                answer: 'Le Strutture sono le sedi/impianti dell\'associazione; ogni struttura può contenere una o più Aree (sotto-spazi al suo interno, es. singoli campi o sale). L\'elenco Strutture mostra quante aree sono state censite per ciascuna sede.',
            },
            {
                id: 'corsi-calendario-scadenze',
                question: 'A cosa servono le icone "Soci in scadenza" e "Soci scaduti" nel Calendario?',
                answer: 'Sono scorciatoie che aprono direttamente l\'elenco degli iscritti a un corso/attività la cui iscrizione, tesseramento o certificato medico sta per scadere o è già scaduto, per contattarli rapidamente.',
            },
            {
                id: 'corsi-staff-tecnici',
                question: 'Dove gestisco l\'anagrafica di istruttori/tecnici?',
                answer: 'In Attività → Staff trovi l\'anagrafica di tecnici/istruttori, con un filtro "Attualmente impiegato" per distinguere il personale attivo da quello non più in servizio.',
            },
        ],
    },
    {
        id: 'prodotti-negozio',
        label: 'Prodotti e Negozio Soci',
        items: [
            {
                id: 'prodotti-tipologie',
                question: 'Che differenza c\'è tra le tipologie di Prodotto (Prodotto generico, Quota periodica, Abbonamento, Iscrizione, Scadenzario)?',
                answer: 'Prodotto generico è un articolo/servizio da vendere senza logiche particolari. Quota periodica e Abbonamento sono pensati per pagamenti ricorrenti (es. mensilità, corsi). Iscrizione è il prodotto legato all\'adesione annuale del socio. Scadenzario genera automaticamente un piano di rate/scadenze future collegato al prodotto. Scegli la tipologia in base a come vuoi che il pagamento venga trattato nel resto del gestionale (bilancio, scadenze, iscrizioni).',
            },
            {
                id: 'prodotti-visibilita-vendibile',
                question: 'Cosa cambia tra i flag "Visibile/Obsoleto" e "Vendibile online" di un prodotto?',
                answer: 'Il flag di visibilità determina se il prodotto è ancora proposto nel gestionale (un prodotto "obsoleto" resta nello storico ma non è più selezionabile per nuove vendite). "Vendibile online" controlla invece, indipendentemente da questo, se il prodotto compare nel Negozio dell\'Area Soci per l\'acquisto self-service.',
            },
            {
                id: 'negozio-socio-acquisto',
                question: 'Come funziona l\'acquisto di un prodotto dal Negozio dell\'Area Soci?',
                answer: 'Il socio vede l\'elenco dei prodotti disponibili per l\'acquisto online, li aggiunge al carrello (con un campo note per eventuali indicazioni all\'associazione) e conferma: al termine riceve conferma "Ricevuta registrata" e la ricevuta viene generata automaticamente lato gestionale.',
            },
        ],
    },
    {
        id: 'staff-utenti-permessi',
        label: 'Utenti, Staff e Permessi',
        items: [
            {
                id: 'utenti-ruoli',
                question: 'Che ruoli utente esistono nel gestionale?',
                answer: 'Utente (accesso operativo standard), Amministratore (accesso più ampio, incluse le impostazioni della società) e Superuser (gestione multi-società e parametri riservati come l\'amministrazione delle società e i parametri SMTP).',
            },
            {
                id: 'utenti-impersona',
                question: 'A cosa serve la funzione "Impersona" nell\'elenco Utenti?',
                answer: 'Permette a un amministratore di accedere temporaneamente con le credenziali/permessi di un altro utente per verificare cosa vede o risolvere un problema segnalato. Il ruolo e i permessi correnti dell\'amministratore vengono salvati per poter tornare al proprio account con "Torna al tuo account".',
            },
            {
                id: 'utenti-funzionalita-vs-ruolo',
                question: 'Che differenza c\'è tra i permessi di ruolo e la voce "Funzionalità" di un utente?',
                answer: 'Il ruolo (Utente/Amministratore/Superuser) definisce l\'accesso di base (es. un Amministratore vede tutto il menu tranne l\'Amministrazione riservata al Superuser). "Funzionalità" permette invece di restringere in modo granulare, per singolo utente, quali voci di menu specifiche può vedere: se non configurata (valore nullo) l\'utente vede tutto il menu previsto dal suo ruolo, altrimenti vede solo le voci esplicitamente incluse.',
            },
            {
                id: 'utenti-reset-password',
                question: 'Come faccio a reimpostare la password di un altro utente?',
                answer: 'Dall\'elenco Utenti, sulla riga dell\'utente interessato, usa l\'azione "Reimposta password": è pensata per i casi in cui l\'utente non riesce ad accedere e non deve gestirsela da solo.',
            },
        ],
    },
    {
        id: 'automazioni',
        label: 'Automazioni',
        items: [
            {
                id: 'automazioni-cosa-fanno',
                question: 'Cosa fanno le Automazioni?',
                answer: 'Ogni regola di automazione invia comunicazioni automatiche in prossimità di una scadenza (tesseramento, certificato medico, ecc.), con un numero di "Giorni di anticipo" configurabile e, per le scadenze fisse annuali, campi giorno/mese dedicati.',
            },
            {
                id: 'automazioni-log',
                question: 'Come verifico se un\'automazione ha effettivamente inviato le comunicazioni?',
                answer: 'Nella tabella dei log invii, sotto l\'elenco delle regole, puoi filtrare per Tipo automazione e Data e controllare la colonna "Esito" per ogni invio effettuato.',
            },
            {
                id: 'automazioni-non-applicabile',
                question: 'Perché alcune automazioni mostrano "Non applicabile per questa società" o "Gestito per singolo socio"?',
                answer: 'Non tutte le automazioni sono globali per l\'associazione: alcune dipendono da impostazioni non attive per quella società specifica, altre vengono invece configurate e attivate a livello di singolo socio anziché come regola generale.',
            },
        ],
    },
    {
        id: 'societa-impostazioni',
        label: 'Società e Impostazioni',
        items: [
            {
                id: 'societa-dove-modificare-alias',
                question: 'Dove modifico l\'alias mittente di email/SMS?',
                answer: 'L\'alias può essere impostato sia in Impostazioni → Anagrafica Società sia in Impostazioni → Comunicazioni (Parametri SMTP, riservato ai superuser): il primo è il dato anagrafico generale, il secondo è legato alla configurazione tecnica di invio. Se non vedi coerenza tra i due, verifica entrambi i punti.',
            },
            {
                id: 'societa-parametri-smtp',
                question: 'A cosa servono i Parametri SMTP in Comunicazioni Società?',
                answer: 'Configurano il server email effettivamente usato per inviare le comunicazioni (Host, Porta, Utente, Password) oltre all\'alias mittente. Questa sezione è visibile solo agli utenti Superuser.',
            },
            {
                id: 'societa-logo',
                question: 'Come cambio il logo che appare sui documenti stampati?',
                answer: 'In Impostazioni Società puoi caricare un nuovo logo: la pagina mostra un\'anteprima "Attuale" con il logo in uso e un\'anteprima "Nuovo" con il file appena caricato, prima di confermare la sostituzione.',
            },
            {
                id: 'societa-affiliazioni',
                question: 'A cosa serve la sezione Affiliazioni nell\'Anagrafica Società?',
                answer: 'Permette di registrare, con una selezione multipla di Tipo e Affiliazione, a quali enti/federazioni l\'associazione è affiliata: questi dati vengono poi utilizzati nella modulistica e nei documenti che richiedono di indicarli.',
            },
            {
                id: 'societa-menu-impostazioni-diviso',
                question: 'Perché nel menu "Impostazioni" trovo tante voci diverse (Anagrafica, Anno contabile, Società, Conti, Comunicazioni, Automazioni)?',
                answer: 'Sono raggruppate sotto la stessa voce di menu per comodità di navigazione, ma restano pagine indipendenti: ciascuna gestisce un aspetto diverso della configurazione (dati fiscali, periodo contabile, preferenze generali, piano conti/casse, invio email, regole di automazione).',
            },
            {
                id: 'societa-superuser-multi',
                question: 'Come funziona la gestione multi-società per i Superuser?',
                answer: 'In Amministrazione → Società (visibile solo ai Superuser) trovi l\'elenco di tutte le società/associazioni gestite sull\'istanza, con filtro per Tipo e la possibilità di creare rapidamente una società con dati casuali a scopo di test.',
            },
            {
                id: 'societa-tipo-associazione',
                question: 'Che differenza fa scegliere ASD o APS come Tipo Associazione?',
                answer: 'Il tipo (ASD - Associazione Sportiva Dilettantistica, o APS - Associazione di Promozione Sociale) determina alcuni dati e diciture fiscali richiesti in anagrafica e nei documenti generati, in linea con la normativa applicabile a quella forma associativa.',
            },
        ],
    },
    {
        id: 'altro',
        label: 'Modulistica e altre funzioni',
        items: [
            {
                id: 'modulistica-editor',
                question: 'Come creo un modulo/documento personalizzato in Modulistica?',
                answer: 'Modulistica include un editor di testo semplice (Grassetto, Corsivo, Sottolineato, Elenco puntato, dimensione carattere da "Molto piccolo" a "Enorme") per scrivere il contenuto del modulo; alla stampa puoi scegliere la data da riportare sul documento generato in PDF.',
            },
            {
                id: 'modulistica-da-scheda-socio',
                question: 'Posso stampare un modulo precompilato con i dati di un socio specifico?',
                answer: 'Sì, dal menu Azioni della scheda socio puoi generare rapidamente la modulistica già precompilata con i dati anagrafici di quel socio, invece di passare dalla sezione Modulistica generale.',
            },
            {
                id: 'template-stampa-vs-footer-ricevuta',
                question: 'Che differenza c\'è tra "Template di Stampa" e il footer delle Ricevute?',
                answer: 'Il Template di Stampa è il footer generico usato per la modulistica e le stampe generali (es. sede legale, PEC), mentre il footer Ricevute è un testo distinto, pensato specificamente per le diciture da riportare in calce alle ricevute (es. dicitura fiscale IVA).',
            },
            {
                id: 'ricerca-socio-riuso',
                question: 'Perché la stessa finestra di ricerca socio compare in più punti del gestionale (corsi, ricevute...)?',
                answer: 'È un componente di ricerca socio condiviso, usato in tutti i punti dell\'applicazione dove serve selezionare un socio esistente (es. iscrizione a un corso, creazione di una ricevuta), per garantire la stessa esperienza di ricerca ovunque.',
            },
        ],
    },
];
