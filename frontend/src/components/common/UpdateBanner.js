import React, { useState, useEffect } from 'react';
import '../../styles/components/update-banner.css';

/**
 * UpdateBanner — Shows a top banner when an app update is available/downloaded.
 * 
 * States:
 * 1. Hidden (no update)
 * 2. Downloading — shows progress bar
 * 3. Ready — update downloaded, shows "Restart" button
 */
const UpdateBanner = () => {
    const [status, setStatus] = useState('idle'); // idle | downloading | ready
    const [version, setVersion] = useState('');
    const [progress, setProgress] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Only works in Electron (window.electron is exposed via preload.js)
        if (!window.electron?.onUpdateAvailable) return;

        window.electron.onUpdateAvailable((info) => {
            setVersion(info.version);
            setStatus('downloading');
            setDismissed(false);
        });

        window.electron.onUpdateProgress((info) => {
            setProgress(info.percent);
        });

        window.electron.onUpdateDownloaded((info) => {
            setVersion(info.version);
            setStatus('ready');
            setProgress(100);
            setDismissed(false);
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
    };

    // Don't render if no update or dismissed
    if (status === 'idle' || dismissed) return null;

    return (
        <div className={`update-banner update-banner--${status}`}>
            <div className="update-banner__content">
                {/* Icon */}
                <svg className="update-banner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {status === 'downloading' ? (
                        <>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </>
                    ) : (
                        <>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </>
                    )}
                </svg>

                {/* Text */}
                <span className="update-banner__text">
                    {status === 'downloading' ? (
                        <>Downloading update v{version}… <strong>{progress}%</strong></>
                    ) : (
                        <>Update v{version} is ready — restart to apply</>
                    )}
                </span>

                {/* Progress bar (downloading state) */}
                {status === 'downloading' && (
                    <div className="update-banner__progress">
                        <div
                            className="update-banner__progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="update-banner__actions">
                    {status === 'ready' && (
                        <button className="update-banner__btn update-banner__btn--install" onClick={handleInstall}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4v6h-6" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            Restart Now
                        </button>
                    )}
                    <button className="update-banner__btn update-banner__btn--dismiss" onClick={handleDismiss} aria-label="Dismiss">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateBanner;
