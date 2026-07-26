// frontend/src/pages/History.jsx
import { useEffect, useState } from "react";
import API from "../api/api";
import "./History.css";

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    setLoading(true);
    API.get("/history")
      .then((res) => {
        console.log("History data:", res.data);
        setHistory(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Error fetching history:", err);
        setHistory([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Filter history berdasarkan search
  const filteredHistory = history.filter((item) =>
    item.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format angka
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "-";
    return num.toLocaleString("id-ID");
  };

  // Format persentase
  const formatPercent = (num) => {
    if (num === undefined || num === null) return "-";
    return (num * 100).toFixed(2) + "%";
  };

  const handleDetailClick = (item) => {
    setSelectedItem(selectedItem?.id === item.id ? null : item);
  };

  // ============================================================
  // FUNGSI EXPORT CSV
  // ============================================================
  const exportToCSV = () => {
    if (filteredHistory.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }

    // Header CSV
    const headers = [
      'ID', 
      'Nama File', 
      'Model', 
      'Recall', 
      'Precision', 
      'F1-Score', 
      'Normal', 
      'Anomali', 
      'Tanggal'
    ];

    // Data rows
    const rows = filteredHistory.map(item => [
      item.id,
      item.file_name || '-',
      item.model_name || '-',
      item.recall !== undefined && item.recall !== null ? (item.recall * 100).toFixed(2) + '%' : '-',
      item.precision !== undefined && item.precision !== null ? (item.precision * 100).toFixed(2) + '%' : '-',
      item.f1_score !== undefined && item.f1_score !== null ? (item.f1_score * 100).toFixed(2) + '%' : '-',
      item.normal_count !== undefined && item.normal_count !== null ? item.normal_count : '-',
      item.anomaly_count !== undefined && item.anomaly_count !== null ? item.anomaly_count : '-',
      formatDate(item.created_at)
    ]);

    // Buat konten CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `riwayat_pengujian_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <div className="history-page">
        <h1>Riwayat Pengujian</h1>
        <div className="loading-spinner">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <div>
          <h1>Riwayat Pengujian</h1>
          <p className="history-subtitle">
            Daftar semua pengujian klasifikasi yang telah dilakukan
          </p>
        </div>
        <div className="history-actions">
          <span className="stat-badge">
            Total: {filteredHistory.length} pengujian
          </span>
          <button className="export-btn" onClick={exportToCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="history-search">
        <input
          type="text"
          placeholder="Cari berdasarkan nama file..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button className="clear-search" onClick={() => setSearchTerm("")}>
            ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="history-container">
        {filteredHistory.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>Belum ada data pengujian</h3>
            <p>Silakan upload dataset dan lakukan pengujian terlebih dahulu</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama File</th>
                <th>Model</th>
                <th>Tanggal</th>
                <th className="text-center">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => {
                const isOpen = selectedItem?.id === item.id;
                return (
                  <> {/* ✅ Ganti React.Fragment dengan <> */}
                    <tr 
                      className={isOpen ? "active-row" : ""}
                      onClick={() => handleDetailClick(item)}
                    >
                      <td>
                        <span className="id-badge">#{item.id}</span>
                      </td>
                      <td>
                        <span className="file-name-cell">
                          <span className="file-icon">📄</span>
                          {item.file_name || "-"}
                        </span>
                      </td>
                      <td>
                        <span className={`model-badge ${
                          item.model_name?.includes("SimCLR") ? "model-simclr" : "model-baseline"
                        }`}>
                          {item.model_name || "-"}
                        </span>
                      </td>
                      <td>{formatDate(item.created_at)}</td>
                      <td className="text-center">
                        <button 
                          className={`detail-btn ${isOpen ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDetailClick(item);
                          }}
                        >
                          {isOpen ? "▲ Sembunyikan" : "▼ Detail"}
                        </button>
                      </td>
                    </tr>

                    {/* Detail Row */}
                    {isOpen && (
                      <tr className="detail-row">
                        <td colSpan="5">
                          <div className="detail-card">
                            <div className="detail-header">
                              <h3>📊 Hasil Prediksi</h3>
                              <span className="detail-file">{item.file_name}</span>
                            </div>

                            <div className="detail-grid">
                              {/* Metrik Utama */}
                              <div className="detail-metrics">
                                <div className="metric-item">
                                  <span className="metric-label">Recall</span>
                                  <span className="metric-value highlight-recall">
                                    {formatPercent(item.recall)}
                                  </span>
                                </div>
                                <div className="metric-item">
                                  <span className="metric-label">Precision</span>
                                  <span className="metric-value highlight-precision">
                                    {formatPercent(item.precision)}
                                  </span>
                                </div>
                                <div className="metric-item">
                                  <span className="metric-label">F1-Score</span>
                                  <span className="metric-value highlight-f1">
                                    {formatPercent(item.f1_score)}
                                  </span>
                                </div>
                              </div>

                              {/* Distribusi */}
                              <div className="detail-distribution">
                                <div className="dist-item">
                                  <span className="dist-label">Normal</span>
                                  <span className="dist-value normal">
                                    {formatNumber(item.normal_count)}
                                  </span>
                                </div>
                                <div className="dist-item">
                                  <span className="dist-label">Anomali</span>
                                  <span className="dist-value anomaly">
                                    {formatNumber(item.anomaly_count)}
                                  </span>
                                </div>
                                <div className="dist-item total">
                                  <span className="dist-label">Total</span>
                                  <span className="dist-value">
                                    {formatNumber((item.normal_count || 0) + (item.anomaly_count || 0))}
                                  </span>
                                </div>
                              </div>

                              {/* Confusion Matrix */}
                              <div className="detail-confusion">
                                <h4>Confusion Matrix</h4>
                                <div className="confusion-grid">
                                  <div className="confusion-cell">
                                    <span className="confusion-label">TP</span>
                                    <span className="confusion-value">{formatNumber(item.true_positive)}</span>
                                  </div>
                                  <div className="confusion-cell">
                                    <span className="confusion-label">FN</span>
                                    <span className="confusion-value">{formatNumber(item.false_negative)}</span>
                                  </div>
                                  <div className="confusion-cell">
                                    <span className="confusion-label">FP</span>
                                    <span className="confusion-value">{formatNumber(item.false_positive)}</span>
                                  </div>
                                  <div className="confusion-cell">
                                    <span className="confusion-label">TN</span>
                                    <span className="confusion-value">{formatNumber(item.true_negative)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Info Tambahan */}
                              <div className="detail-info">
                                <div className="info-item">
                                  <span className="info-label">ID Pengujian</span>
                                  <span className="info-value">#{item.id}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">Model</span>
                                  <span className="info-value">{item.model_name}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">File</span>
                                  <span className="info-value">{item.file_name}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">Tanggal</span>
                                  <span className="info-value">{formatDate(item.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            <button 
                              className="close-detail"
                              onClick={() => setSelectedItem(null)}
                            >
                              Tutup Detail ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default History;