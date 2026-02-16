import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, AlertCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import GlassSelect from './GlassSelect';
import ConfirmationModal from './ConfirmationModal';

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
            // JS Date constructor prefers YYYY-MM-DD or MM/DD/YYYY
            dateObj = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
        }
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${d}-${m}-${y}`; // Return strictly DD-MM-YYYY
    }

    return val; // Return original if unknown format
};

const BulkImportModal = ({
    onClose,
    onImport,
    title = "Bulk Import",
    columns = [], // [{ key, label, required, type, options, width, aliases }]
    onValidate, // (row) => string[]
    sampleFile, // URL
    transformData, // (row) => row (optional pre-processing)
    extraActions, // React Node for extra toolbar buttons
    isOpen
}) => {
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [alertData, setAlertData] = useState({ isOpen: false, title: '', message: '' });

    const fileInputRef = useRef(null);

    // --- Validation ---
    const validateAll = (data) => {
        const newErrors = {};
        let isValid = true;

        data.forEach(row => {
            let rowErrors = [];

            // 1. Built-in required check based on columns prop
            columns.forEach(col => {
                if (col.required) {
                    const val = row[col.key];
                    if (val === undefined || val === null || val === '') {
                        rowErrors.push(`${col.label} required`);
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
        });

        setErrors(newErrors);
        return isValid;
    };

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
    }, [previewData]); // We rely on onValidate being stable or included in dependency if needed, but passing fn props is tricky. existingISBNs etc should be captured in closure of onValidate passed from parent.

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
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Read as array of arrays first to find headers
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!rawJson || rawJson.length === 0) {
                    throw new Error("Empty file");
                }

                const headers = rawJson[0].map(h => String(h).toLowerCase().trim());
                const rows = rawJson.slice(1);

                // Mapping Logic
                const fieldMap = {}; // colKey -> index
                columns.forEach(col => {
                    // Find index of header matching key or aliases
                    const searchTerms = [col.key.toLowerCase(), ...(col.aliases || [])];
                    const index = headers.findIndex(h => searchTerms.some(term => h.includes(term.toLowerCase())));
                    fieldMap[col.key] = index;
                });

                let parsedData = rows.map((rowArr, idx) => {
                    const newRow = { id: idx };
                    columns.forEach(col => {
                        const valIndex = fieldMap[col.key];
                        let val = valIndex !== -1 ? (rowArr[valIndex] !== undefined ? String(rowArr[valIndex]) : '') : '';

                        // Basic trim
                        val = val.trim();

                        // Default value if defined and empty
                        if (val === '' && col.defaultValue !== undefined) {
                            val = col.defaultValue;
                        }

                        newRow[col.key] = val;
                    });

                    // Optional transformation
                    let processedRow = transformData ? transformData(newRow) : newRow;

                    // Auto-Correct Date Fields
                    columns.forEach(col => {
                        // Check aliases for DOB/Date like fields if type is 'text' but intended for date
                        // Or explicitly use type 'date' or 'date-text'
                        if ((col.type === 'date' || col.type === 'date-text') && processedRow[col.key]) {
                            processedRow[col.key] = parseDateValue(processedRow[col.key]);
                        }
                    });

                    return processedRow;
                });

                // Filter out completely empty rows
                parsedData = parsedData.filter(r => Object.values(r).some(v => v !== '' && v !== 'id'));

                if (parsedData.length === 0) {
                    throw new Error("No valid data found in file.");
                }

                setPreviewData(parsedData);
                validateAll(parsedData);
                setStep(2);
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
        reader.readAsBinaryString(file);
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
        // Strict Re-validation
        const isValid = validateAll(previewData);
        if (!isValid || Object.keys(errors).length > 0) {
            setAlertData({
                isOpen: true,
                title: 'Validation Errors',
                message: "Please fix all errors before importing."
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

    const hasErrors = Object.keys(errors).length > 0;
    const totalErrorCount = Object.values(errors).reduce((acc, curr) => acc + curr.length, 0);

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2200
        }}>
            <div className="glass-panel bounce-in" style={{ width: '95%', maxWidth: '1300px', height: '85vh', padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{title}</h2>
                    <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '25px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {step === 1 ? (
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
                                    {columns.map(col => (
                                        <div key={col.key} style={{ flex: 1, padding: '6px 4px', background: 'var(--bg-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {col.label} {col.required && '*'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Toolbar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <h4 style={{ margin: 0 }}>Previewing {previewData.length} records</h4>
                                    {hasErrors && (
                                        <span style={{ color: '#fc8181', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <AlertCircle size={14} /> {totalErrorCount} errors to fix.
                                        </span>
                                    )}
                                    {/* Pass setData and data to extra actions via render prop if needed, or just allow them to act on parent state if lifted? 
                                        Since we control state here, we can pass setters if extraActions was a function, but here it's a node.
                                        Actually, "Auto-Fill" needs access to previewData and setPreviewData.
                                        Let's allow extraActions to be a function that receives { data, setData, setLoading }
                                    */}
                                    {typeof extraActions === 'function' ? extraActions({
                                        data: previewData,
                                        setData: (newData) => {
                                            setPreviewData(newData);
                                        },
                                        setLoading
                                    }) : extraActions}
                                </div>
                                <button className="icon-btn-sm" onClick={() => { setStep(1); setFile(null); setErrors({}); }}>Re-upload</button>
                            </div>

                            {/* Table */}
                            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 9999, background: 'var(--surface-primary, #ffffff)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transform: 'translateZ(0)' }}>
                                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                                            {columns.map(col => (
                                                <th key={col.key} style={{ padding: '12px 10px', width: col.width || 'auto' }}>
                                                    {col.label} {col.required && '*'}
                                                </th>
                                            ))}
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map(row => {
                                            const rowErrors = errors[row.id] || [];
                                            const isRowError = rowErrors.length > 0;
                                            return (
                                                <tr key={row.id} style={{ borderBottom: '1px solid var(--glass-border)', background: isRowError ? 'rgba(255, 0, 0, 0.05)' : 'transparent' }}>
                                                    {columns.map(col => {
                                                        const cellError = rowErrors.find(e => e.includes(col.label)) || (col.required && !row[col.key] ? 'Required' : null);
                                                        return (
                                                            <td key={col.key} style={{ padding: '8px', verticalAlign: 'top' }}>
                                                                {col.type === 'select' ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <GlassSelect
                                                                            options={col.options || []}
                                                                            value={row[col.key]}
                                                                            onChange={(val) => handleCellChange(row.id, col.key, val)}
                                                                            className={cellError ? 'error-border' : ''}
                                                                            style={{ position: 'relative', zIndex: 0 }}
                                                                        />
                                                                        {cellError && <span style={{ color: '#fc8181', fontSize: '0.7rem' }}>{cellError}</span>}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <input
                                                                            type={col.type === 'number' ? 'number' : 'text'}
                                                                            className={`glass-input ${cellError ? 'error-border' : ''}`}
                                                                            value={row[col.key]}
                                                                            onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                                                            onBlur={(e) => handleCellChange(row.id, col.key, e.target.value.trim())} // Auto-trim
                                                                            style={{ width: '100%' }}
                                                                        />
                                                                        {cellError && <span style={{ color: '#fc8181', fontSize: '0.7rem' }}>{cellError}</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'top' }}>
                                                        <button className="icon-btn-sm danger-hover" onClick={() => handleDeleteRow(row.id)}>
                                                            <X size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {hasErrors ? (
                                        <span style={{ color: '#fc8181' }}>Unable to import. Please correct errors above.</span>
                                    ) : (
                                        "Ready to import."
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button onClick={onClose} className="icon-btn">Cancel</button>
                                    <button
                                        onClick={handleConfirmImport}
                                        className="primary-glass-btn"
                                        disabled={loading || hasErrors}
                                        style={{ opacity: hasErrors ? 0.5 : 1, cursor: hasErrors ? 'not-allowed' : 'pointer' }}
                                    >
                                        {loading ? 'Importing...' : 'Confirm Import'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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

export default BulkImportModal;
