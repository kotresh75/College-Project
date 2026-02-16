import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, FileText, Loader } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import IDCardTemplate from './IDCardTemplate';

const IDCardPreviewModal = ({ student, onClose }) => {
    const cardRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(''); // 'processing', 'success', ''
    const [signatures, setSignatures] = useState({ hod: null, principal: null });
    const [signaturesLoading, setSignaturesLoading] = useState(true);

    // Fetch HOD and Principal signatures on mount
    useEffect(() => {
        const fetchSignatures = async () => {
            try {
                // Fetch Principal Signature
                const principalRes = await fetch('http://localhost:17221/api/settings/principal-signature');
                const principalData = await principalRes.json();

                // Fetch Department for HOD signature
                let hodSignature = null;
                if (student.dept_id) {
                    const deptRes = await fetch(`http://localhost:17221/api/departments/${student.dept_id}`);
                    if (deptRes.ok) {
                        const deptData = await deptRes.json();
                        hodSignature = deptData.hod_signature;
                    }
                }

                setSignatures({
                    hod: hodSignature,
                    principal: principalData.signature
                });
            } catch (e) {
                console.error("Failed to fetch signatures", e);
            } finally {
                setSignaturesLoading(false);
            }
        };

        fetchSignatures();
    }, [student.dept_id]);

    const generateCardImage = async (scale = 3) => {
        const element = cardRef.current;
        if (!element) return null;

        try {
            // html2canvas handles DOM rendering much better than manual SVG serialization
            const canvas = await html2canvas(element, {
                scale: scale, // High resolution
                useCORS: true, // Allow loading cross-origin images
                allowTaint: true, // Allow tainted canvas (we just want to export)
                backgroundColor: null,
                logging: false,
                imageTimeout: 0,
            });
            return canvas;
        } catch (error) {
            console.error("Export Failed", error);
            alert("Failed to generate image. Please try again.");
            return null;
        }
    };

    const handleDownload = async (type) => {
        if (loading) return;
        setLoading(true);
        setStatus('processing');

        // Small delay to let UI update
        await new Promise(r => setTimeout(r, 100));

        const canvas = await generateCardImage(3); // 3x scale for print quality

        if (canvas) {
            if (type === 'png') {
                const link = document.createElement('a');
                link.download = `${student.register_number || 'Student'}_ID.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } else if (type === 'pdf') {
                const imgData = canvas.toDataURL('image/png');
                // Card dimensions in mm (approx)
                const cardWidthMM = 100.54;
                const cardHeightMM = 159.54;

                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [cardWidthMM, cardHeightMM]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, cardWidthMM, cardHeightMM);
                pdf.save(`${student.register_number || 'Student'}_ID.pdf`);
            }
            setStatus('success');
            setTimeout(() => setStatus(''), 2000);
        } else {
            setStatus('');
        }
        setLoading(false);
    };

    return createPortal(
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2200
        }}>
            <div className="glass-panel bounce-in" style={{
                width: 'auto', maxWidth: '900px', maxHeight: '95vh',
                display: 'flex', flexDirection: 'column', padding: 0,
                background: 'var(--bg-color)', border: '1px solid var(--glass-border)',
                overflow: 'hidden'
            }}>

                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>ID Card Preview</h2>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>High Res Export</p>
                    </div>
                    <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                </div>

                {/* Body (Scrollable if needed, but keeping centered) */}
                <div style={{ padding: '30px', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                        {/* Card Template - No scale transform to match export exactly */}
                        <IDCardTemplate
                            ref={cardRef}
                            student={student}
                            hodSignature={signatures.hod}
                            principalSignature={signatures.principal}
                        />

                        {/* Loading Overlay */}
                        {(loading || signaturesLoading) && (
                            <div style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                                backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column',
                                justifyContent: 'center', alignItems: 'center', color: 'white',
                                zIndex: 10, borderRadius: '8px'
                            }}>
                                <Loader className="animate-spin" size={32} style={{ marginBottom: '10px' }} />
                                <span>{signaturesLoading ? 'Loading...' : (status === 'processing' ? 'Generating...' : 'Done!')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '20px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '15px', background: 'rgba(255,255,255,0.02)' }}>
                    <button
                        onClick={() => handleDownload('png')}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                            background: '#4f46e5', color: 'white', fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1, transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#4338ca')}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#4f46e5')}
                    >
                        <Download size={18} /> Save PNG
                    </button>
                    <button
                        onClick={() => handleDownload('pdf')}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                            background: '#10b981', color: 'white', fontWeight: 600, // Emerald Green
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1, transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#059669')}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#10b981')}
                    >
                        <FileText size={18} /> Save PDF
                    </button>
                    <button onClick={onClose} style={{
                        padding: '10px 20px', borderRadius: '8px',
                        background: 'transparent', border: '1px solid #ccc', color: '#666',
                        cursor: 'pointer'
                    }}>
                        Close
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};



export default IDCardPreviewModal;
