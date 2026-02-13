import React, { useState, useEffect } from 'react';
import { X, Download, FileText, FileSpreadsheet, Layers, CheckCircle2, Filter } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const ExportModal = ({ onClose, onExport, totalBooks, selectedCount, filteredCount, data = [], columns = [], onFetchData }) => {
    const { t } = useLanguage();
    const [scope, setScope] = useState('all'); // all, selected, filtered
    const [format, setFormat] = useState('xlsx');
    const [loading, setLoading] = useState(false);

    // Print State
    const [settings, setSettings] = useState({});

    useEffect(() => {
        fetch('http://localhost:17221/api/settings/app')
            .then(res => res.json())
            .then(data => setSettings(data))
            .catch(() => { });
    }, []);

    const handleExport = async () => {
        setLoading(true);
        try {
            await onExport(scope, format);
            onClose();
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const ScopeOption = ({ id, label, count, icon: Icon, disabled }) => (
        <div
            onClick={() => !disabled && setScope(id)}
            className="scope-option"
            style={{
                opacity: disabled ? 0.5 : 1,
                pointerEvents: disabled ? 'none' : 'auto',
                borderColor: scope === id ? 'var(--primary-color)' : 'var(--border-color)',
                background: scope === id ? 'var(--hover-overlay)' : 'transparent',
            }}
        >
            <div className="scope-icon" style={{
                background: scope === id ? 'var(--primary-color)' : 'var(--surface-secondary)',
                color: scope === id ? '#fff' : 'var(--text-secondary)'
            }}>
                <Icon size={20} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{count} Books</div>
            </div>
            {scope === id && <CheckCircle2 size={20} style={{ color: 'var(--primary-color)' }} />}
        </div>
    );

    return (
        <>
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
            }}>
                <div className="glass-panel bounce-in" style={{ width: '480px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '24px' }}>

                    {/* Header */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--surface-secondary)',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', background: 'var(--hover-overlay)', borderRadius: '10px', color: 'var(--text-primary)' }}>
                                <Download size={22} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{t('common.export.title')}</h2>
                                <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)', opacity: 0.8 }}>{t('common.export.subtitle')}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                    </div>

                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Scope Selection */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}>{t('common.export.source')}</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <ScopeOption id="all" label={t('common.export.all')} count={totalBooks} icon={Layers} />
                                {/* Always enabled - user can choose filtered even if same as all */}
                                <ScopeOption id="filtered" label={t('common.export.filtered')} count={filteredCount} icon={Filter} />
                                <ScopeOption id="selected" label={t('common.export.selected')} count={selectedCount} icon={CheckCircle2} disabled={selectedCount === 0} />
                            </div>
                        </div>

                        {/* Format Selection */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}>{t('common.export.format')}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>

                                {/* Excel Option */}
                                <div
                                    onClick={() => setFormat('xlsx')}
                                    className="format-card"
                                    style={{
                                        borderColor: format === 'xlsx' ? '#10b981' : 'var(--border-color)',
                                        background: format === 'xlsx' ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                                    }}
                                >
                                    <FileSpreadsheet size={24} style={{ color: format === 'xlsx' ? '#10b981' : 'var(--text-secondary)', marginBottom: '6px' }} />
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{t('common.export.excel')}</span>
                                </div>

                                {/* CSV Option */}
                                <div
                                    onClick={() => setFormat('csv')}
                                    className="format-card"
                                    style={{
                                        borderColor: format === 'csv' ? '#3b82f6' : 'var(--border-color)',
                                        background: format === 'csv' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                    }}
                                >
                                    <FileText size={24} style={{ color: format === 'csv' ? '#3b82f6' : 'var(--text-secondary)', marginBottom: '6px' }} />
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{t('common.export.csv')}</span>
                                </div>

                                {/* PDF Option */}
                                <div
                                    onClick={() => setFormat('pdf')}
                                    className="format-card"
                                    style={{
                                        borderColor: format === 'pdf' ? '#ef4444' : 'var(--border-color)',
                                        background: format === 'pdf' ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                                    }}
                                >
                                    <FileText size={24} style={{ color: format === 'pdf' ? '#ef4444' : 'var(--text-secondary)', marginBottom: '6px' }} />
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{t('common.export.pdf')}</span>
                                </div>


                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={loading}
                            className="primary-glass-btn"
                            style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                background:
                                    format === 'xlsx' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                                        format === 'pdf' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' :
                                            format === 'print' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' :
                                                'var(--primary-btn-bg)',
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'wait' : 'pointer'
                            }}
                        >
                            {loading ? <div className="spinner-sm" style={{ borderTopColor: 'white' }} /> : <Download size={20} />}
                            {loading ? t('common.loading') : `${t('common.export.export_btn')} ${format === 'xlsx' ? t('common.export.excel') : format === 'pdf' ? t('common.export.pdf') : t('common.export.csv')}`}
                        </button>

                    </div>
                </div>

                <style jsx>{`
                    .scope-option {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        border: 1px solid var(--border-color);
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .scope-option:hover {
                        background: var(--hover-overlay);
                        border-color: var(--border-color-strong);
                    }
                    .scope-icon {
                        width: 36px;
                        height: 36px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                    }
                    .format-card {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 16px;
                        border: 1px solid var(--border-color);
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .format-card:hover {
                        background: var(--hover-overlay);
                        border-color: var(--border-color-strong);
                    }
                `}</style>
            </div>

        </>
    );
};

export default ExportModal;
