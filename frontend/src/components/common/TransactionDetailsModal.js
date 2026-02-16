import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, BookOpen, User, Info, CheckCircle, DollarSign, Copy, FileJson, ArrowUpRight, ArrowDownLeft, RotateCcw } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/components/TransactionDetailsModal.css';

const TransactionDetailsModal = ({ isOpen, onClose, transaction }) => {
    const { t } = useLanguage();
    const [mounted, setMounted] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !transaction || !mounted) return null;

    // Parse details
    let details = {};
    try {
        if (typeof transaction.details === 'string') details = JSON.parse(transaction.details);
        else if (typeof transaction.details === 'object') details = transaction.details;
    } catch (e) { }

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const actionType = transaction.action_type || transaction.status;

    // Map status to type class
    const getTypeClass = (status) => {
        if (status === 'ISSUE') return 'issue';
        if (status === 'RETURN') return 'return';
        if (status === 'RENEW') return 'renew';
        if (status === 'FINE_PAID' || status === 'Fine Collected') return 'fine';
        if (status === 'FINE_WAIVED') return 'fine';
        if (status === 'Active' || status === 'ACTIVE') return 'active';
        return 'default';
    };

    const getStatusLabel = (status) => {
        if (status === 'ISSUE') return 'Issued';
        if (status === 'RETURN') return 'Returned';
        if (status === 'RENEW') return 'Renewed';
        if (status === 'FINE_PAID' || status === 'Fine Collected') return 'Fine Collected';
        if (status === 'FINE_WAIVED') return 'Fine Waived';
        if (status === 'Active' || status === 'ACTIVE') return 'Active';
        return status || '—';
    };

    const getStatusIcon = (status) => {
        if (status === 'ISSUE') return <ArrowUpRight size={12} />;
        if (status === 'RETURN') return <ArrowDownLeft size={12} />;
        if (status === 'RENEW') return <RotateCcw size={12} />;
        if (status === 'FINE_PAID' || status === 'Fine Collected') return <DollarSign size={12} />;
        if (status === 'FINE_WAIVED') return <CheckCircle size={12} />;
        if (status === 'Active' || status === 'ACTIVE') return <Clock size={12} />;
        return <Info size={12} />;
    };

    // Safe date helper
    const getDateObj = (ts) => {
        if (!ts) return null;
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
    };
    const safeDate = getDateObj(transaction.timestamp || transaction.date || transaction.issue_date || transaction.return_date || transaction.created_at);

    const typeClass = getTypeClass(actionType);

    const CopyBtn = ({ value, field }) => (
        <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(value, field); }}
            className={`txn-copy-btn ${copiedField === field ? 'copied' : ''}`}
            title="Copy"
        >
            {copiedField === field ? <CheckCircle size={10} /> : <Copy size={10} />}
        </button>
    );

    return createPortal(
        <div className="txn-modal-overlay" onClick={onClose}>
            <div className="txn-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="txn-modal-header">
                    <div className="txn-header-left">
                        <div className={`txn-header-icon ${typeClass}`}>
                            <Info size={20} strokeWidth={1.5} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <h3 className="txn-header-title">{t('history.details.title')}</h3>
                                <span className={`txn-status-badge ${typeClass}`}>
                                    {getStatusIcon(actionType)}
                                    {getStatusLabel(actionType)}
                                </span>
                            </div>
                            <div className="txn-header-id">
                                <span>{t('history.details.id')}: {transaction.id}</span>
                                <CopyBtn value={transaction.id} field="id" />
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="txn-close-btn">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="txn-modal-body">

                    {/* Student & Book Cards */}
                    <div className="txn-info-grid">
                        {/* Student */}
                        <div className="txn-info-card">
                            <div className="txn-info-card-label student">
                                <User size={10} /> {t('history.details.student')}
                            </div>
                            <div className="txn-info-row">
                                <span className="txn-info-key">{t('history.details.name')}:</span>
                                <span className="txn-info-value" title={transaction.student_name}>{transaction.student_name}</span>
                            </div>
                            <div className="txn-info-row">
                                <span className="txn-info-key">{t('history.details.reg_no')}:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="txn-info-value secondary">{transaction.student_reg_no || transaction.register_number}</span>
                                    <CopyBtn value={transaction.student_reg_no || transaction.register_number} field="reg" />
                                </div>
                            </div>
                            <div className="txn-info-row">
                                <span className="txn-info-key">{t('history.details.dept')}:</span>
                                <span className="txn-info-value secondary">{transaction.student_dept || transaction.department_name}</span>
                            </div>
                        </div>

                        {/* Book */}
                        <div className="txn-info-card">
                            <div className="txn-info-card-label book">
                                <BookOpen size={10} /> {t('history.details.book')}
                            </div>
                            <div className="txn-info-row">
                                <span className="txn-info-key">{t('history.details.book_title')}:</span>
                                <span className="txn-info-value" title={transaction.book_title}>{transaction.book_title}</span>
                            </div>
                            <div className="txn-info-row">
                                <span className="txn-info-key">{t('history.details.isbn')}:</span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className="txn-info-value mono">{details.accession || transaction.accession_number}</span>
                                        <CopyBtn value={details.accession || transaction.accession_number} field="acc" />
                                    </div>
                                    <span className="txn-info-value mono" style={{ fontSize: '10px', opacity: 0.7 }}>{transaction.book_isbn || transaction.isbn}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="txn-timeline">
                        <div className="txn-timeline-header">
                            <Clock size={10} /> {t('history.details.timeline')}
                        </div>
                        <div className="txn-timeline-body">
                            <div className="txn-timeline-row">
                                <span className="txn-timeline-key">{t('history.details.action_date')}:</span>
                                <span className="txn-timeline-value">{safeDate ? formatDate(safeDate) : '—'}</span>
                            </div>
                            <div className="txn-timeline-row">
                                <span className="txn-timeline-key">{t('history.details.time')}:</span>
                                <span className="txn-timeline-value secondary">{safeDate ? safeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                            </div>

                            {actionType === 'ISSUE' && (
                                <>
                                    <div className="txn-timeline-row">
                                        <span className="txn-timeline-key">{t('history.details.due_date')}:</span>
                                        <span className="txn-timeline-value info">{formatDate(details.due_date)}</span>
                                    </div>
                                    {details.loan_days && (
                                        <div className="txn-timeline-row">
                                            <span className="txn-timeline-key">{t('history.details.duration')}:</span>
                                            <span className="txn-timeline-value secondary">{details.loan_days} {t('history.details.days')}</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {actionType === 'RETURN' && (
                                <>
                                    <div className="txn-timeline-row">
                                        <span className="txn-timeline-key">{t('history.details.returned')}:</span>
                                        <span className="txn-timeline-value success">{formatDate(details.return_date)}</span>
                                    </div>
                                    <div className="txn-timeline-row">
                                        <span className="txn-timeline-key">{t('history.details.condition')}:</span>
                                        <span className={`txn-timeline-value ${details.condition === 'Good' ? 'success' : 'danger'}`}>
                                            {details.condition}
                                        </span>
                                    </div>
                                </>
                            )}

                            {actionType === 'RENEW' && (
                                <>
                                    <div className="txn-timeline-row">
                                        <span className="txn-timeline-key">{t('history.details.extended')}:</span>
                                        <span className="txn-timeline-value secondary">+{details.extend_days} {t('history.details.days')}</span>
                                    </div>
                                    <div className="txn-timeline-row">
                                        <span className="txn-timeline-key">{t('history.details.new_due')}:</span>
                                        <span className="txn-timeline-value info">{formatDate(details.new_due_date)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Fines & Remarks */}
                    {(details.fine_amount > 0 || details.remarks || details.reason || details.waiver_reason) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {Number(details.fine_amount) > 0 && (
                                <div className="txn-fine-card">
                                    <div className="txn-fine-left">
                                        <div className="txn-fine-icon">
                                            <DollarSign size={14} />
                                        </div>
                                        <div>
                                            <div className="txn-fine-label">{t('history.details.fine_generated')}</div>
                                            <div className="txn-fine-amount">₹{details.fine_amount}</div>
                                        </div>
                                    </div>
                                    {(actionType === 'FINE_PAID' || actionType === 'Fine Collected') && (
                                        <span className="txn-fine-paid-badge">PAID</span>
                                    )}
                                </div>
                            )}

                            {(details.remarks || details.reason || details.waiver_reason) && (
                                <div>
                                    <div className="txn-notes-label">{t('history.details.notes')}</div>
                                    <div className="txn-notes-content">
                                        "{details.remarks || details.reason || details.waiver_reason}"
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Raw Data */}
                    <div>
                        <button onClick={() => setShowRaw(!showRaw)} className="txn-raw-toggle">
                            <FileJson size={12} />
                            {showRaw ? t('history.details.hide_raw') : t('history.details.view_raw')}
                        </button>
                        {showRaw && (
                            <div className="txn-raw-content">
                                {JSON.stringify(details, null, 2)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="txn-modal-footer">
                    <div className="txn-footer-info">
                        {t('history.details.recorded_by')}: <span>{transaction.performed_by || 'System'}</span>
                    </div>
                    <button onClick={onClose} className="txn-close-action-btn">
                        {t('history.details.close')}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default TransactionDetailsModal;
