import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X, UploadCloud, AlertCircle, FileSpreadsheet, CheckCircle,
    AlertTriangle, Copy, Search, Replace, Wand2, ArrowRight,
    Filter, Trash2, ChevronDown, Sparkles, RefreshCw, FileCheck,
    ArrowDown, Columns, Eye, EyeOff
} from 'lucide-react';
import * as XLSX from 'xlsx';
import GlassSelect from './GlassSelect';
import ConfirmationModal from './ConfirmationModal';
import '../../styles/components/smart-bulk-import.css';

// Helper to parse dates robustly (handles Excel serial, DD/MM/YYYY, YYYY-MM-DD)
const parseDateValue = (val) => {
    if (!val) return '';

    let dateObj = null;

    // 1. Excel Serial Date (number)
    const num = Number(val);
    if (!isNaN(num) && num > 20000) {
        dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
    } else {
        const str = String(val).trim();
        // 2. Try standard ISO/Date parsing first
        const isoTry = new Date(str);
        if (!isNaN(isoTry.getTime())) {
            dateObj = isoTry;
        }

        // 3. Regex for DD-MM-YYYY or DD/MM/YYYY (Strict)
        const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (ddmmyyyy) {
            dateObj = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
        }
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${y}-${m}-${d}`; // Return strictly YYYY-MM-DD for DB/Input compatibility
    }

    return val; // Return original if unknown format
};

// Fuzzy match score (simple Levenshtein-based)
const fuzzyMatch = (str1, str2) => {
    const s1 = String(str1).toLowerCase().trim();
    const s2 = String(str2).toLowerCase().trim();
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 80;

    // Simple character overlap
    const set1 = new Set(s1.split(''));
    const set2 = new Set(s2.split(''));
    const intersection = [...set1].filter(c => set2.has(c)).length;
    const union = new Set([...s1, ...s2]).size;
    return Math.round((intersection / union) * 100);
};

// Title Case helper
const toTitleCase = (str) => {
    return String(str).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

const SmartBulkImportModal = ({
    onClose,
    onImport,
    title = "Smart Bulk Import",
    columns = [], // [{ key, label, required, type, options, width, aliases, suggestFrom }]
    onValidate, // (row) => string[]
    sampleFile, // URL
    transformData, // (row) => row (optional pre-processing)
    extraActions, // React Node for extra toolbar buttons
    isOpen,
    duplicateKey // Key to check for duplicates (e.g., 'isbn', 'register_no')
}) => {
    // Steps: 1=Upload, 2=Column Mapping (optional), 3=Preview
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [rawHeaders, setRawHeaders] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});
    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [warnings, setWarnings] = useState({});
    const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });

    // Smart features state
    const [filterStatus, setFilterStatus] = useState('all'); // all, valid, warning, error, duplicate
    const [duplicates, setDuplicates] = useState(new Set());
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [selectedColumn, setSelectedColumn] = useState('');
    const [hiddenColumns, setHiddenColumns] = useState(new Set());

    const fileInputRef = useRef(null);

    // --- Computed Stats ---
    const stats = useMemo(() => {
        const validCount = previewData.filter(row =>
            !errors[row.id]?.length && !warnings[row.id]?.length && !duplicates.has(row.id)
        ).length;
        const warningCount = previewData.filter(row =>
            warnings[row.id]?.length > 0 && !errors[row.id]?.length
        ).length;
        const errorCount = previewData.filter(row => errors[row.id]?.length > 0).length;
        const duplicateCount = duplicates.size;

        return { validCount, warningCount, errorCount, duplicateCount, total: previewData.length };
    }, [previewData, errors, warnings, duplicates]);

    // --- Duplicate Detection ---
    const detectDuplicates = useCallback((data) => {
        if (!duplicateKey) return new Set();

        const seen = new Map();
        const dupes = new Set();

        data.forEach(row => {
            const key = String(row[duplicateKey] || '').toLowerCase().trim();
            if (!key) return;

            if (seen.has(key)) {
                dupes.add(row.id);
                dupes.add(seen.get(key));
            } else {
                seen.set(key, row.id);
            }
        });

        return dupes;
    }, [duplicateKey]);

    // --- Validation ---
    const validateAll = useCallback((data) => {
        const newErrors = {};
        const newWarnings = {};
        let isValid = true;

        data.forEach(row => {
            let rowErrors = [];
            let rowWarnings = [];

            // 1. Built-in required check based on columns prop
            columns.forEach(col => {
                const val = row[col.key];
                // Check if required
                if (col.required && (val === undefined || val === null || val === '')) {
                    rowErrors.push(`${col.label} required`);
                } else if (col.type === 'select' && col.options && val) {
                    // Strict check: Value must be in options
                    const isValidOption = col.options.some(opt => opt.value === val);
                    if (!isValidOption) {
                        rowErrors.push(`Invalid ${col.label}`);
                    }
                }


                // Type-based validation
                if (col.type === 'number' && row[col.key]) {
                    const num = Number(row[col.key]);
                    if (isNaN(num)) {
                        rowErrors.push(`${col.label} must be a number`);
                    }
                }

                // Email validation
                if (col.type === 'email' && row[col.key]) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(row[col.key])) {
                        rowWarnings.push(`${col.label} may be invalid`);
                    }
                }
            });

            // 2. Custom validation
            if (onValidate) {
                const customErrors = onValidate(row);
                if (customErrors && customErrors.length > 0) {
                    rowErrors = [...rowErrors, ...customErrors];
                }
            }

            if (rowErrors.length > 0) {
                newErrors[row.id] = rowErrors;
                isValid = false;
            }

            if (rowWarnings.length > 0) {
                newWarnings[row.id] = rowWarnings;
            }
        });

        setErrors(newErrors);
        setWarnings(newWarnings);

        // Detect duplicates
        const dupes = detectDuplicates(data);
        setDuplicates(dupes);

        return isValid && dupes.size === 0;
    }, [columns, onValidate, detectDuplicates]);

    const handleCellChange = (id, field, value) => {
        setPreviewData(prev => prev.map(row => {
            if (row.id === id) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const handleDeleteRow = (id) => {
        setPreviewData(prev => prev.filter(row => row.id !== id));
    };

    // Re-validate when data changes
    useEffect(() => {
        if (previewData.length > 0) {
            validateAll(previewData);
        }
    }, [previewData, validateAll]);

    // --- Batch Operations ---
    const handleFindReplace = () => {
        if (!findText || !selectedColumn) return;

        setPreviewData(prev => prev.map(row => {
            if (String(row[selectedColumn]).includes(findText)) {
                return { ...row, [selectedColumn]: String(row[selectedColumn]).replaceAll(findText, replaceText) };
            }
            return row;
        }));

        setShowFindReplace(false);
        setFindText('');
        setReplaceText('');
    };

    const handleApplyToEmpty = (columnKey, value) => {
        setPreviewData(prev => prev.map(row => {
            if (!row[columnKey] || row[columnKey] === '') {
                return { ...row, [columnKey]: value };
            }
            return row;
        }));
    };

    const handleTransformColumn = (columnKey, transformType) => {
        setPreviewData(prev => prev.map(row => {
            let newVal = row[columnKey];
            switch (transformType) {
                case 'uppercase':
                    newVal = String(newVal || '').toUpperCase();
                    break;
                case 'lowercase':
                    newVal = String(newVal || '').toLowerCase();
                    break;
                case 'titlecase':
                    newVal = toTitleCase(newVal || '');
                    break;
                case 'trim':
                    newVal = String(newVal || '').trim();
                    break;
                default:
                    break;
            }
            return { ...row, [columnKey]: newVal };
        }));
    };

    const handleRemoveDuplicates = () => {
        if (!duplicateKey || duplicates.size === 0) return;

        const seen = new Set();
        setPreviewData(prev => prev.filter(row => {
            const key = String(row[duplicateKey] || '').toLowerCase().trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        }));
    };

    const handleFetchMetadata = async () => {
        if (!navigator.onLine) {
            setAlertData({
                isOpen: true,
                title: 'Offline',
                message: "You are offline. Connect to the internet to continue."
            });
            return;
        }

        // Identify rows with ISBN but missing Title
        const isbnCol = columns.find(c => c.key.toLowerCase().includes('isbn'));
        const titleCol = columns.find(c => c.key.toLowerCase().includes('title'));
        const authorCol = columns.find(c => c.key.toLowerCase().includes('author'));
        const publisherCol = columns.find(c => c.key.toLowerCase().includes('publisher'));

        if (!isbnCol || !titleCol) {
            setAlertData({
                isOpen: true,
                title: 'Column Mismatch',
                message: "Could not identify ISBN or Title columns to perform auto-fill."
            });
            return;
        }

        const rowsToUpdate = previewData.filter(row => {
            const isbn = row[isbnCol.key];
            const title = row[titleCol.key];
            const author = authorCol ? row[authorCol.key] : 'found'; // if no col, treat as found
            const publisher = publisherCol ? row[publisherCol.key] : 'found';

            // Update if ISBN exists AND (Title missing OR Author missing OR Publisher missing)
            const missingTitle = !title || title.trim() === '';
            const missingAuthor = !author || author.trim() === '';
            const missingPublisher = !publisher || publisher.trim() === '';

            return isbn && (missingTitle || missingAuthor || missingPublisher);
        });

        if (rowsToUpdate.length === 0) {
            setAlertData({
                isOpen: true,
                title: 'No Rows to Update',
                message: "No rows found with valid ISBNs and missing titles."
            });
            return;
        }

        setLoading(true);
        let updatedCount = 0;
        const newPreviewData = [...previewData];

        // Process in chunks or sequential
        for (const row of rowsToUpdate) {
            const isbn = String(row[isbnCol.key]).replace(/[^0-9X]/g, '');
            if (isbn.length < 10) continue;

            try {
                const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.items && data.items.length > 0) {
                        const info = data.items[0].volumeInfo;
                        const targetIndex = newPreviewData.findIndex(r => r.id === row.id);

                        if (targetIndex !== -1) {
                            newPreviewData[targetIndex] = {
                                ...newPreviewData[targetIndex],
                                [titleCol.key]: info.title || newPreviewData[targetIndex][titleCol.key],
                                [authorCol?.key]: (info.authors ? info.authors.join(', ') : '') || newPreviewData[targetIndex][authorCol?.key],
                                [publisherCol?.key]: info.publisher || newPreviewData[targetIndex][publisherCol?.key]
                            };
                            updatedCount++;
                        }
                    }
                }
            } catch (e) {
                console.warn("Fetch failed for", isbn, e);
            }
            // Be polite to API
            await new Promise(r => setTimeout(r, 250));
        }

        setPreviewData(newPreviewData);
        setLoading(false);
        setAlertData({
            isOpen: true,
            title: 'Metadata Fetched',
            message: `Successfully updated ${updatedCount} records.`
        });
    };

    // --- Parsing ---
    const parseFile = (file) => {
        if (file.size > 20 * 1024 * 1024) {
            setAlertData({
                isOpen: true,
                title: 'File Too Large',
                message: "File size exceeds 20MB limit."
            });
            setFile(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', codepage: 65001 }); // UTF-8 codepage
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Read as array of arrays first to find headers
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

                if (!rawJson || rawJson.length === 0) {
                    throw new Error("Empty file");
                }

                const headers = rawJson[0].map(h => String(h).trim());
                setRawHeaders(headers);

                // Auto-detect column mapping with fuzzy matching
                const autoMapping = {};
                columns.forEach(col => {
                    const searchTerms = [col.key.toLowerCase(), col.label.toLowerCase(), ...(col.aliases || []).map(a => a.toLowerCase())];

                    let bestMatch = { index: -1, score: 0 };
                    headers.forEach((h, idx) => {
                        const headerLower = h.toLowerCase();
                        searchTerms.forEach(term => {
                            const score = fuzzyMatch(headerLower, term);
                            if (score > bestMatch.score && score >= 50) {
                                bestMatch = { index: idx, score };
                            }
                        });
                    });

                    if (bestMatch.index !== -1) {
                        autoMapping[col.key] = bestMatch.index;
                    }
                });

                setColumnMapping(autoMapping);

                // Parse data with mapping
                const rows = rawJson.slice(1);
                let parsedData = rows.map((rowArr, idx) => {
                    const newRow = { id: idx };
                    columns.forEach(col => {
                        const valIndex = autoMapping[col.key];
                        let val = valIndex !== undefined && valIndex !== -1 ? (rowArr[valIndex] !== undefined ? String(rowArr[valIndex]) : '') : '';

                        val = val.trim();

                        if (val === '' && col.defaultValue !== undefined) {
                            val = col.defaultValue;
                        }

                        newRow[col.key] = val;
                    });

                    let processedRow = transformData ? transformData(newRow) : newRow;

                    // Auto-Correct Date Fields
                    columns.forEach(col => {
                        if ((col.type === 'date' || col.type === 'date-text') && processedRow[col.key]) {
                            processedRow[col.key] = parseDateValue(processedRow[col.key]);
                        }
                    });

                    return processedRow;
                });

                // Filter out completely empty rows
                parsedData = parsedData.filter(r => Object.values(r).some(v => v !== '' && v !== r.id));

                if (parsedData.length === 0) {
                    throw new Error("No valid data found in file.");
                }

                setPreviewData(parsedData);
                validateAll(parsedData);
                setStep(3); // Skip to preview (column mapping auto-detected)
            } catch (err) {
                console.error(err);
                setAlertData({
                    isOpen: true,
                    title: 'Parse Error',
                    message: "Failed to parse file. Please ensure it is a valid CSV or Excel file."
                });
                setFile(null);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const selectedFile = e.dataTransfer.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    // --- Actions ---
    const handleConfirmImport = async () => {
        const isValid = validateAll(previewData);
        const hasErrors = Object.keys(errors).length > 0;

        if (!isValid || hasErrors) {
            setAlertData({
                isOpen: true,
                title: 'Validation Errors',
                message: "Please fix all errors before importing. You can filter by errors using the stats bar above."
            });
            return;
        }

        // Warn about duplicates but allow import
        if (duplicates.size > 0) {
            setAlertData({
                isOpen: true,
                title: 'Duplicates Detected',
                message: `${duplicates.size} duplicate entries found. Remove them using "Remove Duplicates" or continue at your own risk.`
            });
            return;
        }

        setLoading(true);
        try {
            await onImport(previewData);
            setLoading(false);
            onClose();
        } catch (err) {
            setLoading(false);
            setAlertData({
                isOpen: true,
                title: 'Import Failed',
                message: err.message || "Unknown error occurred."
            });
        }
    };

    // Filtered data based on status
    const filteredData = useMemo(() => {
        switch (filterStatus) {
            case 'valid':
                return previewData.filter(row => !errors[row.id]?.length && !warnings[row.id]?.length && !duplicates.has(row.id));
            case 'warning':
                return previewData.filter(row => warnings[row.id]?.length > 0);
            case 'error':
                return previewData.filter(row => errors[row.id]?.length > 0);
            case 'duplicate':
                return previewData.filter(row => duplicates.has(row.id));
            default:
                return previewData;
        }
    }, [previewData, errors, warnings, duplicates, filterStatus]);

    const visibleColumns = columns.filter(col => !hiddenColumns.has(col.key));

    const hasErrors = Object.keys(errors).length > 0;

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2200
        }}>
            <div className="glass-panel bounce-in" style={{ width: '95%', maxWidth: '1400px', height: '90vh', padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Sparkles size={22} color="var(--primary-color)" />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{title}</h2>
                        {step === 3 && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                                {previewData.length} records loaded
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {step === 1 ? (
                        /* Upload Step */
                        <div
                            style={{ flex: 1, border: '2px dashed var(--glass-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.3s' }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <UploadCloud size={64} color="var(--primary-color)" style={{ marginBottom: '20px' }} />
                            <h3 style={{ margin: '0 0 10px 0' }}>Drag & Drop File</h3>
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Supports .csv, .xlsx, .xls</p>
                            <input ref={fileInputRef} type="file" accept=".csv, .xlsx, .xls" style={{ display: 'none' }} onChange={handleFileChange} />

                            {sampleFile && (
                                <a
                                    href={sampleFile}
                                    download
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ marginTop: '30px', color: 'var(--primary-color)', fontSize: '0.9rem' }}
                                >
                                    Download Sample Template
                                </a>
                            )}

                            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', width: '80%' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Expected Format:</span>
                                    <span>Max 20MB | Max 1000 Rows</span>
                                </div>
                                <div style={{ display: 'flex', gap: '1px', background: 'var(--glass-border)', border: '1px solid var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                    {columns.slice(0, 6).map(col => (
                                        <div key={col.key} style={{ flex: 1, padding: '6px 4px', background: 'var(--bg-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {col.label} {col.required && '*'}
                                        </div>
                                    ))}
                                    {columns.length > 6 && (
                                        <div style={{ flex: 1, padding: '6px 4px', background: 'var(--bg-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                            +{columns.length - 6} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : step === 3 ? (
                        /* Preview Step */
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Stats Bar */}
                            <div className="smart-import-stats">
                                <div
                                    className={`stat-item stat-valid ${filterStatus === 'valid' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus(filterStatus === 'valid' ? 'all' : 'valid')}
                                >
                                    <CheckCircle size={16} />
                                    <span>{stats.validCount} Valid</span>
                                </div>
                                <div
                                    className={`stat-item stat-warning ${filterStatus === 'warning' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus(filterStatus === 'warning' ? 'all' : 'warning')}
                                >
                                    <AlertTriangle size={16} />
                                    <span>{stats.warningCount} Warnings</span>
                                </div>
                                <div
                                    className={`stat-item stat-error ${filterStatus === 'error' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus(filterStatus === 'error' ? 'all' : 'error')}
                                >
                                    <AlertCircle size={16} />
                                    <span>{stats.errorCount} Errors</span>
                                </div>
                                {duplicateKey && (
                                    <div
                                        className={`stat-item stat-duplicate ${filterStatus === 'duplicate' ? 'active' : ''}`}
                                        onClick={() => setFilterStatus(filterStatus === 'duplicate' ? 'all' : 'duplicate')}
                                    >
                                        <Copy size={16} />
                                        <span>{stats.duplicateCount} Duplicates</span>
                                    </div>
                                )}

                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                    {filterStatus !== 'all' && (
                                        <button
                                            className="batch-ops-btn"
                                            onClick={() => setFilterStatus('all')}
                                        >
                                            <Eye size={14} /> Show All
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Batch Operations Toolbar */}
                            <div className="batch-ops-toolbar">
                                <button className="batch-ops-btn" onClick={() => setShowFindReplace(true)}>
                                    <Replace size={14} /> Find & Replace
                                </button>

                                {duplicates.size > 0 && (
                                    <button className="batch-ops-btn primary" onClick={handleRemoveDuplicates}>
                                        <Trash2 size={14} /> Remove {duplicates.size} Duplicates
                                    </button>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transform:</span>
                                    <GlassSelect
                                        options={columns.map(c => ({ value: c.key, label: c.label }))}
                                        value={selectedColumn}
                                        onChange={setSelectedColumn}
                                        placeholder="Select Column"
                                        style={{ minWidth: '140px' }}
                                    />
                                    {selectedColumn && (
                                        <>
                                            <button className="batch-ops-btn" onClick={() => handleTransformColumn(selectedColumn, 'titlecase')}>
                                                Title Case
                                            </button>
                                            <button className="batch-ops-btn" onClick={() => handleTransformColumn(selectedColumn, 'uppercase')}>
                                                UPPER
                                            </button>
                                            <button className="batch-ops-btn" onClick={() => handleTransformColumn(selectedColumn, 'trim')}>
                                                Trim
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                    {typeof extraActions === 'function' ? extraActions({
                                        data: previewData,
                                        setData: (newData) => {
                                            setPreviewData(newData);
                                        },
                                        setLoading
                                    }) : extraActions}

                                    <button className="batch-ops-btn" onClick={() => { setStep(1); setFile(null); setErrors({}); setWarnings({}); setDuplicates(new Set()); }}>
                                        <RefreshCw size={14} /> Re-upload
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="smart-import-table-container" style={{ flex: 1, overflow: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 9999, background: 'var(--surface-primary, #ffffff)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transform: 'translateZ(0)' }}>
                                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                                            <th style={{ padding: '12px 10px', width: '50px' }}>#</th>
                                            {visibleColumns.map(col => (
                                                <th key={col.key} style={{ padding: '12px 10px', width: col.width || 'auto' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {col.label} {col.required && <span style={{ color: '#fc8181' }}>*</span>}
                                                    </div>
                                                </th>
                                            ))}
                                            <th style={{ width: '80px' }}>Status</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.length === 0 ? (
                                            <tr>
                                                <td colSpan={visibleColumns.length + 3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                                    <FileCheck size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                                    <p>No records match filter.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredData.map((row, idx) => {
                                                const rowErrors = errors[row.id] || [];
                                                const rowWarnings = warnings[row.id] || [];
                                                const isDuplicate = duplicates.has(row.id);
                                                const isRowError = rowErrors.length > 0;
                                                const isRowWarning = rowWarnings.length > 0 && !isRowError;

                                                let rowClass = 'smart-import-row';
                                                if (isDuplicate) rowClass += ' duplicate-highlight';
                                                else if (isRowError) rowClass += ' error-row';
                                                else if (isRowWarning) rowClass += ' warning-row';

                                                return (
                                                    <tr key={row.id} className={rowClass} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                            {idx + 1}
                                                        </td>
                                                        {visibleColumns.map(col => {
                                                            const cellError = rowErrors.find(e => e.includes(col.label)) || (col.required && !row[col.key] ? 'Required' : null);
                                                            const cellWarning = rowWarnings.find(w => w.includes(col.label));

                                                            return (
                                                                <td key={col.key} style={{ padding: '8px', verticalAlign: 'top' }}>
                                                                    {col.type === 'select' ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <GlassSelect
                                                                                options={col.options || []}
                                                                                value={row[col.key]}
                                                                                onChange={(val) => handleCellChange(row.id, col.key, val)}
                                                                                className={cellError ? 'error-border' : cellWarning ? 'warning-border' : ''}
                                                                                style={{ position: 'relative', zIndex: 0 }}
                                                                            />
                                                                            {cellError && <span style={{ color: '#fc8181', fontSize: '0.7rem' }}>{cellError}</span>}
                                                                            {cellWarning && !cellError && <span style={{ color: '#ed8936', fontSize: '0.7rem' }}>{cellWarning}</span>}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <input
                                                                                type={col.type === 'number' ? 'number' : 'text'}
                                                                                className={`glass-input ${cellError ? 'error-border' : cellWarning ? 'warning-border' : ''}`}
                                                                                value={row[col.key]}
                                                                                onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                                                                onBlur={(e) => handleCellChange(row.id, col.key, e.target.value.trim())}
                                                                                style={{ width: '100%' }}
                                                                            />
                                                                            {cellError && <span style={{ color: '#fc8181', fontSize: '0.7rem' }}>{cellError}</span>}
                                                                            {cellWarning && !cellError && <span style={{ color: '#ed8936', fontSize: '0.7rem' }}>{cellWarning}</span>}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            {isDuplicate && (
                                                                <span className="duplicate-badge">
                                                                    <Copy size={10} /> DUP
                                                                </span>
                                                            )}
                                                            {isRowError && !isDuplicate && (
                                                                <AlertCircle size={16} color="#fc8181" />
                                                            )}
                                                            {isRowWarning && !isDuplicate && (
                                                                <AlertTriangle size={16} color="#ed8936" />
                                                            )}
                                                            {!isRowError && !isRowWarning && !isDuplicate && (
                                                                <CheckCircle size={16} color="#48bb78" />
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <button className="icon-btn-sm danger-hover" onClick={() => handleDeleteRow(row.id)}>
                                                                <X size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer */}
                            <div className="smart-import-footer">
                                <div className="summary-text">
                                    {hasErrors ? (
                                        <span style={{ color: '#fc8181' }}>
                                            <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                            Fix <strong>{stats.errorCount}</strong> errors before importing
                                        </span>
                                    ) : duplicates.size > 0 ? (
                                        <span style={{ color: '#9f7aea' }}>
                                            <Copy size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                            <strong>{duplicates.size}</strong> duplicates detected - remove or proceed
                                        </span>
                                    ) : (
                                        <span style={{ color: '#48bb78' }}>
                                            <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                            <strong>{stats.validCount}</strong> records ready to import
                                        </span>
                                    )}
                                </div>
                                <div className="action-buttons">
                                    <button onClick={onClose} className="icon-btn">Cancel</button>
                                    <button
                                        onClick={handleConfirmImport}
                                        className="primary-glass-btn"
                                        disabled={loading || hasErrors}
                                        style={{ opacity: hasErrors ? 0.5 : 1, cursor: hasErrors ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="spinner-sm" style={{ borderTopColor: 'white' }}></div>
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <FileSpreadsheet size={16} />
                                                Import {stats.validCount} Records
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Loading Overlay */}
                {loading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        zIndex: 2200, borderRadius: '16px'
                    }}>
                        <div className="spinner-lg" style={{ borderTopColor: '#fff', width: '50px', height: '50px' }}></div>
                        <p style={{ color: '#fff', marginTop: '15px', fontWeight: 600 }}>Processing...</p>
                    </div>
                )}
            </div>

            {/* Find & Replace Modal */}
            {showFindReplace && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', zIndex: 2500, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="find-replace-modal glass-panel">
                        <h3><Replace size={18} /> Find & Replace</h3>

                        <div className="find-replace-row">
                            <label>Column:</label>
                            <GlassSelect
                                options={columns.map(c => ({ value: c.key, label: c.label }))}
                                value={selectedColumn}
                                onChange={setSelectedColumn}
                                placeholder="Select Column"
                            />
                        </div>

                        <div className="find-replace-row">
                            <label>Find:</label>
                            <input
                                className="glass-input"
                                value={findText}
                                onChange={(e) => setFindText(e.target.value)}
                                placeholder="Text to find..."
                            />
                        </div>

                        <div className="find-replace-row">
                            <label>Replace:</label>
                            <input
                                className="glass-input"
                                value={replaceText}
                                onChange={(e) => setReplaceText(e.target.value)}
                                placeholder="Replace with..."
                            />
                        </div>

                        <div className="find-replace-actions">
                            <button className="icon-btn" onClick={() => setShowFindReplace(false)}>Cancel</button>
                            <button
                                className="primary-glass-btn"
                                onClick={handleFindReplace}
                                disabled={!findText || !selectedColumn}
                            >
                                Replace All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={alertData.isOpen}
                onClose={() => setAlertData({ ...alertData, isOpen: false })}
                onConfirm={() => setAlertData({ ...alertData, isOpen: false })}
                title={alertData.title}
                message={alertData.message}
                confirmText="OK"
                cancelText={null}
            />
        </div>,
        document.body
    );
};

export default SmartBulkImportModal;
