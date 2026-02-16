import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Plus, Upload, Download, Trash2, Edit, Filter, Search, UserCheck,
    ArrowUpDown, ArrowUpCircle, ArrowDownCircle, Edit2
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import ConfirmationModal from '../components/common/ConfirmationModal';
import GlassSelect from '../components/common/GlassSelect';
import SmartAddStudentModal from '../components/students/SmartAddStudentModal';
import SmartEditStudentModal from '../components/students/SmartEditStudentModal';
import BulkEditStudentModal from '../components/students/BulkEditStudentModal';
import SmartBulkImportModal from '../components/common/SmartBulkImportModal';
import StudentExportModal from '../components/students/StudentExportModal';
import StudentDetailModal from '../components/students/StudentDetailModal';
import PromotionModal from '../components/students/PromotionModal';
import SmartStudentTable from '../components/students/SmartStudentTable';
import StatusModal from '../components/common/StatusModal';
import { useLanguage } from '../context/LanguageContext';
import { useTutorial } from '../context/TutorialContext';
import PdfPreviewModal from '../components/common/PdfPreviewModal';

const StudentManager = () => {
    const { t } = useLanguage();
    const { setPageContext } = useTutorial();
    const socket = useSocket();
    const [students, setStudents] = useState([]);

    useEffect(() => {
        setPageContext('students');
    }, []);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ department: '', semester: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStudentsCount, setTotalStudentsCount] = useState(0);

    // Modals & Selection
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [pdfPreview, setPdfPreview] = useState({ isOpen: false, html: '', title: '', fileName: '' });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPromotionModal, setShowPromotionModal] = useState(false);

    const [isDeleting, setIsDeleting] = useState(false);

    const [editingStudent, setEditingStudent] = useState(null);
    const [viewingStudent, setViewingStudent] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [confirmConfig, setConfirmConfig] = useState({ show: false, action: null, data: null });
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    // Fetch Departments
    useEffect(() => {
        fetch('http://localhost:17221/api/departments')
            .then(res => res.json())
            .then(data => Array.isArray(data) ? setDepartments(data) : [])
            .catch(err => console.error("Failed to fetch depts", err));

        // Fetch all students for validation (lightweight ID check if possible, or full list)
        fetch('http://localhost:17221/api/students?limit=10000').then(res => res.json())
            .then(data => {
                if (data.data && Array.isArray(data.data)) {
                    setExistingRegNos(new Set(data.data.map(s => s.register_number.toUpperCase())));
                }
            });
    }, []);

    const [existingRegNos, setExistingRegNos] = useState(new Set());

    // Fetch Students
    const fetchStudents = useCallback(async (currPage = 1) => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                search,
                department: filters.department,
                semester: filters.semester,
                sortBy: sortConfig.key,
                order: sortConfig.direction,
                page: currPage,
                limit
            }).toString();

            const res = await axios.get(`http://localhost:17221/api/students?${query}`);
            setStudents(res.data.data || []);
            setTotalPages(res.data.pagination?.totalPages || 1);
            setTotalStudentsCount(res.data.pagination?.total || 0);
            // setPagination(res.data.pagination);
            setSelectedStudents(new Set());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, filters, sortConfig, limit]); // Removed 'page' from dependencies as it's passed as an argument

    useEffect(() => {
        fetchStudents(page);
    }, [fetchStudents, page]);

    // Socket Listener
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Real-time update: Refreshing Students");
            fetchStudents(page);
            fetchGlobalCount(); // Refresh total count
        };
        socket.on('student_update', handleUpdate);
        return () => socket.off('student_update', handleUpdate);
    }, [socket, fetchStudents, page]);

    // Fetch Global Count
    const [globalTotalStudentsCount, setGlobalTotalStudentsCount] = useState(0);
    const fetchGlobalCount = async () => {
        try {
            const res = await axios.get(`http://localhost:17221/api/students?limit=100000`);
            const data = (res.data && res.data.data) || [];
            if (Array.isArray(data)) {
                setGlobalTotalStudentsCount(data.length);
            }
        } catch (e) {
            console.error("Failed to fetch global count", e);
        }
    };

    useEffect(() => {
        fetchGlobalCount();
    }, []);

    // --- Selection Logic ---
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedStudents(new Set(students.map(s => s.id)));
        } else {
            setSelectedStudents(new Set());
        }
    };

    const handleSelectStudent = (id) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudents(newSet);
    };

    // --- Action Handlers ---
    const handleDeleteClick = (studentId) => {
        setConfirmConfig({ show: true, action: 'delete_single', data: studentId });
    };

    const handleBulkDeleteClick = () => {
        setConfirmConfig({ show: true, action: 'delete_bulk', data: Array.from(selectedStudents) });
    };

    const handleBulkPromoteDemoteRequest = (action) => {
        setConfirmConfig({ show: true, action: action, data: Array.from(selectedStudents) });
    };

    const showSuccess = (title, message) => {
        setStatusModal({ isOpen: true, type: 'success', title, message });
    };

    const showError = (title, message) => {
        setStatusModal({ isOpen: true, type: 'error', title, message });
    };

    const executeConfirmation = async () => {
        const { action, data } = confirmConfig;

        setIsDeleting(true);

        // --- DELETE LOGIC ---
        if (action === 'delete_single' || action === 'delete_bulk') {
            const isBulk = action === 'delete_bulk';
            const ids = isBulk ? data : [data];
            const endpoint = isBulk ? '/api/students/bulk-delete' : `/api/students/${ids[0]}`;
            const method = isBulk ? 'POST' : 'DELETE';
            const body = isBulk ? JSON.stringify({ ids }) : null;

            try {
                const res = await fetch(`http://localhost:17221${endpoint}`, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body
                });

                const result = await res.json();

                if (res.ok) {
                    setIsDeleting(false); // Stop spinner
                    setConfirmConfig({ show: false, action: null, data: null }); // Close Confirm Modal manually
                    fetchStudents();
                    showSuccess("Deleted", "Student(s) deleted successfully.");
                    // setTimeout(() => window.location.reload(), 1500); // Force refresh - REMOVED to avoid jarring experience
                    return;
                } else {
                    setIsDeleting(false); // Stop spinner
                    setConfirmConfig({ show: false, action: null, data: null });
                    // Show specific error from backend (e.g., "Cannot delete: Student has active loans")
                    setTimeout(() => showError("Deletion Failed", (result.error || "Failed to delete student") + " (ERR_STU_DEL)"), 100);
                    return;
                }
            } catch (e) {
                console.error(e);
                setIsDeleting(false);
                setConfirmConfig({ show: false, action: null, data: null });
                setTimeout(() => showError("Network Error", "Failed to connect to server. (ERR_NET_STU_DEL)"), 100);
                return;
            }

            // --- PROMOTE / DEMOTE LOGIC ---
        } else if (action === 'promote' || action === 'demote') {
            const endpoint = action === 'promote' ? '/api/students/bulk-promote' : '/api/students/bulk-demote';
            try {
                const res = await fetch(`http://localhost:17221${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: data })
                });
                const result = await res.json();
                if (res.ok) {
                    setIsDeleting(false);
                    setConfirmConfig({ show: false, action: null, data: null });
                    fetchStudents();
                    setSelectedStudents(new Set());
                    showSuccess("Success", `Students ${action}d successfully.`);
                    return;
                } else {
                    setIsDeleting(false);
                    setConfirmConfig({ show: false, action: null, data: null });
                    setTimeout(() => showError("Action Failed", (result.error || "Unknown Error") + " (ERR_STU_ACT)"), 100);
                    return;
                }
            } catch (e) {
                console.error(e);
                setIsDeleting(false);
                setConfirmConfig({ show: false, action: null, data: null });
                setTimeout(() => showError("Network Error", "Failed to connect to server. (ERR_NET_CONN)"), 100);
                return;
            }
        }

        setIsDeleting(false);
        setConfirmConfig({ show: false, action: null, data: null });
    };

    const handleEditClick = (student) => {
        setEditingStudent(student);
        setShowEditModal(true);
    };

    const handleBulkUpdate = async (updates) => {
        try {
            const res = await fetch('http://localhost:17221/api/students/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedStudents), updates })
            });
            const result = await res.json();
            if (res.ok) {
                setShowBulkEdit(false);
                setSelectedStudents(new Set());
                fetchStudents();
                showSuccess("Success", "Bulk update successful");
            } else {
                showError("Update Failed", (result.error || "Unknown Error") + " (ERR_STU_BULK)");
            }
        } catch (e) {
            console.error(e);
            showError("Network Error", "Failed to connect. (ERR_NET_BULK)");
        }
    };

    // Unified Import Handler
    const handleImportSubmit = async (data) => {
        try {
            // Map Dept Names to IDs
            const finalData = data.map(row => {
                const dept = departments.find(d => d.name === row.department);
                return {
                    ...row,
                    department: dept ? dept.id : null // Send ID
                };
            });

            const res = await fetch('http://localhost:17221/api/students/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });
            const result = await res.json();
            if (res.ok) {
                fetchStudents();
                showSuccess("Import Complete", `Success: ${result.success}, Failed: ${result.failed}`);
            } else {
                showError("Import Failed", result.error || "Unknown Error");
            }
        } catch (e) {
            console.error(e);
            showError("Network Error", "Import failed.");
        }
    };

    const handleExport = async (scope, format) => {
        try {
            const body = {
                scope,
                format,
                filters: scope === 'all' ? {} : { search, department: filters.department, semester: filters.semester },
                ids: Array.from(selectedStudents)
            };

            const res = await fetch('http://localhost:17221/api/students/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                if (format === 'csv') {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    showSuccess("Success", "Export started.");
                } else {
                    const data = await res.json();

                    // Prepare data for Client-Side Export
                    const cleanData = data.map(s => ({
                        Photo: s.profile_image,
                        Name: s.full_name,
                        RegNo: s.register_number,
                        Department: s.department || s.dept_id || '-',
                        Semester: s.semester || '-',
                        Email: s.email || '-',
                        Phone: s.phone || '-',
                        Status: s.status || 'Active'
                    }));

                    if (format === 'xlsx') {
                        try {
                            const XLSX = require('xlsx');
                            // Exclude Photo for Excel
                            const excelData = cleanData.map(({ Photo, ...rest }) => rest);
                            const ws = XLSX.utils.json_to_sheet(excelData);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Students");
                            XLSX.writeFile(wb, `students_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
                            showSuccess("Success", "Export generated successfully.");
                        } catch (e) {
                            console.error("Excel export error:", e);
                            showError("Export Failed", "Could not generate Excel file.");
                        }
                    } else if (format === 'pdf') {
                        try {
                            const { generatePrintContent } = require('../utils/SmartPrinterHandler');
                            const content = generatePrintContent("Student List", cleanData, [
                                {
                                    key: 'Photo',
                                    label: 'Photo',
                                    render: (item) => item.Photo ? `<img src="${item.Photo}" class="student-photo" width="32" height="32" onerror="this.style.display='none'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #ccc;">` : ''
                                },
                                { key: 'Name', label: 'Name' },
                                { key: 'RegNo', label: 'Reg No' },
                                { key: 'Department', label: 'Department' },
                                { key: 'Semester', label: 'Sem' },
                                { key: 'Status', label: 'Status' }
                            ], {});
                            setShowExportModal(false);
                            setPdfPreview({ isOpen: true, html: content.html, title: 'Student List', fileName: `students_export_${new Date().toISOString().slice(0, 10)}` });
                        } catch (e) {
                            console.error("PDF export error:", e);
                            showError("Export Failed", "Could not generate PDF.");
                        }
                    } else {
                        // Fallback fallback (shouldn't happen if modal handles print)
                        console.warn("Unknown format:", format);
                    }
                }
            } else {
                showError("Export Failed", "Could not export data.");
            }
        } catch (e) { console.error(e); }
    };

    const handleViewClick = (student) => {
        setViewingStudent(student);
        setShowDetailModal(true);
    };

    // Helper to get modal props
    const getConfirmProps = () => {
        const { action, data } = confirmConfig;

        if (action === 'delete_single') {
            return {
                title: "Delete Student?",
                message: "Are you sure you want to delete this student? This action cannot be undone.",
                confirmText: "Delete", isDanger: true
            };
        }
        if (action === 'delete_bulk') {
            return {
                title: `Delete ${data?.length} Students?`,
                message: "This will permanently delete the selected students.",
                confirmText: "Delete All", isDanger: true
            };
        }
        if (action === 'promote') {
            return {
                title: `Promote ${data?.length} Students?`,
                message: "This will increment their semester. 6th semester students will become 'Alumni'.",
                confirmText: "Promote", isDanger: false
            };
        }
        if (action === 'demote') {
            return {
                title: `Demote ${data?.length} Students?`,
                message: "This will decrement their semester. Alumni will be returned to 6th semester.",
                confirmText: "Demote", isDanger: true
            };
        }
        return {};
    };

    const handleSelectAllGlobal = async () => {
        setLoading(true);
        try {
            // Fetch ALL IDs matching current filters
            const query = new URLSearchParams({
                search,
                department: filters.department,
                semester: filters.semester,
                idsOnly: 'true'
            }).toString();

            const finalQuery = `limit=100000&${query}`;

            const res = await fetch(`http://localhost:17221/api/students?${finalQuery}`);
            const data = await res.json();

            if (data.data && Array.isArray(data.data)) {
                const allIds = data.data.map(s => s.id);
                setSelectedStudents(new Set(allIds));
                showSuccess("Selected All", `${allIds.length} students selected.`);
            }
        } catch (e) {
            console.error(e);
            showError("Error", "Failed to select all students.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-content">
            {/* --- Controls --- */}
            <div className="flex flex-col gap-4 mb-6">
                {/* Row 1: Search, Filters, Primary Actions */}
                <div className="catalog-toolbar">
                    <div className="toolbar-search" style={{ flex: 1 }}>
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder={t('students.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="w-[180px]">
                        <GlassSelect
                            value={filters.department}
                            onChange={(val) => setFilters(prev => ({ ...prev, department: val }))}
                            options={[
                                { value: '', label: t('students.all_departments') },
                                ...departments.map(d => ({ value: d.name, label: d.name }))
                            ]}
                            icon={Filter}
                            placeholder={t('students.all_departments')}
                        />
                    </div>

                    <div className="w-[160px]">
                        <GlassSelect
                            value={filters.semester}
                            onChange={(val) => setFilters(prev => ({ ...prev, semester: val }))}
                            options={[
                                { value: '', label: t('students.all_semesters') },
                                { value: '1', label: 'Semester 1' },
                                ...['2', '3', '4', '5', '6'].map(s => ({ value: s, label: `Semester ${s}` }))
                            ]}
                            icon={Filter}
                            placeholder={t('students.all_semesters')}
                        />
                    </div>

                    <div className="w-[160px]">
                        <GlassSelect
                            value={`${sortConfig.key}-${sortConfig.direction}`}
                            onChange={(val) => {
                                const [key, direction] = val.split('-');
                                setSortConfig({ key, direction });
                            }}
                            options={[
                                { value: 'name-asc', label: 'Sort by Name (A-Z)' },
                                { value: 'name-desc', label: 'Sort by Name (Z-A)' },
                                { value: 'register_no-asc', label: 'Sort by RegNo (Asc)' },
                                { value: 'register_no-desc', label: 'Sort by RegNo (Desc)' },
                                { value: 'semester-asc', label: 'Sort by Semester (Asc)' },
                                { value: 'semester-desc', label: 'Sort by Semester (Desc)' }
                            ]}
                            icon={ArrowUpDown}
                            placeholder={t('students.sort_by')}
                        />
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-2"></div>

                    <button className="toolbar-icon-btn" style={{ width: '40px', height: '40px', flexShrink: 0 }} onClick={() => setShowExportModal(true)} title={t('students.export_data')}>
                        <Download size={20} />
                    </button>

                    <button className="toolbar-icon-btn" style={{ width: '40px', height: '40px', flexShrink: 0 }} onClick={() => setShowImportModal(true)} title={t('students.import_csv')}>
                        <Upload size={20} />
                    </button>

                    <button className="toolbar-primary-btn whitespace-nowrap" onClick={() => setShowAddModal(true)}>
                        <Plus size={20} /> {t('students.add_student')}
                    </button>
                </div>

                {/* Row 2: Bulk Actions & Utilities */}
                <div className="catalog-toolbar">
                    <button className="toolbar-primary-btn bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 whitespace-nowrap" onClick={() => setShowPromotionModal(true)}>
                        <ArrowUpCircle size={20} className="mr-2" /> {t('students.promote_class')}
                    </button>

                    {selectedStudents.size > 0 && (
                        <>
                            <div className="h-8 w-px bg-white/10 mx-2"></div>
                            <span className="text-sm text-white/50 px-2 font-medium">{selectedStudents.size} {t('students.selected')}</span>

                            <button className="toolbar-icon-btn text-green-400 hover:bg-green-500/20 hover:text-green-400" onClick={() => handleBulkPromoteDemoteRequest('promote')} title={t('students.promote_selected')}>
                                <ArrowUpCircle size={20} />
                            </button>
                            <button className="toolbar-icon-btn text-orange-400 hover:bg-orange-500/20 hover:text-orange-400" onClick={() => handleBulkPromoteDemoteRequest('demote')} title={t('students.demote_selected')}>
                                <ArrowDownCircle size={20} />
                            </button>
                            <button className="toolbar-icon-btn text-blue-400 hover:bg-blue-500/20 hover:text-blue-400" onClick={() => setShowBulkEdit(true)} title={t('students.bulk_edit')}>
                                <Edit2 size={20} />
                            </button>
                            <button className="toolbar-icon-btn text-red-400 hover:bg-red-500/20 hover:text-red-400" onClick={handleBulkDeleteClick} title={t('students.delete_selected')}>
                                <Trash2 size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* --- Table View --- */}
            <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <SmartStudentTable
                    students={students}
                    loading={loading}
                    selectedIds={selectedStudents}
                    onSelect={handleSelectStudent}
                    onSelectAll={(ids, select) => {
                        if (select) {
                            setSelectedStudents(prev => {
                                const newSet = new Set(prev);
                                ids.forEach(id => newSet.add(id));
                                return newSet;
                            });
                        } else {
                            // If IDs are empty, it means "Deselect All" was clicked in popup
                            if (ids.length === 0) setSelectedStudents(new Set());
                            else {
                                setSelectedStudents(prev => {
                                    const newSet = new Set(prev);
                                    ids.forEach(id => newSet.delete(id));
                                    return newSet;
                                });
                            }
                        }
                    }}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onView={handleViewClick}
                    sortConfig={sortConfig}
                    onSort={(key) => {
                        let direction = 'asc';
                        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
                        setSortConfig({ key, direction });
                    }}
                    pagination={{
                        currentPage: page,
                        totalPages: totalPages,
                        totalItems: totalStudentsCount,
                        itemsPerPage: limit,
                        onPageChange: (newPage) => setPage(newPage),
                        onItemsPerPageChange: (newLimit) => { setLimit(newLimit); setPage(1); },
                        onSelectAllGlobal: handleSelectAllGlobal // Pass the global select handler
                    }}
                />
            </div>



            {showImportModal && (
                <SmartBulkImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    title="Smart Import Students (CSV/Excel)"
                    sampleFile="/student_sample.csv"
                    duplicateKey="register_no"
                    onImport={handleImportSubmit}
                    columns={[
                        { key: 'name', label: 'Name', required: true, aliases: ['student'] },
                        { key: 'father_name', label: 'Father Name', aliases: ['father', 'father name', 'parent', 'guardian'] },
                        { key: 'register_no', label: 'RegNo', required: true, aliases: ['reg', 'usn'] },
                        {
                            key: 'department',
                            label: 'Dept',
                            required: true,
                            type: 'select',
                            options: departments.map(d => ({ value: d.name, label: d.name })),
                            aliases: ['branch', 'program']
                        },
                        {
                            key: 'semester',
                            label: 'Sem',
                            required: true,
                            type: 'select',
                            options: ['1', '2', '3', '4', '5', '6'].map(s => ({ value: s, label: s })),
                            aliases: ['year']
                        },
                        { key: 'dob', label: 'DOB', required: true, type: 'date-text', aliases: ['birth'] },
                        { key: 'email', label: 'Email', type: 'email', aliases: ['mail'] },
                        { key: 'phone', label: 'Phone', aliases: ['contact', 'mobile'] },
                        { key: 'address', label: 'Address', aliases: ['location'] }
                    ]}
                    onValidate={(row) => {
                        const errors = [];
                        if (existingRegNos.has(row.register_no?.toUpperCase())) errors.push('RegNo exists in DB');
                        if (row.dob && !/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) errors.push('Format DD-MM-YYYY');
                        // Dept validation - logic handled by Select but if imported from CSV
                        if (row.department && !departments.some(d => d.name.toLowerCase() === row.department.toLowerCase())) {
                            errors.push("Unknown Dept");
                        }
                        return errors;
                    }}
                    transformData={(row) => {
                        // Auto-match dept
                        if (row.department) {
                            const found = departments.find(d => d.name.toLowerCase() === row.department.toLowerCase());
                            if (found) row.department = found.name;
                        }
                        // Auto-format name to Title Case
                        if (row.name) {
                            row.name = row.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        }
                        return row;
                    }}
                />
            )}
            {showAddModal && <SmartAddStudentModal onClose={() => setShowAddModal(false)} onAdd={fetchStudents} />}
            {showEditModal && editingStudent && (
                <SmartEditStudentModal
                    student={editingStudent}
                    onClose={() => { setShowEditModal(false); setEditingStudent(null); }}
                    onUpdate={fetchStudents}
                />
            )}
            {showBulkEdit && (
                <BulkEditStudentModal
                    count={selectedStudents.size}
                    onClose={() => setShowBulkEdit(false)}
                    onUpdate={handleBulkUpdate}
                />
            )}
            {showExportModal && (
                <StudentExportModal
                    onClose={() => setShowExportModal(false)}
                    onExport={handleExport}
                    totalStudents={globalTotalStudentsCount || totalStudentsCount}
                    selectedCount={selectedStudents.size}
                    selectedIds={selectedStudents}
                    filteredCount={totalStudentsCount} // Use pagination total, which is the total filtered items
                    data={students.map(s => ({
                        id: s.id, // Ensure ID is present for matching
                        Photo: s.profile_image,
                        Name: s.full_name,
                        'Father Name': s.father_name,
                        RegNo: s.register_number,
                        Dept: s.department_name || s.department,
                        Sem: s.semester,
                        Status: s.status,
                        Phone: s.phone,
                        DOB: s.dob ? s.dob.split('-').reverse().join('/') : ''
                    }))}
                    columns={[
                        { key: 'Photo', label: 'Photo', render: (row) => row.Photo ? `<img src="${row.Photo}" style="height:40px; width:40px; object-fit:cover; border-radius:50%;" />` : '' },
                        'Name', 'Father Name', 'RegNo', 'Dept', 'Sem', 'Status', 'Phone', 'DOB'
                    ]}
                    onFetchAll={async () => {
                        try {
                            // strictly fetch ALL for export/print
                            const res = await fetch(`http://localhost:17221/api/students?limit=100000`);
                            const data = await res.json();
                            return (data.data || []).map(s => ({
                                id: s.id, // Include ID for selection matching
                                Photo: s.profile_image,
                                Name: s.full_name,
                                'Father Name': s.father_name,
                                RegNo: s.register_number,
                                Dept: s.department_name || s.department,
                                Sem: s.semester,
                                Status: s.status,
                                Phone: s.phone,
                                DOB: s.dob ? s.dob.split('-').reverse().join('/') : ''
                            }));
                        } catch (e) {
                            console.error("Fetch all failed", e);
                            return [];
                        }
                    }}
                />
            )}
            {showDetailModal && viewingStudent && (
                <StudentDetailModal
                    student={viewingStudent}
                    onClose={() => { setShowDetailModal(false); setViewingStudent(null); }}
                />
            )}
            {showPromotionModal && (
                <PromotionModal
                    onClose={() => setShowPromotionModal(false)}
                    onPromoteComplete={() => { setShowPromotionModal(false); fetchStudents(); }}
                />
            )}

            <ConfirmationModal
                isOpen={confirmConfig.show}
                onClose={() => !isDeleting && setConfirmConfig({ ...confirmConfig, show: false })}
                onConfirm={executeConfirmation}
                isLoading={isDeleting}
                closeOnConfirm={false} // We handle close manually
                {...getConfirmProps()}
            />

            <StatusModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
            />

            <PdfPreviewModal
                isOpen={pdfPreview.isOpen}
                onClose={() => setPdfPreview(p => ({ ...p, isOpen: false }))}
                htmlContent={pdfPreview.html}
                title={pdfPreview.title}
                fileName={pdfPreview.fileName}
                enableImageToggle={true}
            />
        </div>
    );
};

export default StudentManager;
