import { formatDate } from '../../utils/dateUtils';
import { Mail, Phone, Edit2, Trash2, Shield, Activity, Lock, ToggleLeft, ToggleRight } from 'lucide-react';

const AdminCard = ({ admin, onEdit, onToggleStatus, onDelete, onResetPassword }) => {
    const isActive = admin.status === 'Active';
    const isRoot = !!admin.is_founder;

    return (
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', borderTop: isRoot ? '3px solid #f6e05e' : '1px solid var(--glass-border)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: isRoot ? 'linear-gradient(135deg, #f6e05e 0%, #d69e2e 100%)' : 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isRoot ? '#000' : 'var(--text-main)'
                    }}>
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{admin.name}</h3>
                        <span style={{ fontSize: '0.8rem', color: isRoot ? '#f6e05e' : 'var(--text-secondary)' }}>
                            {isRoot ? 'Root Administrator' : 'System Administrator'}
                        </span>
                    </div>
                </div>
                <div style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                    background: isActive ? 'rgba(72, 187, 120, 0.2)' : 'rgba(252, 129, 129, 0.2)',
                    color: isActive ? '#48bb78' : '#fc8181', border: `1px solid ${isActive ? '#48bb78' : '#fc8181'}`
                }}>
                    {admin.status}
                </div>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Mail size={16} /> {admin.email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Phone size={16} /> {admin.phone || 'N/A'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Activity size={16} /> Last Login: {formatDate(admin.last_login, true)}
                </div>
            </div>

            {/* Actions */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {!isRoot && (
                    <>
                        <button
                            className="icon-btn"
                            style={{ color: isActive ? '#fc8181' : '#48bb78' }}
                            title={isActive ? "Disable Admin" : "Enable Admin"}
                            onClick={() => onToggleStatus(admin)}
                        >
                            {isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button className="icon-btn" title="Reset Password" onClick={() => onResetPassword(admin)}>
                            <Lock size={18} />
                        </button>
                    </>
                )}
                <button className="icon-btn" title="Edit Details" onClick={() => onEdit(admin)}>
                    <Edit2 size={18} />
                </button>
                {!isRoot && (
                    <button className="icon-btn danger-hover" title="Delete Admin" onClick={() => onDelete(admin)}>
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default AdminCard;
