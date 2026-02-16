import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Book, User, Calendar, Clock, AlertTriangle, AlertCircle } from 'lucide-react';

const DashboardDetailModal = ({ type, onClose }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (!type) return;

        let endpoint = `http://localhost:17221/api/dashboard/details?type=${type}`;
        let modalTitle = '';

        switch (type) {
            case 'issued_today':
                modalTitle = 'Books Issued Today';
                break;
            case 'overdue':
                modalTitle = 'Overdue Books';
                break;
            case 'lost_damaged':
                modalTitle = 'Lost & Damaged Books';
                break;
            default:
                modalTitle = 'Details';
        }
        setTitle(modalTitle);

        fetch(endpoint)
            .then(res => res.json())
            .then(data => {
                setData(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [type]);

    return createPortal(
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
        }}>
            <div className="glass-panel bounce-in" style={{
                width: '95%', maxWidth: '900px', height: '80vh',
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg-color)', padding: 0,
                overflow: 'hidden', border: '1px solid var(--glass-border)'
            }}>

                {/* Header */}
                <div style={{ padding: '20px 25px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-2 text-xl font-bold">
                        {type === 'issued_today' && <Clock className="text-blue-400" />}
                        {type === 'overdue' && <AlertCircle className="text-orange-400" />}
                        {type === 'lost_damaged' && <AlertTriangle className="text-red-400" />}
                        {title}
                    </div>
                    <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '0', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="spinner-lg"></div>
                        </div>
                    ) : (
                        <table className="w-full text-sm item-table">
                            <thead className="sticky top-0 bg-black/40 backdrop-blur-md z-10">
                                <tr className="text-left text-gray-400 border-b border-glass">
                                    <th className="p-4 w-16">#</th>
                                    {type === 'issued_today' && (
                                        <>
                                            <th className="p-4">Time</th>
                                            <th className="p-4">Student</th>
                                            <th className="p-4">Book Title</th>
                                            <th className="p-4">Accession</th>
                                        </>
                                    )}
                                    {type === 'overdue' && (
                                        <>
                                            <th className="p-4">Due Date</th>
                                            <th className="p-4">Student</th>
                                            <th className="p-4">Book Title</th>
                                            <th className="p-4">Accession</th>
                                        </>
                                    )}
                                    {type === 'lost_damaged' && (
                                        <>
                                            <th className="p-4">Reported On</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Book Title</th>
                                            <th className="p-4">Accession</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center p-8 text-gray-500">
                                            No records found.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item, idx) => (
                                        <tr key={idx} className="border-b border-glass hover:bg-white/5 transition-colors">
                                            <td className="p-4 opacity-50">{idx + 1}</td>

                                            {type === 'issued_today' && (
                                                <>
                                                    <td className="p-4 font-mono text-xs opacity-70">
                                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-white">{item.student}</div>
                                                        <div className="text-xs opacity-60 font-mono">{item.register_number}</div>
                                                    </td>
                                                    <td className="p-4 font-medium">{item.title}</td>
                                                    <td className="p-4 font-mono text-xs opacity-70">{item.accession_number}</td>
                                                </>
                                            )}

                                            {type === 'overdue' && (
                                                <>
                                                    <td className="p-4 text-red-300 font-medium">
                                                        {new Date(item.due_date).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-white">{item.student}</div>
                                                        <div className="text-xs opacity-60 font-mono">{item.register_number}</div>
                                                    </td>
                                                    <td className="p-4 font-medium">{item.title}</td>
                                                    <td className="p-4 font-mono text-xs opacity-70">{item.accession_number}</td>
                                                </>
                                            )}

                                            {type === 'lost_damaged' && (
                                                <>
                                                    <td className="p-4 font-mono text-xs opacity-70">
                                                        {new Date(item.date).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Lost' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                                                            }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium">{item.title}</td>
                                                    <td className="p-4 font-mono text-xs opacity-70">{item.accession_number}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DashboardDetailModal;
