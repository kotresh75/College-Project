import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas'; // Import capture library
import {
    FileText, TrendingUp, DollarSign, Package, Calendar,
    AlertCircle, Sparkles, BookOpen, AlertTriangle, Library, Users, Download
} from 'lucide-react';
import CirculationAnalytics from '../components/analytics/CirculationAnalytics';
import FinancialAnalytics from '../components/analytics/FinancialAnalytics';
import InventoryAnalytics from '../components/analytics/InventoryAnalytics';
import GlassSelect from '../components/common/GlassSelect';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useTutorial } from '../context/TutorialContext';

// Import New Modular Analytics Components
import ReportExportModal from '../components/reports/ReportExportModal';
import { generatePrintContent } from '../utils/SmartPrinterHandler';
import PdfPreviewModal from '../components/common/PdfPreviewModal';


const SmartReportsPage = () => {
    const { t } = useLanguage();
    const { setPageContext } = useTutorial();
    useEffect(() => {
        setPageContext('reports');
    }, []);
    const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'analytics'
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState('30days'); // '7days', '30days', '90days'
    const [showExportModal, setShowExportModal] = useState(false);
    const [pdfPreview, setPdfPreview] = useState({ isOpen: false, html: '', title: '', fileName: '' });


    useEffect(() => {
        console.log("ReportsPage Loaded - TAB VERSION FIXED", new Date().toISOString());
        fetchReportData();
    }, [period]);

    const socket = useSocket();
    // ... rest of socket effect
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Report Data Update: Refreshing");
            fetchReportData();
        };
        // Listen to all relevant sources
        socket.on('circulation_update', handleUpdate);
        socket.on('fine_update', handleUpdate);
        socket.on('book_update', handleUpdate);
        return () => {
            socket.off('circulation_update', handleUpdate);
            socket.off('fine_update', handleUpdate);
            socket.off('book_update', handleUpdate);
        };
    }, [socket, period]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            // Fetch ALL 4 endpoints in parallel
            const [summaryRes, circRes, finRes, invRes] = await Promise.all([
                fetch(`http://localhost:17221/api/reports/summary?period=${period}`),
                fetch(`http://localhost:17221/api/reports/circulation?period=${period}`),
                fetch(`http://localhost:17221/api/reports/financial?period=${period}`),
                fetch(`http://localhost:17221/api/reports/inventory?period=${period}`)
            ]);

            const summary = await summaryRes.json();
            const circ = await circRes.json();
            const fin = await finRes.json();
            const inv = await invRes.json();

            setStats({ summary, circ, fin, inv });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Format Date to DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB'); // DD/MM/YYYY
    };

    // Helper for Period Label
    const getPeriodLabel = (p) => {
        const labels = {
            'today': t('reports.export.today') || 'Today',
            '7days': t('reports.period.7days') || 'Last 7 Days',
            '30days': t('reports.period.30days') || 'Last 30 Days',
            '90days': t('reports.period.90days') || 'Last 90 Days',
            '365days': t('reports.period.365days') || 'Last 365 Days'
        };
        return labels[p] || p;
    };

    // Build all 5 report sections from stats
    const getAllReportSections = (reportStats, selectedPd) => {
        if (!reportStats) return [];
        const periodLabel = getPeriodLabel(selectedPd || period);

        // 1. Daily Activity
        const dailyActivity = {
            title: `${t('reports.tabs.daily') || 'Daily Activity'} - ${periodLabel}`,
            sheetName: t('reports.tabs.daily') || 'Daily Activity',
            data: (reportStats.summary?.data || []).map(row => ({
                [t('reports.export.date') || 'Date']: formatDate(row.date),
                [t('reports.export.issues') || 'Issues']: row.issues,
                [t('reports.export.returns') || 'Returns']: row.returns,
                [t('reports.export.fine') || 'Fine Amount']: `₹${row.fines}`
            })),
            columns: [
                { key: t('reports.export.date') || 'Date', label: t('reports.export.date') || 'Date' },
                { key: t('reports.export.issues') || 'Issues', label: t('reports.export.issues') || 'Issues' },
                { key: t('reports.export.returns') || 'Returns', label: t('reports.export.returns') || 'Returns' },
                { key: t('reports.export.fine') || 'Fine Amount', label: t('reports.export.fine') || 'Fine Amount' }
            ]
        };

        // 2. Most Demanded Books
        const topBooks = {
            title: `${t('reports.sections.most_demanded') || 'Most Demanded Books'} - ${periodLabel}`,
            sheetName: t('reports.sections.most_demanded') || 'Most Demanded Books',
            data: (reportStats.circ?.top_books || []).map((b, i) => ({
                '#': i + 1,
                [t('reports.analytics.circ.book_title') || 'Title']: b.title,
                [t('reports.export.count') || 'Count']: b.count
            })),
            columns: [
                { key: '#', label: '#' },
                { key: t('reports.analytics.circ.book_title') || 'Title', label: t('reports.analytics.circ.book_title') || 'Title' },
                { key: t('reports.export.count') || 'Count', label: t('reports.export.count') || 'Count' }
            ]
        };

        // 3. Financials
        const fin = reportStats.fin?.summary || {};
        const financials = {
            title: `${t('reports.tabs.financial') || 'Financials'} - ${periodLabel}`,
            sheetName: t('reports.tabs.financial') || 'Financials',
            data: [
                { [t('reports.export.desc') || 'Description']: t('reports.analytics.fin.collected') || 'Collected', [t('reports.export.amount') || 'Amount']: `₹${(fin.collected || 0).toFixed(2)}` },
                { [t('reports.export.desc') || 'Description']: t('reports.analytics.fin.pending') || 'Pending', [t('reports.export.amount') || 'Amount']: `₹${(fin.pending || 0).toFixed(2)}` }
            ],
            columns: [
                { key: t('reports.export.desc') || 'Description', label: t('reports.export.desc') || 'Description' },
                { key: t('reports.export.amount') || 'Amount', label: t('reports.export.amount') || 'Amount' }
            ]
        };

        // 4. Inventory
        const inv = reportStats.inv?.summary || {};
        const inventory = {
            title: `${t('reports.tabs.inventory') || 'Inventory'}`,
            sheetName: t('reports.tabs.inventory') || 'Inventory',
            data: [
                { [t('reports.export.desc') || 'Description']: t('reports.analytics.inv.total_titles') || 'Total Titles', [t('reports.export.val') || 'Value']: inv.titles || 0 },
                { [t('reports.export.desc') || 'Description']: t('reports.analytics.inv.total_volumes') || 'Total Volumes', [t('reports.export.val') || 'Value']: inv.volumes || 0 },
                { [t('reports.export.desc') || 'Description']: t('reports.analytics.inv.estimated_value') || 'Estimated Value', [t('reports.export.val') || 'Value']: `₹${(inv.estimated_value || 0).toFixed(2)}` }
            ],
            columns: [
                { key: t('reports.export.desc') || 'Description', label: t('reports.export.desc') || 'Description' },
                { key: t('reports.export.val') || 'Value', label: t('reports.export.val') || 'Value' }
            ]
        };

        // 5. Quick Stats
        const snaps = reportStats.summary?.snapshots || {};
        const quickStats = {
            title: t('reports.sections.quick_stats') || 'Quick Stats',
            sheetName: t('reports.sections.quick_stats') || 'Quick Stats',
            data: [
                { [t('reports.export.desc') || 'Description']: t('reports.stats.active_issues') || 'Active Issues', [t('reports.export.val') || 'Value']: snaps.active_issues || 0 },
                { [t('reports.export.desc') || 'Description']: t('reports.stats.overdue') || 'Overdue Books', [t('reports.export.val') || 'Value']: snaps.overdue_books || 0 },
                { [t('reports.export.desc') || 'Description']: t('reports.stats.total_books') || 'Total Books', [t('reports.export.val') || 'Value']: snaps.total_books || 0 },
                { [t('reports.export.desc') || 'Description']: t('reports.stats.members') || 'Members', [t('reports.export.val') || 'Value']: snaps.total_members || 0 }
            ],
            columns: [
                { key: t('reports.export.desc') || 'Description', label: t('reports.export.desc') || 'Description' },
                { key: t('reports.export.val') || 'Value', label: t('reports.export.val') || 'Value' }
            ]
        };

        return [dailyActivity, topBooks, financials, inventory, quickStats];
    };

    // Fetch fresh data for a specific period
    const fetchReportDataForPeriod = async (selectedPeriod) => {
        const apiPeriod = selectedPeriod === 'today' ? '1days' : selectedPeriod;
        const [summaryRes, circRes, finRes, invRes] = await Promise.all([
            fetch(`http://localhost:17221/api/reports/summary?period=${apiPeriod}`),
            fetch(`http://localhost:17221/api/reports/circulation?period=${apiPeriod}`),
            fetch(`http://localhost:17221/api/reports/financial?period=${apiPeriod}`),
            fetch(`http://localhost:17221/api/reports/inventory?period=${apiPeriod}`)
        ]);
        return {
            summary: await summaryRes.json(),
            circ: await circRes.json(),
            fin: await finRes.json(),
            inv: await invRes.json()
        };
    };

    // Main export handler
    const handleReportExport = async (selectedPeriod, format, contentType) => {
        // Get data (use current stats if period matches, else fetch fresh)
        let reportStats = stats;
        if (selectedPeriod !== period) {
            reportStats = await fetchReportDataForPeriod(selectedPeriod);
        }

        const sections = getAllReportSections(reportStats, selectedPeriod);
        console.log(`[Export] Generated ${sections.length} sections:`, sections.map(s => `${s.sheetName} (${s.data.length} rows)`));
        const dateStr = new Date().toLocaleDateString('en-GB');
        const fileName = `Library_Report_${dateStr.replace(/\//g, '-')}`;

        if (format === 'xlsx') {
            // Multi-sheet Excel — manual workbook construction
            const XLSX = require('xlsx');
            const wb = { SheetNames: [], Sheets: {} };
            const safeNames = ['Daily Activity', 'Top Books', 'Financials', 'Inventory', 'Quick Stats'];
            sections.forEach((section, idx) => {
                const sheetData = section.data && section.data.length > 0 ? section.data : [{ Info: 'No data available' }];
                const ws = XLSX.utils.json_to_sheet(sheetData);
                const name = safeNames[idx] || `Sheet${idx + 1}`;
                wb.SheetNames.push(name);
                wb.Sheets[name] = ws;
            });
            console.log('[Export XLSX] Final workbook sheets:', wb.SheetNames, '| Sheet count:', wb.SheetNames.length);
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'csv') {
            // Concatenated CSV with section headers + UTF-8 BOM for proper ₹ rendering
            let csvContent = '\uFEFF'; // UTF-8 BOM
            sections.forEach((section, idx) => {
                if (idx > 0) csvContent += '\n\n';
                csvContent += `--- ${section.title} ---\n`;
                if (section.data.length > 0) {
                    const headers = Object.keys(section.data[0]);
                    csvContent += headers.join(',') + '\n';
                    section.data.forEach(row => {
                        csvContent += headers.map(h => {
                            const val = String(row[h] || '');
                            return val.includes(',') ? `"${val}"` : val;
                        }).join(',') + '\n';
                    });
                }
            });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.csv`;
            link.click();
        } else if (format === 'pdf') {
            const pdfTitle = `${t('reports.export.summary_title') || 'Library Report'} - ${getPeriodLabel(selectedPeriod)}`;
            const settings = { visualData: reportStats };
            const content = generatePrintContent(pdfTitle, sections, [], settings);
            setShowExportModal(false);
            setPdfPreview({ isOpen: true, html: content.html, title: pdfTitle, fileName });
        }
    };



    const contentRef = useRef(null);

    const handleCaptureVisual = async () => {
        if (!contentRef.current) return null;
        try {
            const originalOverflow = contentRef.current.style.overflow;
            contentRef.current.style.overflow = 'visible';

            const canvas = await html2canvas(contentRef.current, {
                scale: 1.5,
                backgroundColor: '#1e293b',
                useCORS: true,
                logging: false,
                windowWidth: 1200
            });

            contentRef.current.style.overflow = originalOverflow;
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error("Capture failed", e);
            throw e;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e293b] text-white overflow-hidden relative">
            {/* Header */}
            <div className="flex flex-col gap-6 p-6 pb-2 z-20">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <FileText className="text-indigo-400" size={32} />
                            {t('reports.title')}
                        </h1>
                        <p className="text-gray-400 mt-1">{t('reports.subtitle')}</p>
                    </div>
                    <div className="flex gap-3">
                        <GlassSelect
                            value={period}
                            onChange={setPeriod}
                            options={[
                                { value: '7days', label: t('reports.period.7days') },
                                { value: '30days', label: t('reports.period.30days') },
                                { value: '90days', label: t('reports.period.90days') },
                                { value: '365days', label: t('reports.period.365days') }
                            ]}
                            icon={Calendar}
                        />
                        <button
                            className="toolbar-icon-btn"
                            onClick={() => setShowExportModal(true)}
                            title={t('reports.export_print') || 'Export / Print'}
                            style={{ height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
                        >
                            <Download size={20} />
                        </button>
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="inline-flex gap-2 border-b border-white/10 pb-2">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`btn btn-sm ${activeTab === 'daily'
                            ? 'btn-primary shadow-lg shadow-indigo-500/20'
                            : 'btn-ghost text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {t('reports.tabs.daily')}
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`btn btn-sm ${activeTab === 'analytics'
                            ? 'btn-primary shadow-lg shadow-indigo-500/20'
                            : 'btn-ghost text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {t('reports.tabs.analytics')}
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div
                ref={contentRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4 relative z-10"
            >
                {/* Background Decor */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1]">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px]"></div>
                </div>

                {loading ? (
                    <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-gray-400 font-mono text-sm tracking-widest animate-pulse">{t('reports.loading')}</p>
                    </div>
                ) : !stats || !stats.summary ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
                        <AlertCircle size={48} className="text-red-400 mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-white mb-2">{t('reports.offline_title')}</h3>
                        <button onClick={fetchReportData} className="mt-6 px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">{t('reports.retry')}</button>
                    </div>
                ) : (
                    <div className="pb-10 animate-fade-in-up space-y-10">

                        {/* TAB 1: DAILY ACTIVITY */}
                        {activeTab === 'daily' && (
                            <div className="report-section">
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <Calendar className="text-blue-400" size={20} />
                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">{t('reports.tabs.daily')}</h2>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                                                <th className="py-4 px-4 font-semibold">{t('reports.table.date')}</th>
                                                <th className="py-4 px-4 font-semibold">{t('reports.table.issued')}</th>
                                                <th className="py-4 px-4 font-semibold">{t('reports.table.returned')}</th>
                                                <th className="py-4 px-4 font-semibold text-right">{t('reports.table.fine')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-300 divide-y divide-white/5">
                                            {stats.summary.data.length === 0 ? (
                                                <tr><td colSpan="4" className="py-8 text-center text-gray-500">{t('reports.no_activity')}</td></tr>
                                            ) : (
                                                stats.summary.data.map((row, i) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                                        <td className="py-4 px-4 font-medium text-white">{formatDate(row.date)}</td>
                                                        <td className="py-4 px-4">{row.issues}</td>
                                                        <td className="py-4 px-4">{row.returns}</td>
                                                        <td className="py-4 px-4 text-right font-mono text-emerald-400">₹{row.fines.toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-white/20 bg-white/5 font-bold text-white">
                                                <td className="py-4 px-4">{t('reports.total')}</td>
                                                <td className="py-4 px-4">{stats.summary.totals?.issues || 0}</td>
                                                <td className="py-4 px-4">{stats.summary.totals?.returns || 0}</td>
                                                <td className="py-4 px-4 text-right">₹{(stats.summary.totals?.fines || 0).toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: ANALYTICS */}
                        {activeTab === 'analytics' && (
                            <div className="space-y-10">

                                {/* Most Demanded Books (Table View) */}
                                <div className="report-section">
                                    <div className="flex items-center gap-2 mb-4 px-2 pt-4">
                                        <TrendingUp className="text-purple-400" size={20} />
                                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{t('reports.sections.most_demanded')}</h2>
                                    </div>
                                    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                                                    <th className="py-4 px-4 font-semibold w-20">#</th>
                                                    <th className="py-4 px-4 font-semibold">{t('reports.analytics.circ.book_title')}</th>
                                                    <th className="py-4 px-4 font-semibold text-right">{t('reports.table.issued')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-300 divide-y divide-white/5">
                                                {(stats.circ.top_books || []).length === 0 ? (
                                                    <tr><td colSpan="3" className="py-8 text-center text-gray-500">No trending books</td></tr>
                                                ) : (
                                                    (stats.circ.top_books || []).map((book, i) => (
                                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                                            <td className="py-4 px-4 font-medium text-purple-400">#{i + 1}</td>
                                                            <td className="py-4 px-4 font-medium text-white">{book.title}</td>
                                                            <td className="py-4 px-4 text-right">
                                                                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-mono">{book.count}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Quick Stats (Insights) */}
                                <div className="report-section">
                                    <div className="flex items-center gap-2 mb-4 px-2 pt-4 border-t border-white/5">
                                        <Sparkles className="text-amber-400" size={20} />
                                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{t('reports.sections.quick_stats')}</h2>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="glass-panel p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400"><BookOpen size={24} /></div>
                                            <div>
                                                <p className="text-gray-400 text-xs uppercase font-semibold">{t('reports.stats.active_issues')}</p>
                                                <h3 className="text-2xl font-bold text-white">{stats.summary.snapshots?.active_issues || 0}</h3>
                                            </div>
                                        </div>
                                        <div className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-red-500/20 text-red-400"><AlertTriangle size={24} /></div>
                                            <div>
                                                <p className="text-gray-400 text-xs uppercase font-semibold">{t('reports.stats.overdue')}</p>
                                                <h3 className="text-2xl font-bold text-white">{stats.summary.snapshots?.overdue_books || 0}</h3>
                                            </div>
                                        </div>
                                        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400"><Library size={24} /></div>
                                            <div>
                                                <p className="text-gray-400 text-xs uppercase font-semibold">{t('reports.stats.total_books')}</p>
                                                <h3 className="text-2xl font-bold text-white">{stats.summary.snapshots?.total_books || 0}</h3>
                                            </div>
                                        </div>
                                        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400"><Users size={24} /></div>
                                            <div>
                                                <p className="text-gray-400 text-xs uppercase font-semibold">{t('reports.stats.members')}</p>
                                                <h3 className="text-2xl font-bold text-white">{stats.summary.snapshots?.total_members || 0}</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financials */}
                                <div className="report-section">
                                    <div className="flex items-center gap-2 mb-4 px-2 pt-4 border-t border-white/5">
                                        <DollarSign className="text-emerald-400" size={20} />
                                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{t('reports.tabs.financial')}</h2>
                                    </div>
                                    <FinancialAnalytics stats={stats.fin} />
                                </div>

                                {/* Inventory */}
                                <div className="report-section">
                                    <div className="flex items-center gap-2 mb-4 px-2 pt-4 border-t border-white/5">
                                        <Package className="text-gray-400" size={20} />
                                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{t('reports.tabs.inventory')}</h2>
                                    </div>
                                    <InventoryAnalytics stats={stats.inv} />
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>

            {showExportModal && (
                <ReportExportModal
                    onClose={() => setShowExportModal(false)}
                    onExport={handleReportExport}
                    currentPeriod={period}
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

export default SmartReportsPage;
