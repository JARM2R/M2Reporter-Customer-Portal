'use client';

import { useInactivityTimer } from '@/hooks/useInactivityTimer';

export default function InactivityWarning() {
  const { showWarning, timeLeft, handleStayLoggedIn, handleLogout } = useInactivityTimer({
    warningTime: 8 * 60 * 1000,  // Show warning after 8 minutes
    logoutTime: 10 * 60 * 1000,  // Auto-logout after 10 minutes (high security)
  });

  if (!showWarning) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          maxWidth: '500px',
          width: '90%',
          zIndex: 9999,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {/* Warning Icon */}
          <div
            style={{
              fontSize: '48px',
              marginBottom: '20px',
            }}
          >
            ⏱️
          </div>

          {/* Title */}
          <h2
            style={{
              color: '#144478',
              fontSize: '24px',
              marginBottom: '15px',
              fontWeight: 'bold',
            }}
          >
            Session Timeout Warning
          </h2>

          {/* Message */}
          <p
            style={{
              color: '#666',
              fontSize: '16px',
              marginBottom: '10px',
              lineHeight: '1.5',
            }}
          >
            You've been inactive for a while. For your security, you'll be automatically logged out in:
          </p>

          {/* Countdown */}
          <div
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#dc3545',
              margin: '20px 0',
              fontFamily: 'monospace',
            }}
          >
            {timeLeft}
          </div>

          <p
            style={{
              color: '#666',
              fontSize: '14px',
              marginBottom: '30px',
            }}
          >
            Click "Stay Logged In" to continue your session.
          </p>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={handleStayLoggedIn}
              style={{
                padding: '12px 30px',
                backgroundColor: '#B3CC48',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#a3bc38';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#B3CC48';
              }}
            >
              Stay Logged In
            </button>

            <button
              onClick={handleLogout}
              style={{
                padding: '12px 30px',
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.borderColor = '#999';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}