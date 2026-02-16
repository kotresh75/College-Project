import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';
import { History, Search, Filter, BookOpen, AlertCircle, CheckCircle, Clock, ArrowUpRight, ArrowDownLeft, RotateCcw, Info, Download, Calendar } from 'lucide-react';
import TransactionDetailsModal from '../components/common/TransactionDetailsModal';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { useTutorial } from '../context/TutorialContext';
import GlassSelect from '../components/common/GlassSelect';
import SmartExportModal from '../components/common/SmartExportModal';
import SmartTransactionTable from '../components/history/SmartTransactionTable';
import PdfPreviewModal from '../components/common/PdfPreviewModal';

const TransactionHistoryPage = () => {
    const { t } = useLanguage();
    const { setPageContext } = useTutorial();
    useEffect(() => {
        setPageContext('transactions');
    }, []);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState('All');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('All'); // All, Today, Week, Month, Year

    const [departments, setDepartments] = useState([]);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [pdfPreview, setPdfPreview] = useState({ isOpen: false, html: '', title: '', fileName: '' });

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Fetch Departments for Filter
    useEffect(() => {
        fetch('http://localhost:17221/api/departments')
            .then(res => res.json())
            .then(data => Array.isArray(data) ? setDepartments(data) : [])
            .catch(err => console.error("Failed to fetch departments", err));
    }, []);

    // Total Count
    const [totalHistoryCount, setTotalHistoryCount] = useState(0);
    const fetchTotalHistoryCount = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`http://localhost:17221/api/circulation/history?limit=100000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            setTotalHistoryCount(list.length);
        } catch (e) {
            console.error("Failed to fetch total history count", e);
        }
    };

    useEffect(() => {
        fetchHistory();
        fetchTotalHistoryCount();
    }, [search, statusFilter, departmentFilter, timeFilter]);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("History Update: Refreshing");
            fetchHistory();
        };
        socket.on('circulation_update', handleUpdate);
        return () => socket.off('circulation_update', handleUpdate);
    }, [socket, search, statusFilter, departmentFilter, timeFilter]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (statusFilter !== 'All') params.append('status', statusFilter);
            if (departmentFilter !== 'All') params.append('department', departmentFilter);

            // Time Filter Logic
            if (timeFilter !== 'All') {
                const now = new Date();
                let startDate = new Date();

                if (timeFilter === 'Today') {
                    startDate.setHours(0, 0, 0, 0);
                } else if (timeFilter === 'Week') {
                    startDate.setDate(now.getDate() - 7);
                    startDate.setHours(0, 0, 0, 0); // consistency
                } else if (timeFilter === 'Month') {
                    startDate.setDate(now.getDate() - 30);
                    startDate.setHours(0, 0, 0, 0);
                } else if (timeFilter === 'Year') {
                    startDate.setDate(now.getDate() - 365);
                    startDate.setHours(0, 0, 0, 0);
                }

                // Format as YYYY-MM-DD using Local Time
                const year = startDate.getFullYear();
                const month = String(startDate.getMonth() + 1).padStart(2, '0');
                const day = String(startDate.getDate()).padStart(2, '0');
                params.append('startDate', `${year}-${month}-${day}`);
                // endDate is implicitly "now" / undefined means no upper bound effectively, or we can send today
            }

            const token = localStorage.getItem('auth_token');
            const res = await fetch(`http://localhost:17221/api/circulation/history?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTransactions(Array.isArray(data) ? data : (data.data || []));
            setSelectedIds(new Set());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (log) => {
        setSelectedTransaction(log);
        setIsDetailsOpen(true);
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = (ids) => {
        const allSelected = ids.every(id => selectedIds.has(id));
        const newSet = new Set(selectedIds);

        if (allSelected) {
            ids.forEach(id => newSet.delete(id));
        } else {
            ids.forEach(id => newSet.add(id));
        }
        setSelectedIds(newSet);
    };

    return (
        <div className="dashboard-content">
            {/* --- Controls --- */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="catalog-toolbar">
                    <h1 className="text-2xl font-bold flex items-center gap-2 mr-4 text-white">
                        <History size={24} className="text-accent" /> {t('history.title')}
                    </h1>

                    <div className="toolbar-search" style={{ flex: 1 }}>
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder={t('history.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="w-[180px]">
                        <GlassSelect
                            value={departmentFilter}
                            onChange={(val) => setDepartmentFilter(val)}
                            options={[
                                { value: 'All', label: t('history.filter_dept_all') },
                                ...departments.map(d => ({ value: d.name, label: d.name }))
                            ]}
                            icon={Filter}
                            placeholder={t('history.filter_dept_all')}
                        />
                    </div>

                    <div className="w-[150px]">
                        <GlassSelect
                            value={timeFilter}
                            onChange={setTimeFilter}
                            options={[
                                { value: 'All', label: t('history.filter_time_all') },
                                { value: 'Today', label: t('history.time_today') },
                                { value: 'Week', label: t('history.time_week') },
                                { value: 'Month', label: t('history.time_month') },
                                { value: 'Year', label: t('history.time_year') }
                            ]}
                            icon={Calendar}
                            placeholder={t('history.filter_time')}
                        />
                    </div>

                    <div className="w-[150px]">
                        <GlassSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: 'All', label: t('history.filter_status_all') },
                                { value: 'ISSUE', label: t('history.status_issue') },
                                { value: 'RETURN', label: t('history.status_return') },
                                { value: 'RENEW', label: t('history.status_renew') }
                            ]}
                            icon={Filter}
                            placeholder={t('history.filter_status')}
                        />
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-2"></div>

                    <button className="toolbar-icon-btn" onClick={() => setShowExportModal(true)} title={t('history.export_tooltip')}>
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Smart Table */}
            <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <SmartTransactionTable
                    transactions={transactions}
                    loading={loading}
                    selectedIds={selectedIds}
                    onSelect={toggleSelect}
                    onSelectAll={toggleSelectAll}
                    onView={handleViewDetails}
                />
            </div>

            <TransactionDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                transaction={selectedTransaction}
            />

            {showExportModal && (
                <SmartExportModal
                    onClose={() => setShowExportModal(false)}
                    totalCount={totalHistoryCount || transactions.length}
                    filteredCount={transactions.length}
                    selectedCount={selectedIds.size}
                    entityName={t('history.entity_name')}
                    data={transactions.map(txn => {
                        let details = {};
                        try { details = JSON.parse(txn.details || '{}'); } catch (e) { }
                        return {
                            [t('history.cols.date')]: new Date(txn.timestamp || txn.date).toLocaleString(),
                            [t('history.cols.action')]: txn.status,
                            [t('history.cols.student')]: txn.student_name,
                            [t('history.cols.regno')]: txn.register_number,
                            [t('history.cols.dept')]: txn.department_name,
                            [t('history.cols.book')]: txn.book_title,
                            [t('history.cols.accession')]: txn.accession_number,
                            [t('history.cols.fine')]: details.fine_amount || 0,
                            [t('history.cols.condition')]: details.condition || '-',
                        };
                    })}
                    columns={[
                        t('history.cols.date'),
                        t('history.cols.action'),
                        t('history.cols.student'),
                        t('history.cols.regno'),
                        t('history.cols.dept'),
                        t('history.cols.book'),
                        t('history.cols.accession'),
                        t('history.cols.fine')
                    ]}
                    onExport={async (scope, format) => {
                        // SmartExportModal handles printing via getExportData + preview. Avoid double fetch.


                        let dataToExport = null;

                        try {
                            if (scope === 'all') {
                                const params = new URLSearchParams();
                                params.append('limit', '100000');
                                const token = localStorage.getItem('auth_token');
                                const res = await fetch(`http://localhost:17221/api/circulation/history?${params.toString()}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const data = await res.json();
                                dataToExport = Array.isArray(data) ? data : (data.data || []);
                            } else if (scope === 'filtered') {
                                // Re-fetch with current filters but higher limit to ensure we get ALL filtered items
                                const params = new URLSearchParams();
                                if (search) params.append('search', search);
                                if (statusFilter !== 'All') params.append('status', statusFilter);
                                if (departmentFilter !== 'All') params.append('department', departmentFilter);
                                if (timeFilter !== 'All') {
                                    const now = new Date();
                                    let startDate = new Date();
                                    if (timeFilter === 'Today') startDate.setHours(0, 0, 0, 0);
                                    else if (timeFilter === 'Week') startDate.setDate(now.getDate() - 7);
                                    else if (timeFilter === 'Month') startDate.setDate(now.getDate() - 30);
                                    else if (timeFilter === 'Year') startDate.setDate(now.getDate() - 365);

                                    const year = startDate.getFullYear();
                                    const month = String(startDate.getMonth() + 1).padStart(2, '0');
                                    const day = String(startDate.getDate()).padStart(2, '0');
                                    params.append('startDate', `${year}-${month}-${day}`);
                                }
                                params.append('limit', '100000');

                                const token = localStorage.getItem('auth_token');
                                const res = await fetch(`http://localhost:17221/api/circulation/history?${params.toString()}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const data = await res.json();
                                dataToExport = Array.isArray(data) ? data : (data.data || []);
                            } else if (scope === 'selected') {
                                dataToExport = transactions.filter(t => selectedIds.has(t.id));
                            }
                        } catch (e) {
                            console.error("Export fetch failed", e);
                            alert("Failed to fetch data for export. Please try again.");
                            return;
                        }

                        if (!dataToExport || dataToExport.length === 0) {
                            alert("No data to export");
                            return;
                        }

                        const cleanData = dataToExport.map(t => {
                            let details = {};
                            try { details = JSON.parse(t.details || '{}'); } catch (e) { }
                            return {
                                Date: new Date(t.timestamp || t.date).toLocaleString(),
                                Action: t.status,
                                Student: t.student_name,
                                RegNo: t.register_number,
                                Department: t.department_name,
                                Book: t.book_title,
                                Accession: t.accession_number,
                                Fine: details.fine_amount || 0,
                                Condition: details.condition || '-',
                                Remarks: details.remarks || '-'
                            };
                        });

                        if (format === 'xlsx') {
                            const XLSX = require('xlsx');
                            const ws = XLSX.utils.json_to_sheet(cleanData);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "History");
                            XLSX.writeFile(wb, `transaction_history_${new Date().toISOString().slice(0, 10)}.xlsx`);
                        } else if (format === 'csv') {
                            const headers = Object.keys(cleanData[0]);
                            const rows = cleanData.map(row =>
                                Object.values(row).map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',')
                            );
                            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", `history_export_${new Date().toISOString().slice(0, 10)}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        } else if (format === 'pdf') {
                            const { generatePrintContent } = require('../utils/SmartPrinterHandler');
                            const content = generatePrintContent('Transaction History', cleanData, [
                                { key: 'Date', label: 'Date' },
                                { key: 'Action', label: 'Action' },
                                { key: 'Student', label: 'Student' },
                                { key: 'RegNo', label: 'Reg No' },
                                { key: 'Book', label: 'Book' },
                                { key: 'Fine', label: 'Fine' }
                            ], {});
                            setShowExportModal(false);
                            setPdfPreview({ isOpen: true, html: content.html, title: 'Transaction History', fileName: `transaction_history_${new Date().toISOString().slice(0, 10)}` });
                        }
                    }}

                />
            )}

            <PdfPreviewModal
                isOpen={pdfPreview.isOpen}
                onClose={() => setPdfPreview(p => ({ ...p, isOpen: false }))}
                htmlContent={pdfPreview.html}
                title={pdfPreview.title}
                fileName={pdfPreview.fileName}
            />
        </div>
    );
};

export default TransactionHistoryPage;
