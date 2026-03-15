import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Login from './Login'
import Soci from './pages/Soci'
import Layout from './components/Layout'
import SocietaAnagrafica from './pages/SocietaAnagrafica'
import AnnoContabile from './pages/AnnoContabile'
import SocietaComunicazioni from './pages/SocietaComunicazioni'
import Modulistica from './pages/Modulistica'
import TemplateStampa from './pages/TemplateStampa'
import Prodotti from './pages/Prodotti'
import Pagamenti from './pages/Pagamenti'
import { SocietaProvider } from './data/SocietaContext'

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
    <SocietaProvider>
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
          <Route path="/pagamenti" element={isAuthenticated ? (
            <Layout onLogout={handleLogout} title="Pagamenti">
              <Pagamenti />
            </Layout>
          ) : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/soci" />} />
        </Routes>
      </Router>
    </SocietaProvider>
  )
}

export default App
