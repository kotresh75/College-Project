import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { X, Download, Printer, FileText, Settings2, Maximize2, Minimize2, Droplets, Layout, Ruler, FileType, Loader2, Image as ImageIcon } from 'lucide-react';

import { generatePdf } from '../../utils/SmartPrinterHandler';
import './PdfPreviewModal.css';

/**
 * PdfPreviewModal — Premium Document Previewer with Paginated Preview
 */
const PdfPreviewModal = ({ isOpen, onClose, htmlContent, title = 'Document', fileName = 'document', enableImageToggle = false }) => {


    // --- Settings State ---
    const [pageSize, setPageSize] = useState('A4');
    const [orientation, setOrientation] = useState('portrait');
    const [colorMode, setColorMode] = useState('color');
    const [margins, setMargins] = useState('normal');
    const [showHeader, setShowHeader] = useState(true);
    const [showFooter, setShowFooter] = useState(true);
    const [showImages, setShowImages] = useState(true); // New: Toggle images

    const [zoom, setZoom] = useState(60);
    const [downloading, setDownloading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(true);

    const previewRef = useRef(null);
    const iframeRef = useRef(null);

    // --- Derived Dimensions ---
    const paperDimensions = useMemo(() => {
        const sizes = {
            'A4': { w: 210, h: 297 },
            'Letter': { w: 216, h: 279 },
            'Legal': { w: 216, h: 356 },
        };
        const base = sizes[pageSize] || sizes['A4'];
        if (orientation === 'landscape') return { w: base.h, h: base.w };
        return base;
    }, [pageSize, orientation]);

    const marginValues = useMemo(() => {
        const map = { narrow: '5mm', normal: '10mm', wide: '20mm' };
        return map[margins] || '10mm';
    }, [margins]);

    const marginMm = margins === 'narrow' ? 5 : margins === 'wide' ? 20 : 10;

    // --- Build Modified HTML (settings applied) ---
    const processedHtml = useMemo(() => {
        if (!htmlContent) return '';
        let html = htmlContent;

        const fontScaleCss = `body { font-size: 11px !important; }`;
        const marginCss = `@page { margin: ${marginValues}; } .print-container { padding: ${marginValues}; }`;

        let visibilityCss = '';
        if (!showHeader) visibilityCss += `.print-header { display: none !important; }`;
        if (!showFooter) visibilityCss += `.print-footer { display: none !important; }`;

        let colorCss = '';
        if (colorMode === 'grayscale') {
            colorCss = `html { filter: grayscale(100%) !important; }`;
        } else if (colorMode === 'bw') {
            colorCss = `html { filter: grayscale(100%) contrast(150%) !important; }`;
        }

        const tableFitCss = `
            table { width: 100% !important; table-layout: auto !important; border-collapse: collapse !important; }
            th, td { 
                white-space: normal !important; 
                word-wrap: break-word !important; 
                overflow-wrap: anywhere !important;
                word-break: normal !important;
                padding: 3px 4px !important; 
                font-size: 0.9em !important; 
                vertical-align: top !important;
                border: 1px solid #ddd !important;
                min-width: 35px !important;
            }
            th { background: #f8f9fa !important; font-weight: 600 !important; }
        `;

        // Image toggle CSS — baked into HTML so iframe remounts cleanly
        let imageCss = '';
        if (enableImageToggle && !showImages) {
            imageCss = `
                img, .student-photo, .print-logo { display: none !important; }
                th:nth-child(1), td:nth-child(1) { display: none !important; width: 0 !important; padding: 0 !important; border: none !important; }
            `;
        }

        const injectCss = `<style>${fontScaleCss} ${marginCss} ${visibilityCss} ${colorCss} ${tableFitCss} ${imageCss}</style>`;

        if (html.includes('</head>')) {
            html = html.replace('</head>', `${injectCss}</head>`);
        } else {
            html = injectCss + html;
        }

        return html;
    }, [htmlContent, marginValues, showHeader, showFooter, colorMode, showImages, enableImageToggle]);

    // --- Print via System Dialog ---
    const handlePrint = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (!doc) return;

        // Inject @page CSS so the printer respects our settings
        const size = pageSize === 'A4' ? 'A4' : pageSize === 'Letter' ? 'letter' : 'legal';
        const orient = orientation === 'landscape' ? 'landscape' : 'portrait';

        // Remove old print style if it exists
        const old = doc.getElementById('pdf-print-settings');
        if (old) old.remove();

        const printStyle = doc.createElement('style');
        printStyle.id = 'pdf-print-settings';
        printStyle.textContent = `
            @page {
                size: ${size} ${orient};
                margin: ${marginValues};
            }
            @media print {
                html, body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                /* Hide page shadows and gaps for clean print */
                body > div {
                    box-shadow: none !important;
                    margin: 0 !important;
                    border: none !important;
                }
            }
        `;
        doc.head.appendChild(printStyle);

        // Trigger native print dialog
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, [pageSize, orientation, marginValues]);

    // --- Download PDF ---
    const handleDownload = useCallback(async () => {
        setDownloading(true);
        try {
            const pdfOptions = {
                pageSize: pageSize,
                landscape: orientation === 'landscape',
                margins: marginValues,
            };

            const base64Data = await generatePdf(processedHtml, pdfOptions);
            if (base64Data) {
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${fileName}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } catch (error) {
            console.error('PDF download failed:', error);
        } finally {
            setDownloading(false);
        }
    }, [processedHtml, pageSize, orientation, marginValues, fileName]);


    // --- Key that forces iframe to fully remount when ANY setting changes ---
    const iframeKey = useMemo(() =>
        `${pageSize}-${orientation}-${margins}-${colorMode}-${showHeader}-${showFooter}-${Date.now()}`,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [processedHtml, paperDimensions, marginMm]
    );

    // Reset generating state on key change
    useEffect(() => {
        setIsGenerating(true);
    }, [iframeKey]);

    // --- Preview srcdoc: just the processed HTML + gray background style ---
    const previewSrcDoc = useMemo(() => {
        if (!processedHtml) return '';
        let content = processedHtml;

        // Only inject the gray background - pagination is handled by onLoad
        const bgCss = `<style>
            html, body {
                background: #cacaca !important;
                margin: 0 !important;
                padding: 0 !important;
            }
        </style>`;

        if (content.includes('</head>')) {
            content = content.replace('</head>', `${bgCss}</head>`);
        } else {
            content = bgCss + content;
        }
        return content;
    }, [processedHtml]);

    // --- Pagination logic: runs from React after iframe loads ---
    const paginateIframe = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (!doc || !doc.body) return;
            const body = doc.body;

            // Step 1: Measure the browser's actual mm-to-px ratio
            const ruler = doc.createElement('div');
            ruler.style.cssText = 'position:absolute;visibility:hidden;width:100mm;height:100mm;pointer-events:none;';
            body.appendChild(ruler);
            const mmToPx = ruler.offsetWidth / 100;
            body.removeChild(ruler);

            // Step 2: Compute all dimensions in px
            const pw = paperDimensions.w;
            const ph = paperDimensions.h;
            const m = marginMm;
            const pageWidthPx = Math.round(pw * mmToPx);
            const pageHeightPx = Math.round(ph * mmToPx);
            const marginPx = Math.round(m * mmToPx);
            const contentAreaW = pageWidthPx - marginPx * 2;
            const contentAreaH = pageHeightPx - marginPx * 2;

            // Step 3: Set body width to content area width for correct text wrapping
            body.style.cssText = `background:#cacaca; margin:0; padding:0; width:${contentAreaW}px;`;

            // Force full layout
            void body.offsetHeight;
            const totalContentH = body.scrollHeight;

            // Step 4: Calculate pages
            const numPages = Math.max(1, Math.ceil(totalContentH / contentAreaH));

            // Step 5: Grab the rendered HTML
            const savedHTML = body.innerHTML;

            // Step 6: Clear body and set it up as page container
            body.innerHTML = '';
            body.style.cssText = `
                background: #cacaca;
                margin: 0;
                padding: 16px 0;
                overflow: visible;
                display: flex;
                flex-direction: column;
                align-items: center;
            `;

            // Step 7: Create visual page divs
            for (let i = 0; i < numPages; i++) {
                const page = doc.createElement('div');
                page.style.cssText = `
                    width: ${pageWidthPx}px;
                    height: ${pageHeightPx}px;
                    background: #ffffff;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06);
                    margin: 10px auto;
                    padding: ${marginPx}px;
                    box-sizing: border-box;
                    overflow: hidden;
                    position: relative;
                    flex-shrink: 0;
                `;

                const contentClone = doc.createElement('div');
                contentClone.innerHTML = savedHTML;
                contentClone.style.cssText = `
                    width: ${contentAreaW}px;
                    position: relative;
                    margin-top: ${-i * contentAreaH}px;
                `;

                page.appendChild(contentClone);
                body.appendChild(page);
            }

            // Step 8: Resize iframe to fit all pages
            void body.offsetHeight;
            const finalH = body.scrollHeight;
            iframe.style.height = (finalH + 10) + 'px';
            iframe.style.width = (pageWidthPx + 60) + 'px';

        } catch (err) {
            console.error('Pagination error:', err);
            try {
                const doc = iframe.contentDocument;
                if (doc && doc.body) {
                    iframe.style.height = Math.max(doc.body.scrollHeight, 500) + 'px';
                }
            } catch (_) { }
        } finally {
            setIsGenerating(false);
        }
    }, [paperDimensions, marginMm]);

    // --- Trigger pagination when iframe loads ---

    const handleIframeLoad = useCallback(() => {
        // Small delay to ensure styles are applied and layout is calculated
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                paginateIframe();
            });
        });
    }, [paginateIframe]);

    if (!isOpen) return null;

    const previewScale = zoom / 100;

    return (
        <div className="pdf-preview-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="pdf-preview-container">

                {/* ---- Header ---- */}
                <div className="pdf-preview-header">
                    <div className="pdf-preview-header-left">
                        <div className="pdf-preview-header-icon">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2>PDF Preview</h2>
                            <p>{title}</p>
                        </div>
                    </div>
                    <button className="pdf-preview-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* ---- Body ---- */}
                <div className="pdf-preview-body">

                    {/* ---- Preview Pane ---- */}
                    <div className="pdf-preview-pane" ref={previewRef}>

                        {/* Sticky Zoom Bar */}
                        <div className="pdf-zoom-bar">
                            <Minimize2 size={14} style={{ color: 'var(--text-secondary)' }} />
                            <input
                                type="range"
                                className="pdf-zoom-slider"
                                min={30}
                                max={150}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                            />
                            <Maximize2 size={14} style={{ color: 'var(--text-secondary)' }} />
                            <span className="pdf-zoom-value">{zoom}%</span>
                        </div>

                        {/* Loading Overlay */}
                        {isGenerating && (
                            <div className="pdf-generation-overlay">
                                <Loader2 size={32} className="pdf-spinner-large" />
                                <span>Generating Preview...</span>
                            </div>
                        )}

                        {/* Paginated Preview — zoom wrapper */}
                        <div
                            className="pdf-pages-wrapper"
                            style={{
                                transform: `scale(${previewScale})`,
                                transformOrigin: 'top center',
                                opacity: isGenerating ? 0.4 : 1, // Dim while loading
                                transition: 'opacity 0.3s ease'
                            }}
                        >
                            <iframe
                                ref={iframeRef}
                                key={iframeKey}
                                title="PDF Preview"
                                srcDoc={previewSrcDoc}
                                onLoad={handleIframeLoad}
                                style={{
                                    width: '900px',
                                    height: '600px',
                                    border: 'none',
                                    display: 'block',
                                    background: '#cacaca',
                                }}
                                sandbox="allow-same-origin allow-modals"
                            />
                        </div>
                    </div>

                    {/* ---- Settings Sidebar ---- */}
                    <div className="pdf-settings-sidebar">
                        <div className="pdf-settings-header">
                            <Settings2 size={16} style={{ color: '#8b5cf6' }} />
                            <h3>Document Settings</h3>
                        </div>

                        <div className="pdf-settings-content">

                            {/* Page Size */}
                            <div className="pdf-setting-group">
                                <span className="pdf-setting-label">
                                    <FileType size={13} /> Page Size
                                </span>
                                <select
                                    className="pdf-select"
                                    value={pageSize}
                                    onChange={(e) => setPageSize(e.target.value)}
                                >
                                    <option value="A4">A4 (210 × 297 mm)</option>
                                    <option value="Letter">Letter (8.5 × 11 in)</option>
                                    <option value="Legal">Legal (8.5 × 14 in)</option>
                                </select>
                            </div>

                            {/* Orientation */}
                            <div className="pdf-setting-group">
                                <span className="pdf-setting-label">
                                    <Layout size={13} /> Orientation
                                </span>
                                <div className="pdf-pill-group">
                                    <button
                                        className={`pdf-pill ${orientation === 'portrait' ? 'active' : ''}`}
                                        onClick={() => setOrientation('portrait')}
                                    >
                                        Portrait
                                    </button>
                                    <button
                                        className={`pdf-pill ${orientation === 'landscape' ? 'active' : ''}`}
                                        onClick={() => setOrientation('landscape')}
                                    >
                                        Landscape
                                    </button>
                                </div>
                            </div>

                            {/* Color Mode */}
                            <div className="pdf-setting-group">
                                <span className="pdf-setting-label">
                                    <Droplets size={13} /> Color Mode
                                </span>
                                <div className="pdf-pill-group">
                                    <button
                                        className={`pdf-pill ${colorMode === 'color' ? 'active' : ''}`}
                                        onClick={() => setColorMode('color')}
                                    >
                                        Color
                                    </button>
                                    <button
                                        className={`pdf-pill ${colorMode === 'grayscale' ? 'active' : ''}`}
                                        onClick={() => setColorMode('grayscale')}
                                    >
                                        Gray
                                    </button>
                                    <button
                                        className={`pdf-pill ${colorMode === 'bw' ? 'active' : ''}`}
                                        onClick={() => setColorMode('bw')}
                                    >
                                        B&W
                                    </button>
                                </div>
                            </div>

                            {/* Show Images Toggle (Conditional) */}
                            {enableImageToggle && (
                                <div className="pdf-setting-group">
                                    <div className="pdf-toggle-row">
                                        <span>
                                            <ImageIcon size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                            Show Images
                                        </span>
                                        <label className="pdf-toggle">
                                            <input
                                                type="checkbox"
                                                checked={showImages}
                                                onChange={(e) => setShowImages(e.target.checked)}
                                            />
                                            <div className="pdf-toggle-track" />
                                            <div className="pdf-toggle-thumb" />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Margins */}
                            <div className="pdf-setting-group">
                                <span className="pdf-setting-label">
                                    <Ruler size={13} /> Margins
                                </span>
                                <div className="pdf-pill-group">
                                    <button
                                        className={`pdf-pill ${margins === 'narrow' ? 'active' : ''}`}
                                        onClick={() => setMargins('narrow')}
                                    >
                                        Narrow
                                    </button>
                                    <button
                                        className={`pdf-pill ${margins === 'normal' ? 'active' : ''}`}
                                        onClick={() => setMargins('normal')}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        className={`pdf-pill ${margins === 'wide' ? 'active' : ''}`}
                                        onClick={() => setMargins('wide')}
                                    >
                                        Wide
                                    </button>
                                </div>
                            </div>



                            <div className="pdf-settings-divider" />

                            {/* Header Toggle */}
                            <div className="pdf-toggle-row">
                                <span>Show Header</span>
                                <label className="pdf-toggle">
                                    <input
                                        type="checkbox"
                                        checked={showHeader}
                                        onChange={(e) => setShowHeader(e.target.checked)}
                                    />
                                    <div className="pdf-toggle-track" />
                                    <div className="pdf-toggle-thumb" />
                                </label>
                            </div>

                            {/* Footer Toggle */}
                            <div className="pdf-toggle-row">
                                <span>Show Footer</span>
                                <label className="pdf-toggle">
                                    <input
                                        type="checkbox"
                                        checked={showFooter}
                                        onChange={(e) => setShowFooter(e.target.checked)}
                                    />
                                    <div className="pdf-toggle-track" />
                                    <div className="pdf-toggle-thumb" />
                                </label>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ---- Footer ---- */}
                <div className="pdf-preview-footer">
                    <button className="pdf-btn-close" onClick={onClose}>
                        Close
                    </button>
                    <div className="pdf-footer-actions">
                        <button
                            className="pdf-btn-print"
                            onClick={handlePrint}
                        >
                            <Printer size={18} /> Print
                        </button>
                        <button
                            className="pdf-btn-download"
                            onClick={handleDownload}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <><div className="pdf-spinner" /> Generating...</>
                            ) : (
                                <><Download size={18} /> Download PDF</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PdfPreviewModal;
