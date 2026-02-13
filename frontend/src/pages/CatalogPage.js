import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Upload, Filter, Grid, List as ListIcon, ArrowUpDown, Trash2, Download, BookOpen, Book, BarChart2, MoreVertical, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useLanguage } from '../context/LanguageContext';
import GlassSelect from '../components/common/GlassSelect';
import { useSocket } from '../context/SocketContext';
import SmartAddBookModal from '../components/books/SmartAddBookModal';
import SmartEditBookModal from '../components/books/SmartEditBookModal';
import SmartManageCopiesModal from '../components/books/SmartManageCopiesModal';
import SmartBulkImportModal from '../components/common/SmartBulkImportModal';
import ExportModal from '../components/books/ExportModal';
import SmartBookDetailModal from '../components/books/SmartBookDetailModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import SmartBookTable from '../components/books/SmartBookTable';
import PdfPreviewModal from '../components/common/PdfPreviewModal';

const CatalogPage = () => {
    const socket = useSocket();
    const { t } = useLanguage();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    // Removed viewMode state

    // Book Context for Import Validation
    const [existingTitles, setExistingTitles] = useState(new Set());
    const [existingISBNsDB, setExistingISBNsDB] = useState(new Set());

    const [departments, setDepartments] = useState([]); // Store full dept objects
    const [departmentOptions, setDepartmentOptions] = useState([
        { value: 'All', label: t('catalog.all_departments') }
    ]);

    // Selection state
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [pdfPreview, setPdfPreview] = useState({ isOpen: false, html: '', title: '', fileName: '' });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        isDanger: false
    });

    const [selectedBook, setSelectedBook] = useState(null);
    const [autoFillProgress, setAutoFillProgress] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Use window-level state for background auto-fill so it persists across navigation


    // Sync with global state
    useEffect(() => {
        // Update from global on mount
        if (window.__autoFillStatus) {
            // Using a local ref or just skipping this since we don't display it here anymore
            // But we might want to know if it finished to refresh books?
            if (window.__autoFillStatus.justCompleted) {
                window.__autoFillStatus.justCompleted = false;
                fetchBooks();
            }
        }

        // Poll for updates while running (only if we need to refresh books on completion)
        const interval = setInterval(() => {
            if (window.__autoFillStatus && window.__autoFillStatus.justCompleted) {
                window.__autoFillStatus.justCompleted = false;
                fetchBooks();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);


    // Fetch Departments
    useEffect(() => {
        fetch('http://localhost:17221/api/departments')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setDepartments(data); // Save full data for code lookup
                    const options = [
                        { value: 'All', label: 'All Departments' },
                        ...data.map(d => ({ value: d.name, label: d.name }))
                    ];
                    setDepartmentOptions(options);
                }
            })
            .catch(err => console.error("Failed to fetch departments", err));
    }, []);

    // Fetch Books
    const fetchBooks = async () => {
        setLoading(true);
        try {
            // Removed status query param
            const query = new URLSearchParams({ search, department: category, sort: sortBy }).toString();
            // TODO: Pagination support on backend would be ideal for infinite scroll
            const res = await fetch(`http://localhost:17221/api/books?${query}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setBooks(data);
                // Update context for validation
                setExistingTitles(new Set(data.map(b => b.title ? b.title.toLowerCase().trim() : '')));
                setExistingISBNsDB(new Set(data.map(b => b.isbn)));
            } else {
                setBooks([]);
            }
        } catch (error) {
            console.error("Failed to fetch books", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooks();
    }, [search, category, sortBy]); // Removed viewMode dependency

    // Socket Listener
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Book Update: Refreshing");
            fetchBooks();
            fetchTotalCount(); // Refresh total count on updates
        };
        socket.on('book_update', handleUpdate);
        return () => socket.off('book_update', handleUpdate);
    }, [socket, search, category, sortBy]);

    // Fetch Total Count separately
    const [totalBooksCount, setTotalBooksCount] = useState(0);
    const fetchTotalCount = async () => {
        try {
            // Fetch all books to get count. If backend supported /count endpoint it would be better.
            const res = await fetch(`http://localhost:17221/api/books?limit=100000`);
            const data = await res.json();
            const allBooks = Array.isArray(data) ? data : (data.data || []);
            setTotalBooksCount(allBooks.length);
        } catch (e) {
            console.error("Failed to fetch total count", e);
        }
    };

    useEffect(() => {
        fetchTotalCount();
    }, []);

    // Handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === books.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(books.map(b => b.isbn))); // ISBN as key
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const executeBulkDelete = async () => {
        setIsDeleting(true);
        try {
            for (const id of selectedIds) {
                // Standard DELETE endpoint is now Safe Hard Delete
                const url = `http://localhost:17221/api/books/${id}`;

                const res = await fetch(url, { method: 'DELETE' });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to delete");
                }
            }
            fetchBooks();
            setSelectedIds(new Set());
            setIsDeleting(false);
            setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            console.error("Bulk delete failed:", error);
            setIsDeleting(false);
            setConfirmationModal(prev => ({
                ...prev,
                isOpen: true,
                title: 'Error',
                message: error.message || 'Failed to delete books. Please try again.',
                isDanger: true,
                confirmText: 'Close',
                onConfirm: () => setConfirmationModal(p => ({ ...p, isOpen: false }))
            }));
        }
    };

    const handleBulkDeleteClick = () => {
        if (selectedIds.size === 0) return;
        setConfirmationModal({
            isOpen: true,
            title: t('catalog.delete_permanent_title'),
            message: t('catalog.delete_permanent_msg').replace('{count}', selectedIds.size),
            onConfirm: executeBulkDelete,
            confirmText: t('catalog.delete_permanent_btn'),
            cancelText: t('common.cancel'),
            isDanger: true
        });
    };

    // Explicit Handlers for Modal Logic
    const handleAddBook = () => {
        setSelectedBook(null);
        setShowAddModal(true);
    };

    const handleEditBook = (book) => {
        setSelectedBook(book);
        setShowEditModal(true);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedBook(null);
    };



    return (
        <div className="dashboard-content">
            {/* --- Controls --- */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="catalog-toolbar">
                    <div className="toolbar-search">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder={t('catalog.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="w-[200px]">
                        <GlassSelect
                            value={category}
                            onChange={setCategory}
                            options={departmentOptions.map(opt => opt.value === 'All' ? { ...opt, label: t('catalog.all_departments') } : opt)}
                            icon={Filter}
                            placeholder={t('catalog.all_departments')}
                        />
                    </div>

                    <div className="w-[180px]">
                        <GlassSelect
                            value={sortBy}
                            onChange={setSortBy}
                            options={[
                                { value: 'newest', label: t('catalog.recently_added') },
                                { value: 'title', label: t('catalog.title_az') },
                                { value: 'availability', label: t('catalog.availability') }
                            ]}
                            icon={ArrowUpDown}
                            placeholder={t('catalog.sort_by')}
                        />
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-2"></div>

                    {selectedIds.size > 0 && (
                        <button className="toolbar-icon-btn text-red-400 hover:bg-red-500/20 hover:text-red-400" onClick={handleBulkDeleteClick} title={t('catalog.delete_selected')}>
                            <Trash2 size={20} />
                        </button>
                    )}

                    <button className="toolbar-icon-btn" onClick={() => setShowExportModal(true)} title={t('catalog.export_data')}>
                        <Download size={20} />
                    </button>

                    <button className="toolbar-icon-btn" onClick={() => setShowImportModal(true)} title={t('catalog.import_csv')}>
                        <Upload size={20} />
                    </button>

                    <button className="toolbar-primary-btn" onClick={handleAddBook}>
                        <Plus size={20} /> {t('catalog.add_book')}
                    </button>
                </div>
            </div>

            {/* --- Table View --- */}
            <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <SmartBookTable
                    books={books}
                    loading={loading}
                    selectedIds={selectedIds}
                    onSelect={toggleSelect}
                    onSelectAll={(ids) => {
                        // SmartTable passes ids of current page
                        // If all are selected, deselect them. If not strings, select them.
                        const allSelected = ids.every(id => selectedIds.has(id));
                        const newSet = new Set(selectedIds);

                        if (allSelected) {
                            ids.forEach(id => newSet.delete(id));
                        } else {
                            ids.forEach(id => newSet.add(id));
                        }
                        setSelectedIds(newSet);
                    }}
                    onEdit={handleEditBook}
                    onManage={(book) => { setSelectedBook(book); setShowManageModal(true); }}
                    onView={(book) => { setSelectedBook(book); setShowDetailModal(true); }}
                    onDelete={(book) => {
                        setConfirmationModal({
                            isOpen: true,
                            title: t('catalog.delete_book_title'),
                            message: t('catalog.delete_confirm_msg').replace('{title}', book.title),
                            confirmText: t('catalog.delete_btn'),
                            cancelText: t('common.cancel'),
                            isDanger: true,
                            onConfirm: async () => {
                                setIsDeleting(true);
                                try {
                                    const res = await fetch(`http://localhost:17221/api/books/${book.isbn}`, { method: 'DELETE' });
                                    if (!res.ok) throw new Error("Failed to delete");
                                    fetchBooks();
                                    setIsDeleting(false);
                                    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                                } catch (err) {
                                    setIsDeleting(false);
                                    console.error(err);
                                    // Make sure to show error? Existing implementation logged only.
                                    // Ideally show alerting here.
                                    setConfirmationModal(prev => ({ ...prev, isOpen: false })); // Close for now or show error
                                }
                            }
                        });
                    }}
                />
            </div>

            {/* --- Modals Integration --- */}
            {/* --- Modals Integration --- */}
            {showImportModal && (
                <SmartBulkImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    title="Smart Import Books (CSV/Excel)"
                    sampleFile="/book_sample.csv"
                    duplicateKey="isbn"
                    columns={[
                        { key: 'isbn', label: 'ISBN', required: true, width: '140px', aliases: ['id', 'code'] },
                        { key: 'title', label: 'Title', required: true, aliases: ['name', 'book'] },
                        { key: 'author', label: 'Author', aliases: ['writer'] },
                        { key: 'publisher', label: 'Publisher', aliases: ['pub'] },
                        {
                            key: 'category',
                            label: 'Department',
                            required: true,
                            type: 'select',
                            options: departmentOptions.filter(d => d.value !== 'All'),
                            aliases: ['dept', 'department', 'genre']
                        },
                        { key: 'cover_image_url', label: 'Cover URL', width: '140px' },
                        { key: 'shelf_location', label: 'Shelf/Rack', width: '100px', aliases: ['shelf', 'rack', 'location'] },
                        { key: 'price', label: 'Price', type: 'number', width: '80px' },
                        { key: 'quantity', label: 'Qty', required: true, type: 'number', width: '70px', defaultValue: '1' }
                    ]}
                    onValidate={(row) => {
                        const errors = [];
                        // Check DB duplicates
                        if (existingISBNsDB.has(row.isbn)) errors.push('ISBN exists in DB');
                        // Check Title Duplicate
                        if (row.title && existingTitles.has(row.title.toLowerCase().trim())) {
                            errors.push('Title exists in Library');
                        }
                        if (row.quantity && parseInt(row.quantity) < 1) errors.push('Invalid Qty');
                        // Strict Department Validation
                        const isValidDept = row.category && departments.some(d => d.name === row.category);
                        if (!isValidDept) errors.push('Department Required');
                        return errors;
                    }}
                    transformData={(row) => {
                        // Auto-generate ISBN if missing
                        if (!row.isbn) {
                            const randomDigits = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
                            row.isbn = `AG-${randomDigits}`;
                        }
                        // Normalize Dept (Name or Code)
                        if (row.category) {
                            const val = row.category.toLowerCase().trim();
                            // 1. Try Name Match
                            let found = departments.find(d => d.name.toLowerCase() === val);
                            // 2. Try Code Match
                            if (!found) found = departments.find(d => d.code && d.code.toLowerCase() === val);

                            if (found) row.category = found.name;
                        }
                        return row;
                    }}

                    onImport={async (booksData) => {
                        const res = await fetch('http://localhost:17221/api/books/bulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(booksData)
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Bulk import failed");

                        setConfirmationModal({
                            isOpen: true,
                            title: t('catalog.import_success_title'),
                            message: t('catalog.import_success_msg').replace('{count}', data.details?.success || booksData.length),
                            onConfirm: () => setConfirmationModal(prev => ({ ...prev, isOpen: false })),
                            confirmText: t('common.confirm'),
                            cancelText: null,
                            isDanger: false
                        });
                        fetchBooks();
                    }}
                />
            )}
            {showExportModal && (
                <ExportModal
                    onClose={() => setShowExportModal(false)}
                    totalBooks={totalBooksCount || books.length}
                    selectedIds={selectedIds}
                    selectedCount={selectedIds.size}
                    filteredCount={books.length} // Use books.length directly as it is already filtered by server
                    data={books.map(b => ({ // Don't re-filter here!
                        Cover: b.cover_image_url || b.cover_image,
                        ISBN: b.isbn,
                        Title: b.title,
                        Author: b.author,
                        Publisher: b.publisher,
                        Department: b.department_name || b.category || '-',
                        Location: b.location || 'Main Stack',
                        Total: b.total_copies || 0,
                        Available: b.available_copies || 0
                    }))}
                    columns={[
                        { key: 'Cover', label: 'Cover', render: (row) => row.Cover ? `<img src="${row.Cover}" style="height:40px; width:auto; border-radius:3px;" />` : '' },
                        'ISBN', 'Title', 'Author', 'Publisher', 'Department', 'Location', 'Total', 'Available'
                    ]}
                    onFetchData={async (scope) => {
                        // Logic to get data based on scope for Printing
                        let dataToExport = books;
                        if (scope === 'all') {
                            try {
                                // REMOVED &department=All to fetch truly all books
                                const res = await fetch(`http://localhost:17221/api/books?limit=100000`);
                                const data = await res.json();
                                dataToExport = Array.isArray(data) ? data : (data.data || []);
                            } catch (e) {
                                console.error("Failed to fetch all books", e);
                                dataToExport = [];
                            }
                        } else if (scope === 'selected') {
                            dataToExport = books.filter(b => selectedIds.has(b.isbn));
                        } else if (scope === 'filtered') {
                            dataToExport = books; // Use current books state directly
                        }

                        // Map to Print Format
                        return dataToExport.map(b => ({
                            Cover: b.cover_image_url || b.cover_image,
                            ISBN: b.isbn,
                            Title: b.title,
                            Author: b.author,
                            Publisher: b.publisher,
                            Department: b.department_name || b.category || '-',
                            Location: b.location || 'Main Stack',
                            Total: b.total_copies || 0,
                            Available: b.available_copies || 0
                        }));
                    }}
                    onExport={async (scope, format) => {
                        // 1. Determine Data Source
                        let dataToExport = books;

                        if (scope === 'all') {
                            try {
                                // REMOVED &department=All
                                const res = await fetch(`http://localhost:17221/api/books?limit=100000`);
                                const data = await res.json();
                                dataToExport = Array.isArray(data) ? data : (data.data || []);
                            } catch (e) {
                                console.error("Failed to fetch all books", e);
                                dataToExport = [];
                            }
                        } else if (scope === 'selected') {
                            dataToExport = books.filter(b => selectedIds.has(b.isbn));
                        } else if (scope === 'filtered') {
                            dataToExport = books; // Use current books state directly
                        }

                        // 2. Prepare Data for Export (Clean fields)
                        const cleanData = dataToExport.map(b => ({
                            Cover: b.cover_image_url || b.cover_image,
                            ISBN: b.isbn,
                            Title: b.title,
                            Author: b.author,
                            Publisher: b.publisher,
                            Department: b.department_name || b.category || '-',
                            Location: b.location || 'Main Stack',
                            TotalCopies: b.total_copies || 0,
                            AvailableCopies: b.available_copies || 0,
                            Price: b.price
                        }));

                        // 3. Export Logic
                        if (format === 'xlsx') {
                            const XLSX = require('xlsx'); // Using require to avoid top-level import crash if missing
                            // Exclude Cover for Excel
                            const excelData = cleanData.map(({ Cover, ...rest }) => rest);
                            const ws = XLSX.utils.json_to_sheet(excelData);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Books");
                            XLSX.writeFile(wb, `library_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
                        } else if (format === 'csv') {
                            // Manual CSV generation with UTF-8 BOM
                            // Exclude Cover for CSV
                            const csvData = cleanData.map(({ Cover, ...rest }) => rest);
                            const headers = Object.keys(csvData[0]).join(',');
                            const rows = csvData.map(row =>
                                Object.values(row).map(val => {
                                    const str = String(val || '');
                                    // Quote if contains comma, newline or quote
                                    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                                        return `"${str.replace(/"/g, '""')}"`;
                                    }
                                    return str;
                                }).join(',')
                            ).join('\n');

                            // Add BOM \uFEFF for Excel to recognize UTF-8
                            const csvContent = '\uFEFF' + headers + "\n" + rows;
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.setAttribute("download", `library_export_${new Date().toISOString().slice(0, 10)}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        } else if (format === 'pdf') {
                            const { generatePrintContent } = require('../utils/SmartPrinterHandler');
                            const content = generatePrintContent("Book Catalog", cleanData, [
                                { key: 'Cover', label: 'Cover', render: (row) => row.Cover ? `<img src="${row.Cover}" style="height:40px; width:auto; border-radius:3px;" />` : '' },
                                { key: 'ISBN', label: 'ISBN' },
                                { key: 'Title', label: 'Title' },
                                { key: 'Author', label: 'Author' },
                                { key: 'Publisher', label: 'Publisher' },
                                { key: 'Department', label: 'Dept' },
                                { key: 'Location', label: 'Loc' },
                                { key: 'TotalCopies', label: 'Total' },
                                { key: 'AvailableCopies', label: 'Avail' }
                            ], {});
                            setShowExportModal(false);
                            setPdfPreview({ isOpen: true, html: content.html, title: 'Book Catalog', fileName: `library_export_${new Date().toISOString().slice(0, 10)}` });
                        }
                    }}
                />
            )}

            {showAddModal && (
                <SmartAddBookModal
                    onClose={handleCloseAddModal}
                    onAdded={fetchBooks}
                />
            )}

            {showEditModal && selectedBook && (
                <SmartEditBookModal
                    book={selectedBook}
                    onClose={handleCloseEditModal}
                    onUpdated={fetchBooks}
                />
            )}

            {showManageModal && (
                <SmartManageCopiesModal
                    book={selectedBook}
                    onClose={() => { setShowManageModal(false); setSelectedBook(null); }}
                    onUpdate={fetchBooks} // Trigger refresh on changes
                />
            )}

            {showDetailModal && (
                <SmartBookDetailModal
                    book={selectedBook}
                    onClose={() => { setShowDetailModal(false); setSelectedBook(null); }}
                    onEdit={() => { setShowDetailModal(false); setShowEditModal(true); }}
                    onManageCopies={() => { setShowDetailModal(false); setShowManageModal(true); }}
                />
            )}

            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={() => !isDeleting && setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationModal.onConfirm}
                title={confirmationModal.title}
                message={confirmationModal.message}
                confirmText={confirmationModal.confirmText}
                cancelText={confirmationModal.cancelText}
                isDangerous={confirmationModal.isDanger}
                isLoading={isDeleting}
                closeOnConfirm={false} // Handle manual close
                zIndex={3100}
            />

            {/* Success Modal for Auto-Fill */}
            <ConfirmationModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
                onConfirm={() => setSuccessModal({ ...successModal, isOpen: false })}
                title={successModal.title}
                message={successModal.message}
                confirmText="OK"
                cancelText={null}
                zIndex={3100}
            />

            <PdfPreviewModal
                isOpen={pdfPreview.isOpen}
                onClose={() => setPdfPreview(p => ({ ...p, isOpen: false }))}
                htmlContent={pdfPreview.html}
                title={pdfPreview.title}
                fileName={pdfPreview.fileName}
            />

            <style>{`
                .hover-link:hover { text-decoration: underline; color: var(--primary-color) !important; }
                .table-row-hover:hover { background: rgba(255,255,255,0.05); }
            `}</style>
        </div>
    );
};

export default CatalogPage;
