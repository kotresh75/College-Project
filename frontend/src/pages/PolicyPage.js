import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, RotateCcw, Lock, Calendar, DollarSign, BookOpen, FileText } from 'lucide-react';
import PasswordPromptModal from '../components/common/PasswordPromptModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import GlassSelect from '../components/common/GlassSelect';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useTutorial } from '../context/TutorialContext';

const PolicyPage = () => {
    const { t } = useLanguage();
    const { setPageContext } = useTutorial();
    useEffect(() => {
        setPageContext('policies');
    }, []);
    const [activeTab, setActiveTab] = useState('borrowing');
    const [activeProfile, setActiveProfile] = useState('student');
    const [policies, setPolicies] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState({});
    const [settings, setSettings] = useState({}); // Store system settings for security config

    // Notification State
    const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const showNotification = (title, message, type = 'info') => setNotification({ isOpen: true, title, message, type });
    const closeNotification = () => setNotification(n => ({ ...n, isOpen: false }));

    // Fetch Policies
    useEffect(() => {
        fetchPolicies();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('http://localhost:17221/api/settings/app');
            const data = await res.json();
            setSettings(data);
        } catch (e) {
            console.error("Failed to fetch settings", e);
        }
    };

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Policy Update: Refreshing");
            fetchPolicies();
        };
        socket.on('policy_update', handleUpdate);
        return () => socket.off('policy_update', handleUpdate);
    }, [socket]);

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:17221/api/policy');
            const data = await res.json();
            setPolicies(data);
        } catch (err) {
            showNotification('Error', t('policy.actions.err_load'), 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle Change in deeply nested objects
    const handleChange = (section, path, value) => {
        setPolicies(prev => {
            const updated = { ...prev };
            // Simple path handling for now (assuming 1 or 2 levels deep)
            if (section === 'policy_borrowing') {
                updated[section][activeProfile][path] = value;
            } else if (section === 'policy_financial') {
                updated[section][path] = value;
            } else if (section === 'policy_calendar') {
                updated[section][path] = value;
            } else {
                updated[section][path] = value;
            }
            return updated;
        });
        setUnsavedChanges(prev => ({ ...prev, [section]: true }));
    };

    const handleSave = () => {
        setIsPromptOpen(true);
    };

    const confirmSave = async (password) => {
        // Prepare the user ID - robust check
        const user = JSON.parse(localStorage.getItem('user_info')) || JSON.parse(localStorage.getItem('user'));
        const adminId = user ? user.id : null;

        try {
            const res = await fetch('http://localhost:17221/api/policy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    updates: policies, // We send full policies or just diffs. Sending full for simplicity.
                    admin_id: adminId,
                    admin_password: password
                })
            });
            const data = await res.json();

            if (res.ok) {
                showNotification('Success', t('policy.actions.success_update', { version: data.version }), 'success');
                setIsPromptOpen(false);
                setUnsavedChanges({});
                fetchPolicies(); // Refresh
            } else {
                showNotification(t('policy.actions.err_update'), data.error + " (ERR_POL_UPD)", 'error');
                setIsPromptOpen(false); // Close prompt to allow retry or cancel
            }
        } catch (e) {
            showNotification(t('policy.actions.err_network'), t('policy.actions.err_network'), 'error');
            setIsPromptOpen(false);
        }
    };

    if (loading) return <div className="p-4">Loading Policies...</div>;
    if (!policies) return <div className="p-4">Error loading policies.</div>;

    const renderBorrowingTab = () => {
        // Single profile 'student' active by default

        return (
            <div className="animate-fade-in">
                <div className="flex items-center mb-6 border-b border-white/10 pb-4">
                    <h4 className="font-medium flex items-center gap-2 text-lg">
                        <BookOpen size={20} className="text-emerald-400" /> {t('policy.borrowing.title')}
                    </h4>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="field-label">{t('policy.borrowing.max_books')}</label>
                        <input
                            type="number" className="glass-input w-full"
                            value={policies.policy_borrowing[activeProfile]?.maxBooks || 0}
                            onChange={e => handleChange('policy_borrowing', 'maxBooks', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="field-label">{t('policy.borrowing.loan_days')}</label>
                        <input
                            type="number" className="glass-input w-full"
                            value={policies.policy_borrowing[activeProfile]?.loanDays || 0}
                            onChange={e => handleChange('policy_borrowing', 'loanDays', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="field-label">{t('policy.borrowing.renewal_days')}</label>
                        <input
                            type="number" className="glass-input w-full"
                            placeholder={t('policy.borrowing.renewal_placeholder')}
                            value={policies.policy_borrowing[activeProfile]?.renewalDays || ''}
                            onChange={e => handleChange('policy_borrowing', 'renewalDays', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="field-label">{t('policy.borrowing.max_renewals')}</label>
                        <input
                            type="number" className="glass-input w-full"
                            value={policies.policy_borrowing[activeProfile]?.maxRenewals || 0}
                            onChange={e => handleChange('policy_borrowing', 'maxRenewals', parseInt(e.target.value))}
                        />
                    </div>


                    <div className="col-span-2 mt-4 p-4 border border-red-500/30 rounded-xl bg-red-500/5">
                        <label className="field-label text-red-300 flex items-center gap-2"><Lock size={14} /> {t('policy.borrowing.auto_block')}</label>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-white/60">{t('policy.borrowing.block_msg')}</span>
                            <input
                                type="number" className="glass-input w-32"
                                value={policies.policy_borrowing[activeProfile]?.blockFineThreshold || 0}
                                onChange={e => handleChange('policy_borrowing', 'blockFineThreshold', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderFinancialTab = () => (
        <div className="glass-panel p-4 animate-fade-in space-y-6">
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="field-label">{t('policy.financial.daily_rate')}</label>
                    <input
                        type="number" step="0.5" className="glass-input w-full"
                        value={policies.policy_financial.dailyFineRate}
                        onChange={e => handleChange('policy_financial', 'dailyFineRate', parseFloat(e.target.value))}
                    />
                </div>

            </div>

            <div>
                <h4 className="border-b border-glass pb-2 mb-4 font-medium">{t('policy.financial.damage_lost_title')}</h4>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="field-label">{t('policy.financial.damage_amt')}</label>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">₹</span>
                            <input
                                type="number" className="glass-input w-full"
                                value={policies.policy_financial.damagedFineAmount || 100}
                                onChange={e => handleChange('policy_financial', 'damagedFineAmount', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="field-label">{t('policy.financial.lost_amt')}</label>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">₹</span>
                            <input
                                type="number" className="glass-input w-full"
                                value={policies.policy_financial.lostFineAmount || 500}
                                onChange={e => handleChange('policy_financial', 'lostFineAmount', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );

    return (
        <div className="dashboard-content">
            {/* Header & Toolbar */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="catalog-toolbar justify-between">
                    {/* Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                            <Lock size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white leading-tight flex items-center gap-2">
                                {t('policy.title')}
                                <span className="text-[10px] font-normal text-white/40 bg-white/10 px-1.5 py-0.5 rounded-full">v{policies.policy_version || '1.0'}</span>
                            </h1>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button className="toolbar-icon-btn" onClick={fetchPolicies} title={t('policy.actions.reset')}>
                            <RotateCcw size={20} />
                        </button>

                        <button className="toolbar-primary-btn" onClick={handleSave}>
                            <Save size={18} /> {t('policy.actions.save')}
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs (Pill Style) - Below Toolbar */}
                <div className="flex">
                    <div className="glass-panel flex gap-1 p-1 rounded-full">
                        <button
                            onClick={() => setActiveTab('borrowing')}
                            className={`btn rounded-full flex items-center gap-2 ${activeTab === 'borrowing' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            <BookOpen size={18} /> {t('policy.tabs.borrowing')}
                        </button>
                        <button
                            onClick={() => setActiveTab('financial')}
                            className={`btn rounded-full flex items-center gap-2 ${activeTab === 'financial' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            <DollarSign size={18} /> {t('policy.tabs.financial')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="glass-panel" style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                {activeTab === 'borrowing' && renderBorrowingTab()}
                {activeTab === 'financial' && renderFinancialTab()}
            </div>

            <PasswordPromptModal
                isOpen={isPromptOpen}
                onClose={() => setIsPromptOpen(false)}
                onSuccess={confirmSave}
                message={t('policy.actions.prompt_msg')}
            />

            {/* Notification Modal */}
            <ConfirmationModal
                isOpen={notification.isOpen}
                onClose={closeNotification}
                onConfirm={closeNotification}
                title={notification.title}
                message={notification.message}
                confirmText="OK"
                cancelText=""
                isDanger={notification.type === 'error'}
            />
        </div>
    );
};

export default PolicyPage;
