import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    User, Mail, Shield, Lock, Save, CheckCircle, AlertCircle,
    Key, Camera, Briefcase, Hash, X
} from 'lucide-react';
import '../styles/pages/ProfileStyles.css';

const TOTAL_ICONS = 15;

const UserProfile = () => {
    const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('user_info') || '{}'));
    const [passData, setPassData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconLoading, setIconLoading] = useState(false);

    const profileIcon = userInfo.profile_icon || `/profile-icons/profile_icon_${Math.floor(Math.random() * 15) + 1}.png`;
    const userInitial = (userInfo.name || 'U').charAt(0).toUpperCase();

    const handleChange = (e) => {
        setPassData({ ...passData, [e.target.name]: e.target.value });
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        if (passData.newPassword !== passData.confirmPassword) {
            setStatus({ type: 'error', message: 'New passwords do not match' });
            return;
        }
        if (passData.newPassword.length < 6) {
            setStatus({ type: 'error', message: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            await axios.post('http://localhost:17221/api/auth/change-password', {
                oldPassword: passData.oldPassword,
                newPassword: passData.newPassword
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setStatus({ type: 'success', message: 'Password changed successfully!' });
            setPassData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to change password' });
        } finally {
            setLoading(false);
        }
    };

    const handleIconSelect = async (iconPath) => {
        setIconLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            await axios.put('http://localhost:17221/api/auth/profile-icon', {
                profileIcon: iconPath
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Update localStorage
            const updated = { ...userInfo, profile_icon: iconPath };
            localStorage.setItem('user_info', JSON.stringify(updated));
            setUserInfo(updated);
            setShowIconPicker(false);
        } catch (err) {
            console.error('Failed to update icon:', err);
        } finally {
            setIconLoading(false);
        }
    };

    return (
        <div className="profile-page dashboard-content">

            {/* Profile Hero Card */}
            <div className="profile-hero glass-card animate-fade-in-up">
                <div className="profile-hero-content">
                    <div className="profile-avatar-wrapper" onClick={() => setShowIconPicker(true)}>
                        <div className="profile-avatar-large">
                            {profileIcon ? (
                                <img src={profileIcon} alt="Profile" className="profile-avatar-img" />
                            ) : (
                                <span className="profile-avatar-initial">{userInitial}</span>
                            )}
                        </div>
                        <div className="profile-avatar-overlay">
                            <Camera size={20} />
                            <span>Change</span>
                        </div>
                    </div>
                    <div className="profile-hero-info">
                        <h1 className="profile-hero-name">{userInfo.name || 'User Name'}</h1>
                        <span className="profile-role-badge">
                            <Shield size={14} />
                            {userInfo.role || 'Staff'}
                        </span>
                        {userInfo.department && (
                            <span className="profile-department">
                                <Briefcase size={14} />
                                {userInfo.department}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Icon Picker Modal */}
            {showIconPicker && (
                <div className="icon-picker-backdrop" onClick={() => setShowIconPicker(false)}>
                    <div className="icon-picker-modal glass-card animate-bounce-in" onClick={(e) => e.stopPropagation()}>
                        <div className="icon-picker-header">
                            <h3>Choose Your Avatar</h3>
                            <button className="icon-picker-close" onClick={() => setShowIconPicker(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="icon-picker-grid">
                            {Array.from({ length: TOTAL_ICONS }, (_, i) => {
                                const iconPath = `/profile-icons/profile_icon_${i + 1}.png`;
                                const isActive = profileIcon === iconPath;
                                return (
                                    <button
                                        key={i}
                                        className={`icon-picker-item ${isActive ? 'active' : ''}`}
                                        onClick={() => handleIconSelect(iconPath)}
                                        disabled={iconLoading}
                                    >
                                        <img src={iconPath} alt={`Icon ${i + 1}`} />
                                        {isActive && <div className="icon-picker-check"><CheckCircle size={16} /></div>}
                                    </button>
                                );
                            })}
                        </div>
                        {iconLoading && <div className="icon-picker-loading">Updating...</div>}
                    </div>
                </div>
            )}

            {/* Two-Column Content */}
            <div className="profile-grid">

                {/* Account Details Card */}
                <div className="profile-card glass-card animate-fade-in-up">
                    <div className="profile-card-header">
                        <User size={20} className="profile-card-icon" />
                        <h2>Account Details</h2>
                    </div>
                    <div className="profile-details-list">
                        <div className="profile-detail-row">
                            <div className="profile-detail-label">
                                <User size={16} />
                                <span>Full Name</span>
                            </div>
                            <span className="profile-detail-value">{userInfo.name || '—'}</span>
                        </div>
                        <div className="profile-detail-row">
                            <div className="profile-detail-label">
                                <Mail size={16} />
                                <span>Email Address</span>
                            </div>
                            <span className="profile-detail-value">{userInfo.email || '—'}</span>
                        </div>
                        <div className="profile-detail-row">
                            <div className="profile-detail-label">
                                <Shield size={16} />
                                <span>Role</span>
                            </div>
                            <span className="profile-detail-badge">{userInfo.role || '—'}</span>
                        </div>
                        {userInfo.department && (
                            <div className="profile-detail-row">
                                <div className="profile-detail-label">
                                    <Briefcase size={16} />
                                    <span>Department</span>
                                </div>
                                <span className="profile-detail-value">{userInfo.department}</span>
                            </div>
                        )}
                        <div className="profile-detail-row">
                            <div className="profile-detail-label">
                                <Hash size={16} />
                                <span>Member ID</span>
                            </div>
                            <span className="profile-detail-mono">{userInfo.id ? userInfo.id.substring(0, 8).toUpperCase() : '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Security Card */}
                <div className="profile-card glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="profile-card-header">
                        <Shield size={20} className="profile-card-icon" />
                        <h2>Security</h2>
                    </div>
                    <p className="profile-card-subtitle">Update your password to keep your account secure.</p>

                    {status.message && (
                        <div className={`profile-alert ${status.type === 'success' ? 'profile-alert-success' : 'profile-alert-error'}`}>
                            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            <span>{status.message}</span>
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="profile-security-form">
                        <div className="profile-input-group">
                            <label>Current Password</label>
                            <div className="profile-input-wrapper">
                                <Key size={18} className="profile-input-icon" />
                                <input
                                    type="password"
                                    name="oldPassword"
                                    value={passData.oldPassword}
                                    onChange={handleChange}
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="profile-input-row">
                            <div className="profile-input-group">
                                <label>New Password</label>
                                <div className="profile-input-wrapper">
                                    <Lock size={18} className="profile-input-icon" />
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passData.newPassword}
                                        onChange={handleChange}
                                        placeholder="Min 6 characters"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="profile-input-group">
                                <label>Confirm Password</label>
                                <div className="profile-input-wrapper">
                                    <CheckCircle size={18} className="profile-input-icon" />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Re-enter password"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="profile-form-actions">
                            <button
                                type="submit"
                                disabled={loading}
                                className="profile-save-btn"
                            >
                                {loading ? (
                                    <span className="profile-btn-loading">Updating...</span>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>Update Password</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
