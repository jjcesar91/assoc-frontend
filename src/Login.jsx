import React, { useState } from 'react';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await fetch('/auth/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('token', data.accessToken);
        setMessage('Login successful!');
      } else {
        setMessage(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Network error or server unreachable');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    setEmail('');
    setPassword('');
    setMessage('Logged out');
  };

  if (user) {
    return (
      <div className="login-container">
        <div className="welcome-box">
          <h2>Welcome, {user.username}!</h2>
          <p>Email: {user.email}</p>
          <p className="form-label" style={{textAlign: 'center', opacity: 0.7}}>
            Your access token is stored in localStorage.
          </p>
          <button className="login-button logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h2 className="login-title">Login</h2>
      <form className="login-form" onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
          />
        </div>
        <button className="login-button" type="submit">
          Sign In
        </button>
      </form>
      {message && (
        <div className={`message ${message.toLowerCase().includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default Login;
