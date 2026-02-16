import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';

import GlassSelect from '../components/common/GlassSelect';
import StatusModal from '../components/common/StatusModal';
// import StudentSearchSelect from '../components/common/StudentSearchSelect'; // Removed
import GlassAutocomplete from '../components/common/GlassAutocomplete';
import GlassEditor from '../components/common/GlassEditor';
import { Send, Trash2, Users, FileText, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';

const NotificationPage = () => {
    const { t } = useLanguage();
    const [recipientType, setRecipientType] = useState('student');
    const [targetStudents, setTargetStudents] = useState([]); // Array for multi-select
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [emailUsage, setEmailUsage] = useState(null);

    const [loading, setLoading] = useState(false);
    const [isBroadcastEnabled, setIsBroadcastEnabled] = useState(true);

    const fetchEmailUsage = async () => {
        try {
            const res = await fetch('http://localhost:17221/api/settings/email/usage');
            if (res.ok) {
                const data = await res.json();
                setEmailUsage(data); // { count, limit, date }
            }
        } catch (err) {
            console.error("Failed to fetch email usage:", err);
        }
    };

    // Fetch Settings to check if Broadcast is enabled
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('http://localhost:17221/api/settings/app');
                if (res.ok) {
                    const data = await res.json();
                    if (data.email_events && data.email_events.broadcastMessages === false) {
                        setIsBroadcastEnabled(false);
                    } else {
                        setIsBroadcastEnabled(true);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            }
        };
        fetchSettings();
        fetchEmailUsage();
    }, []);

    // Status Modal State
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    // History State
    const [history, setHistory] = useState([]);
    const [historySort, setHistorySort] = useState('desc'); // 'desc' (Recent) or 'asc' (Oldest)
    const [visibleCount, setVisibleCount] = useState(8);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

    // Fetch History Helper
    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`http://localhost:17221/api/admins/broadcast/history?order=${historySort}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    // Re-fetch when sort changes
    useEffect(() => {
        fetchHistory();
    }, [historySort]);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Broadcast History Update: Refreshing");
            fetchHistory();
        };
        socket.on('broadcast_update', handleUpdate);
        return () => socket.off('broadcast_update', handleUpdate);
    }, [socket, historySort]);

    // Fetch History
    useEffect(() => {
        fetchHistory();
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let backendGroup = '';

            if (recipientType === 'student') {
                if (targetStudents.length === 0) throw new Error(t('broadcast.status.select_student_err'));
                // Send comma-separated list of IDs
                const ids = targetStudents.map(s => s.id).join(',');
                backendGroup = `Student:${ids}`;
            }
            else if (recipientType === 'overdue') {
                backendGroup = 'Overdue';
            }
            else if (recipientType === 'issued') {
                backendGroup = 'Issued';
            }

            // Retrieve consistent token
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error(t('broadcast.status.auth_err'));

            const formData = new FormData();
            formData.append('recipient_group', backendGroup);
            formData.append('subject', subject);
            formData.append('message', message);
            if (file) {
                formData.append('attachment', file);
            }

            const response = await fetch('http://localhost:17221/api/admins/broadcast', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Content-Type not set to let browser set boundary for multipart
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                // Handle different error formats ({ error: ... } vs { message: ... })
                const errMsg = data.error || data.message || `Server Error: ${JSON.stringify(data)}`;
                throw new Error(errMsg);
            }

            setStatusModal({ isOpen: true, type: 'success', title: t('broadcast.status.sent'), message: `${t('broadcast.status.success_msg')} ${data.recipientCount || t('broadcast.status.recipients')}` });
            setSubject('');
            setMessage('');
            setFile(null);
            setTargetStudents([]);
            fetchHistory(); // Refresh history
        } catch (err) {
            setStatusModal({ isOpen: true, type: 'error', title: t('broadcast.status.failed'), message: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Offline State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    // Load More Handler
    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 8);
    };

    return (
        <div className="dashboard-content">
            <h1 className="page-title">{t('broadcast.title')}</h1>

            {!isOnline && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#EF4444',
                    fontSize: '0.9rem'
                }}>
                    <AlertCircle size={20} />
                    <div>
                        <strong>Offline:</strong> Internet connection is required to send emails.
                    </div>
                </div>
            )}

            {/* Main Content Area - Fixed Height to prevent expansion */}
            <div style={{ display: 'flex', gap: '20px', flexDirection: 'row', flexWrap: 'wrap', height: 'calc(100vh - 140px)', minHeight: '600px' }}>

                {/* --- COMPOSER PANEL (LEFT - 60%) --- */}
                <div className="glass-panel" style={{ flex: '3', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'hidden' }}>
                    <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                        <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Send size={20} /> {t('broadcast.compose.title')}
                        </h2>
                    </div>

                    {/* Email Usage Indicator */}
                    {emailUsage && (
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                <span>Daily Email Quota</span>
                                <span style={{ fontWeight: 'bold', color: emailUsage.count >= emailUsage.limit ? '#EF4444' : 'inherit' }}>
                                    {emailUsage.count} / {emailUsage.limit}
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min((emailUsage.count / emailUsage.limit) * 100, 100)}%`,
                                    height: '100%',
                                    background: emailUsage.count >= emailUsage.limit ? '#EF4444' : '#48bb78',
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                            {emailUsage.count >= emailUsage.limit && (
                                <div style={{ fontSize: '0.8rem', color: '#EF4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} /> Limit reached. Emails will not be sent.
                                </div>
                            )}
                        </div>
                    )}

                    {!isBroadcastEnabled && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: '#EF4444',
                            fontSize: '0.9rem'
                        }}>
                            <AlertCircle size={20} />
                            <div>
                                <strong>Warning:</strong> Broadcast messages are currently disabled in Settings. Emails will NOT be sent.
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>

                        {/* Targeting Section */}
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{t('broadcast.compose.recipient_type')}</label>
                            <GlassSelect
                                icon={Users}
                                value={recipientType}
                                onChange={setRecipientType}
                                options={[
                                    { value: 'student', label: t('broadcast.compose.types.student') },
                                    { value: 'overdue', label: t('broadcast.compose.types.overdue') },
                                    { value: 'issued', label: t('broadcast.compose.types.issued') }
                                ]}
                            />
                        </div>



                        {recipientType === 'student' && (
                            <div className="glass-card bounce-in" style={{ padding: '15px', background: 'rgba(100,100,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>{t('broadcast.compose.search_student')}:</label>

                                {/* Selected Students Chips */}
                                {targetStudents.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '5px' }}>
                                        {targetStudents.map(s => (
                                            <div key={s.id} style={{
                                                background: 'rgba(72, 187, 120, 0.2)',
                                                border: '1px solid rgba(72, 187, 120, 0.3)',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                fontSize: '0.85rem'
                                            }}>
                                                <Users size={14} />
                                                <span>{s.full_name} ({s.register_number})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setTargetStudents(prev => prev.filter(p => p.id !== s.id))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: 'inherit', opacity: 0.7 }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <GlassAutocomplete
                                    placeholder={t('broadcast.compose.enter_student')}
                                    onSearch={async (query) => {
                                        const token = localStorage.getItem('auth_token');
                                        const res = await fetch(`http://localhost:17221/api/circulation/search/students?q=${query}`, {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        // Issue Tab's search endpoint returns array directly
                                        return await res.json();
                                    }}
                                    onSelect={(student) => {
                                        if (!targetStudents.some(s => s.id === student.id)) {
                                            setTargetStudents(prev => [...prev, student]);
                                        }
                                    }}
                                    renderItem={(s) => (
                                        <div className="py-1">
                                            <div className="font-bold text-white">{s.full_name}</div>
                                            <div className="text-xs text-gray-400">{s.register_number} • {s.department_name}</div>
                                        </div>
                                    )}
                                    icon={Users}
                                    value=""
                                />
                            </div>
                        )}

                        {/* Subject */}
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{t('broadcast.compose.subject')}</label>
                            <div className="input-group">
                                <FileText className="input-icon" size={18} />
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder={t('broadcast.compose.enter_subject')}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Message Body (WYSIWYG) */}
                        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{t('broadcast.compose.body')}</label>
                            <div style={{ flex: 1, minHeight: '200px' }}>
                                <GlassEditor
                                    value={message}
                                    onChange={setMessage}
                                    placeholder={t('broadcast.compose.type_message')}
                                />
                            </div>
                        </div>

                        {/* Attachment */}
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{t('broadcast.compose.attachment') || "Attachment (Optional)"}</label>
                            <div className="input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                                <input
                                    type="file"
                                    id="file-upload"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const selectedFile = e.target.files[0];
                                        if (selectedFile) {
                                            if (selectedFile.size > 10 * 1024 * 1024) { // 10MB Limit
                                                setStatusModal({
                                                    isOpen: true,
                                                    type: 'error',
                                                    title: 'File Too Large',
                                                    message: 'The selected file exceeds the 10MB limit. Please choose a smaller file.'
                                                });
                                                e.target.value = null; // Reset input
                                                return;
                                            }
                                            setFile(selectedFile);
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="secondary-glass-btn"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        padding: '8px 16px',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <FileText size={16} />
                                    {file ? 'Change File' : 'Choose File'}
                                </label>
                                {file && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        <span>{file.name}</span>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 0 }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '15px', marginTop: 'auto' }}>
                            <button
                                type="submit"
                                disabled={loading || !isBroadcastEnabled || !isOnline}
                                className="primary-glass-btn"
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '10px',
                                    opacity: (loading || !isBroadcastEnabled || !isOnline) ? 0.6 : 1,
                                    cursor: (loading || !isBroadcastEnabled || !isOnline) ? 'not-allowed' : 'pointer',
                                    filter: (!isBroadcastEnabled || !isOnline) ? 'grayscale(1)' : 'none'
                                }}
                            >
                                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Send size={18} />}
                                {loading ? t('broadcast.compose.sending') : t('broadcast.compose.send')}
                            </button>
                            <button type="button" className="icon-btn" onClick={() => { setSubject(''); setMessage(''); setFile(null); }} style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }}>
                                <Trash2 size={18} /> {t('broadcast.compose.clear')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- HISTORY PANEL (RIGHT - 40%) --- */}
                <div className="glass-panel" style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={20} /> {t('broadcast.history.title')}
                        </h2>
                        <div style={{ width: '160px' }}>
                            <GlassSelect
                                value={historySort}
                                onChange={setHistorySort}
                                options={[
                                    { value: 'desc', label: t('broadcast.history.recent') },
                                    { value: 'asc', label: t('broadcast.history.oldest') }
                                ]}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {history.slice(0, visibleCount).map(item => (
                            <div
                                key={item.id}
                                className="glass-card"
                                style={{
                                    padding: '15px',
                                    marginBottom: '15px',
                                    borderLeft: item.status === 'sent' ? '4px solid #48bb78' : '4px solid #f56565',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                onClick={() => setSelectedHistoryItem(item)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{item.date}</span>
                                    {item.status === 'sent' ? <CheckCircle size={16} color="#48bb78" /> : <AlertCircle size={16} color="#f56565" />}
                                </div>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{item.subject}</h4>
                                <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                    {t('broadcast.history.to')}: {item.target}
                                </div>
                            </div>
                        ))}

                        {visibleCount < history.length && (
                            <button
                                onClick={handleLoadMore}
                                className="secondary-glass-btn"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    marginTop: '10px',
                                    cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-main)'
                                }}
                            >
                                Load More
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <StatusModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                autoClose={statusModal.type === 'success' ? 3000 : 0}
            />

            {/* Detail View Modal */}
            {selectedHistoryItem && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setSelectedHistoryItem(null)}>
                    <div
                        className="glass-panel"
                        style={{
                            width: '90%',
                            maxWidth: '800px', // Increased from 600px
                            maxHeight: '85vh',
                            overflowY: 'auto',
                            position: 'relative',
                            animation: 'scaleIn 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 10001 // Ensure it's above overlay backdrop
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedHistoryItem(null)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{ paddingRight: '40px', marginBottom: '5px' }}>{selectedHistoryItem.subject}</h2>

                        <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Clock size={14} /> {selectedHistoryItem.date}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Users size={14} /> {selectedHistoryItem.target}
                            </span>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: selectedHistoryItem.status === 'sent' ? '#48bb78' : '#f56565'
                            }}>
                                {selectedHistoryItem.status === 'sent' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                {selectedHistoryItem.status === 'sent' ? 'Sent' : 'Failed'}
                            </span>
                        </div>

                        <div
                            className="broadcast-message-content"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '20px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                lineHeight: '1.6',
                                color: 'var(--text-main)',
                                overflowWrap: 'anywhere', // Force wrap at any point if necessary
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap', // Preserve newlines but wrap text
                                maxWidth: '100%'
                            }}>
                            <div dangerouslySetInnerHTML={{ __html: selectedHistoryItem.message || selectedHistoryItem.body || `<div style="text-align:center; color: var(--text-secondary); padding: 20px;"><i>Content not available for this message.</i></div>` }} />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
};

export default NotificationPage;
