// frontend/src/components/Navbar.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from '../context/AuthContext';
import "./Navbar.css";

function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
      case "/baseline":
        return "Dashboard Dataset Seimbang";
      case "/simclr":
        return "Dashboard Dataset Tidak Seimbang";
      case "/upload":
        return "Upload Dataset";
      case "/history":
        return "Riwayat Pengujian";
      case "/kelola-user":
        return "Kelola User";
      default:
        return "Dashboard";
    }
  };

  const modelInfo = {
    name: "Baseline MLP / SimCLR",
    type: "Supervised / Self-Supervised"
  };

  // Ambil inisial user untuk avatar
  const getUserInitial = () => {
    if (!user?.username) return "?";
    return user.username.charAt(0).toUpperCase();
  };

  // Warna avatar berdasarkan username
  const getAvatarColor = () => {
    const colors = [
      "#2563eb", "#7c3aed", "#dc2626", "#16a34a", 
      "#ea580c", "#0891b2", "#db2777", "#4f46e5"
    ];
    if (!user?.username) return colors[0];
    const index = user.username.length % colors.length;
    return colors[index];
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">🛡️</span>
            <span className="brand-text">Deteksi Anomali</span>
          </Link>
          <span className="page-title">{getPageTitle()}</span>
        </div>

        <div className="navbar-right">
          {/* Model Badge */}
          <div className="model-badge">
            <span className="model-label">Model:</span>
            <span className="model-name">{modelInfo.name}</span>
            <span className="model-divider">•</span>
            <span className="model-type">{modelInfo.type}</span>
          </div>

          {/* Theme Toggle Button */}
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Profile Avatar dengan Dropdown */}
          <div className="profile-container">
            <button 
              className="profile-avatar"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-label="Profile menu"
              style={{ backgroundColor: getAvatarColor() }}
            >
              {getUserInitial()}
            </button>

            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div 
                    className="profile-avatar-large"
                    style={{ backgroundColor: getAvatarColor() }}
                  >
                    {getUserInitial()}
                  </div>
                  <div className="profile-info">
                    <span className="profile-name">{user?.username || 'User'}</span>
                    <span className={`profile-role ${user?.role}`}>{user?.role || 'Petugas'}</span>
                  </div>
                </div>
                <div className="profile-divider"></div>
                <button className="profile-logout" onClick={logout}>
                  <span className="logout-icon">🚪</span>
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="hamburger"></span>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <Link to="/baseline" onClick={() => setIsMobileMenuOpen(false)}>
            📊 Dataset Seimbang
          </Link>
          <Link to="/simclr" onClick={() => setIsMobileMenuOpen(false)}>
            📊 Dataset Tidak Seimbang
          </Link>
          <Link to="/upload" onClick={() => setIsMobileMenuOpen(false)}>
            📤 Upload Dataset
          </Link>
          <Link to="/history" onClick={() => setIsMobileMenuOpen(false)}>
            📜 Riwayat Pengujian
          </Link>
          {user?.role === 'admin' && (
            <Link to="/kelola-user" onClick={() => setIsMobileMenuOpen(false)}>
              👥 Kelola User
            </Link>
          )}
          <div className="mobile-theme-toggle">
            <button onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Mode Gelap' : '☀️ Mode Terang'}
            </button>
          </div>
          <div className="mobile-logout">
            <button onClick={logout}>
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;