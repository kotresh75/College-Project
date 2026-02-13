import React, { useState, useEffect } from 'react';
import '../../styles/components/tables.css';
import { formatDate } from '../../utils/dateUtils';
import { IndianRupee, Clock, FileText, Search, User, ChevronDown, ChevronUp, Edit, Filter, Calendar, CheckCircle, Download, BookOpen, AlertCircle } from 'lucide-react';
import ReceiptPreviewModal from '../finance/ReceiptPreviewModal';
import VerifyReceiptModal from './VerifyReceiptModal';
import EditFineModal from './EditFineModal';
import StatusModal from '../common/StatusModal';
import FineHistoryTable from './FineHistoryTable';
import TransactionDetailModal from './TransactionDetailModal';
import GlassSelect from '../common/GlassSelect';
import SmartExportModal from '../common/SmartExportModal';
import PdfPreviewModal from '../common/PdfPreviewModal';
import { generatePrintContent } from '../../utils/SmartPrinterHandler';
import { useLanguage } from '../../context/LanguageContext';

const FinesTab = ({ initialTab }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState(initialTab || 'pending');
    const [fines, setFines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);
    const [currentReceiptData, setCurrentReceiptData] = useState(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);

    // Filters for History
    // Filters for History
    const [dateFilter, setDateFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deptFilter, setDeptFilter] = useState('all');
    const [departments, setDepartments] = useState([]);

    // Expansion State
    const [expandedStudentId, setExpandedStudentId] = useState(null);

    // Modal State
    const [editModal, setEditModal] = useState({ isOpen: false, fine: null });
    const [detailModal, setDetailModal] = useState({ isOpen: false, transaction: null });
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [showExportModal, setShowExportModal] = useState(false);
    const [pdfPreview, setPdfPreview] = useState({ isOpen: false, html: '', title: '', fileName: '' });
    const [emailEvents, setEmailEvents] = useState(null);

    // Fetch Email Event Settings
    useEffect(() => {
        fetch('http://localhost:17221/api/settings/app')
            .then(res => res.json())
            .then(data => {
                if (data.email_events) setEmailEvents(data.email_events);
            })
            .catch(err => console.error("Failed to fetch settings:", err));
    }, []);

    // Helpers
    const fetchFines = React.useCallback(async () => {
        setLoading(true);
        try {
            // For History, we fetch ALL fines and filter client-side (or could depend on API)
            // Ideally, history tab should fetch all past fines.
            const status = activeTab === 'pending' ? 'Unpaid' : '';
            const url = status
                ? `http://localhost:17221/api/fines?status=${status}`
                : `http://localhost:17221/api/fines`;

            const token = localStorage.getItem('auth_token');
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (Array.isArray(data)) {
                setFines(data);
            } else {
                setFines([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchFines();
        // Fetch Departments for filter
        fetch('http://localhost:17221/api/departments')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setDepartments(data);
            })
            .catch(err => console.error("Failed to fetch departments", err));
    }, [fetchFines]);

    // Filtering Logic for History Table
    const filteredHistoryFines = React.useMemo(() => {
        if (activeTab !== 'history') return [];

        return fines.filter(fine => {
            // 1. Base Criteria: Must NOT be Unpaid (Paid or Waived)
            if (fine.status === 'Unpaid') return false;

            // 2. Search Term
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (fine.student_name?.toLowerCase().includes(searchLower)) ||
                (fine.roll_number?.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;

            // 3. Status Filter
            if (statusFilter !== 'all' && fine.status !== statusFilter) return false;

            // 4. Date Filter
            if (dateFilter !== 'all') {
                const fineDate = new Date(fine.payment_date || fine.updated_at);
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                if (dateFilter === 'today') {
                    if (fineDate < today) return false;
                } else if (dateFilter === 'week') {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    if (fineDate < weekAgo) return false;
                } else if (dateFilter === 'month') {
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    if (fineDate < monthAgo) return false;
                } else if (dateFilter === 'year') {
                    const yearAgo = new Date(today);
                    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                    if (fineDate < yearAgo) return false;
                }
            }

            // 5. Dept Filter
            if (deptFilter !== 'all' && fine.department_name !== deptFilter) return false;

            return true;
        });
    }, [fines, activeTab, searchTerm, statusFilter, dateFilter, deptFilter]);

    // Calculate Total Collected based on filtered view
    const totalCollectedInHistory = React.useMemo(() => {
        return filteredHistoryFines
            .filter(f => f.status === 'Paid')
            .reduce((sum, f) => sum + f.amount, 0);
    }, [filteredHistoryFines]);

    const handleSmartExport = (scope, format) => {
        // 1. Determine Data Source
        let dataToExport = [];
        const allHistoryFines = fines.filter(f => f.status !== 'Unpaid');

        if (scope === 'filtered') {
            dataToExport = filteredHistoryFines;
        } else {
            dataToExport = allHistoryFines;
        }

        if (dataToExport.length === 0) {
            showError("No data to export");
            return;
        }

        // 2. Prepare Data with ALL columns
        const cleanData = dataToExport.map(fine => ({
            Date: formatDate(fine.payment_date || fine.updated_at),
            'Receipt ID': fine.receipt_number ? `REC-${String(fine.receipt_number).replace(/^REC-/, '')}` : '-',
            Student: fine.student_name,
            'Roll No': fine.roll_number,
            Department: fine.department_name || '-',
            'Book Title': fine.book_title || '-',
            Amount: fine.status === 'Waived' ? 0 : `₹${fine.amount}`,
            Status: fine.status,
            Reason: fine.reason || fine.remark || '-',
            'Payment Method': fine.payment_method || '-'
        }));

        // 3. Export Logic
        if (format === 'xlsx') {
            const XLSX = require('xlsx');
            const ws = XLSX.utils.json_to_sheet(cleanData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Fine History");
            XLSX.writeFile(wb, `fines_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } else if (format === 'csv') {
            const headers = Object.keys(cleanData[0]);
            const rows = cleanData.map(row =>
                Object.values(row).map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',')
            );
            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `fines_export_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'pdf') {
            const content = generatePrintContent('Fine History Report', cleanData, [
                { key: 'Date', label: 'Date' },
                { key: 'Receipt ID', label: 'Receipt ID' },
                { key: 'Student', label: 'Student' },
                { key: 'Roll No', label: 'Roll No' },
                { key: 'Department', label: 'Department' },
                { key: 'Amount', label: 'Amount' },
                { key: 'Status', label: 'Status' },
                { key: 'Reason', label: 'Reason' },
                { key: 'Payment Method', label: 'Method' }
            ], {});
            setShowExportModal(false);
            setPdfPreview({
                isOpen: true,
                html: content.html,
                title: 'Fine History Report',
                fileName: `fines_export_${new Date().toISOString().slice(0, 10)}`
            });
        }
    };


    // Grouping Logic for Pending Cards
    const groupedPendingFines = React.useMemo(() => {
        if (activeTab !== 'pending') return [];

        const groups = {};
        const pendingFines = fines.filter(f => f.status === 'Unpaid'); // Only Unpaid

        pendingFines.forEach(fine => {
            if (!groups[fine.student_id]) {
                groups[fine.student_id] = {
                    student: {
                        id: fine.student_id,
                        name: fine.student_name,
                        regNo: fine.roll_number,
                        profile_image: fine.profile_image // Propagate this
                    },
                    fines: [],
                    totalAmount: 0
                };
            }
            groups[fine.student_id].fines.push(fine);
            groups[fine.student_id].totalAmount += fine.amount;
        });
        return Object.values(groups).filter(g =>
            g.student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.student.regNo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [fines, searchTerm, activeTab]);

    // UI Helpers
    const showSuccess = (title, message) => {
        setStatusModal({ isOpen: true, type: 'success', title, message });
    };

    const showError = (message) => {
        setStatusModal({ isOpen: true, type: 'error', title: 'Error', message });
    };

    // Actions
    const handleCollect = async (studentId, fineIds) => {
        if (!fineIds || fineIds.length === 0) return;

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:17221/api/fines/collect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fine_ids: fineIds,
                    payment_method: 'Cash'
                })
            });

            if (res.ok) {
                // Receipt Generation
                const data = await res.json();
                const paidFines = fines.filter(f => fineIds.includes(f.id));
                const total = paidFines.reduce((sum, f) => sum + f.amount, 0);
                const student = paidFines[0];

                setCurrentReceiptData({
                    id: data.receiptId || 'REC-' + Date.now(),
                    student_name: student.student_name,
                    roll_number: student.roll_number,
                    items: paidFines.map(f => ({ description: `${f.remark || f.reason} - ${f.book_title || ''}`, amount: f.amount })),
                    total: total,
                    payment_method: 'Cash'
                });
                setShowReceipt(true);
                setShowReceipt(true);
                fetchFines();
                showSuccess(t('circulation.fines.collect_success'), `Successfully collected ₹${total}`);
            } else {
                showError("Payment processing failed");
            }
        } catch (e) {
            showError("Network error processing payment");
        }
    };

    const openEditModal = (fine) => {
        setEditModal({ isOpen: true, fine });
    };

    const handleUpdateFine = async (fineId, amount, reason) => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:17221/api/fines/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fine_id: fineId,
                    amount: amount,
                    reason: reason
                })
            });
            if (res.ok) {
                fetchFines();
                setEditModal({ isOpen: false, fine: null });
                showSuccess('Fine Updated', 'The fine details have been updated successfully.');
            } else {
                showError("Failed to update fine details");
            }
        } catch (e) {
            showError("Network error updating fine");
        }
    };

    const handleWaiveFine = async (fineId, reason) => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:17221/api/fines/waive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fine_id: fineId,
                    reason: reason
                })
            });
            if (res.ok) {
                fetchFines();
                setEditModal({ isOpen: false, fine: null });
                showSuccess(t('circulation.fines.waive_success'), 'The fine has been waived successfully.');
            } else {
                showError("Failed to waive fine");
            }
        } catch (e) {
            showError("Network error waiving fine");
        }
    };

    const handleViewReceipt = (fine) => {
        setCurrentReceiptData({
            id: fine.receipt_number ? `REC-${String(fine.receipt_number).replace(/^REC-/, '')}` : `REC-${fine.id.slice(0, 8)}`,
            student_name: fine.student_name,
            roll_number: fine.roll_number,
            items: [{ description: fine.reason || fine.remark, amount: fine.amount }],
            total: fine.amount,
            payment_method: fine.payment_method || 'Cash' // Fallback
        });
        setShowReceipt(true);
    };

    const handleViewDetails = (fine) => {
        // Map fine object to transaction format expected by modal
        setDetailModal({
            isOpen: true,
            transaction: {
                id: fine.transaction_id || fine.id, // Fallback
                action: fine.status === 'Paid' ? 'FINE PAID' : fine.status,
                timestamp: fine.payment_date || fine.updated_at,
                details: {
                    ...fine,
                    book_title: fine.book_title,
                    accession: fine.accession_number,
                    fine_amount: fine.amount,
                    remarks: fine.reason || fine.remark
                },
                student: {
                    name: fine.student_name,
                    regNo: fine.roll_number
                }
            }
        });
    };

    const handleResendEmail = async (fine) => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:17221/api/fines/resend-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fine_id: fine.id })
            });
            const data = await res.json();
            if (res.ok) {
                showSuccess('Email Sent', t('circulation.fines.receipt_resent'));
            } else {
                showError(data.error || "Failed to send email");
            }
        } catch (e) {
            showError("Network error sending email");
        }
    };

    return (
        <div className="h-full flex flex-col pt-0 text-white overflow-hidden relative" style={{ minHeight: '600px' }}>
            {/* Header / Filter Row */}
            {/* Header / Filter Row - Standardized Catalog Toolbar */}
            <div className="catalog-toolbar mb-4">
                {/* 1. Tabs Group */}
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}>
                    {['pending', 'history'].map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setExpandedStudentId(null); }}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md capitalize`}
                                style={{
                                    background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                    opacity: isActive ? 1 : 0.7,
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab === 'pending' ? <Clock size={14} /> : <FileText size={14} />} {tab === 'pending' ? t('circulation.fines.tab_pending') : t('circulation.fines.tab_history')}
                            </button>
                        );
                    })}
                </div>

                {/* 2. Search Bar - Flex 1 */}
                <div className="toolbar-search" style={{ flex: 1, margin: '0 8px' }}>
                    <Search size={20} />
                    <input
                        placeholder={t('circulation.fines.search_placeholder')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* 3. Actions / Filters */}
                {/* Filters - Only Visible in History Tab */}
                {activeTab === 'history' && (
                    <>
                        <div style={{ width: '130px' }}>
                            <GlassSelect
                                value={dateFilter}
                                onChange={(val) => setDateFilter(val)}
                                options={[
                                    { value: 'all', label: t('circulation.fines.filter_date') },
                                    { value: 'today', label: t('common.today') || 'Today' },
                                    { value: 'week', label: t('common.this_week') || 'This Week' },
                                    { value: 'month', label: t('common.this_month') || 'This Month' },
                                    { value: 'year', label: t('common.this_year') || 'This Year' }
                                ]}
                                icon={Calendar}
                                placeholder={t('circulation.fines.filter_date')}
                            />
                        </div>

                        <div style={{ width: '180px' }}>
                            <GlassSelect
                                value={deptFilter}
                                onChange={(val) => setDeptFilter(val)}
                                options={[
                                    { value: 'all', label: t('circulation.fines.filter_dept') }, // 'All Departments'
                                    ...departments.map(d => ({ value: d.name, label: d.name }))
                                ]}
                                icon={User}
                                placeholder={t('circulation.fines.filter_dept')}
                            />
                        </div>

                        <div style={{ width: '130px' }}>
                            <GlassSelect
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val)}
                                options={[
                                    { value: 'all', label: t('circulation.fines.filter_status') },
                                    { value: 'Paid', label: t('common.paid') || 'Paid' },
                                    { value: 'Waived', label: t('common.waived') || 'Waived' }
                                ]}
                                icon={Filter}
                                placeholder={t('circulation.fines.filter_status')}
                            />
                        </div>

                        <button
                            onClick={() => setShowExportModal(true)}
                            className="toolbar-icon-btn flex-shrink-0"
                            title={t('circulation.fines.export_data')}
                        >
                            <Download size={20} style={{ minWidth: '20px', width: '20px', height: '20px' }} />
                        </button>
                    </>
                )}

                {/* Always Visible Actions */}
                <button
                    onClick={() => setShowVerifyModal(true)}
                    className="toolbar-primary-btn whitespace-nowrap"
                    title={t('circulation.fines.verify_receipt')}
                    style={{ height: '40px', padding: '0 16px', fontSize: '0.85rem' }}
                >
                    <CheckCircle size={16} /> {t('circulation.fines.verify_receipt')}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 pb-20">
                {activeTab === 'history' ? (
                    <div className="flex flex-col gap-4">
                        {/* Summary Card */}
                        <div className="p-4 rounded-xl border border-glass bg-gradient-to-r from-emerald-500/10 to-teal-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-emerald-500/20">
                                    <IndianRupee size={20} className="text-emerald-400" />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">{t('circulation.fines.total_collected')} (Filtered)</div>
                                    <div className="text-2xl font-bold text-white">₹{totalCollectedInHistory.toFixed(2)}</div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 text-right">
                                {t('circulation.fines.showing_records', { count: filteredHistoryFines.length })} <br />
                                {t('circulation.fines.paid_waived')}
                            </div>
                        </div>

                        <FineHistoryTable
                            fines={filteredHistoryFines}
                            onViewReceipt={handleViewReceipt}
                            onViewDetails={handleViewDetails}
                            onResendEmail={handleResendEmail}
                        />
                    </div>
                ) : (
                    /* PENDING (Cards) View */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                        {emailEvents && emailEvents.finePaymentReceipt === false && (
                            <div style={{ gridColumn: '1/-1' }} className="mb-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm flex items-center gap-2">
                                <AlertCircle size={18} />
                                <span>
                                    <strong>Warning:</strong> Email receipts are disabled in settings. Students will NOT receive payment confirmation emails.
                                </span>
                            </div>
                        )}

                        {groupedPendingFines.length === 0 && !loading && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '50px' }}>
                                {t('circulation.fines.no_pending')}
                            </div>
                        )}

                        {groupedPendingFines.map(group => {
                            const isExpanded = expandedStudentId === group.student.id;
                            const fineCount = group.fines.length;

                            // Grid span style
                            const gridStyle = isExpanded
                                ? { gridColumn: '1 / -1', transition: 'all 0.3s ease' }
                                : { transition: 'all 0.3s ease' };

                            return (
                                <div
                                    key={group.student.id}
                                    className={`glass-panel ${!isExpanded ? 'hover-scale' : ''}`}
                                    style={{
                                        padding: '20px',
                                        position: 'relative',
                                        borderLeft: group.totalAmount > 0 ? '4px solid #fc8181' : '4px solid #48bb78',
                                        zIndex: 1,
                                        ...gridStyle
                                    }}
                                >
                                    {/* Card Header (Clickable) */}
                                    <div
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setExpandedStudentId(isExpanded ? null : group.student.id)}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div style={{
                                                    width: '50px', height: '50px', borderRadius: '50%',
                                                    background: 'rgba(0,0,0,0.05)',
                                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                    border: '1px solid var(--glass-border)',
                                                    overflow: 'hidden'
                                                }}>
                                                    {group.student.profile_image ? (
                                                        <img
                                                            src={group.student.profile_image}
                                                            alt={group.student.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <User size={24} color="#2d3436" strokeWidth={2.5} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg text-white">{group.student.name}</div>
                                                    <div className="text-sm text-gray-400">{group.student.regNo}</div>
                                                </div>
                                            </div>

                                            {/* Total Amount Badge */}
                                            <div className="text-right">
                                                <div className="text-sm text-gray-400">{t('circulation.fines.total_due')}</div>
                                                <div className="text-xl font-bold text-red-300">₹{group.totalAmount.toFixed(2)}</div>
                                            </div>
                                        </div>

                                        {/* Summary Bar */}
                                        <div className="flex justify-between items-center p-3 rounded-lg border border-glass" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <div className="text-sm">
                                                <span className="text-gray-400">Fines: </span>
                                                <span className="font-bold text-white">{fineCount}</span>
                                            </div>
                                            {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Expanded Details (SlideDown Animation) */}
                                    {isExpanded && (
                                        <div className="accordion-content">

                                            {/* Bulk Action for Pending */}
                                            {group.totalAmount > 0 && (
                                                <div className="flex justify-end mb-4">
                                                    <div className="flex items-center gap-2 text-lg font-bold text-white bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                                                        <span>{t('circulation.fines.total_fine')}:</span>
                                                        <span className="text-red-300 flex items-center"><IndianRupee size={18} />{group.totalAmount}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* List of Fines */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {group.fines.map(fine => (
                                                    <div key={fine.id} className="p-4 rounded-xl border border-glass bg-white/5 relative group">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-start gap-3 flex-1">
                                                                {fine.cover_image ? (
                                                                    <img src={fine.cover_image} alt="Book" className="w-auto h-8 rounded-sm object-cover shadow-sm bg-black/20" />
                                                                ) : (
                                                                    <div className="w-6 h-8 rounded-sm bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                                                        <BookOpen size={14} />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="font-semibold text-white">{fine.book_title || 'General Fine'}</div>
                                                                    {fine.accession_number && (
                                                                        <div className="text-xs text-gray-400 font-mono mt-0.5">Acc: {fine.accession_number}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded text-xs border ${fine.status === 'Paid' ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                                                                {fine.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-400 mb-1">
                                                            {fine.remark || fine.reason}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mb-3 space-y-1">
                                                            <div>Due: {fine.due_date ? formatDate(fine.due_date) : '-'}</div>
                                                            {fine.issue_date && <div>Issued: {formatDate(fine.issue_date)}</div>}
                                                            {fine.last_renewed_date && <div>Renewed: {formatDate(fine.last_renewed_date)}</div>}
                                                        </div>

                                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-glass">
                                                            <span className="font-bold text-red-300">₹{fine.amount}</span>

                                                            {activeTab === 'pending' && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleCollect(group.student.id, [fine.id])}
                                                                        className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-500/10 transition-colors flex items-center gap-1"
                                                                        title={t('circulation.fines.pay')}
                                                                    >
                                                                        <CheckCircle size={12} /> {t('circulation.fines.pay')}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openEditModal(fine)}
                                                                        className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10 transition-colors flex items-center gap-1"
                                                                    >
                                                                        <Edit size={12} /> {t('circulation.fines.edit')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ReceiptPreviewModal
                isOpen={showReceipt}
                onClose={() => setShowReceipt(false)}
                transaction={currentReceiptData}
            />

            <VerifyReceiptModal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
            />

            <EditFineModal
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false, fine: null })}
                fine={editModal.fine}
                onSave={handleUpdateFine}
                onWaive={handleWaiveFine}
            />

            <TransactionDetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, transaction: null })}
                transaction={detailModal.transaction}
            />

            <StatusModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
            />

            {showExportModal && (
                <SmartExportModal
                    onClose={() => setShowExportModal(false)}
                    totalCount={fines.filter(f => f.status !== 'Unpaid').length}
                    selectedCount={0}
                    filteredCount={filteredHistoryFines.length}
                    entityName="Fine Records"
                    onExport={handleSmartExport}
                    columns={['Date', 'Receipt ID', 'Student', 'Roll No', 'Department', 'Book Title', 'Amount', 'Status', 'Reason', 'Payment Method']}
                />
            )}

            <PdfPreviewModal
                isOpen={pdfPreview.isOpen}
                onClose={() => setPdfPreview(p => ({ ...p, isOpen: false }))}
                htmlContent={pdfPreview.html}
                title={pdfPreview.title}
                fileName={pdfPreview.fileName}
            />
        </div >
    );
};

export default FinesTab;
