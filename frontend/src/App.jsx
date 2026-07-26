// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";  // ✅ Ganti
import History from "./pages/History";
import UploadPage from "./pages/UploadPage";
import KelolaUser from "./pages/KelolaUser";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />
            
            {/* Dashboard - untuk Petugas */}
            <Route path="/baseline" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />  {/* ✅ Ganti dengan Dashboard */}
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/simclr" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />  {/* ✅ Ganti dengan Dashboard */}
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Upload */}
            <Route path="/upload" element={
              <ProtectedRoute>
                <Layout>
                  <UploadPage />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* History */}
            <Route path="/history" element={
              <ProtectedRoute>
                <Layout>
                  <History />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Kelola User - Admin Only */}
            <Route path="/kelola-user" element={
              <ProtectedRoute adminOnly={true}>
                <Layout>
                  <KelolaUser />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootRedirect() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="loading-spinner">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/kelola-user" replace />;
  return <Navigate to="/baseline" replace />;
}

function Layout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default App;