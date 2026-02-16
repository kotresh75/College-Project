import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Filter, Users, Loader, CheckCircle, AlertCircle, FileText, Eye, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom';
import IDCardTemplate from './IDCardTemplate';
import GlassSelect from '../common/GlassSelect';
import { useLanguage } from '../../context/LanguageContext';

// ── PDF Preview Modal ──
const PDFPreviewModal = ({ pdfBlobUrl, fileName, onClose }) => {
    if (!pdfBlobUrl) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = pdfBlobUrl;
        link.download = fileName;
        link.click();
    };

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
        }} onClick={onClose}>
            <div style={{
                width: '90vw', height: '90vh', maxWidth: '1200px',
                background: 'var(--bg-primary, #1a1a2e)',
                borderRadius: '16px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Eye size={20} style={{ color: '#3B82F6' }} />
                        <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-main, #fff)' }}>
                            PDF Preview
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #888)', marginLeft: '8px' }}>
                            {fileName}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            onClick={handleDownload}
                            className="primary-glass-btn"
                            style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                        >
                            <Download size={16} /> Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.08)', border: 'none',
                                borderRadius: '8px', padding: '8px', cursor: 'pointer',
                                color: 'var(--text-secondary, #888)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.2)'}
                            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer */}
                <div style={{ flex: 1, padding: '0' }}>
                    <iframe
                        src={pdfBlobUrl}
                        title="ID Cards PDF Preview"
                        style={{
                            width: '100%', height: '100%', border: 'none',
                            background: '#525659'
                        }}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── Main Component ──
