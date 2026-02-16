import React, { useState, useEffect } from 'react';
import { Search, Plus, Building } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import SmartAddDepartmentModal from '../components/departments/SmartAddDepartmentModal';
import SmartDepartmentTable from '../components/departments/SmartDepartmentTable';
import ConfirmationModal from '../components/common/ConfirmationModal';
import StatusModal from '../components/common/StatusModal';
import { useSocket } from '../context/SocketContext';
import { useTutorial } from '../context/TutorialContext';

const DepartmentPage = () => {
    const { setPageContext } = useTutorial();
    useEffect(() => {
        setPageContext('departments');
    }, []);
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    // Modal States
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, data: null });

    const socket = useSocket();

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:17221/api/departments?search=${search}`);
            const data = await res.json();
            if (Array.isArray(data)) setDepartments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, [search]);

    // Socket Listener
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Department Update: Refreshing");
            fetchDepartments();
        };
        socket.on('dept_update', handleUpdate);
        return () => socket.off('dept_update', handleUpdate);
    }, [socket, search]);

    const handleDeleteClick = (id) => {
        setConfirmModal({ isOpen: true, data: { id } });
    };

    const confirmDelete = async () => {
        const id = confirmModal.data?.id;
        if (!id) return;

        try {
            const res = await fetch(`http://localhost:17221/api/departments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchDepartments();
                setStatusModal({ isOpen: true, type: 'success', title: t('departments.delete_success_title'), message: t('departments.delete_success_msg') });
            } else {
                setStatusModal({ isOpen: true, type: 'error', title: t('departments.delete_fail_title'), message: t('departments.delete_fail_msg') });
            }
        } catch (err) {
            setStatusModal({ isOpen: true, type: 'error', title: t('common.error'), message: 'Network error occurred.' });
        } finally {
            setConfirmModal({ isOpen: false, data: null });
        }
    };

    return (
        <div className="dashboard-content">
            <div className="flex flex-col gap-6 h-full">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Building size={32} className="text-blue-400" /> {t('departments.title')}
                    </h1>
                    <p className="text-[var(--text-secondary)]">{t('departments.subtitle')}</p>
                </div>

                {/* Smart Toolbar */}
                <div className="catalog-toolbar">
                    <div className="toolbar-search" style={{ flex: 1, maxWidth: '500px' }}>
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder={t('departments.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div style={{ flex: 1 }} />

                    <button
                        className="toolbar-primary-btn"
                        onClick={() => { setSelectedDept(null); setShowModal(true); }}
                    >
                        <Plus size={20} /> {t('departments.add_department')}
                    </button>
                </div>

                <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <SmartDepartmentTable
                        departments={departments}
                        loading={loading}
                        onEdit={(dept) => { setSelectedDept(dept); setShowModal(true); }}
                        onDelete={handleDeleteClick}
                    />
                </div>

                {showModal && (
                    <SmartAddDepartmentModal
                        onClose={() => setShowModal(false)}
                        onAdded={fetchDepartments}
                        initialData={selectedDept}
                    />
                )}
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, data: null })}
                onConfirm={confirmDelete}
                title={t('departments.delete_title')}
                message={t('departments.delete_confirm_msg')}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                isDanger={true}
            />

            <StatusModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
            />
        </div>
    );
};

export default DepartmentPage;
