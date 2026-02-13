import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ArrowUpDown, ArrowUp, ArrowDown, Info, Layers, BookOpen, Clock,
    ArrowUpRight, ArrowDownLeft, RotateCcw, Eye, DollarSign, CheckCircle
} from 'lucide-react';
import GlassSelect from '../common/GlassSelect';
import { formatDate } from '../../utils/dateUtils';
import '../../styles/components/tables.css';
import { useLanguage } from '../../context/LanguageContext';

const SmartTransactionTable = ({
    transactions,
    loading,
    selectedIds,
    onSelect,
    onSelectAll,
    onView
}) => {
    const { t } = useLanguage();
    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
    const [showSelectPopup, setShowSelectPopup] = useState(false);

    // --- Status Badge (matching SmartStudentTable pattern) ---
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

    // --- Sorting ---
    const sortedTransactions = useMemo(() => {
        let sortableItems = [...safeTransactions];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (sortConfig.key === 'timestamp') {
                    aValue = new Date(a.timestamp || a.date).getTime();
                    bValue = new Date(b.timestamp || b.date).getTime();
                } else if (sortConfig.key === 'student_name') {
                    aValue = (a.student_name || '').toLowerCase();
                    bValue = (b.student_name || '').toLowerCase();
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [safeTransactions, sortConfig]);

    // --- Pagination ---
    const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedTransactions, currentPage, itemsPerPage]);

    React.useEffect(() => { setCurrentPage(1); }, [safeTransactions.length]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    if (loading) {
        return (
            <div className="glass-panel w-full p-12 flex justify-center items-center h-64">
                <div className="spinner-lg"></div>
            </div>
        );
    }

    if (safeTransactions.length === 0) {
        return (
            <div className="glass-panel w-full p-12 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-white/5 mb-4">
                    <Layers size={48} className="text-gray-500 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('history.table.no_transactions')}</h3>
                <p className="text-[var(--text-secondary)]">{t('history.table.no_transactions_desc')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px', position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds?.size > 0}
                                        ref={(el) => {
                                            if (el) el.indeterminate = selectedIds?.size > 0 && selectedIds?.size < safeTransactions.length;
                                        }}
                                        onChange={(e) => {
                                            e.preventDefault();
                                            if (selectedIds?.size > 0 || safeTransactions.length > paginatedTransactions.length) {
                                                setShowSelectPopup(true);
                                            } else {
                                                if (onSelectAll) onSelectAll(safeTransactions.map(t => t.id));
                                            }
                                        }}
                                        className="cursor-pointer"
                                    />
                                </div>
                                {showSelectPopup && (
                                    <>
                                        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setShowSelectPopup(false)} />
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                                            background: 'var(--bg-color)', border: '1px solid var(--glass-border)',
                                            borderRadius: '8px', padding: '4px', zIndex: 101, minWidth: '160px',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                        }}>
                                            <button
                                                onClick={() => { if (onSelectAll) onSelectAll(paginatedTransactions.map(t => t.id)); setShowSelectPopup(false); }}
                                                style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px' }}
                                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                {t('history.table.select_page')} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({paginatedTransactions.length})</span>
                                            </button>
                                            <button
                                                onClick={() => { if (onSelectAll) onSelectAll(safeTransactions.map(t => t.id)); setShowSelectPopup(false); }}
                                                style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', fontWeight: 600 }}
                                                onMouseEnter={(e) => e.target.style.background = 'rgba(99, 179, 237, 0.1)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                {t('history.table.select_all')} ({safeTransactions.length})
                                            </button>
                                            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
                                            <button
                                                onClick={() => { if (onSelectAll) onSelectAll([]); setShowSelectPopup(false); }}
                                                style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px' }}
                                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                {t('history.table.deselect_all')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </th>
                            <th style={{ width: '60px' }}>#</th>
                            <th className="sortable" onClick={() => handleSort('student_name')}>
                                <div className="flex items-center gap-2">{t('history.table.student')} {getSortIcon('student_name')}</div>
                            </th>
                            <th className="sortable" onClick={() => handleSort('book_title')}>
                                <div className="flex items-center gap-2">{t('history.table.book_details')} {getSortIcon('book_title')}</div>
                            </th>
                            <th className="sortable" style={{ minWidth: '150px' }} onClick={() => handleSort('timestamp')}>
                                <div className="flex items-center gap-2">{t('history.table.date_time')} {getSortIcon('timestamp')}</div>
                            </th>
                            <th className="sortable" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-2">{t('history.table.action')} {getSortIcon('status')}</div>
                            </th>
                            <th style={{ minWidth: '140px' }}>{t('history.table.details')}</th>
                            <th style={{ textAlign: 'right', minWidth: '80px' }}>{t('history.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map((txn, index) => {
                            let details = {};
                            try { if (txn.details) details = JSON.parse(txn.details); } catch (e) { }

                            return (
                                <tr key={txn.id} className="hover:bg-white/5 transition-colors group">
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds?.has(txn.id)}
                                            onChange={() => onSelect && onSelect(txn.id)}
                                            className="cursor-pointer"
                                        />
                                    </td>
                                    {/* # */}
                                    <td className="text-[var(--text-secondary)]">
                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                    </td>
                                    {/* Student */}
                                    <td>
                                        <div className="flex flex-col">
                                            <span
                                                className="font-medium text-[var(--text-primary)] cursor-pointer hover:text-blue-400 decoration-blue-400 no-underline hover:underline transition-all"
                                                onClick={() => onView && onView(txn)}
                                            >
                                                {txn.student_name}
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)] font-mono mt-1 opacity-70">{txn.register_number}</span>
                                            {txn.department_name && (
                                                <span className="text-xs text-[var(--text-secondary)] opacity-60">{txn.department_name}</span>
                                            )}
                                        </div>
                                    </td>
                                    {/* Book */}
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-[var(--text-primary)]">{txn.book_title}</span>
                                            <span className="text-xs text-[var(--text-secondary)] font-mono mt-1 opacity-70">Acc: {txn.accession_number}</span>
                                        </div>
                                    </td>
                                    {/* Date */}
                                    <td className="text-[var(--text-secondary)]">
                                        {formatDate(txn.timestamp || txn.date)}
                                        <div className="text-xs opacity-60">
                                            {new Date(txn.timestamp || txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    {/* Action Status */}
                                    <td>
                                        {getStatusBadge(txn.status)}
                                    </td>
                                    {/* Details */}
                                    <td className="text-[var(--text-muted)] text-xs max-w-xs truncate">
                                        {txn.status === 'RETURN' && details && (
                                            <span>
                                                Cond: {details.condition || 'Good'}
                                                {Number(details.fine_amount) > 0 && <span className="text-red-400 ml-2">Fine: ₹{details.fine_amount}</span>}
                                            </span>
                                        )}
                                        {txn.status === 'ISSUE' && details && details.due_date && (
                                            <span>Due: {formatDate(details.due_date)}</span>
                                        )}
                                        {txn.status === 'RENEW' && details && details.new_due_date && (
                                            <span>New Due: {formatDate(details.new_due_date)}</span>
                                        )}
                                        {(txn.status === 'FINE_PAID' || txn.status === 'Fine Collected') && details && (
                                            <span className="text-yellow-400">₹{details.fine_amount || details.amount || '-'}</span>
                                        )}
                                    </td>
                                    {/* Actions */}
                                    <td>
                                        <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                                            <button
                                                onClick={() => onView && onView(txn)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination - Same as SmartStudentTable/SmartBookTable */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center px-4 py-2 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border-color-light)]">
                    <div className="text-sm text-[var(--text-tertiary)]">
                        {t('history.table.showing')} <span className="text-[var(--text-primary)] font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> {t('history.table.to')} <span className="text-[var(--text-primary)] font-bold">{Math.min(currentPage * itemsPerPage, safeTransactions.length)}</span> {t('history.table.of')} <span className="text-[var(--text-primary)] font-bold">{safeTransactions.length}</span> {t('history.table.results')}
                    </div>

                    <div className="flex items-center gap-2">
                        <div style={{ width: '130px' }}>
                            <GlassSelect
                                options={[
                                    { value: 10, label: `10 ${t('history.table.per_page')}` },
                                    { value: 20, label: `20 ${t('history.table.per_page')}` },
                                    { value: 50, label: `50 ${t('history.table.per_page')}` }
                                ]}
                                value={itemsPerPage}
                                onChange={setItemsPerPage}
                                small={true}
                                showSearch={false}
                            />
                        </div>

                        <div className="h-4 w-px bg-[var(--border-color)] mx-2"></div>

                        <div className="pagination">
                            <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                <ChevronsLeft size={16} />
                            </button>
                            <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                <ChevronLeft size={16} />
                            </button>

                            <span className="text-sm font-medium px-2 text-[var(--text-primary)]">
                                {t('history.table.page')} {currentPage} {t('history.table.of')} {totalPages}
                            </span>

                            <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                <ChevronRight size={16} />
                            </button>
                            <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartTransactionTable;
