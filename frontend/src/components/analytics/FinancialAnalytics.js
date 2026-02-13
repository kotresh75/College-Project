import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Wallet, CreditCard, Activity, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import StatsCard from '../dashboard/StatsCard';
import { useLanguage } from '../../context/LanguageContext';

const FinancialAnalytics = ({ stats }) => {
    const { t } = useLanguage();
    // Helper for recovery rate
    const collected = stats?.summary?.collected || 0;
    const pending = stats?.summary?.pending || 0;
    const totalPotential = collected + pending;
    const recoveryRate = totalPotential > 0 ? ((collected / totalPotential) * 100).toFixed(0) : 0;

    // Custom Chart Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-gray-400 text-xs mb-2 font-mono">{label}</p>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-emerald-400">₹{payload[0].value}</span>
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('reports.analytics.fin.received')}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Money Cards - Forced 2 Columns */}
            <div className="grid gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <StatsCard
                    title={t('reports.analytics.fin.collected')}
                    value={`₹${collected.toFixed(2)}`}
                    icon={Wallet}
                    color="emerald"
                    trend={null}
                />
                <StatsCard
                    title={t('reports.analytics.fin.pending')}
                    value={`₹${pending.toFixed(2)}`}
                    icon={AlertCircle}
                    color="red"
                    trend={totalPotential > 0 ? `${((pending / totalPotential) * 100).toFixed(0)}% ${t('reports.analytics.fin.unrecovered')}` : null}
                />

            </div>

            {/* Main Financial Grid - Forced 2 Columns */}
            <div className="grid gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {/* Collection Trends REMOVED as per request */}

                {/* Efficiency Meter */}
                <div className="chart-widget p-6 border-none bg-white/5 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <CreditCard size={18} className="text-blue-400" />
                        {t('reports.analytics.fin.recovery_rate')}
                    </h3>

                    <div className="flex-1 flex flex-col justify-center items-center relative">
                        {/* Circular Progress Placeholder */}
                        <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                                <circle
                                    cx="80" cy="80" r="70"
                                    stroke={recoveryRate > 80 ? "#10b981" : recoveryRate > 50 ? "#f59e0b" : "#ef4444"}
                                    strokeWidth="12"
                                    fill="none"
                                    strokeDasharray="440"
                                    strokeDashoffset={440 - (440 * (recoveryRate / 100))}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-white">{recoveryRate}%</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest mt-1">{t('reports.analytics.fin.recovered')}</span>
                            </div>
                        </div>

                        <div className="w-full mt-8 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{t('reports.analytics.fin.total_generated')}</span>
                                <span className="text-white font-mono">₹{totalPotential.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{t('reports.analytics.fin.collected_amount')}</span>
                                <span className="text-emerald-400 font-mono">₹{collected.toFixed(0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialAnalytics;
