import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatDate } from '../../utils/dateUtils';
import { X, Activity, User, Mail, Phone, Briefcase, Calendar, Clock, Lock } from 'lucide-react';

const StaffDetailModal = ({ staff, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (staff) {
            setLoading(true);
            fetch(`http://localhost:17221/api/staff/${staff.id}/activity`)
                .then(res => res.json())
                .then(data => setLogs(Array.isArray(data) ? data : []))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [staff]);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1400] flex items-center justify-center animate-fade-in p-4" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400
        }}>
            <div className="glass-panel w-full max-w-4xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
                style={{
                    padding: 0,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    boxShadow: 'var(--glass-shadow)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-lg)'
                }}
            >

                {/* Header with Profile Summarry */}
                <div className="p-5 border-b flex justify-between items-start" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center border" style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                            borderColor: 'var(--glass-border)'
                        }}>
                            <User size={30} style={{ color: 'var(--text-main)' }} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>{staff.name}</h2>
                            <div className="flex gap-4 text-sm opacity-80" style={{ color: 'var(--text-secondary)' }}>
                                <span className="flex items-center gap-2"><Briefcase size={14} /> {staff.designation}</span>
                                <span className="flex items-center gap-2"><Mail size={14} /> {staff.email}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar Profile Details */}
                    <div className="w-64 p-5 border-r" style={{ borderColor: 'var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
                        <h3 className="text-xs uppercase tracking-wider font-semibold mb-4 opacity-70" style={{ color: 'var(--text-secondary)' }}>Profile Details</h3>

                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs opacity-70 mb-1" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                                <div className="flex items-center gap-2 font-medium">
                                    <Phone size={14} className="text-green-500" /> {staff.phone || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs opacity-70 mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${staff.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                    {staff.status}
                                </span>
                            </div>
                            <div>
                                <label className="block text-xs opacity-70 mb-1" style={{ color: 'var(--text-secondary)' }}>Last Login</label>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-blue-500" />
                                    {staff.last_login ? formatDate(staff.last_login, true) : 'Never'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs opacity-70 mb-1" style={{ color: 'var(--text-secondary)' }}>Joined</label>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-purple-500" />
                                    {formatDate(staff.created_at)}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                            <label className="block text-xs opacity-70 mb-2" style={{ color: 'var(--text-secondary)' }}>Permissions</label>
                            <div className="flex flex-wrap gap-1.5">
                                {(staff.access_permissions || []).map(p => (
                                    <span key={p} className="text-xs px-2 py-1 rounded border bg-white/5" style={{ borderColor: 'var(--glass-border)' }}>
                                        {p}
                                    </span>
                                ))}
                                {(!staff.access_permissions || staff.access_permissions.length === 0) && <span className="text-xs italic opacity-60">None</span>}
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Logs Timeline */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Activity size={20} className="text-yellow-400" /> Activity Log
                        </h3>

                        {loading ? (
                            <div className="p-10 text-center"><div className="spinner-lg"></div></div>
                        ) : logs.length === 0 ? (
                            <div className="p-10 text-center italic opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                No activity recorded yet.
                            </div>
                        ) : (
                            <div className="relative pl-6 border-l-2 space-y-6" style={{ borderColor: 'var(--glass-border)' }}>
                                {logs.map(log => (
                                    <div key={log.id} className="relative pl-4">
                                        {/* Dot */}
                                        <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-[var(--bg-color)]"></div>

                                        {/* Content */}
                                        <div className="text-sm mb-1">
                                            <span className="font-semibold">{log.action_type}</span> - {log.description}
                                        </div>
                                        <div className="text-xs flex gap-3 opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                            <span>{formatDate(log.timestamp, true)}</span>
                                            <span className="px-1.5 rounded bg-white/10">{log.module}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <button onClick={onClose} className="primary-glass-btn px-6 py-2 rounded-lg text-sm font-medium">Close</button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default StaffDetailModal;
