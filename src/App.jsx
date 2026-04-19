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
import Prodotti from './pages/Prodotti'
import Pagamenti from './pages/Pagamenti';
import NuovoPagamento from './pages/NuovoPagamento';
import Conti from './pages/Conti';
import Scadenziario from './pages/Scadenziario';
import Contabilita from './pages/Contabilita';
import GruppiSottogruppi from './pages/GruppiSottogruppi';
import FornitoriContabilita from './pages/FornitoriContabilita';
import AttivitaStrutture from './pages/AttivitaStrutture';
import AttivitaConfigurazione from './pages/AttivitaConfigurazione';
import Staff from './pages/Staff';
import Calendario from './pages/Calendario';
import { SocietaProvider } from './data/SocietaContext'
import { AnnoProvider } from './data/AnnoContext'
import { ConfirmProvider } from './components/ConfirmModal'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <ConfirmProvider>
    <SocietaProvider>
      <AnnoProvider>
        <Router>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login onLoginSuccess={handleLogin} /> : <Navigate to="/soci" />} />
          <Route path="/soci" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Soci">
              <Soci />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/societa/anagrafica" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Anagrafica Società">
              <SocietaAnagrafica />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/societa/anno-contabile" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Anno Contabile">
              <AnnoContabile />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/societa/comunicazioni" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Comunicazioni">
              <SocietaComunicazioni />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/societa/impostazioni" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Impostazioni Società">
              <SocietaImpostazioni />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/modulistica" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Modulistica">
              <Modulistica />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/modulistica/template" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Template di Stampa">
              <TemplateStampa />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/prodotti" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Prodotti">
              <Prodotti />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/nuovo-pagamento" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Nuovo Pagamento">
              <NuovoPagamento />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/pagamenti" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Pagamenti">
              <Pagamenti />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/pagamenti/conti" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Configurazione Conti">
              <Conti />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/scadenziario" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Scadenziario">
              <Scadenziario />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/contabilita/operazioni" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Contabilità - Operazioni">
              <Contabilita />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/contabilita" element={<Navigate to="/contabilita/operazioni" />} />
          <Route path="/contabilita/gruppi" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Contabilità - Gruppi / Sottogruppi">
              <GruppiSottogruppi />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/contabilita/fornitori" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Contabilità - Fornitori">
              <FornitoriContabilita />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/attivita/calendario" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Attività - Calendario">
              <Calendario />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/attivita/strutture" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Attività - Strutture">
              <AttivitaStrutture />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/attivita/configurazione" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Attività - Tipo Attività">
              <AttivitaConfigurazione />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/attivita/tecnici" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Attività - Staff">
              <Staff />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/soci" />} />
        </Routes>
      </Router>
      </AnnoProvider>
    </SocietaProvider>
    </ConfirmProvider>
  )
}

export default App
