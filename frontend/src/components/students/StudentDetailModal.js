import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, BookOpen, DollarSign, Calendar, Mail, Phone, MapPin, AlertCircle, Clock, CheckCircle, Info, Hash, Award, AlertTriangle, Check, CreditCard } from 'lucide-react';
import TransactionDetailsModal from '../common/TransactionDetailsModal';
import IDCardPreviewModal from './IDCardPreviewModal'; // Updated import
import '../../styles/components/smart-book-detail.css'; // Reusing the shared smart styling

const StudentDetailModal = ({ student, onClose }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loans, setLoans] = useState([]);
    const [history, setHistory] = useState([]);
    const [fines, setFines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFineOrTxn, setSelectedFineOrTxn] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [showIDCard, setShowIDCard] = useState(false);

    // Fetch Data
    useEffect(() => {
        if (student?.id) {
            // Loans
            fetch(`http://localhost:17221/api/circulation/loans/${student.id}`)
                .then(res => res.json())
                .then(data => setLoans(Array.isArray(data) ? data : []))
                .catch(console.error);

            // Fines
            fetch(`http://localhost:17221/api/fines/student/${student.id}`)
                .then(res => res.json())
                .then(data => setFines(Array.isArray(data) ? data : []))
                .catch(console.error);
        }
    }, [student.id]);

    useEffect(() => {
        if (activeTab === 'circulation' && student?.id) {
            const url = `http://localhost:17221/api/circulation/history?student_id=${student.id}&limit=100`;
            console.log("Fetching student history:", url);
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    console.log("Student history data:", data);
                    setHistory(Array.isArray(data) ? data : []);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [activeTab, student.id]);

    // Stats
    const activeLoanCount = loans.length;
    const [maxLoans, setMaxLoans] = useState(5);

    useEffect(() => {
        fetch('http://localhost:17221/api/policy')
            .then(res => res.json())
            .then(data => {
                if (data.policy_borrowing?.student?.maxBooks) {
                    setMaxLoans(parseInt(data.policy_borrowing.student.maxBooks));
                }
            })
            .catch(console.error);
    }, []);
    const loanUtilization = Math.min((activeLoanCount / maxLoans) * 100, 100);

    // Ring Calc
    const circumference = 339;
    const strokeDashoffset = circumference - (loanUtilization / 100) * circumference;
    const ringColor = activeLoanCount >= maxLoans ? '#fc8181' : 'var(--primary-color)';

    const copyToClipboard = () => {
        navigator.clipboard.writeText(student.register_number);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    return createPortal(
        <div className="smart-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="smart-detail-modal" style={{ height: '700px', width: '900px' }}>

                {/* Hero Section */}
                <div className="detail-hero" style={{
                    backgroundImage: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)', // Generic dark abstract bg
                    minHeight: '200px'
                }}>
                    <div className="hero-overlay" style={{ background: 'linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.9))' }} />

                    <button className="hero-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>

                    <div className="hero-content">
                        <div className="book-cover-large" style={{ borderRadius: '50%', width: '140px', height: '140px', background: 'var(--surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            {student.profile_image ? (
                                <img
                                    src={student.profile_image}
                                    alt={student.full_name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <User size={60} style={{ opacity: 0.8 }} />
                            )}
                        </div>
                        <div className="hero-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '10px' }}>
                            <h1 className="hero-title">{student.full_name}</h1>
                            <div className="hero-meta">
                                <span style={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={copyToClipboard}>
                                    <Hash size={16} /> {student.register_number}
                                    {copiedId && <Check size={14} color="#48bb78" />}
                                </span>
                                <span className="hero-badge" style={{ background: getStatusColor(student.status), border: 'none', color: '#fff' }}>
                                    {student.status}
                                </span>
                                <button
                                    className="hero-badge"
                                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}
                                    onClick={() => setShowIDCard(true)}
                                >
                                    <CreditCard size={14} /> ID Card
                                </button>
                            </div>
                            <div className="hero-meta" style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                                <span style={{ opacity: 0.7 }}>{student.department_name}</span>
                                <span style={{ opacity: 0.4 }}>•</span>
                                <span style={{ color: 'var(--primary-color)' }}>Semester {student.semester}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="smart-tabs" style={{ paddingLeft: '200px' }}>
                    <button className={`smart-tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                        <User size={18} /> Profile
                    </button>
                    <button className={`smart-tab-btn ${activeTab === 'circulation' ? 'active' : ''}`} onClick={() => setActiveTab('circulation')}>
                        <BookOpen size={18} /> History
                    </button>
                    <button className={`smart-tab-btn ${activeTab === 'fines' ? 'active' : ''}`} onClick={() => setActiveTab('fines')}>
                        <DollarSign size={18} /> Fines
                    </button>
                </div>

                {/* Content */}
                <div className="detail-content">
                    {activeTab === 'profile' && (
                        <div className="detail-grid">
                            <div className="detail-left">
                                <div className="detail-card">
                                    <div className="card-header">
                                        <h3 className="card-title"><Info size={18} /> Personal Information</h3>
                                    </div>
                                    <div className="data-row">
                                        <span className="data-label">Father Name</span>
                                        <span className="data-value">{student.father_name || '-'}</span>
                                    </div>
                                    <div className="data-row">
                                        <span className="data-label">Email Address</span>
                                        <span className="data-value">{student.email}</span>
                                    </div>
                                    <div className="data-row">
                                        <span className="data-label">Phone Number</span>
                                        <span className="data-value">{student.phone || '-'}</span>
                                    </div>
                                    <div className="data-row">
                                        <span className="data-label">Date of Birth</span>
                                        <span className="data-value">
                                            {student.dob ? student.dob.split('-').reverse().join('/') : '-'}
                                        </span>
                                    </div>
                                    <div className="data-row">
                                        <span className="data-label">Address</span>
                                        <span className="data-value" style={{ maxWidth: '60%', textAlign: 'right' }}>{student.address || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-right">
                                <div className="detail-card" style={{ textAlign: 'center' }}>
                                    <h3 className="card-title" style={{ justifyContent: 'center', marginBottom: '20px' }}>Loan Limit</h3>

                                    <div className="availability-ring">
                                        <svg width="120" height="120" viewBox="0 0 120 120">
                                            <circle cx="60" cy="60" r="54" className="ring-bg" />
                                            <circle cx="60" cy="60" r="54" className="ring-value"
                                                style={{ strokeDasharray: circumference, strokeDashoffset, stroke: ringColor }}
                                            />
                                        </svg>
                                        <div className="ring-content">
                                            <span className="ring-number" style={{ color: ringColor }}>{activeLoanCount}</span>
                                            <span className="ring-label">of {maxLoans} Books</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                                        {Math.max(0, maxLoans - activeLoanCount)} slots remaining
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'circulation' && (
                        <div>
                            {loading ? <div className="p-10 flex justify-center"><div className="spinner-lg"></div></div> : (
                                <div className="holder-list">
                                    {history.length === 0 ? <div className="text-center p-8 opacity-50">No circulation history found.</div> :
                                        history.map((tx, idx) => (
                                            <div key={idx} className="holder-item">
                                                <div className="holder-info">
                                                    <h4>{tx.book_title}</h4>
                                                    <div className="holder-meta">
                                                        {new Date(tx.date || tx.issue_date).toLocaleDateString()} • <span className="font-mono">#{tx.accession_number}</span>
                                                    </div>
                                                </div>
                                                <div className="holder-status">
                                                    <span className={`copy-badge ${tx.status === 'RETURN' ? 'available' :
                                                        tx.status === 'ISSUE' ? 'borrowed' :
                                                            'lost'
                                                        }`}>
                                                        {tx.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'fines' && (
                        <div className="holder-list">
                            {fines.length === 0 ? <div className="text-center p-8 opacity-50">No fine records found.</div> :
                                fines.map((fine, idx) => (
                                    <div key={idx} className="holder-item" onClick={() => { setSelectedFineOrTxn({ ...fine, action_type: 'FINE_PAID' }); setIsDetailsOpen(true); }} style={{ cursor: 'pointer' }}>
                                        <div className="holder-info">
                                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                ₹{fine.amount}
                                                {fine.is_paid ? <CheckCircle size={14} color="#48bb78" /> : <AlertTriangle size={14} color="#fc8181" />}
                                            </h4>
                                            <div className="holder-meta">
                                                {fine.reason} • {new Date(fine.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="holder-status">
                                            <span className="text-sm opacity-70 block">{fine.book_title}</span>
                                            <span className={`copy-badge ${fine.is_paid ? 'available' : 'lost'}`}>
                                                {fine.is_paid ? 'PAID' : 'UNPAID'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            <TransactionDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                transaction={selectedFineOrTxn}
            />
            {/* ID Card Generator */}
            {showIDCard && (
                <IDCardPreviewModal
                    student={student}
                    onClose={() => setShowIDCard(false)}
                />
            )}
        </div>,
        document.body
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Active': return 'var(--success-color)'; // using CSS var from global
        case 'Blocked': return 'var(--danger-color)';
        case 'Graduated': return '#a29bfe';
        case 'Deleted': return '#718096';
        default: return 'var(--text-secondary)';
    }
};

export default StudentDetailModal;
