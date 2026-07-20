import { useSearchParams } from 'react-router-dom';
import UploadRicevuta from '../components/UploadRicevuta';

// Pagina pubblica (senza autenticazione) per il caricamento della ricevuta di pagamento.
// Accessibile tramite link con token: /carica-ricevuta?token=XXXX
//
// La meccanica di upload vive in <UploadRicevuta/>, condivisa con l'area soci:
// qui restano solo il recupero del token dalla querystring e la cornice di pagina.

export default function CaricaRicevuta() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.title}>Caricamento ricevuta di pagamento</h1>
                <UploadRicevuta token={token} />
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    },
    card: {
        width: '100%',
        maxWidth: '480px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '32px',
    },
    title: { fontSize: '20px', margin: '0 0 20px', color: '#111827' },
};
