// frontend/src/components/Sidebar.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import "./Sidebar.css";

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Jika admin, hanya tampilkan Kelola User
  if (isAdmin) {
    return (
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Tombol Toggle */}
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
        >
          {isCollapsed ? '→' : '←'}
        </button>

        {/* Header */}
        <div className="sidebar-header">
          {!isCollapsed && <div className="sidebar-divider"></div>}
        </div>

        {/* Menu - Admin Only */}
        <nav className="sidebar-nav">
          <ul>
            <li className={location.pathname === "/kelola-user" ? "active" : ""}>
              <Link to="/kelola-user" data-tooltip="Kelola User">
                <span className="menu-icon">👥</span>
                {!isCollapsed && <span className="menu-label">Kelola User</span>}
              </Link>
            </li>
          </ul>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="sidebar-footer">
            <div className="footer-divider"></div>
            <div className="footer-info">
              <span className="footer-version">v1.0.0</span>
              <span className="footer-status">
                <span className="status-dot"></span>
                Admin
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Jika petugas (bukan admin), tampilkan menu lengkap
  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Tombol Toggle */}
      <button 
        className="sidebar-toggle" 
        onClick={toggleSidebar}
        aria-label={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      {/* Header */}
      <div className="sidebar-header">
        {!isCollapsed && <div className="sidebar-divider"></div>}
      </div>

      {/* Menu - Petugas */}
      <nav className="sidebar-nav">
        <ul>
          {/* Dashboard */}
          <li className={location.pathname === "/baseline" || location.pathname === "/" || location.pathname === "/simclr" ? "active" : ""}>
            <Link to="/baseline" data-tooltip="Dashboard">
              <span className="menu-icon">📊</span>
              {!isCollapsed && <span className="menu-label">Dashboard</span>}
            </Link>
          </li>

          {/* Upload */}
          <li className={location.pathname === "/upload" ? "active" : ""}>
            <Link to="/upload" data-tooltip="Upload Dataset">
              <span className="menu-icon">📤</span>
              {!isCollapsed && <span className="menu-label">Upload Dataset</span>}
            </Link>
          </li>

          {/* History */}
          <li className={location.pathname === "/history" ? "active" : ""}>
            <Link to="/history" data-tooltip="Riwayat Pengujian">
              <span className="menu-icon">📜</span>
              {!isCollapsed && <span className="menu-label">Riwayat Pengujian</span>}
            </Link>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="footer-divider"></div>
          <div className="footer-info">
            <span className="footer-version">v1.0.0</span>
            <span className="footer-status">
              <span className="status-dot"></span>
              Petugas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;