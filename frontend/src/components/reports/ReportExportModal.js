import React, { useState } from 'react';
import { X, Download, FileText, FileSpreadsheet, Calendar, Clock, CalendarDays, CalendarRange, CalendarCheck, CheckCircle2, Table2, BarChart3, Layers } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const ReportExportModal = ({ onClose, onExport, currentPeriod = '30days' }) => {
    const { t } = useLanguage();
    const [period, setPeriod] = useState(currentPeriod);
    const [format, setFormat] = useState('xlsx');

    const [loading, setLoading] = useState(false);

    const periodOptions = [
        { id: 'today', label: t('reports.export.today') || 'Today', icon: Clock },
        { id: '7days', label: t('reports.period.7days') || 'Last 7 Days', icon: Calendar },
        { id: '30days', label: t('reports.period.30days') || 'Last 30 Days', icon: CalendarDays },
        { id: '90days', label: t('reports.period.90days') || 'Last 3 Months', icon: CalendarRange },
        { id: '365days', label: t('reports.period.365days') || 'Last Year', icon: CalendarCheck },
    ];

    const formatOptions = [
        { id: 'xlsx', label: t('common.export.excel') || 'Excel', icon: FileSpreadsheet, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        { id: 'csv', label: t('common.export.csv') || 'CSV', icon: FileText, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        { id: 'pdf', label: t('common.export.pdf') || 'PDF', icon: FileText, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    ];

    // Trigger rebuild
    const handleExport = async () => {
        setLoading(true);
        try {
            await onExport(period, format);
            if (format !== 'pdf') {
                onClose();
            }
        } catch (e) {
            console.error("Export failed", e);
        } finally {
            setLoading(false);
        }
    };

    const getButtonGradient = () => {
        switch (format) {
            case 'xlsx': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            case 'pdf': return 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';

            default: return 'var(--primary-btn-bg)';
        }
    };

    const getButtonLabel = () => {
        const fmtLabel = format === 'xlsx' ? (t('common.export.excel') || 'Excel') :
            format === 'pdf' ? (t('common.export.pdf') || 'PDF') :
                (t('common.export.csv') || 'CSV');
        return `${t('common.export.export_btn') || 'Export'} ${fmtLabel}`;
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }}>
            <div className="glass-panel bounce-in" style={{ width: '520px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '24px', maxHeight: '90vh' }}>

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
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                                {t('reports.export_print') || 'Export / Print'}
                            </h2>
                            <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)', opacity: 0.8 }}>
                                {t('reports.export.all_sections') || 'All report sections included'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

                    {/* Data Source (Period) */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block' }}>
                            {t('reports.export.data_source') || 'Data Source'}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {periodOptions.map(opt => {
                                const isActive = period === opt.id;
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => setPeriod(opt.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 14px', borderRadius: '10px',
                                            border: `1.5px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                            background: isActive ? 'var(--hover-overlay)' : 'transparent',
                                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Icon size={14} />
                                        {opt.label}
                                        {isActive && <CheckCircle2 size={14} style={{ color: 'var(--primary-color)', marginLeft: '2px' }} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block' }}>
                            {t('common.export.format') || 'File Format'}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            {formatOptions.map(opt => {
                                const isActive = format === opt.id;
                                const Icon = opt.icon;
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => setFormat(opt.id)}
                                        className="format-card"
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            padding: '14px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                            border: `1.5px solid ${isActive ? opt.color : 'var(--border-color)'}`,
                                            background: isActive ? opt.bg : 'transparent'
                                        }}
                                    >
                                        <Icon size={24} style={{ color: isActive ? opt.color : 'var(--text-secondary)', marginBottom: '6px' }} />
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{opt.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>



                    {/* Sections Preview */}
                    <div style={{
                        padding: '12px 14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                        fontSize: '0.78rem', color: 'var(--text-secondary)'
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '6px' }}>
                            {t('reports.export.includes') || 'Includes:'}
                        </span>
                        {t('reports.tabs.daily') || 'Daily Activity'} → {t('reports.sections.most_demanded') || 'Most Demanded Books'} → {t('reports.tabs.financial') || 'Financials'} → {t('reports.tabs.inventory') || 'Inventory'} → {t('reports.sections.quick_stats') || 'Quick Stats'}
                        {format === 'pdf' && <span style={{ color: '#ef4444', marginLeft: '6px' }}>+ {t('reports.export.with_visuals') || 'Visual Charts'}</span>}
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="primary-glass-btn"
                        style={{
                            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
                            background: getButtonGradient(), opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>{t('reports.loading') || 'Processing...'}</span>
                            </>
                        ) : (
                            <>
                                {format === 'xlsx' ? <FileSpreadsheet size={20} /> : <Download size={20} />}
                                {getButtonLabel()}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .format-card:hover {
                    background: var(--hover-overlay);
                    border-color: var(--border-color-strong);
                }
            `}</style>
        </div>
    );
};

export default ReportExportModal;
