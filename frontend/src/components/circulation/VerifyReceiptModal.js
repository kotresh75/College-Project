import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, CheckCircle } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useLanguage } from '../../context/LanguageContext';

const VerifyReceiptModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [receiptId, setReceiptId] = useState('');
    const [loading, setLoading] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [error, setError] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleVerify = async () => {
        if (!receiptId.trim()) return;

        setLoading(true);
        setError(null);
        setReceiptData(null);

        try {
            // Smart Input: Auto-prepend 'REC-' if purely numeric or missing it
            let queryId = receiptId.trim();
            if (/^\d+$/.test(queryId)) {
                queryId = `REC-${queryId}`; // User entered just the number
            } else if (!queryId.toUpperCase().startsWith('REC-')) {
                // If they typed something else, let's try searching as is, but maybe help them out?
                // For now, assume exact match or numeric shortcut.
            }

            const token = localStorage.getItem('auth_token');
            // Try explicit ID match first
            // Note: Backend uses LIKE %ID%, so strict formatting isn't always required but good for precision
            const response = await fetch(`http://localhost:17221/api/fines/receipt/${queryId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error(t('circulation.verify_receipt.err_not_found'));
                throw new Error(t('circulation.verify_receipt.err_failed'));
            }

            const data = await response.json();
            setReceiptData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1400] flex items-center justify-center animate-fade-in p-4" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400
        }}>
            <div className="glass-panel w-full max-w-md overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
                style={{
                    padding: 0,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    boxShadow: 'var(--glass-shadow)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-lg)'
                }}
            >
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <CheckCircle className="text-green-500" /> {t('circulation.verify_receipt.title')}
                    </h2>
                    <button onClick={onClose} className="transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={receiptId}
                            onChange={(e) => setReceiptId(e.target.value)}
                            placeholder={t('circulation.verify_receipt.placeholder')}
                            className="glass-input flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                            autoFocus
                        />
                        <button
                            onClick={handleVerify}
                            disabled={loading || !receiptId.trim()}
                            className="primary-glass-btn flex items-center gap-2"
                        >
                            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Search size={18} />}
                            {loading ? t('circulation.verify_receipt.verifying') : t('circulation.verify_receipt.verify_btn')}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {receiptData && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                            <div className="p-4 rounded-lg border space-y-3" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--glass-border)' }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs uppercase font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('circulation.verify_receipt.student')}</div>
                                        <div className="font-medium" style={{ color: 'var(--text-main)' }}>{receiptData.student_name}</div>
                                        <div className="text-xs opacity-70" style={{ color: 'var(--text-secondary)' }}>{receiptData.register_number}</div>
                                        <div className="text-[10px] text-emerald-500 mt-1 font-mono">{receiptData.id.startsWith('REC-') ? receiptData.id : `REC-${receiptData.id}`}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs uppercase font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('circulation.verify_receipt.date')}</div>
                                        <div style={{ color: 'var(--text-main)' }}>{formatDate(receiptData.date)}</div>
                                    </div>
                                </div>

                                <div className="border-t my-2" style={{ borderColor: 'var(--glass-border)' }}></div>

                                <div className="space-y-2">
                                    {receiptData.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span style={{ color: 'var(--text-secondary)' }}>{item.description}</span>
                                            <span className="font-medium" style={{ color: 'var(--text-main)' }}>₹{item.amount}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t my-2 pt-2 flex justify-between items-center" style={{ borderColor: 'var(--glass-border)' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{t('circulation.verify_receipt.total_paid')}</span>
                                    <span className="text-xl font-bold text-green-500">₹{receiptData.total}</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/30">
                                    <CheckCircle size={10} /> {t('circulation.verify_receipt.valid_badge')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t flex justify-end" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
                    <button onClick={onClose} className="px-6 py-2 rounded-lg transition-colors text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10" style={{ background: 'rgba(128,128,128,0.1)', color: 'var(--text-main)' }}>
                        {t('circulation.verify_receipt.close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VerifyReceiptModal;
