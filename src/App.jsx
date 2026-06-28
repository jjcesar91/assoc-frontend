import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Login from './Login'
import Soci from './pages/Soci'
import Layout from './components/Layout'
import SocietaAnagrafica from './pages/SocietaAnagrafica'
import SocietaImpostazioni from './pages/SocietaImpostazioni'
import AnnoContabile from './pages/AnnoContabile'
import SocietaComunicazioni from './pages/SocietaComunicazioni'
import Modulistica from './pages/Modulistica'
import TemplateStampa from './pages/TemplateStampa'
import TemplateRicevuta from './pages/TemplateRicevuta'
import Prodotti from './pages/Prodotti'
import Ordini from './pages/Ordini';
import NuovoOrdine from './pages/NuovoOrdine';
import Conti from './pages/Conti';
import OrdiniComunicazioni from './pages/OrdiniComunicazioni';
import Scadenziario from './pages/Scadenziario';
import Contabilita from './pages/Contabilita';
import GruppiSottogruppi from './pages/GruppiSottogruppi';
import FornitoriContabilita from './pages/FornitoriContabilita';
import AttivitaStrutture from './pages/AttivitaStrutture';
import AttivitaConfigurazione from './pages/AttivitaConfigurazione';
import Staff from './pages/Staff';
import Calendario from './pages/Calendario';
import Utenti from './pages/Utenti';
import SuperuserSocieta from './pages/SuperuserSocieta';
import SocioDashboard from './pages/SocioDashboard';
import CaricaRicevuta from './pages/CaricaRicevuta';
import { SocietaProvider } from './data/SocietaContext'
import { AnnoProvider } from './data/AnnoContext'
import { ConfirmProvider } from './components/ConfirmModal'
import { AlertProvider } from './components/AlertModal'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_features');
    localStorage.removeItem('selectedSocietaId');
    localStorage.removeItem('impersonate_admin_token');
    localStorage.removeItem('impersonate_admin_refresh_token');
    localStorage.removeItem('impersonate_admin_role');
    localStorage.removeItem('impersonate_admin_features');
    window.dispatchEvent(new Event('session-updated'));
  };

  const fetchAndStoreUserInfo = async (token) => {
    if (!token) {
      return null;
    }

    try {
      const res = await fetch('/auth/api/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem('user_role', user.role || 'user');
        localStorage.setItem('user_features', JSON.stringify(user.features ?? null));
        return user.role || 'user';
      }
      if (res.status === 401 || res.status === 403) {
        return null;
      }
    } catch (e) {
      console.error('Errore caricamento profilo utente', e);
    }
    return null;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchAndStoreUserInfo(token).then(role => {
        if (role) {
          setUserRole(role);
          setIsAuthenticated(true);
        } else {
          clearSession();
          setUserRole('user');
          setIsAuthenticated(false);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (accessToken, refreshToken) => {
    localStorage.removeItem('selectedSocietaId');
    localStorage.setItem('token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    } else {
      localStorage.removeItem('refresh_token');
    }
    const role = await fetchAndStoreUserInfo(accessToken);
    if (role) {
      setUserRole(role);
      setIsAuthenticated(true);
      window.dispatchEvent(new Event('session-updated'));
      return;
    }
    clearSession();
    setUserRole('user');
    setIsAuthenticated(false);
  };

  const handleLogout = () => {
    clearSession();
    setIsAuthenticated(false);
    setUserRole('user');
  };

  if (loading) return <div>Loading...</div>;

  const isSocio = userRole === 'socio';

  return (
    <AlertProvider>
    <ConfirmProvider>
    <SocietaProvider>
      <AnnoProvider>
        <Router>
        <Routes>
          {/* ── Route pubblica: caricamento ricevuta tramite token (nessuna autenticazione) ── */}
          <Route path="/carica-ricevuta" element={<CaricaRicevuta />} />

          {/* Login: se autenticato come socio → dashboard, altrimenti → /soci */}
          <Route path="/login" element={
            !isAuthenticated
              ? <Login onLoginSuccess={handleLogin} />
              : isSocio
                ? <Navigate to="/area-soci" />
                : <Navigate to="/soci" />
          } />

          {/* ── Area Soci (solo role=socio) ── */}
          <Route path="/area-soci" element={
            isAuthenticated && isSocio
              ? <SocioDashboard onLogout={handleLogout} />
              : isAuthenticated
                ? <Navigate to="/soci" />
                : <Navigate to="/login" />
          } />

          {/* ── Route admin/staff (non accessibili ai soci) ── */}
          <Route path="/soci" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Soci">
              <Soci />
            </Layout>
          ) : isAuthenticated ? <Navigate to="/area-soci" /> : <Navigate to="/login" />} />
          <Route path="/societa/anagrafica" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Anagrafica Società">
              <SocietaAnagrafica />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/societa/anno-contabile" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Anno Contabile">
              <AnnoContabile />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/societa/comunicazioni" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Comunicazioni">
              <SocietaComunicazioni />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/societa/impostazioni" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Impostazioni Società">
              <SocietaImpostazioni />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/modulistica" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Modulistica">
              <Modulistica />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/modulistica/template" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Template di Stampa">
              <TemplateStampa />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/prodotti" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Prodotti">
              <Prodotti />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/nuovo-ordine" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Nuovo Ordine">
              <NuovoOrdine />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/ordini" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Ordini">
              <Ordini />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/ordini/conti" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Configurazione Conti">
              <Conti />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/ordini/comunicazioni" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Comunicazioni Ordini">
              <OrdiniComunicazioni />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/ordini/template" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Template Ricevute">
              <TemplateRicevuta />
            </Layout>
          ) : <Navigate to="/login" />} />
          {/* Redirect vecchi percorsi per compatibilità */}
          <Route path="/pagamenti" element={<Navigate to="/ordini" replace />} />
          <Route path="/pagamenti/conti" element={<Navigate to="/ordini/conti" replace />} />
          <Route path="/pagamenti/template" element={<Navigate to="/ordini/template" replace />} />
          <Route path="/nuovo-pagamento" element={<Navigate to="/nuovo-ordine" replace />} />
          <Route path="/scadenziario" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Scadenziario">
              <Scadenziario />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/contabilita/operazioni" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Contabilità - Operazioni">
              <Contabilita />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/contabilita" element={<Navigate to="/contabilita/operazioni" />} />
          <Route path="/contabilita/gruppi" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Contabilità - Gruppi / Sottogruppi">
              <GruppiSottogruppi />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/contabilita/fornitori" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Contabilità - Fornitori">
              <FornitoriContabilita />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/attivita/calendario" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Attività - Calendario">
              <Calendario />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/attivita/strutture" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Attività - Strutture">
              <AttivitaStrutture />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/attivita/configurazione" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Attività - Tipo Attività">
              <AttivitaConfigurazione />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/attivita/tecnici" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Attività - Staff">
              <Staff />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/amministrazione/utenti" element={isAuthenticated && !isSocio ? (
            <Layout onLogout={handleLogout} title="Amministrazione - Utenti">
              <Utenti />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/amministrazione/societa" element={isAuthenticated && userRole === 'superuser' ? (
            <Layout onLogout={handleLogout} title="Amministrazione - Società">
              <SuperuserSocieta />
            </Layout>
          ) : isAuthenticated ? <Navigate to="/soci" /> : <Navigate to="/login" />} />
          <Route path="/" element={isAuthenticated
            ? isSocio ? <Navigate to="/area-soci" /> : <Navigate to="/soci" />
            : <Navigate to="/login" />
          } />
        </Routes>
      </Router>
      </AnnoProvider>
    </SocietaProvider>
    </ConfirmProvider>
    </AlertProvider>
  )
}

export default App
