import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Login from './Login'
import Soci from './pages/Soci'

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
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLoginSuccess={handleLogin} /> : <Navigate to="/soci" />} />
        <Route path="/soci" element={isAuthenticated ? <Soci onLogout={handleLogout}/> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/soci" />} />
      </Routes>
    </Router>
  )
}

export default App
