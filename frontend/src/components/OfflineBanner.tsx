import React, { useEffect } from 'react';
import { useOffline } from '../offline/useOffline';
import { dismissReconnected } from '../offline/status';

const formatTime = (ms: number) => {
    const d = new Date(ms);
    const sameDay = d.toDateString() === new Date().toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return sameDay ? time : `${d.toLocaleDateString()} ${time}`;
};

const base: React.CSSProperties = {
    position: 'fixed',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2000,
    borderRadius: 99,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '8px 18px',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.03em',
    fontFamily: 'var(--font)',
};

/** Shown at the top of both portals while offline, and briefly after reconnecting. */
const OfflineBanner = () => {
    const { isOffline, dataFrom, justReconnected } = useOffline();

    useEffect(() => {
        if (!justReconnected) return;
        const t = window.setTimeout(dismissReconnected, 15000);
        return () => clearTimeout(t);
    }, [justReconnected]);

    if (isOffline) {
        return (
            <div role="status" style={{ ...base, background: '#5b4a3f', color: '#fff', pointerEvents: 'none' }}>
                <span>⚠ You're offline – read-only mode</span>
                <span style={{ opacity: 0.8, fontWeight: 500 }}>
                    {dataFrom ? `Showing data from ${formatTime(dataFrom)}` : 'Showing saved data'}
                </span>
            </div>
        );
    }

    if (justReconnected) {
        return (
            <div role="status" style={{ ...base, background: '#3b5a38', color: '#fff' }}>
                <span>✓ Back online</span>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        background: '#fff',
                        color: '#3b5a38',
                        border: 'none',
                        borderRadius: 99,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Refresh data
                </button>
                <button
                    onClick={dismissReconnected}
                    aria-label="Dismiss"
                    style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}
                >
                    ✕
                </button>
            </div>
        );
    }

    return null;
};

export default OfflineBanner;