const BulkIDCardDownload = () => {
    const { t } = useLanguage();

    // Filter state
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSem, setSelectedSem] = useState('');

    // Data state
    const [studentCount, setStudentCount] = useState(0);
    const [loadingCount, setLoadingCount] = useState(false);

    // Generation state
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [status, setStatus] = useState(''); // '', 'generating', 'complete', 'error'
    const [errorMsg, setErrorMsg] = useState('');

    // Preview state
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [pdfFileName, setPdfFileName] = useState('');

    // Refs
    const renderContainerRef = useRef(null);
    const abortRef = useRef(false);

    // Signature cache
    const sigCacheRef = useRef({ principal: null, hod: {} });

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        };
    }, [pdfBlobUrl]);

    // Fetch departments on mount
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const res = await fetch('http://localhost:17221/api/departments');
                const data = await res.json();
                setDepartments(data);
            } catch (e) {
                console.error('Failed to fetch departments', e);
            }
        };
        fetchDepartments();
    }, []);

    // Fetch student count when filters change
    const fetchCount = useCallback(async () => {
        setLoadingCount(true);
        try {
            const params = new URLSearchParams();
            if (selectedDept) params.append('department', selectedDept);
            if (selectedSem) params.append('semester', selectedSem);

            const res = await fetch(`http://localhost:17221/api/students/id-cards?${params.toString()}`);
            const data = await res.json();
            setStudentCount(data.total || 0);
        } catch (e) {
            console.error('Failed to fetch count', e);
            setStudentCount(0);
        } finally {
            setLoadingCount(false);
        }
    }, [selectedDept, selectedSem]);

    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    // Fetch signatures (cached)
    const fetchSignatures = async (deptId) => {
        if (sigCacheRef.current.principal === null) {
            try {
                const res = await fetch('http://localhost:17221/api/settings/principal-signature');
                const data = await res.json();
                sigCacheRef.current.principal = data.signature || undefined;
            } catch {
                sigCacheRef.current.principal = undefined;
            }
        }
        if (deptId && !(deptId in sigCacheRef.current.hod)) {
            try {
                const res = await fetch(`http://localhost:17221/api/departments/${deptId}`);
                if (res.ok) {
                    const data = await res.json();
                    sigCacheRef.current.hod[deptId] = data.hod_signature || undefined;
                } else {
                    sigCacheRef.current.hod[deptId] = undefined;
                }
            } catch {
                sigCacheRef.current.hod[deptId] = undefined;
            }
        }
    };

    // Render a single card to canvas — uses scale 2 (not 3) for performance
    const renderCardToCanvas = (student, signatures) => {
        return new Promise((resolve) => {
            const container = renderContainerRef.current;
            if (!container) { resolve(null); return; }

            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.left = '-9999px';
            wrapper.style.top = '0';
            container.appendChild(wrapper);

            const root = require('react-dom/client').createRoot(wrapper);
            root.render(
                <IDCardTemplate
                    student={student}
                    hodSignature={signatures.hod}
                    principalSignature={signatures.principal}
                />
            );

            // Use requestAnimationFrame + timeout to avoid blocking the main thread
            requestAnimationFrame(() => {
                setTimeout(async () => {
                    try {
                        const cardEl = wrapper.firstChild;
                        if (!cardEl) { resolve(null); return; }

                        const canvas = await html2canvas(cardEl, {
                            scale: 2, // Lower scale = less memory & faster
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: null,
                            logging: false,
                            imageTimeout: 5000,
                        });
                        resolve(canvas);
                    } catch (err) {
                        console.error('Card render error for', student.register_number, err);
                        resolve(null);
                    } finally {
                        root.unmount();
                        container.removeChild(wrapper);
                    }
                }, 400);
            });
        });
    };

    // Main generate function — creates PDF blob for preview
    const handleGenerate = async () => {
        if (generating) return;
        setGenerating(true);
        setStatus('generating');
        setErrorMsg('');
        abortRef.current = false;

        // Clear previous preview
        if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }

        try {
            // 1. Fetch students
            const params = new URLSearchParams();
            if (selectedDept) params.append('department', selectedDept);
            if (selectedSem) params.append('semester', selectedSem);

            const res = await fetch(`http://localhost:17221/api/students/id-cards?${params.toString()}`);
            const data = await res.json();
            const students = data.data || [];

            if (students.length === 0) {
                setStatus('error');
                setErrorMsg(t('settings.enrichment.id_cards.no_students'));
                setGenerating(false);
                return;
            }

            setProgress({ current: 0, total: students.length });

            // --- Landscape A4 layout: 4 columns × 2 rows ---
            const pageWidthMM = 297;
            const pageHeightMM = 210;
            const marginMM = 10;

            const cols = 4;
            const rows = 2;
            const cardsPerPage = cols * rows;

            const usableWidth = pageWidthMM - (marginMM * 2);
            const usableHeight = pageHeightMM - (marginMM * 2);

            const gapX = 5;
            const gapY = 5;

            const cardW = (usableWidth - (gapX * (cols - 1))) / cols;
            const cardH = cardW * (603 / 380);

            const totalGridHeight = (cardH * rows) + (gapY * (rows - 1));
            const offsetY = marginMM + ((usableHeight - totalGridHeight) / 2);

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // 2. Pre-fetch all unique signatures
            const uniqueDeptIds = [...new Set(students.map(s => s.dept_id).filter(Boolean))];
            for (const deptId of uniqueDeptIds) {
                await fetchSignatures(deptId);
            }
            await fetchSignatures(null);

            // 3. Process students one-by-one with yielding
            let cardIndex = 0;
            let isFirstPage = true;

            for (let i = 0; i < students.length; i++) {
                if (abortRef.current) break;

                const student = students[i];

                // Add new page when needed
                if (cardIndex === 0 && !isFirstPage) {
                    pdf.addPage('a4', 'landscape');
                }
                isFirstPage = false;

                const sigs = {
                    principal: sigCacheRef.current.principal,
                    hod: student.dept_id ? sigCacheRef.current.hod[student.dept_id] : undefined
                };

                const canvas = await renderCardToCanvas(student, sigs);

                if (canvas) {
                    const col = cardIndex % cols;
                    const row = Math.floor(cardIndex / cols);
                    const x = marginMM + (col * (cardW + gapX));
                    const y = offsetY + (row * (cardH + gapY));

                    const imgData = canvas.toDataURL('image/jpeg', 0.92); // JPEG = smaller & faster
                    pdf.addImage(imgData, 'JPEG', x, y, cardW, cardH);
                }

                cardIndex++;
                if (cardIndex >= cardsPerPage) {
                    cardIndex = 0;
                }

                setProgress({ current: i + 1, total: students.length });

                // Yield to main thread every 2 cards to prevent UI freeze
                if ((i + 1) % 2 === 0) {
                    await new Promise(r => setTimeout(r, 30));
                }
            }

            // 4. Create blob URL for preview (instead of direct download)
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);

            const fileName = `ID_Cards${selectedDept ? `_${selectedDept}` : ''}${selectedSem ? `_Sem${selectedSem}` : ''}_${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}.pdf`;

            setPdfBlobUrl(blobUrl);
            setPdfFileName(fileName);
            setStatus('complete');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            console.error('PDF generation error:', err);
            setStatus('error');
            setErrorMsg(err.message || 'Failed to generate PDF');
        } finally {
            setGenerating(false);
        }
    };

    const handleClosePreview = () => {
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
        setPdfFileName('');
    };

    // Semester options
    const semesterOptions = [
        { value: '', label: t('settings.enrichment.id_cards.all_sems') },
        { value: '1', label: 'Semester 1' },
        { value: '2', label: 'Semester 2' },
        { value: '3', label: 'Semester 3' },
        { value: '4', label: 'Semester 4' },
        { value: '5', label: 'Semester 5' },
        { value: '6', label: 'Semester 6' },
    ];

    const departmentOptions = [
        { value: '', label: t('settings.enrichment.id_cards.all_depts') },
        ...departments.map(d => ({ value: d.name, label: d.name }))
    ];

    const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <>
            {/* Hidden render container */}
            <div ref={renderContainerRef} style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none' }} />

            {/* PDF Preview Modal */}
            <PDFPreviewModal
                pdfBlobUrl={pdfBlobUrl}
                fileName={pdfFileName}
                onClose={handleClosePreview}
            />

            <div className="settings-card">
                <h3 className="card-title">
                    <FileText size={18} /> {t('settings.enrichment.id_cards.title')}
                </h3>
                <p className="form-hint" style={{ marginBottom: '1.5rem' }}>
                    {t('settings.enrichment.id_cards.subtitle')}
                </p>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Filters Row */}
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label className="form-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Filter size={14} /> {t('settings.enrichment.id_cards.dept_filter')}
                            </label>
                            <GlassSelect
                                value={selectedDept}
                                onChange={(val) => setSelectedDept(val)}
                                options={departmentOptions}
                                icon={Filter}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label className="form-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Filter size={14} /> {t('settings.enrichment.id_cards.sem_filter')}
                            </label>
                            <GlassSelect
                                value={selectedSem}
                                onChange={(val) => setSelectedSem(val)}
                                options={semesterOptions}
                                icon={Filter}
                            />
                        </div>
                    </div>

                    {/* Count Display */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '14px 18px', borderRadius: '10px',
                        background: studentCount > 0
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))'
                            : 'rgba(239, 68, 68, 0.06)',
                        border: `1px solid ${studentCount > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '10px',
                            background: studentCount > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: studentCount > 0 ? '#3B82F6' : '#EF4444'
                        }}>
                            {loadingCount ? <Loader className="animate-spin" size={20} /> : <Users size={20} />}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                                {loadingCount ? '...' : studentCount > 0
                                    ? t('settings.enrichment.id_cards.students_found').replace('{count}', studentCount)
                                    : t('settings.enrichment.id_cards.no_students')
                                }
                            </div>
                            {studentCount > 0 && !loadingCount && (
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {t('settings.enrichment.id_cards.info_1')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar (during generation) */}
                    {generating && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                    {t('settings.enrichment.id_cards.progress')
                                        .replace('{current}', progress.current)
                                        .replace('{total}', progress.total)}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#3B82F6', fontWeight: 600 }}>
                                    {progressPercent}%
                                </span>
                            </div>
                            <div style={{
                                height: '8px', borderRadius: '4px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%', borderRadius: '4px',
                                    background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
                                    width: `${progressPercent}%`,
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Status Messages */}
                    {status === 'complete' && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px 16px', borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#10B981', fontSize: '0.9rem', fontWeight: 500
                        }}>
                            <CheckCircle size={18} />
                            {t('settings.enrichment.id_cards.complete')}
                        </div>
                    )}

                    {status === 'error' && errorMsg && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px 16px', borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#EF4444', fontSize: '0.9rem', fontWeight: 500
                        }}>
                            <AlertCircle size={18} />
                            {errorMsg}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        className="primary-glass-btn"
                        style={{
                            width: '100%', justifyContent: 'center', marginTop: '5px',
                            opacity: (generating || studentCount === 0 || loadingCount) ? 0.6 : 1,
                            cursor: (generating || studentCount === 0 || loadingCount) ? 'not-allowed' : 'pointer',
                        }}
                        onClick={handleGenerate}
                        disabled={generating || studentCount === 0 || loadingCount}
                    >
                        {generating ? (
                            <><Loader className="animate-spin" size={18} /> {t('settings.enrichment.id_cards.generating')}</>
                        ) : (
                            <><Eye size={18} /> {t('settings.enrichment.id_cards.generate_btn')}</>
                        )}
                    </button>

                    {/* Info Box */}
                    <div className="info-box" style={{ marginTop: '5px', fontSize: '0.85rem' }}>
                        <p>• {t('settings.enrichment.id_cards.info_1')}</p>
                        <p>• {t('settings.enrichment.id_cards.info_2')}</p>
                        <p>• {t('settings.enrichment.id_cards.info_3')}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BulkIDCardDownload;
