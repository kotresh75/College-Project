import React, { useState, useEffect, useRef } from 'react';
import '../../styles/components/update-banner.css';

/**
 * UpdateBanner — Shows a top banner + modal for app updates.
 * 
 * States:
 * 1. Hidden (no update)
 * 2. Downloading — banner + optional modal with detailed progress
 * 3. Ready — banner with "Restart" button + modal showing completion
 */

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec === 0) return '—';
    return formatBytes(bytesPerSec) + '/s';
}

const UpdateBanner = () => {
    const [status, setStatus] = useState('idle'); // idle | downloading | ready
    const [version, setVersion] = useState('');
    const [progress, setProgress] = useState(0);
    const [transferred, setTransferred] = useState(0);
    const [total, setTotal] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [dismissed, setDismissed] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const lastUpdate = useRef({ time: 0, bytes: 0 });

    useEffect(() => {
        if (!window.electron?.onUpdateAvailable) return;

        window.electron.onUpdateAvailable((info) => {
            setVersion(info.version);
            setStatus('downloading');
            setDismissed(false);
            setShowModal(true); // Auto-open modal when update starts
            lastUpdate.current = { time: Date.now(), bytes: 0 };
        });

        window.electron.onUpdateProgress((info) => {
            const now = Date.now();
            const elapsed = (now - lastUpdate.current.time) / 1000;
            const bytesDelta = (info.transferred || 0) - lastUpdate.current.bytes;

            if (elapsed > 0.5) {
                setSpeed(bytesDelta / elapsed);
                lastUpdate.current = { time: now, bytes: info.transferred || 0 };
            }

            setProgress(info.percent || 0);
            setTransferred(info.transferred || 0);
            setTotal(info.total || 0);
        });

        window.electron.onUpdateDownloaded((info) => {
            setVersion(info.version);
            setStatus('ready');
            setProgress(100);
            setDismissed(false);
            setSpeed(0);
        });

        return () => {
            if (window.electron?.removeUpdateListeners) {
                window.electron.removeUpdateListeners();
            }
        };
    }, []);

    const handleInstall = () => {
        if (window.electron?.installUpdate) {
            window.electron.installUpdate();
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setShowModal(false);
    };

    if (status === 'idle' || dismissed) return null;

    const isPreparing = status === 'downloading' && progress === 0;

    return (
        <>
            {/* Top Banner */}
            <div className={`update-banner update-banner--${status}`} onClick={() => setShowModal(true)}>
                <div className="update-banner__content">
                    <svg className="update-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {status === 'downloading' ? (
                            <>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </>
                        ) : (
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
                        )}
                    </svg>
                    <span className="update-banner__text">
                        {status === 'downloading'
                            ? isPreparing
                                ? <>Preparing update v{version}…</>
                                : <>Downloading v{version}… <strong>{Math.round(progress)}%</strong></>
                            : <>Update v{version} is ready — restart to apply</>
                        }
                    </span>

                    {status === 'downloading' && !isPreparing && (
                        <div className="update-banner__progress">
                            <div className="update-banner__progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                    )}

                    <div className="update-banner__actions">
                        {status === 'ready' && (
                            <button className="update-banner__btn update-banner__btn--install" onClick={(e) => { e.stopPropagation(); handleInstall(); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                                Restart Now
                            </button>
                        )}
                        <button className="update-banner__btn update-banner__btn--dismiss" onClick={(e) => { e.stopPropagation(); handleDismiss(); }} aria-label="Dismiss">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Download Modal */}
            {showModal && (
                <div className="update-modal__overlay" onClick={() => setShowModal(false)}>
                    <div className="update-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="update-modal__header">
                            <div className={`update-modal__header-icon ${status === 'ready' ? 'update-modal__header-icon--ready' : ''}`}>
                                {status === 'ready' ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                )}
                            </div>
                            <h3 className="update-modal__title">
                                {status === 'ready' ? 'Update Ready!' : isPreparing ? 'Preparing Update' : 'Downloading Update'}
                            </h3>
                            <p className="update-modal__version">Version {version}</p>
                        </div>

                        {/* Progress Section */}
                        <div className="update-modal__body">
                            {status === 'downloading' && (
                                <>
                                    {/* Large progress bar */}
                                    <div className="update-modal__progress-wrap">
                                        <div className="update-modal__progress-bar">
                                            <div
                                                className={`update-modal__progress-fill ${isPreparing ? 'update-modal__progress-fill--indeterminate' : ''}`}
                                                style={isPreparing ? {} : { width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className="update-modal__percent">{isPreparing ? '…' : `${Math.round(progress)}%`}</span>
                                    </div>

                                    {/* Stats row */}
                                    <div className="update-modal__stats">
                                        <div className="update-modal__stat">
                                            <span className="update-modal__stat-label">{isPreparing ? 'Status' : 'Downloaded'}</span>
                                            <span className="update-modal__stat-value">
                                                {isPreparing ? 'Calculating changes…' : `${formatBytes(transferred)} / ${formatBytes(total)}`}
                                            </span>
                                        </div>
                                        {!isPreparing && (
                                            <div className="update-modal__stat">
                                                <span className="update-modal__stat-label">Speed</span>
                                                <span className="update-modal__stat-value">{formatSpeed(speed)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <p className="update-modal__hint">
                                        {isPreparing
                                            ? 'Comparing files to download only what changed. This may take a moment…'
                                            : 'You can continue using the app. The update will be applied on restart.'
                                        }
                                    </p>
                                </>
                            )}

                            {status === 'ready' && (
                                <>
                                    <div className="update-modal__ready-info">
                                        <svg className="update-modal__check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                        <p>Update has been downloaded and is ready to install. Restart the app to apply changes.</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="update-modal__footer">
                            <button className="update-modal__btn update-modal__btn--secondary" onClick={() => setShowModal(false)}>
                                {status === 'ready' ? 'Later' : 'Minimize'}
                            </button>
                            {status === 'ready' && (
                                <button className="update-modal__btn update-modal__btn--primary" onClick={handleInstall}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                    Restart &amp; Install
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UpdateBanner;
