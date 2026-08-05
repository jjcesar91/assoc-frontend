import { useSearchParams } from 'react-router-dom';
import UploadQuietanza from '../components/UploadQuietanza';

// Pagina pubblica (senza autenticazione) per il caricamento della quietanza di pagamento.
// Accessibile tramite link con token: /carica-quietanza?token=XXXX
//
// La meccanica di upload vive in <UploadQuietanza/>, condivisa con l'area soci:
// qui restano solo il recupero del token dalla querystring e la cornice di pagina.

export default function CaricaQuietanza() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.title}>Caricamento quietanza di pagamento</h1>
                <UploadQuietanza token={token} />
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
