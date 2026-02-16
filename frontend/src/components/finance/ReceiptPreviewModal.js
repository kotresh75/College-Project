import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, Minimize2, Maximize2, Printer } from 'lucide-react';
import { generateReceiptContent, generatePdf } from '../../utils/SmartPrinterHandler';

const ReceiptPreviewModal = ({ isOpen, onClose, transaction }) => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(false);
    const [colorMode, setColorMode] = useState('color');
    const [zoom, setZoom] = useState(100);
    const [paperSize, setPaperSize] = useState('A4');
    const isThermal = paperSize === '58mm' || paperSize === '80mm';
    const iframeRef = useRef(null);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('http://localhost:17221/api/settings/app');
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                    if (data?.app_hardware?.paperSize) {
                        setPaperSize(data.app_hardware.paperSize);
                    }
                }
            } catch (e) {
                console.warn("Could not fetch settings for receipt, using defaults.");
            }
        };
        fetchSettings();
    }, []);

    // Generate content reactively
    const printData = useMemo(() => {
        if (!isOpen || !transaction) return { html: '', paperSize: 'A4' };
        const effectiveSettings = { ...settings, app_hardware: { ...(settings.app_hardware || {}), paperSize } };
        return generateReceiptContent(transaction, effectiveSettings);
    }, [isOpen, transaction, settings, paperSize]);

    // Process HTML for color mode
    const processedHtml = useMemo(() => {
        if (!printData.html) return '';
        let html = printData.html;

        let colorCss = '';
        if (colorMode === 'grayscale') {
            colorCss = `html { filter: grayscale(100%) !important; }`;
        } else if (colorMode === 'bw') {
            colorCss = `html { filter: grayscale(100%) contrast(1.5) !important; }`;
        }

        const previewCss = `<style>html, body { background: #fff !important; margin: 0 !important; } ${colorCss}</style>`;
        if (html.includes('</head>')) {
            html = html.replace('</head>', `${previewCss}</head>`);
        } else {
            html = previewCss + html;
        }
        return html;
    }, [printData.html, colorMode]);

    // Auto-size iframe height
    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc && doc.body) {
                setTimeout(() => {
                    const h = doc.body.scrollHeight;
                    iframe.style.height = Math.max(h + 20, 200) + 'px';
                }, 200);
            }
        } catch (_) { }
    }, []);

    // Print via system dialog
    const handlePrint = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (e) {
            console.error("Print failed:", e);
        }
    }, []);

    const handleDownloadPdf = useCallback(async () => {
        setLoading(true);
        try {
            // Render receipt at correct width for clean PDF
            const container = document.createElement('div');
            const receiptWidth = isThermal ? (paperSize === '58mm' ? '58mm' : '80mm') : '320px';
            container.style.cssText = `
                position: fixed; top: 0; left: 0; z-index: -9999;
                background: #ffffff; overflow: visible;
                width: ${receiptWidth};
            `;

            // Clean up HTML for off-screen rendering
            let cleanHtml = processedHtml
                .replace(/<\/?html[^>]*>/g, '')
                .replace(/<\/?body[^>]*>/g, '')
                .replace(/<head>/g, '<div class="virtual-head">')
                .replace(/<\/head>/g, '</div>');

            container.innerHTML = cleanHtml;
            document.body.appendChild(container);

            // Wait for fonts/images
            await new Promise(resolve => setTimeout(resolve, 500));

            // Dynamically import html2canvas and jspdf
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(container, {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: container.scrollWidth,
                windowHeight: container.scrollHeight,
            });

            document.body.removeChild(container);

            const imgData = canvas.toDataURL('image/png');
            const imgW = canvas.width;
            const imgH = canvas.height;

            // Create PDF sized to content
            const pdfW = 100; // mm width for receipt
            const pdfH = (imgH * pdfW) / imgW;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [pdfW, pdfH + 10] });
            doc.addImage(imgData, 'PNG', 0, 5, pdfW, pdfH);

            doc.save(`Receipt_${transaction.receipt_number || transaction.id}.pdf`);
        } catch (error) {
            console.error("PDF download failed", error);
            // Fallback to existing generatePdf
            try {
                const base64Data = await generatePdf(processedHtml, { pageSize: 'A4' });
                if (base64Data) {
                    const byteCharacters = atob(base64Data);
                    const byteArray = new Uint8Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteArray[i] = byteCharacters.charCodeAt(i);
                    }
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `Receipt_${transaction.receipt_number || transaction.id}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                }
            } catch (fallbackError) {
                console.error("Fallback PDF also failed:", fallbackError);
            }
        } finally {
            setLoading(false);
        }
    }, [processedHtml, transaction, isThermal, paperSize]);

    if (!isOpen || !transaction) return null;

    const previewScale = zoom / 100;
    const previewWidth = paperSize === '58mm' ? '58mm' : paperSize === '80mm' ? '80mm' : '340px';

    return createPortal(
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.3s ease', zIndex: 2200 }}>
            <div style={{
                background: 'var(--surface-primary, #1a1a2e)',
                borderRadius: '20px',
                border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                width: '520px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                    background: 'var(--surface-secondary, rgba(255,255,255,0.03))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                        }}>
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #fff)' }}>Receipt Preview</h3>
                            <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-secondary, #94a3b8)' }}>
                                {transaction.receipt_number || `TXN-${transaction.id}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
                        background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Controls Bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px',
                    borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
                    background: 'var(--surface-tertiary, rgba(0,0,0,0.1))',
                    flexWrap: 'wrap'
                }}>
                    {/* Paper Size */}
                    <div style={{
                        display: 'flex', gap: '3px', padding: '3px',
                        background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                        border: '1px solid var(--glass-border, rgba(255,255,255,0.06))'
                    }}>
                        {[
                            { id: '58mm', label: '58mm' },
                            { id: '80mm', label: '80mm' },
                            { id: 'A4', label: 'A4' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setPaperSize(opt.id)}
                                style={{
                                    padding: '4px 10px', border: 'none', borderRadius: '6px',
                                    background: paperSize === opt.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                                    color: paperSize === opt.id ? '#fff' : 'var(--text-secondary, #94a3b8)',
                                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: paperSize === opt.id ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Separator */}
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

                    {/* Color Mode */}
                    <div style={{
                        display: 'flex', gap: '3px', padding: '3px',
                        background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                        border: '1px solid var(--glass-border, rgba(255,255,255,0.06))'
                    }}>
                        {[
                            { id: 'color', label: '🎨' },
                            { id: 'grayscale', label: '🌓' },
                            { id: 'bw', label: '⬛' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setColorMode(opt.id)}
                                title={opt.id === 'color' ? 'Color' : opt.id === 'grayscale' ? 'Grayscale' : 'Black & White'}
                                style={{
                                    padding: '4px 8px', border: 'none', borderRadius: '6px',
                                    background: colorMode === opt.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    fontSize: '0.8rem', cursor: 'pointer',
                                    transition: 'all 0.2s', lineHeight: 1
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Zoom */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                        <Minimize2 size={12} style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="range"
                            min={50}
                            max={150}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            style={{ width: '60px', height: '3px', cursor: 'pointer', accentColor: '#6366f1' }}
                        />
                        <Maximize2 size={12} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary, #fff)', minWidth: '30px' }}>{zoom}%</span>
                    </div>
                </div>

                {/* Preview Area */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '20px',
                    background: isThermal
                        ? 'repeating-linear-gradient(0deg, #e5e7eb 0px, #e5e7eb 1px, #f3f4f6 1px, #f3f4f6 12px)'
                        : 'var(--surface-tertiary, rgba(0,0,0,0.15))',
                    display: 'flex', justifyContent: 'center', alignItems: 'flex-start'
                }}>
                    <div style={{
                        background: '#ffffff',
                        boxShadow: isThermal
                            ? '2px 2px 8px rgba(0,0,0,0.15)'
                            : '0 4px 25px rgba(0,0,0,0.3)',
                        borderRadius: isThermal ? '0' : '4px',
                        width: previewWidth,
                        overflow: 'hidden',
                        transform: `scale(${previewScale})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.3s ease, width 0.3s ease'
                    }}>
                        <iframe
                            ref={iframeRef}
                            title="Receipt Preview"
                            srcDoc={processedHtml}
                            onLoad={handleIframeLoad}
                            style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                    background: 'var(--surface-secondary, rgba(255,255,255,0.03))',
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                }}>
                    <button onClick={onClose} style={{
                        padding: '9px 18px', borderRadius: '10px',
                        border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
                        background: 'transparent', color: 'var(--text-secondary, #94a3b8)',
                        fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                    }}>
                        Close
                    </button>
                    <button onClick={handlePrint} style={{
                        padding: '9px 18px', borderRadius: '10px',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))',
                        color: '#818cf8', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.2s'
                    }}>
                        <Printer size={15} /> Print
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={loading}
                        style={{
                            padding: '9px 20px', borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                            opacity: loading ? 0.7 : 1, transition: 'all 0.2s'
                        }}
                    >
                        {loading ? (
                            <div style={{
                                width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#fff', borderRadius: '50%',
                                animation: 'spin 0.7s linear infinite'
                            }} />
                        ) : <Download size={16} />}
                        Download PDF
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>,
        document.body
    );
};

export default ReceiptPreviewModal;
