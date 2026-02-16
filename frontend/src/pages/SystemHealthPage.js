import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Wifi, Cpu, HardDrive, RefreshCw, CheckCircle, AlertTriangle, XCircle, Zap, Box, Shield, HeartPulse, Gauge } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { useTutorial } from '../context/TutorialContext';

const SystemHealthPage = () => {
    const { t } = useLanguage();
    const { setPageContext } = useTutorial();
    useEffect(() => {
        setPageContext('system-health');
    }, []);
    const [health, setHealth] = useState(null);
    const [connectivity, setConnectivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkingNet, setCheckingNet] = useState(false);
    const [healthScore, setHealthScore] = useState(0);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    // Calculate Smart Health Score whenever health/connectivity changes
    useEffect(() => {
        if (!health) return;

        let score = 100;
        const deductions = [];

        // 1. CPU Impact (Max 30 points)
        const cpu = parseFloat(health.system.cpuLoad) || 0;
        if (cpu > 50) deductions.push((cpu - 50) * 0.6);

        // 2. Memory Impact (Max 30 points)
        const mem = parseFloat(health.system.memory.usage) || 0;
        if (mem > 60) deductions.push((mem - 60) * 0.6);

        // 3. Disk Impact (Max 20 points)
        if (health.system.disk) {
            const disk = parseFloat(health.system.disk.usagePercent) || 0;
            if (disk > 80) deductions.push((disk - 80) * 1);
        }

        // 4. Connectivity Impact (Max 20 points)
        if (connectivity && !connectivity.internet) deductions.push(20);

        const totalDeduction = deductions.reduce((a, b) => a + b, 0);
        setHealthScore(Math.max(0, Math.round(100 - totalDeduction)));

    }, [health, connectivity]);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:17221/api/health');
            const data = await res.json();
            setHealth(data);

            // Auto-check connectivity if not done yet
            if (!connectivity) {
                const netRes = await fetch('http://localhost:17221/api/health/connectivity');
                const netData = await netRes.json();
                setConnectivity(netData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const runNetCheck = async () => {
        setCheckingNet(true);
        try {
            const res = await fetch('http://localhost:17221/api/health/connectivity');
            const data = await res.json();
            setConnectivity(data);
        } catch (err) {
            setConnectivity({ internet: false, error: 'Failed' });
        } finally {
            setCheckingNet(false);
        }
    };

    const getHealthStatus = (score) => {
        if (score >= 90) return { label: t('sidebar.sys_health.status.optimal') || 'OPTIMAL', color: 'text-green-400', bg: 'bg-green-500' };
        if (score >= 70) return { label: t('sidebar.sys_health.status.good') || 'GOOD', color: 'text-blue-400', bg: 'bg-blue-500' };
        if (score >= 50) return { label: t('sidebar.sys_health.status.fair') || 'FAIR', color: 'text-yellow-400', bg: 'bg-yellow-500' };
        return { label: t('sidebar.sys_health.status.critical') || 'CRITICAL', color: 'text-red-400', bg: 'bg-red-500' };
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (sec) => {
        const days = Math.floor(sec / 86400);
        const hours = Math.floor((sec % 86400) / 3600);
        return `${days}d ${hours}h`;
    };

    if (!health && loading) return <div className="p-10 text-white flex items-center gap-3"><RefreshCw className="animate-spin" /> Initializing...</div>;
    if (!health) return <div className="p-10 text-white">System Core Offline.</div>;

    const healthStatus = getHealthStatus(healthScore);

    return (
        <div className="p-6 text-white h-full overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0f1025] to-[#0f1025]">

            {/* Header - Compact */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                        <Activity className="text-cyan-400" size={20} />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                            {t('sidebar.sys_health.title') || 'System Diagnostics'}
                        </span>
                    </h1>
                </div>
                <button
                    className="px-4 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium flex items-center gap-2 transition-all"
                    onClick={fetchHealth}
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('sidebar.sys_health.scan') || 'Scan'}
                </button>
            </div>

            {/* DASHBOARD GRID */}
            <div className="dashboard-kpi-grid">

                {/* 1. Health Score - Uses standard StatsCard classes mixed with ID Card layout */}
                <div className="stats-card md:col-span-2 relative overflow-hidden group border-t border-cyan-500/30">
                    <div className="absolute inset-0 bg-cyan-500/5 blur-xl group-hover:bg-cyan-500/10 transition-all"></div>
                    <div className="stats-card-header relative z-10 flex items-center justify-between w-full h-full">
                        <div>
                            <h3 className="stats-card-title text-cyan-400">{t('sidebar.sys_health.score_title') || 'System Health Score'}</h3>
                            <div className="flex items-baseline gap-3 mt-1">
                                <span className="stats-card-value text-5xl">{healthScore}</span>
                                <span className={`text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/5 ${healthStatus.color}`}>
                                    {healthStatus.label}
                                </span>
                            </div>
                        </div>
                        <div className={`stats-card-icon bg-cyan-500/10 text-cyan-400 w-16 h-16`}>
                            <Activity size={32} />
                        </div>
                    </div>
                </div>

                {/* 2. CPU */}
                <div className="stats-card group">
                    <div className="stats-card-header">
                        <div>
                            <h3 className="stats-card-title">{t('sidebar.sys_health.cpu') || 'CPU Load'}</h3>
                            <p className="stats-card-value">{health.system.cpuLoad}%</p>
                        </div>
                        <div className="stats-card-icon blue">
                            <Cpu size={24} />
                        </div>
                    </div>
                    <div className="mt-auto pt-4">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                            <div className={`h-full ${parseFloat(health.system.cpuLoad) > 80 ? 'bg-red-500' : 'bg-blue-500'} transition-all`} style={{ width: `${health.system.cpuLoad}%` }}></div>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate font-mono">{health.system.cpuModel}</p>
                    </div>
                </div>

                {/* 3. RAM */}
                <div className="stats-card group">
                    <div className="stats-card-header">
                        <div>
                            <h3 className="stats-card-title">{t('sidebar.sys_health.memory') || 'Memory'}</h3>
                            <p className="stats-card-value">{health.system.memory.usage}%</p>
                        </div>
                        <div className="stats-card-icon purple">
                            <Box size={24} />
                        </div>
                    </div>
                    <div className="mt-auto pt-4">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                            <div className={`h-full ${parseFloat(health.system.memory.usage) > 80 ? 'bg-red-500' : 'bg-purple-400'} transition-all`} style={{ width: `${health.system.memory.usage}%` }}></div>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate font-mono">Free: {formatBytes(health.system.memory.free)}</p>
                    </div>
                </div>

                {/* 4. Disk */}
                <div className="stats-card group">
                    <div className="stats-card-header">
                        <div>
                            <h3 className="stats-card-title">{t('sidebar.sys_health.disk') || 'Disk Space'}</h3>
                            <p className="stats-card-value">{health.system.disk ? `${health.system.disk.usagePercent}%` : '...'}</p>
                        </div>
                        <div className="stats-card-icon green">
                            <HardDrive size={24} />
                        </div>
                    </div>
                    <div className="mt-auto pt-4">
                        {health.system.disk ? (
                            <>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                                    <div className={`h-full ${parseFloat(health.system.disk.usagePercent) > 90 ? 'bg-red-500' : 'bg-green-400'} transition-all`} style={{ width: `${health.system.disk.usagePercent}%` }}></div>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate font-mono">Free: {formatBytes(health.system.disk.free)}</p>
                            </>
                        ) : (
                            <p className="text-[10px] text-gray-500">Scanning storage...</p>
                        )}
                    </div>
                </div>

                {/* 5. Network - Adjusted span if needed, fitting into grid naturally */}
                <div className="stats-card group">
                    <div className="stats-card-header">
                        <div>
                            <h3 className="stats-card-title">{t('sidebar.sys_health.uplink') || 'Uplink'}</h3>
                            <p className={`stats-card-value text-2xl ${connectivity?.internet ? 'text-white' : 'text-red-400'}`}>
                                {connectivity ? (connectivity.internet ?
                                    (t('sidebar.sys_health.status.online') || 'ONLINE') :
                                    (t('sidebar.sys_health.status.offline') || 'OFFLINE')) : '...'}
                            </p>
                        </div>
                        <div className="stats-card-icon orange">
                            <Wifi size={24} />
                        </div>
                    </div>
                    <div className="mt-auto pt-4">
                        <div className="flex gap-1 h-1.5 items-end mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`w-full rounded-sm ${connectivity?.internet ? 'bg-orange-400' : 'bg-white/10'}`} style={{ height: `${20 + (i * 20)}%`, opacity: connectivity?.internet ? 1 : 0.3 }}></div>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate font-mono">{t('sidebar.sys_health.ping') || 'Ping'}: {connectivity?.latency || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Compact Details Table */}
            <div className="glass-panel p-0 overflow-hidden">
                <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                        <Shield className="text-cyan-400" size={14} /> {t('sidebar.sys_health.system_params') || 'System Parameters'}
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono">
                        Node: {health.process?.version} • Uptime: {formatUptime(health.system.uptime)}
                    </span>
                </div>

                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-3 text-gray-400 text-xs w-1/3 flex items-center gap-2"><Server size={14} /> {t('sidebar.sys_health.host') || 'Host Platform'}</td>
                            <td className="p-3 font-mono text-gray-300 text-xs">{health.system.platform} ({health.system.arch})</td>
                            <td className="p-3 text-right"><span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Active</span></td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-3 text-gray-400 text-xs w-1/3 flex items-center gap-2"><Database size={14} /> {t('sidebar.sys_health.db') || 'Database'}</td>
                            <td className="p-3 font-mono text-gray-300 text-xs">SQLite ({health.database.size})</td>
                            <td className="p-3 text-right">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${health.database.status === 'Connected' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                                    {health.database.status}
                                </span>
                            </td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-3 text-gray-400 text-xs w-1/3 flex items-center gap-2"><Box size={14} /> {t('sidebar.sys_health.app_mem') || 'App Memory'}</td>
                            <td className="p-3 font-mono text-gray-300 text-xs">{health.process?.memory ? formatBytes(health.process.memory.rss) : 'N/A'} (RSS)</td>
                            <td className="p-3 text-right"><span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">Running</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div >
    );
};

export default SystemHealthPage;
