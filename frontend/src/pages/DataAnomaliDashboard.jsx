// frontend/src/pages/DataAnomaliDashboard.jsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../api/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

function DataAnomaliDashboard({ model }) {
  const location = useLocation();
  const [predictionDetails, setPredictionDetails] = useState([]);
  const [totalData, setTotalData] = useState(0);
  const [totalNormal, setTotalNormal] = useState(0);
  const [totalAnomali, setTotalAnomali] = useState(0);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterLabel, setFilterLabel] = useState("semua");

  const activeModel = model || (location.pathname.includes("simclr") ? "simclr" : "baseline");

  useEffect(() => {
    setLoading(true);
    const endpoint = activeModel === "baseline" ? "/dashboard/baseline" : "/dashboard/simclr";
    
    API.get(endpoint)
      .then((res) => {
        console.log("📊 Data Dashboard Response:", res.data);
        setFileName(res.data.file_name || "");
        setTotalData(res.data.total_data || 0);
        setTotalNormal(res.data.total_normal || 0);
        setTotalAnomali(res.data.total_anomali || 0);
        
        if (res.data.prediction_details && res.data.prediction_details.length > 0) {
          setPredictionDetails(res.data.prediction_details);
          console.log("✅ Prediction details loaded:", res.data.prediction_details.length, "rows");
        } else {
          console.warn("⚠️ No prediction details found");
          setPredictionDetails([]);
        }
      })
      .catch((err) => {
        console.error("❌ Error fetching data:", err);
        setPredictionDetails([]);
      })
      .finally(() => setLoading(false));
  }, [activeModel]);

  if (loading) {
    return <div className="loading-spinner">Memuat data...</div>;
  }

  // ✅ Filter data berdasarkan label prediksi
  const filteredData = filterLabel === "semua" 
    ? predictionDetails 
    : predictionDetails.filter(d => d.predicted_label === filterLabel);

  // ✅ Bar Chart dari hasil prediksi (tetap dari total)
  const barChartData = [
    { name: "Total", value: totalData, color: "#2563eb" },
    { name: "Normal", value: totalNormal, color: "#22c55e" },
    { name: "Anomali", value: totalAnomali, color: "#ef4444" }
  ];

  // ✅ PAGINATION MENGGUNAKAN filteredData
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
  const currentData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setFilterLabel(e.target.value);
    setCurrentPage(1);
  };

  // ✅ Format probabilitas dengan warna
  const formatProbability = (prob) => {
    if (prob === undefined || prob === null) return '-';
    const percent = (prob * 100).toFixed(2);
    const isAnomaly = prob > 0.5;
    return {
      text: `${percent}%`,
      color: isAnomaly ? '#ef4444' : '#22c55e'
    };
  };

  return (
    <div className="data-tab-content">
      {/* Card Nama Dataset */}
      <div className="dataset-name-card">
        <div className="dataset-name-icon">📁</div>
        <div className="dataset-name-info">
          <span className="dataset-name-label">Dataset yang Digunakan</span>
          <span className="dataset-name-value">{fileName || "Belum ada dataset"}</span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="panel bar-chart-panel">
        <div className="panel-header">
          <h2>📊 Distribusi Data Normal & Anomali</h2>
          <span className="panel-subtitle">
            Total: {totalData} data ({totalNormal} Normal, {totalAnomali} Anomali)
          </span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Jumlah Data" radius={[8, 8, 0, 0]}>
                {barChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabel Hasil Prediksi */}
      {predictionDetails.length > 0 ? (
        <div className="panel data-table-panel">
          <div className="panel-header">
            <div>
              <h2>📋 Detail Hasil Prediksi</h2>
              <span className="panel-subtitle">
                Menampilkan {filteredData.length > 0 ? startIndex + 1 : 0} - {endIndex} dari {filteredData.length} data prediksi 
                (Total dataset: {totalData})
              </span>
            </div>
            <div className="table-controls-group">
              <div className="filter-control">
                <label>Filter Label:</label>
                <select value={filterLabel} onChange={handleFilterChange}>
                  <option value="semua">📊 Semua Data</option>
                  <option value="Normal">✅ Normal ({predictionDetails.filter(d => d.predicted_label === 'Normal').length})</option>
                  <option value="Anomali">⚠️ Anomali ({predictionDetails.filter(d => d.predicted_label === 'Anomali').length})</option>
                </select>
              </div>
              <div className="table-controls">
                <label>
                  Tampilkan
                  <select value={rowsPerPage} onChange={handleRowsPerPageChange}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  per halaman
                </label>
              </div>
            </div>
          </div>

          <div className="data-table-wrapper">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>id.orig_p</th>
                    <th>id.resp_p</th>
                    <th>proto</th>
                    <th>duration</th>
                    <th>orig_bytes</th>
                    <th>resp_bytes</th>
                    <th>conn_state</th>
                    <th>orig_pkts</th>
                    <th>resp_pkts</th>
                    <th>orig_ip_bytes</th>
                    <th>resp_ip_bytes</th>
                    <th>Hasil Prediksi</th>
                    <th>Probabilitas</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length > 0 ? (
                    currentData.map((row, index) => (
                      <tr key={index} className={row.predicted_label === 'Anomali' ? 'row-anomaly' : 'row-normal'}>
                        <td>{startIndex + index + 1}</td>
                        <td>{row.id_orig_p ?? '-'}</td>
                        <td>{row.id_resp_p ?? '-'}</td>
                        <td>{row.proto ?? '-'}</td>
                        <td>{row.duration ?? 0}</td>
                        <td>{row.orig_bytes ?? 0}</td>
                        <td>{row.resp_bytes ?? 0}</td>
                        <td>{row.conn_state ?? '-'}</td>
                        <td>{row.orig_pkts ?? 0}</td>
                        <td>{row.resp_pkts ?? 0}</td>
                        <td>{row.orig_ip_bytes ?? 0}</td>
                        <td>{row.resp_ip_bytes ?? 0}</td>
                        <td>
                          <span className={`label-badge ${row.predicted_label === 'Anomali' ? 'label-anomaly' : 'label-normal'}`}>
                            {row.predicted_label}
                          </span>
                        </td>
                        <td>
                          {row.probability !== undefined && row.probability !== null ? (
                            <span style={{
                              color: row.probability > 0.5 ? '#ef4444' : '#22c55e',
                              fontWeight: 600
                            }}>
                              {(row.probability * 100).toFixed(2)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="14" style={{ textAlign: 'center', padding: '20px' }}>
                        {filterLabel === 'Normal' ? '✅ Tidak ada data Normal' : '⚠️ Tidak ada data Anomali'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredData.length > rowsPerPage && (
            <div className="pagination-controls">
              <button 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ◀ Sebelumnya
              </button>
              <span className="pagination-info">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Selanjutnya ▶
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Belum Ada Data Prediksi</h3>
          <p>Silakan upload dataset dan lakukan prediksi terlebih dahulu</p>
        </div>
      )}
    </div>
  );
}

export default DataAnomaliDashboard;