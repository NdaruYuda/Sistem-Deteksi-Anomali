// frontend/src/pages/ImbalanceDashboard.jsx
import { useEffect, useState } from "react";
import API from "../api/api";
import MetricCard from "../components/MetricCard";
import { 
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer
} from "recharts";
import "../styles/dashboard.css";

function ImbalancedDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [confusionData, setConfusionData] = useState({
    tp: 0,
    tn: 0,
    fp: 0,
    fn: 0
  });

  // Data fitur dataset (11 fitur)
  const datasetFeatures = [
    { no: 1, name: "id.orig_p", type: "Numerik", description: "Port sumber" },
    { no: 2, name: "id.resp_p", type: "Numerik", description: "Port tujuan" },
    { no: 3, name: "proto", type: "Kategorikal", description: "Protokol (tcp/udp/icmp)" },
    { no: 4, name: "duration", type: "Numerik", description: "Durasi koneksi" },
    { no: 5, name: "orig_bytes", type: "Numerik", description: "Byte dari sumber" },
    { no: 6, name: "resp_bytes", type: "Numerik", description: "Byte dari tujuan" },
    { no: 7, name: "conn_state", type: "Kategorikal", description: "Status koneksi" },
    { no: 8, name: "orig_pkts", type: "Numerik", description: "Jumlah paket sumber" },
    { no: 9, name: "resp_pkts", type: "Numerik", description: "Jumlah paket tujuan" },
    { no: 10, name: "orig_ip_bytes", type: "Numerik", description: "IP byte dari sumber" },
    { no: 11, name: "resp_ip_bytes", type: "Numerik", description: "IP byte dari tujuan" }
  ];

  const chartData = data
    ? [
        { name: "Normal", value: data.normal_count || 0 },
        { name: "Anomali", value: data.anomaly_count || 0 },
      ]
    : [];

  const COLORS = ["#22c55e", "#ef4444"];

  const getConfusionMatrix = () => {
    const { tp, tn, fp, fn } = confusionData;
    return [
      [tn || 0, fp || 0],
      [fn || 0, tp || 0]
    ];
  };

  useEffect(() => {
    setLoading(true);

    API.get("/dashboard/simclr")
      .then((res) => {
        console.log("📊 Dashboard Data (SimCLR):", res.data);
        setData(res.data);
        if (res.data && !res.data.message) {
          const tp = res.data.true_positive || 0;
          const tn = res.data.true_negative || 0;
          const fp = res.data.false_positive || 0;
          const fn = res.data.false_negative || 0;
          
          console.log("🔍 Confusion Matrix Data (SimCLR):", { tp, tn, fp, fn });
          
          setConfusionData({ tp, tn, fp, fn });
        }
      })
      .catch((err) => console.error("Error fetching dashboard (SimCLR):", err));

    API.get("/history")
      .then((res) => {
        if (Array.isArray(res.data)) {
          const simclrHistory = res.data.filter(
            item => item.model_name === "SimCLR + MLP"
          );
          setHistoryData(simclrHistory.slice(0, 10).reverse());
        }
      })
      .catch((err) => console.error("Error fetching history (SimCLR):", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-spinner">Memuat data...</div>
      </div>
    );
  }

  if (!data || data.message) {
    return (
      <div className="dashboard-page">
        <div className="empty-state">
          <h2>Belum Ada Data Pengujian</h2>
          <p>Silakan upload dataset dan lakukan pengujian terlebih dahulu</p>
        </div>
      </div>
    );
  }

  const performanceData = historyData.length > 0 
    ? historyData.map((item, index) => ({
        test: `#${index + 1}`,
        recall: Number((item.recall * 100).toFixed(2)),
        precision: Number((item.precision * 100).toFixed(2)),
        f1: Number((item.f1_score * 100).toFixed(2))
      }))
    : [{ test: 'Test 1', recall: 0, precision: 0, f1: 0 }];

  const confusionMatrix = getConfusionMatrix();
  const maxVal = Math.max(...confusionMatrix.flat(), 1);

  const getColor = (value) => {
    if (value === 0) return 'var(--bg-hover)';
    const intensity = Math.min(value / maxVal, 1);
    return `rgba(37, 99, 235, ${0.3 + intensity * 0.7})`;
  };

  const getTextColor = (value) => {
    if (value === 0) return 'var(--text-muted)';
    return value / maxVal > 0.5 ? '#ffffff' : 'var(--text-primary)';
  };

  // Hitung total untuk akurasi
  const total = confusionMatrix[0][0] + confusionMatrix[0][1] + confusionMatrix[1][0] + confusionMatrix[1][1];
  const accuracy = total > 0 ? ((confusionMatrix[0][0] + confusionMatrix[1][1]) / total * 100) : 0;
  const sensitivity = (confusionMatrix[1][1] + confusionMatrix[1][0]) > 0 
    ? (confusionMatrix[1][1] / (confusionMatrix[1][1] + confusionMatrix[1][0]) * 100) 
    : 0;
  const specificity = (confusionMatrix[0][0] + confusionMatrix[0][1]) > 0 
    ? (confusionMatrix[0][0] / (confusionMatrix[0][0] + confusionMatrix[0][1]) * 100) 
    : 0;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Dashboard Dataset Tidak Seimbang</h1>
            <p className="subtitle">Evaluasi Model SimCLR + MLP pada Data Tidak Seimbang</p>
          </div>
          <div className="model-badge">
            <span className="badge">SimCLR + MLP</span>
            <span className="badge-info">Self-Supervised Learning</span>
          </div>
        </div>
        <p className="description">
          Model yang menggabungkan SimCLR (Contrastive Self-Supervised Learning) 
          dengan MLP classifier. Pendekatan ini efektif untuk dataset tidak seimbang 
          dengan mempelajari representasi fitur yang robust.
        </p>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Pengujian" 
          value={data.total_test || 0} 
          icon="📊"
        />
        <MetricCard 
          title="Recall" 
          value={`${((data.recall || 0) * 100).toFixed(2)}%`}
          icon="🎯"
          color="#3b82f6"
        />
        <MetricCard 
          title="Precision" 
          value={`${((data.precision || 0) * 100).toFixed(2)}%`}
          icon="📈"
          color="#8b5cf6"
        />
        <MetricCard 
          title="F1-Score" 
          value={`${((data.f1_score || 0) * 100).toFixed(2)}%`}
          icon="⭐"
          color="#f59e0b"
        />
      </div>

      {/* Chart Row */}
      <div className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="panel-header">
            <h2>Performa Pengujian</h2>
            <span className="panel-subtitle">Recall vs Precision vs F1-Score</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="test" stroke="var(--text-muted)" />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="recall" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Recall"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="precision" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Precision"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="f1" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="F1-Score"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Distribusi Prediksi</h2>
            <span className="panel-subtitle">Normal vs Anomali</span>
          </div>
          <div className="pie-chart-container">
            <PieChart width={300} height={250}>
              <Pie
                data={chartData}
                dataKey="value"
                outerRadius={80}
                label={({ name, percent }) => 
                  `${name} ${(percent * 100).toFixed(1)}%`
                }
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </div>
      </div>

      {/* Dataset Features Table + Confusion Matrix */}
      <div className="dashboard-grid second-row">
        {/* Dataset Features Table */}
        <div className="panel dataset-panel">
          <div className="panel-header">
            <h2>📋 Fitur Dataset</h2>
            <span className="panel-subtitle">11 Fitur yang Digunakan</span>
          </div>
          <div className="table-wrapper">
            <table className="features-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Fitur</th>
                  <th>Tipe</th>
                  <th>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {datasetFeatures.map((feature) => (
                  <tr key={feature.no}>
                    <td>{feature.no}</td>
                    <td><code>{feature.name}</code></td>
                    <td>
                      <span className={`type-badge ${feature.type === 'Numerik' ? 'numeric' : 'categorical'}`}>
                        {feature.type}
                      </span>
                    </td>
                    <td>{feature.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confusion Matrix */}
        <div className="panel confusion-panel">
          <div className="panel-header">
            <h2>📊 Confusion Matrix</h2>
            <span className="panel-subtitle">Heatmap Kesalahan Klasifikasi</span>
          </div>
          <div className="confusion-container">
            <div className="confusion-grid-custom">
              <div className="confusion-header">
                <div className="confusion-empty"></div>
                <div className="confusion-pred-label">Prediksi Normal</div>
                <div className="confusion-pred-label">Prediksi Anomali</div>
              </div>
              
              <div className="confusion-row">
                <div className="confusion-actual-label">Aktual Normal</div>
                <div 
                  className="confusion-cell"
                  style={{ 
                    backgroundColor: getColor(confusionMatrix[0][0]),
                    color: getTextColor(confusionMatrix[0][0])
                  }}
                >
                  <span className="confusion-value">{confusionMatrix[0][0]}</span>
                  <span className="confusion-label-sm">TN</span>
                </div>
                <div 
                  className="confusion-cell fp"
                  style={{ 
                    backgroundColor: getColor(confusionMatrix[0][1]),
                    color: getTextColor(confusionMatrix[0][1])
                  }}
                >
                  <span className="confusion-value">{confusionMatrix[0][1]}</span>
                  <span className="confusion-label-sm">FP</span>
                </div>
              </div>
              
              <div className="confusion-row">
                <div className="confusion-actual-label">Aktual Anomali</div>
                <div 
                  className="confusion-cell fn"
                  style={{ 
                    backgroundColor: getColor(confusionMatrix[1][0]),
                    color: getTextColor(confusionMatrix[1][0])
                  }}
                >
                  <span className="confusion-value">{confusionMatrix[1][0]}</span>
                  <span className="confusion-label-sm">FN</span>
                </div>
                <div 
                  className="confusion-cell"
                  style={{ 
                    backgroundColor: getColor(confusionMatrix[1][1]),
                    color: getTextColor(confusionMatrix[1][1])
                  }}
                >
                  <span className="confusion-value">{confusionMatrix[1][1]}</span>
                  <span className="confusion-label-sm">TP</span>
                </div>
              </div>
            </div>

            <div className="confusion-legend">
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#2563eb' }}></span>
                TN = True Negative (Normal terdeteksi Normal)
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                FP = False Positive (Normal terdeteksi Anomali)
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                FN = False Negative (Anomali terdeteksi Normal) ⚠️
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
                TP = True Positive (Anomali terdeteksi Anomali)
              </span>
            </div>

            <div className="confusion-metrics">
              <div className="cm-metric">
                <span className="cm-label">Akurasi</span>
                <span className="cm-value">{accuracy.toFixed(2)}%</span>
              </div>
              <div className="cm-metric">
                <span className="cm-label">Sensitivity (Recall)</span>
                <span className="cm-value">{sensitivity.toFixed(2)}%</span>
              </div>
              <div className="cm-metric">
                <span className="cm-label">Specificity</span>
                <span className="cm-value">{specificity.toFixed(2)}%</span>
              </div>
              <div className="cm-metric">
                <span className="cm-label">F1-Score</span>
                <span className="cm-value">{data.f1_score ? (data.f1_score * 100).toFixed(2) : '0'}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Info */}
      <div className="model-info-panel">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Model</span>
            <span className="info-value">SimCLR + MLP</span>
          </div>
          <div className="info-item">
            <span className="info-label">Pendekatan</span>
            <span className="info-value">Self-Supervised Learning</span>
          </div>
          <div className="info-item">
            <span className="info-label">Teknik</span>
            <span className="info-value">Contrastive Learning</span>
          </div>
          <div className="info-item">
            <span className="info-label">Data Normal</span>
            <span className="info-value">{data.normal_count || 0}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Data Anomali</span>
            <span className="info-value">{data.anomaly_count || 0}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Data</span>
            <span className="info-value">
              {(data.normal_count || 0) + (data.anomaly_count || 0)}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Terakhir Update</span>
            <span className="info-value">
              {data.created_at ? new Date(data.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImbalancedDashboard;