import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, BookOpen, User, Info, CheckCircle, DollarSign, Copy, FileJson, ArrowUpRight, ArrowDownLeft, RotateCcw } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useLanguage } from '../../context/LanguageContext';

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

    // Status badge (matching SmartStudentTable pattern)
    const getStatusBadge = (status) => {
        if (status === 'ISSUE') {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-fit">
                    <ArrowUpRight size={12} /> Issued
                </span>
            );
        } else if (status === 'RETURN') {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 w-fit">
                    <ArrowDownLeft size={12} /> Returned
                </span>
            );
        } else if (status === 'RENEW') {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 w-fit">
                    <RotateCcw size={12} /> Renewed
                </span>
            );
        } else if (status === 'FINE_PAID' || status === 'Fine Collected') {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 w-fit">
                    <DollarSign size={12} /> Fine Collected
                </span>
            );
        } else if (status === 'FINE_WAIVED') {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1 w-fit">
                    <CheckCircle size={12} /> Fine Waived
                </span>
            );
        } else if (status === 'Active' || status === 'ACTIVE') {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 w-fit">
                    <Clock size={12} /> Active
                </span>
            );
        } else {
            return <span className="text-gray-500 text-xs">{status || '-'}</span>;
        }
    };

    // Safe date helper
    const getDateObj = (ts) => {
        if (!ts) return null;
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
    };
    const safeDate = getDateObj(transaction.timestamp || transaction.date || transaction.issue_date || transaction.return_date || transaction.created_at);

    const CopyBtn = ({ value, field }) => (
        <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(value, field); }}
            className={`p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0 ${copiedField === field ? 'text-green-400' : 'text-gray-500'}`}
            title="Copy"
        >
            {copiedField === field ? <CheckCircle size={10} /> : <Copy size={10} />}
        </button>
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in p-4" style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        }}>
            <div className="glass-panel w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[70vh] shadow-2xl"
                onClick={e => e.stopPropagation()}
                style={{
                    maxHeight: '70vh',
                    background: 'var(--glass-bg, #1a1b26)',
                    border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* Header */}
                <div className="p-3 border-b border-white/10 flex justify-between items-start bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 text-blue-400 shadow-inner">
                            <Info size={20} strokeWidth={1.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-base font-bold text-white">{t('history.details.title')}</h3>
                                {getStatusBadge((transaction.action_type || transaction.status))}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                <span className="opacity-70">{t('history.details.id')}: {transaction.id}</span>
                                <CopyBtn value={transaction.id} field="id" />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">

                    {/* Student & Book - Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Student Card */}
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-2">
                            <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1 mb-0.5">
                                <User size={10} /> {t('history.details.student')}
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 uppercase">{t('history.details.name')}:</span>
                                    <span className="text-xs font-medium text-white truncate max-w-[70%]" title={transaction.student_name}>{transaction.student_name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 uppercase">{t('history.details.reg_no')}:</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-300">{transaction.student_reg_no || transaction.register_number}</span>
                                        <CopyBtn value={transaction.student_reg_no || transaction.register_number} field="reg" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 uppercase">{t('history.details.dept')}:</span>
                                    <span className="text-xs text-gray-300 truncate max-w-[70%]">{transaction.student_dept || transaction.department_name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Book Card */}
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-2">
                            <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1 mb-0.5">
                                <BookOpen size={10} /> {t('history.details.book')}
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 uppercase">{t('history.details.book_title')}:</span>
                                    <span className="text-xs font-medium text-white truncate max-w-[70%]" title={transaction.book_title}>{transaction.book_title}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 uppercase">{t('history.details.isbn')}:</span>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-gray-300 font-mono">{details.accession || transaction.accession_number}</span>
                                            <CopyBtn value={details.accession || transaction.accession_number} field="acc" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-gray-400 font-mono truncate max-w-[80px]">{transaction.book_isbn || transaction.isbn}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-lg border border-white/10 overflow-hidden">
                        <div className="bg-white/5 px-3 py-1.5 border-b border-white/10 flex items-center gap-2">
                            <Clock size={10} className="text-purple-300" />
                            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{t('history.details.timeline')}</span>
                        </div>
                        <div className="p-3 grid grid-cols-1 gap-2">
                            <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded">
                                <span className="text-[10px] text-gray-500 uppercase">{t('history.details.action_date')}:</span>
                                <span className="text-xs font-medium text-white">{safeDate ? formatDate(safeDate) : '-'}</span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded">
                                <span className="text-[10px] text-gray-500 uppercase">{t('history.details.time')}:</span>
                                <span className="text-xs text-gray-300">{safeDate ? safeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                            </div>

                            {(transaction.action_type || transaction.status) === 'ISSUE' && (
                                <>
                                    <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded">
                                        <span className="text-[10px] text-gray-500 uppercase">{t('history.details.due_date')}:</span>
                                        <span className="text-xs font-medium text-blue-300">{formatDate(details.due_date)}</span>
                                    </div>
                                    {details.loan_days && (
                                        <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded">
                                            <span className="text-[10px] text-gray-500 uppercase">{t('history.details.duration')}:</span>
                                            <span className="text-xs text-gray-300">{details.loan_days} {t('history.details.days')}</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {(transaction.action_type || transaction.status) === 'RETURN' && (
                                <>
                                    <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded">
                                        <span className="text-[10px] text-gray-500 uppercase">{t('history.details.returned')}:</span>
                                        <span className="text-xs font-medium text-green-300">{formatDate(details.return_date)}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded">
                                        <span className="text-[10px] text-gray-500 uppercase">{t('history.details.condition')}:</span>
                                        <span className={`text-xs font-bold ${details.condition === 'Good' ? 'text-green-400' : 'text-red-400'}`}>
                                            {details.condition}
                                        </span>
                                    </div>
                                </>
                            )}

                            {(transaction.action_type || transaction.status) === 'RENEW' && (
                                <>
                                    <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded">
                                        <span className="text-[10px] text-gray-500 uppercase">{t('history.details.extended')}:</span>
                                        <span className="text-xs text-gray-300">+{details.extend_days} {t('history.details.days')}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded">
                                        <span className="text-[10px] text-gray-500 uppercase">{t('history.details.new_due')}:</span>
                                        <span className="text-xs font-medium text-blue-300">{formatDate(details.new_due_date)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Fines & Remarks */}
                    {(details.fine_amount > 0 || details.remarks || details.reason || details.waiver_reason) && (
                        <div className="grid grid-cols-1 gap-4">
                            {Number(details.fine_amount) > 0 && (
                                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded-md bg-red-500/20 text-red-400">
                                            <DollarSign size={14} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-red-300 opacity-80 uppercase tracking-wide">{t('history.details.fine_generated')}</div>
                                            <div className="text-sm font-bold text-red-200">₹{details.fine_amount}</div>
                                        </div>
                                    </div>
                                    {((transaction.action_type || transaction.status) === 'FINE_PAID' || (transaction.action_type || transaction.status) === 'Fine Collected') && (
                                        <div className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded border border-green-500/30">
                                            PAID
                                        </div>
                                    )}
                                </div>
                            )}

                            {(details.remarks || details.reason || details.waiver_reason) && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500 ml-1">{t('history.details.notes')}</label>
                                    <div className="p-2 rounded bg-white/5 border border-white/10 text-xs text-gray-300 italic">
                                        "{details.remarks || details.reason || details.waiver_reason}"
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Raw Data Toggle */}
                    <div className="pt-2 border-t border-white/5">
                        <button
                            onClick={() => setShowRaw(!showRaw)}
                            className="flex items-center gap-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors opacity-70 hover:opacity-100 uppercase tracking-wide font-medium"
                        >
                            <FileJson size={12} />
                            {showRaw ? t('history.details.hide_raw') : t('history.details.view_raw')}
                        </button>

                        {showRaw && (
                            <div className="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px] text-gray-400 whitespace-pre-wrap overflow-x-auto scrollbar-thin">
                                {JSON.stringify(details, null, 2)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        {t('history.details.recorded_by')}: <span className="text-gray-400">{transaction.performed_by || 'System'}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/5"
                    >
                        {t('history.details.close')}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default TransactionDetailsModal;
