import React from 'react';
import { Clock, ShieldAlert, User, FileText, Settings, Database } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const RecentAuditTable = ({ logs = [] }) => {
    const { t } = useLanguage();

    const getIcon = (log) => {
        const size = 18;
        const strokeWidth = 2; // Thinner stroke for elegance

        // Database / Backup Actions
        if (log.action_type && (
            log.action_type.includes('BACKUP') ||
            log.action_type.includes('RESTORE') ||
            log.action_type === 'IMPORT'
        )) {
            return <div className="p-2 rounded-full bg-blue-500/10 text-blue-400"><Database size={size} strokeWidth={strokeWidth} /></div>;
        }

        // Critical Actions
        if (
            log.action_type === 'DELETE' ||
            log.action_type === 'REMOVE' ||
            log.action_type === 'LOGIN_FAILED' ||
            log.action_type === 'BACKUP_FAILED'
        ) {
            return <div className="p-2 rounded-full bg-red-500/10 text-red-400"><ShieldAlert size={size} strokeWidth={strokeWidth} /></div>;
        }

        // Security Module
        if (log.module === 'Security') return <div className="p-2 rounded-full bg-red-500/10 text-red-400"><ShieldAlert size={size} strokeWidth={strokeWidth} /></div>;

        // Settings Module
        if (log.module === 'Settings') return <div className="p-2 rounded-full bg-gray-500/10 text-gray-400"><Settings size={size} strokeWidth={strokeWidth} /></div>;

        // Circulation
        if (log.action_type === 'ISSUE' || log.action_type === 'RETURN') return <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400"><FileText size={size} strokeWidth={strokeWidth} /></div>;

        // Default User Action
        return <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-400"><User size={size} strokeWidth={strokeWidth} /></div>;
    };

    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return '-';
        const now = new Date();
        const date = new Date(timestamp);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const getActionColor = (action) => {
        if (action === 'LOGIN') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
        if (action === 'ISSUE') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (action === 'RETURN') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (action.includes('DELETE') || action.includes('FAILED')) return 'bg-red-500/10 text-red-400 border-red-500/20';
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    };

    return (
        <div className="glass-panel overflow-hidden border border-white/5 shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-4 font-medium text-slate-400 text-xs uppercase tracking-wider pl-6">{t('audit.table.action')}</th>
                            <th className="p-4 font-medium text-slate-400 text-xs uppercase tracking-wider">{t('audit.table.actor')}</th>
                            <th className="p-4 font-medium text-slate-400 text-xs uppercase tracking-wider">{t('audit.table.description')}</th>
                            <th className="p-4 font-medium text-slate-400 text-xs uppercase tracking-wider text-right pr-6">{t('audit.table.timestamp')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-12 text-center text-slate-500 italic">
                                    {t('audit.table.no_logs')}
                                </td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors duration-200">
                                    <td className="p-4 pl-6 align-top">
                                        <div className="flex items-start gap-3">
                                            {getIcon(log)}
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border w-fit ${getActionColor(log.action_type)}`}>
                                                    {log.action_type}
                                                </span>
                                                <span className="text-xs text-slate-500">{log.module}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-200">{log.actor_role}</span>
                                            <span className="text-xs text-slate-500 mt-0.5 font-mono" title={log.actor_email || log.actor_id}>
                                                {log.actor_email ?
                                                    (log.actor_email.length > 25 ? log.actor_email.substring(0, 22) + '...' : log.actor_email)
                                                    : (log.actor_id && log.actor_id.length > 10 ? log.actor_id.substring(0, 8) + '...' : log.actor_id)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <p className="text-sm text-slate-300 line-clamp-2 max-w-lg leading-relaxed" title={log.description}>
                                            {log.description}
                                        </p>
                                    </td>
                                    <td className="p-4 pr-6 text-right whitespace-nowrap align-top">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-sm font-medium text-slate-400">{formatRelativeTime(log.timestamp)}</span>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 group-hover:text-slate-500 transition-colors">
                                                <Clock size={12} />
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentAuditTable;
