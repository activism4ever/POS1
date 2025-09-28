import React, { useState } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationPanelProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications = [],
  onMarkAsRead,
  onClearAll
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIconClass = (type: string) => {
    switch (type) {
      case 'info': return 'bi-info-circle text-info';
      case 'warning': return 'bi-exclamation-triangle text-warning';
      case 'success': return 'bi-check-circle text-success';
      case 'danger': return 'bi-x-circle text-danger';
      default: return 'bi-bell text-primary';
    }
  };

  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-light text-dark position-relative"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ border: 'none' }}
      >
        <i className="bi bi-bell" style={{ fontSize: '1.1rem' }}></i>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="dropdown-menu dropdown-menu-end show p-0" style={{ width: '350px', maxHeight: '400px' }}>
            <div className="dropdown-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Notifications</h6>
              {notifications.length > 0 && (
                <button
                  className="btn btn-link btn-sm text-decoration-none p-0"
                  onClick={onClearAll}
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="dropdown-divider m-0"></div>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-bell-slash" style={{ fontSize: '2rem' }}></i>
                  <p className="mb-0 mt-2">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`dropdown-item-text p-3 border-bottom ${!notification.read ? 'bg-light' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onMarkAsRead && onMarkAsRead(notification.id)}
                  >
                    <div className="d-flex align-items-start">
                      <i className={`${getIconClass(notification.type)} me-3 mt-1`}></i>
                      <div className="flex-grow-1">
                        <h6 className="mb-1 text-dark">{notification.title}</h6>
                        <p className="mb-1 text-muted small">{notification.message}</p>
                        <small className="text-muted">{notification.time}</small>
                      </div>
                      {!notification.read && (
                        <div className="bg-primary rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Backdrop */}
          <div 
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ zIndex: -1 }}
            onClick={() => setIsOpen(false)}
          ></div>
        </>
      )}
    </div>
  );
};

export default NotificationPanel;