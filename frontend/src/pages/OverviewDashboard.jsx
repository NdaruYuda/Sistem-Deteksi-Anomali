// frontend/src/pages/OverviewDashboard.jsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../api/api";
import MetricCard from "../components/MetricCard";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer 
} from "recharts";

function OverviewDashboard({ model }) {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [confusionData, setConfusionData] = useState({
    tp: 0,
    tn: 0,
    fp: 0,
    fn: 0
  });

  const COLORS = ["#22c55e", "#ef4444"];
  const activeModel = model || (location.pathname.includes("simclr") ? "simclr" : "baseline");

  useEffect(() => {
    setLoading(true);
    const endpoint = activeModel === "baseline" ? "/dashboard/baseline" : "/dashboard/simclr";
    
    API.get(endpoint)
      .then((res) => {
        setData(res.data);
        if (res.data && !res.data.message) {
          setConfusionData({
            tp: res.data.true_positive || 0,
            tn: res.data.true_negative || 0,
            fp: res.data.false_positive || 0,
            fn: res.data.false_negative || 0
          });
        }
      })
      .catch((err) => console.error(err));

    API.get("/history")
      .then((res) => {
        if (Array.isArray(res.data)) {
          const modelName = activeModel === "baseline" ? "Baseline MLP" : "SimCLR + MLP";
          const filteredHistory = res.data.filter(
            item => item.model_name === modelName
          );
          setHistoryData(filteredHistory.slice(0, 10).reverse());
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [activeModel]);

  if (loading) {
    return <div className="loading-spinner">Memuat data...</div>;
  }

  if (!data || data.message) {
    return (
      <div className="empty-state">
        <h2>Belum Ada Data Pengujian</h2>
        <p>Silakan upload dataset dan lakukan pengujian terlebih dahulu</p>
      </div>
    );
  }

  const chartData = [
    { name: "Normal", value: data.normal_count || 0 },
    { name: "Anomali", value: data.anomaly_count || 0 }
  ];

  const performanceData = historyData.length > 0 
    ? historyData.map((item, index) => ({
        test: `#${index + 1}`,
        recall: Number((item.recall * 100).toFixed(2)),
        precision: Number((item.precision * 100).toFixed(2)),
        f1: Number((item.f1_score * 100).toFixed(2))
      }))
    : [{ test: 'Test 1', recall: 0, precision: 0, f1: 0 }];

  const confusionMatrix = [
    [confusionData.tn || 0, confusionData.fp || 0],
    [confusionData.fn || 0, confusionData.tp || 0]
  ];
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

  const total = confusionMatrix[0][0] + confusionMatrix[0][1] + confusionMatrix[1][0] + confusionMatrix[1][1];
  const accuracy = total > 0 ? ((confusionMatrix[0][0] + confusionMatrix[1][1]) / total * 100) : 0;
  const sensitivity = (confusionMatrix[1][1] + confusionMatrix[1][0]) > 0 
    ? (confusionMatrix[1][1] / (confusionMatrix[1][1] + confusionMatrix[1][0]) * 100) 
    : 0;
  const specificity = (confusionMatrix[0][0] + confusionMatrix[0][1]) > 0 
    ? (confusionMatrix[0][0] / (confusionMatrix[0][0] + confusionMatrix[0][1]) * 100) 
    : 0;

  return (
    <>
      {/* Metrics */}
      <div className="metrics-grid">
        <MetricCard title="Total Pengujian" value={data.total_test || 0} icon="📊" />
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
                <Line type="monotone" dataKey="recall" stroke="#3b82f6" strokeWidth={2} name="Recall" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="precision" stroke="#8b5cf6" strokeWidth={2} name="Precision" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="f1" stroke="#f59e0b" strokeWidth={2} name="F1-Score" dot={{ r: 4 }} />
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
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
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
                className="confusion-cell tn"
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
                className="confusion-cell tp"
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

      {/* Model Info */}
      <div className="model-info-panel">
        <div className="model-info-header">
          <h3>📋 Informasi Model</h3>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Model</span>
            <span className="info-value">
              {activeModel === "baseline" ? "Baseline MLP" : "SimCLR + MLP"}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Pendekatan</span>
            <span className="info-value">
              {activeModel === "baseline" ? "Supervised Learning" : "Self-Supervised Learning"}
            </span>
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
    </>
  );
}

export default OverviewDashboard;