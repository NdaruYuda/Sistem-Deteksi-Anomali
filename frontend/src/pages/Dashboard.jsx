// frontend/src/pages/Dashboard.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import OverviewDashboard from "./OverviewDashboard";
import DataAnomaliDashboard from "./DataAnomaliDashboard";
import "../styles/dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Deteksi model dari path
  const activeModel = location.pathname.includes("simclr") ? "simclr" : "baseline";

  // ✅ Fungsi toggle model
  const toggleModel = () => {
    if (activeModel === "baseline") {
      navigate("/simclr");
    } else {
      navigate("/baseline");
    }
  };

  // Info model
  const modelInfo = {
    baseline: {
      title: "Dashboard Dataset Seimbang",
      subtitle: "Evaluasi Model Baseline MLP pada Data Seimbang",
      badge: "MLP Classifier",
      badgeInfo: "Supervised Learning",
      description: "Model Multi-Layer Perceptron (MLP) yang dilatih menggunakan dataset seimbang untuk mendeteksi anomali jaringan."
    },
    simclr: {
      title: "Dashboard Dataset Tidak Seimbang",
      subtitle: "Evaluasi Model SimCLR + MLP pada Data Tidak Seimbang",
      badge: "SimCLR + MLP",
      badgeInfo: "Self-Supervised Learning",
      description: "Model yang menggabungkan SimCLR (Contrastive Self-Supervised Learning) dengan MLP classifier untuk dataset tidak seimbang."
    }
  };

  const currentInfo = modelInfo[activeModel];

  return (
    <div className="dashboard-page">
      {/* Header dengan Badge Model + Toggle */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>{currentInfo.title}</h1>
            <p className="subtitle">{currentInfo.subtitle}</p>
          </div>

          {/* ✅ Tombol Toggle Model */}
          <button 
            className="toggle-model-btn" 
            onClick={toggleModel}
            title={activeModel === "baseline" ? "Beralih ke SimCLR" : "Beralih ke Baseline MLP"}
          >
            <span className="model-badge-display">
              <span className="badge">{currentInfo.badge}</span>
              <span className="badge-info">{currentInfo.badgeInfo}</span>
              <span className="badge-switch">⟳</span>
            </span>
          </button>
        </div>
        <p className="description">{currentInfo.description}</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🏠 Overview Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          📊 Data Normal & Anomali
        </button>
      </div>

      {/* Render Tab Content */}
      {activeTab === 'overview' && <OverviewDashboard model={activeModel} />}
      {activeTab === 'data' && <DataAnomaliDashboard model={activeModel} />}
    </div>
  );
}

export default Dashboard;