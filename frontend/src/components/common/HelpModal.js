import React, { useEffect, useState } from 'react';
import { X, HelpCircle, Repeat } from 'lucide-react';

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }} onClick={onClose}>
            <div className="glass-panel bounce-in" style={{
                width: '700px', maxWidth: '90%', maxHeight: '80vh',
                display: 'flex', flexDirection: 'column', padding: 0,
                background: 'var(--bg-color)', border: '1px solid var(--glass-border)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '20px', borderBottom: '1px solid var(--glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)'
                }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Repeat size={24} className="text-primary" />
                        Circulation Help
                    </h2>
                    <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
                    <div className="help-content">
                        <p className="text-secondary mb-6">Manage book issues, returns, and renewals efficiently.</p>

                        <div className="help-grid">
                            <div className="help-card">
                                <h4>Issue Book</h4>
                                <ol>
                                    <li>Scan or enter <strong>Student ID</strong>.</li>
                                    <li>Scan <strong>Book Barcode/ISBN</strong>.</li>
                                    <li>Verify details and click <strong>Issue</strong>.</li>
                                </ol>
                            </div>
                            <div className="help-card">
                                <h4>Return Book</h4>
                                <ol>
                                    <li>Go to <strong>Return Tab</strong> (F2).</li>
                                    <li>Scan <strong>Book Barcode</strong>.</li>
                                    <li>System auto-calculates fines if overdue.</li>
                                </ol>
                            </div>
                            <div className="help-card">
                                <h4>Renewals</h4>
                                <p>Books can be renewed if not reserved by another user. Default renewal period is 15 days.</p>
                            </div>
                        </div>

                        <div className="help-alert">
                            <strong>Note:</strong> Overdue fines are calculated automatically based on policy settings.
                        </div>

                        <div className="help-section mt-6">
                            <h4>Keyboard Shortcuts</h4>
                            <div className="shortcuts-inline">
                                <span className="shortcut-badge">F1 <span className="desc">Issue Tab</span></span>
                                <span className="shortcut-badge">F2 <span className="desc">Return Tab</span></span>
                                <span className="shortcut-badge">` <span className="desc">Help</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .help-content h4 {
                    margin-top: 0;
                    color: var(--primary-color);
                    font-size: 1.1rem;
                    margin-bottom: 10px;
                }
                .help-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                }
                .help-card {
                    background: rgba(255,255,255,0.03);
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid var(--glass-border);
                }
                .help-card ol, .help-card ul {
                    padding-left: 20px;
                    color: var(--text-secondary);
                    margin: 0;
                }
                .help-card li {
                    margin-bottom: 5px;
                }
                .help-alert {
                    padding: 15px;
                    background: rgba(234, 179, 8, 0.1);
                    border: 1px solid rgba(234, 179, 8, 0.3);
                    border-radius: 8px;
                    color: #EAB308;
                    font-size: 0.9rem;
                }
                .shortcuts-inline {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .shortcut-badge {
                    background: rgba(255,255,255,0.1);
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-family: monospace;
                    font-weight: bold;
                    color: var(--text-main);
                    border: 1px solid var(--glass-border);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .shortcut-badge .desc {
                    font-family: sans-serif;
                    font-weight: normal;
                    font-size: 0.8em;
                    opacity: 0.7;
                }
            `}</style>
        </div>
    );
};

export default HelpModal;
