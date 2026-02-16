import React, { useState, useEffect } from 'react';
import { Search, Shield, Plus, Lock } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useTutorial } from '../context/TutorialContext';
import AdminCard from '../components/admin/AdminCard';
import AddAdminModal from '../components/admin/AddAdminModal';
import ConfirmationModal from '../components/common/ConfirmationModal';

const AdminManager = () => {
    const { t } = useLanguage();
    const { setPageContext } = useTutorial();
    useEffect(() => {
        setPageContext('admin');
    }, []);
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals 
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState({ show: false, action: null, data: null });

    // Functions
    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:17221/api/admins', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setAdmins(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch admins", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Admin Update: Refreshing");
            fetchAdmins();
        };
        socket.on('admin_update', handleUpdate);
        return () => socket.off('admin_update', handleUpdate);
    }, [socket]);

    // Filter Logic
    const filteredAdmins = admins.filter(admin =>
        admin.name.toLowerCase().includes(search.toLowerCase()) ||
        admin.email.toLowerCase().includes(search.toLowerCase())
    );

    // Handlers
    const handleEdit = (admin) => {
        setEditingAdmin(admin);
        setShowAddModal(true);
    };

    const handleToggleStatus = (admin) => {
        const newStatus = admin.status === 'Active' ? 'Disabled' : 'Active';
        const action = newStatus === 'Active' ? 'enable' : 'disable';
        setConfirmConfig({
            show: true,
            action: 'toggle_status',
            data: { id: admin.id, name: admin.name, newStatus, action }
        });
    };

    const handleDelete = (admin) => {
        setConfirmConfig({ show: true, action: 'delete', data: admin });
    };

    const handleResetPassword = (admin) => {
        setConfirmConfig({ show: true, action: 'reset_password', data: admin });
    };

    const executeConfirmation = async () => {
        const { action, data } = confirmConfig;
        setConfirmConfig({ show: false, action: null, data: null }); // Close modal immediately

        if (action === 'alert') return;

        try {
            const token = localStorage.getItem('auth_token');
            let res;
            if (action === 'toggle_status') {
                res = await fetch(`http://localhost:17221/api/admins/${data.id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: data.newStatus })
                });
            } else if (action === 'delete') {
                res = await fetch(`http://localhost:17221/api/admins/${data.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } else if (action === 'reset_password') {
                res = await fetch(`http://localhost:17221/api/admins/${data.id}/reset-password`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            if (res.ok) {
                fetchAdmins();
                if (action === 'reset_password') {
                    alert(t('admin.actions.success_reset', { name: data.name }));
                }
            } else {
                const err = await res.json();
                alert(t('admin.actions.failed', { error: err.error }));
            }
        } catch (error) {
            console.error(error);
            alert(t('admin.actions.network_err'));
        }
    };

    // Helper for modal props
    const getConfirmProps = () => {
        const { action, data } = confirmConfig;
        if (action === 'delete') return {
            title: t('admin.actions.delete_title'),
            message: t('admin.actions.delete_msg', { name: data.name }),
            confirmText: t('admin.actions.delete_btn'), isDanger: true
        };
        if (action === 'toggle_status') return {
            title: data.action === 'enable' ? t('admin.actions.enable_title') : t('admin.actions.disable_title'),
            message: data.action === 'enable' ? t('admin.actions.enable_msg', { name: data.name }) : t('admin.actions.disable_msg', { name: data.name }),
            confirmText: data.action === 'enable' ? t('admin.actions.enable_btn') : t('admin.actions.disable_btn'),
            isDanger: data.action === 'disable'
        };
        if (action === 'reset_password') return {
            title: t('admin.actions.reset_title'),
            message: t('admin.actions.reset_msg', { name: data.name }),
            confirmText: t('admin.actions.reset_btn'), isDanger: true
        };
        return {};
    };

    return (
        <div className="dashboard-content">
            {/* Header & Toolbar */}
            <div className="mb-6">
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 12, marginBottom: '5px' }}>
                    <Shield size={28} className="text-yellow-400" /> {t('admin.title')}
                </h1>
                <p className="text-white/60">{t('admin.subtitle')}</p>
            </div>

            <div className="flex flex-col gap-4 mb-6">
                <div className="catalog-toolbar" style={{ justifyContent: 'center' }}>
                    <div className="toolbar-search" style={{ width: '400px' }}>
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder={t('admin.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-2"></div>

                    <button className="toolbar-primary-btn whitespace-nowrap" onClick={() => { setEditingAdmin(null); setShowAddModal(true); }}>
                        <Plus size={20} /> {t('admin.create_new')}
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {loading ? (
                        <p style={{ color: 'var(--text-secondary)' }}>{t('admin.loading')}</p>
                    ) : filteredAdmins.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>{t('admin.no_admins')}</p>
                    ) : (
                        filteredAdmins.map(admin => (
                            <AdminCard
                                key={admin.id}
                                admin={admin}
                                onEdit={handleEdit}
                                onToggleStatus={handleToggleStatus}
                                onDelete={handleDelete}
                                onResetPassword={handleResetPassword}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <AddAdminModal
                    admin={editingAdmin}
                    onClose={() => setShowAddModal(false)}
                    onSave={fetchAdmins}
                />
            )}

            <ConfirmationModal
                isOpen={confirmConfig.show}
                onClose={() => setConfirmConfig({ ...confirmConfig, show: false })}
                onConfirm={executeConfirmation}
                {...getConfirmProps()}
            />
        </div>
    );
};

export default AdminManager;
