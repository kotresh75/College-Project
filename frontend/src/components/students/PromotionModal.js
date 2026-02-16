import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, ArrowRight, ShieldAlert, Download, RefreshCw } from 'lucide-react';

const PromotionModal = ({ onClose, onPromoteComplete }) => {
    const [step, setStep] = useState(1); // 1: Intro/Scan, 2: Review/Defaulters, 3: Confirm/Success
    const [loading, setLoading] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState('');

    // Step 1: Scan
    const handleScan = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:17221/api/students/promotion-scan', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setScanResult(data);
                setStep(2);
            } else {
                setError(data.error || "Scan failed");
            }
        } catch (err) {
            setError("Network Error");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Confirm Promote (excluding defaulters)
    const handlePromote = async () => {
        setLoading(true);
        setError('');
        try {
            // Collect IDs of defaulters to exclude
            const excludeIds = scanResult?.liabilities?.map(s => s.id) || [];

            const res = await fetch('http://localhost:17221/api/students/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exclude_ids: excludeIds })
            });
            const data = await res.json();

            if (res.ok) {
                setStep(3); // Success
                if (onPromoteComplete) onPromoteComplete();
            } else {
                setError(data.error || "Promotion failed");
            }
        } catch (err) {
            setError("Network Error");
        } finally {
            setLoading(false);
        }
    };

    const downloadDefaulterReport = () => {
        if (!scanResult?.liabilities) return;

        // Simple CSV generation
        const headers = "Name,Register No,Semester,Department,Pending Books,Pending Fines\n";
        const rows = scanResult.liabilities.map(s =>
            `${s.full_name},${s.register_number},${s.semester},${s.department},${s.pending_books},${s.pending_fines}`
        ).join("\n");

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `defaulters_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return createPortal(
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2200
        }}>
            <div className="glass-panel bounce-in" style={{ width: '95%', maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, background: 'var(--bg-color)', border: '1px solid var(--glass-border)' }}>

                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <RefreshCw size={20} /> End of Semester Promotion
                    </h2>
                    <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                </div>

                {/* Body */}
                <div style={{ padding: '25px', overflowY: 'auto' }}>

                    {error && (
                        <div style={{ background: 'rgba(252, 129, 129, 0.2)', color: '#fc8181', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid rgba(252, 129, 129, 0.3)' }}>
                            {error}
                        </div>
                    )}

                    {/* STEP 1: Intro & Scan */}
                    {step === 1 && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                This workflow will analyze all students for promotion eligibility.
                                Students with unreturned books or unpaid fines will be flagged as <strong>Defaulters</strong> and will NOT be promoted.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', width: '200px' }}>
                                    <h4 style={{ margin: '0 0 5px 0' }}>Sem 1-5</h4>
                                    <span style={{ color: 'var(--success-color)' }}>Promote to Next Sem</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', width: '200px' }}>
                                    <h4 style={{ margin: '0 0 5px 0' }}>Sem 6</h4>
                                    <span style={{ color: '#a29bfe' }}>Graduate to Alumni</span>
                                </div>
                            </div>
                            <br />
                            <button className="primary-glass-btn" style={{ padding: '12px 30px', fontSize: '1rem' }} onClick={handleScan} disabled={loading}>
                                {loading ? 'Scanning Database...' : 'Start Promotion Scan'}
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Review Defaulters */}
                    {step === 2 && scanResult && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, marginBottom: 20 }}>
                                <div style={{ background: 'rgba(66, 153, 225, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(66, 153, 225, 0.2)' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Active</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{scanResult.total_active}</div>
                                </div>
                                <div style={{ background: 'rgba(72, 187, 120, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(72, 187, 120, 0.2)' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Eligible</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>{scanResult.eligible_count}</div>
                                </div>
                                <div style={{ background: 'rgba(252, 129, 129, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(252, 129, 129, 0.2)' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Defaulters</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>{scanResult.defaulter_count}</div>
                                </div>
                            </div>

                            {scanResult.defaulter_count > 0 && (
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger-color)' }}>
                                            <ShieldAlert size={18} /> Defaulting Students (Will stay in current Sem)
                                        </h4>
                                        <button className="icon-btn-sm" onClick={downloadDefaulterReport} title="Download Report">
                                            <Download size={16} /> CSV
                                        </button>
                                    </div>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead style={{ background: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0 }}>
                                                <tr>
                                                    <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                                                    <th style={{ padding: '8px', textAlign: 'left' }}>Sem</th>
                                                    <th style={{ padding: '8px', textAlign: 'center' }}>Books</th>
                                                    <th style={{ padding: '8px', textAlign: 'center' }}>Fines</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scanResult.liabilities.map(s => (
                                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                        <td style={{ padding: '8px' }}>{s.full_name}</td>
                                                        <td style={{ padding: '8px' }}>{s.semester}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center', color: s.pending_books > 0 ? 'var(--danger-color)' : 'inherit' }}>{s.pending_books}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center', color: s.pending_fines > 0 ? 'var(--danger-color)' : 'inherit' }}>{s.pending_fines}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                <button className="icon-btn-ghost" onClick={onClose}>Cancel</button>
                                <button className="primary-glass-btn" onClick={handlePromote} disabled={loading}>
                                    {loading ? 'Processing...' : `Promote ${scanResult.eligible_count} Students`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Success */}
                    {step === 3 && (
                        <div style={{ textAlign: 'center', padding: '30px 0' }}>
                            <CheckCircle size={64} color="var(--success-color)" style={{ marginBottom: 20 }} />
                            <h3>Promotion Successful!</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Eligible students have been promoted to the next semester.<br />
                                Final year students have been marked as Alumni.
                            </p>
                            <button className="primary-glass-btn" onClick={onClose} style={{ marginTop: 20 }}>
                                Close
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>,
        document.body
    );
};

export default PromotionModal;
