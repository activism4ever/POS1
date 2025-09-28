import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = 'primary',
  subtitle,
  onClick,
  loading = false
}) => {
  const colorClasses = {
    primary: 'text-primary border-primary bg-primary-subtle',
    success: 'text-success border-success bg-success-subtle',
    warning: 'text-warning border-warning bg-warning-subtle',
    info: 'text-info border-info bg-info-subtle',
    danger: 'text-danger border-danger bg-danger-subtle'
  };

  return (
    <div 
      className={`card border-start border-4 ${colorClasses[color]} h-100 shadow-sm stat-card ${onClick ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
      style={{
        transition: 'all 0.3s ease',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div className="card-body d-flex align-items-center">
        <div className="flex-grow-1">
          <div className="text-xs fw-bold text-uppercase mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            {title}
          </div>
          <div className="h5 mb-0 fw-bold">
            {loading ? (
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            ) : (
              value
            )}
          </div>
          {subtitle && (
            <div className="text-muted small mt-1">{subtitle}</div>
          )}
        </div>
        <div className={`text-${color}`} style={{ fontSize: '2rem', opacity: 0.8 }}>
          <i className={`bi ${icon}`}></i>
        </div>
      </div>
    </div>
  );
};

export default StatCard;