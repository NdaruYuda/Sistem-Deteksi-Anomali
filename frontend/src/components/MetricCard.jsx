// frontend/src/components/MetricCard.jsx
function MetricCard({ title, value, icon, color = "#2563eb" }) {
  return (
    <div className="metric-card">
      {icon && <div className="metric-icon">{icon}</div>}
      <div className="metric-content">
        <div className="metric-title">{title}</div>
        <div className="metric-value" style={{ color: color }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default MetricCard;