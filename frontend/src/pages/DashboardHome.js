import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../context/PreferencesContext';
import { useLanguage } from '../context/LanguageContext';
import { useTutorial } from '../context/TutorialContext';
import { useSocket } from '../context/SocketContext';
import { Book, Users, Repeat, AlertCircle, DollarSign, PackageX } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

import StatsCard from '../components/dashboard/StatsCard';
import ChartWidget from '../components/dashboard/ChartWidget';
import RecentAuditTable from '../components/dashboard/RecentAuditTable';
import DashboardDetailModal from '../components/dashboard/DashboardDetailModal';

const DashboardHome = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { setPageContext } = useTutorial();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        setPageContext('dashboard');
    }, []);
    const [charts, setCharts] = useState({
        booksByDept: [],
        studentsByDept: [],
        mostIssuedBooks: []
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [modalType, setModalType] = useState(null); // 'issued_today', 'overdue', 'lost_damaged'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const socket = useSocket();

    // Get User Permissions
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userRole = userInfo.role || 'Guest';
    const userPermissions = userInfo.permissions || [];

    const fetchStats = async () => {
        try {
            const statsRes = await axios.get('http://localhost:17221/api/dashboard/stats');
            setStats(statsRes.data);
        } catch (err) {
            console.error("Error fetching stats:", err);
            setError(err.message);
        }
    };

    const fetchCharts = async () => {
        try {
            const chartsRes = await axios.get('http://localhost:17221/api/dashboard/charts');
            setCharts(chartsRes.data);
        } catch (err) {
            console.error("Error fetching charts:", err);
        }
    };

    const fetchLogs = async () => {
        try {
            const logsRes = await axios.get('http://localhost:17221/api/dashboard/logs');
            setRecentLogs(logsRes.data.recent || []);
        } catch (err) {
            console.error("Error fetching logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchCharts();
        fetchLogs();
    }, []);

    // Socket Listener
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            console.log("Real-time update received: Refreshing Dashboard");
            fetchStats();
            fetchCharts();
            fetchLogs();
        };

        socket.on('circulation_update', handleUpdate);
        socket.on('book_update', handleUpdate); // Books change count

        return () => {
            socket.off('circulation_update', handleUpdate);
            socket.off('book_update', handleUpdate);
        };
    }, [socket]);

    // Colors for Pie Chart
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

    if (loading) {
        return <div className="text-center py-8">{t('dashboard.loading')}</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">{t('common.error')}: {error}</div>;
    }

    // Ensure stats is not null before rendering
    if (!stats) {
        return <div className="text-center py-8">{t('dashboard.no_data')}</div>;
    }

    return (
        <div className="dashboard-content">
            <h1 className="dashboard-title mb-6">{t('dashboard.overview')}</h1>

            {/* KPI Section - Grid with Navigation */}
            <div className="dashboard-kpi-grid stagger-children">
                {(userRole === 'Admin' || userPermissions.includes('CATALOG')) && (
                    <StatsCard
                        title={t('dashboard.total_books')}
                        value={stats.totalBooks}
                        icon={Book}
                        color="blue"
                        onClick={() => navigate('/dashboard/books')}
                    />
                )}
                {(userRole === 'Admin' || userPermissions.includes('STUDENTS')) && (
                    <StatsCard
                        title={t('dashboard.total_students')}
                        value={stats.totalStudents}
                        icon={Users}
                        color="purple"
                        onClick={() => navigate('/dashboard/members')}
                    />
                )}
                {(userRole === 'Admin' || userPermissions.includes('CIRCULATION')) && (
                    <>
                        <StatsCard
                            title={t('dashboard.issued_today')}
                            value={stats.booksIssuedToday}
                            icon={Repeat}
                            color="green"
                            onClick={() => setModalType('issued_today')}
                        />
                        <StatsCard
                            title={t('dashboard.overdue_books')}
                            value={stats.overdueBooks}
                            icon={AlertCircle}
                            color="orange"
                            onClick={() => setModalType('overdue')}
                        />
                    </>
                )}
                {(userRole === 'Admin' || userPermissions.includes('CIRCULATION')) && (
                    <StatsCard
                        title={t('dashboard.fines_collected')}
                        value={`₹${stats.totalFines}`}
                        icon={DollarSign}
                        color="emerald"
                        onClick={() => navigate('/dashboard/circulation', { state: { activeTab: 'fines', fineSubTab: 'history' } })}
                    />
                )}
                {(userRole === 'Admin' || userPermissions.includes('CIRCULATION')) && (
                    <StatsCard
                        title={t('dashboard.lost_damaged')}
                        value={stats.lostBooks}
                        icon={PackageX}
                        color="red"
                        onClick={() => setModalType('lost_damaged')}
                    />
                )}
            </div>

            {/* Charts Section - Grid */}
            <div className="dashboard-charts-grid stagger-children">
                {(userRole === 'Admin' || userPermissions.includes('CATALOG')) && (
                    <ChartWidget title={t('dashboard.books_by_dept')}>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={charts.booksByDept}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        fill="#8884d8"
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {charts.booksByDept.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWidget>
                )}

                {(userRole === 'Admin' || userPermissions.includes('STUDENTS')) && (
                    <ChartWidget title={t('dashboard.active_students')}>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.studentsByDept}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={60} />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Bar dataKey="value" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWidget>
                )}

                {(userRole === 'Admin' || userPermissions.includes('CIRCULATION')) && (
                    <ChartWidget title={t('dashboard.trending_books')}>
                        <div className="chart-container flex flex-col justify-center">
                            {charts.mostIssuedBooks && charts.mostIssuedBooks.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={charts.mostIssuedBooks} margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                        <XAxis type="number" stroke="#94a3b8" hide />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                        />
                                        <Bar dataKey="value" fill="#F472B6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-500">No issuance data yet.</p>
                            )}
                        </div>
                    </ChartWidget>
                )}
            </div>

            {/* Audit & Compliance Section - Admin Only */}
            {(userRole === 'Admin' || userPermissions.includes('ADMIN')) && (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="dashboard-title">{t('dashboard.recent_activity')}</h2>
                        <button onClick={() => navigate('/dashboard/audit')} className="text-sm text-emerald-400 hover:text-emerald-300">
                            {t('dashboard.view_audit')} &rarr;
                        </button>
                    </div>
                    <RecentAuditTable logs={recentLogs} />
                </div>
            )}

            {/* Detail Modal */}
            {modalType && (
                <DashboardDetailModal
                    type={modalType}
                    onClose={() => setModalType(null)}
                />
            )}
        </div>
    );
};

export default DashboardHome;
