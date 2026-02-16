import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User, Sun, Moon, Type, ChevronDown, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import StatusModal from '../common/StatusModal';

const Header = ({ toggleSidebar, user, onHelpClick }) => {
    const { theme, toggleTheme, fontScale, setFontScale, highContrast } = usePreferences();
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();
    const [showWarning, setShowWarning] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const profileIcon = userInfo.profile_icon || null;
    const userInitial = (user?.name || userInfo.name || 'U').charAt(0).toUpperCase();

    // Map numeric scale to labels for display/cycling
    const SCALE_MAP = {
        85: 'S',
        100: 'M',
        115: 'L',
        130: 'XL'
    };

    // Font size cycler
    const cycleFontSize = () => {
        const scales = [85, 100, 115, 130];
        let currentIdx = scales.indexOf(fontScale);
        if (currentIdx === -1) currentIdx = 1;
        const nextIndex = (currentIdx + 1) % scales.length;
        setFontScale(scales[nextIndex]);
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'kn' : 'en');
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        setShowProfileDropdown(false);
        navigate('/login');
    };

    const handleThemeToggle = () => {
        if (highContrast) {
            setShowWarning(true);
            return;
        }
        toggleTheme();
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowProfileDropdown(false);
            }
        };
        if (showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showProfileDropdown]);

    return (
        <>
            <header className="glass-header">
                {/* Left: Sidebar Toggle & Institution Name */}
                <div className="header-left">
                    <button className="icon-btn-ghost" onClick={toggleSidebar}>
                        <Menu size={24} />
                    </button>
                    <div className="ml-4">
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            {t('header.institution_name')}
                        </h2>
                    </div>
                </div>

                {/* Right: Controls & Profile */}
                <div className="header-right">
                    {/* Personalization Controls */}
                    <div className="header-controls">
                        <button className="icon-btn-sm" onClick={toggleLanguage} title={t('header.language')}>
                            <span className="control-badge" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                {language === 'en' ? 'KN' : 'EN'}
                            </span>
                        </button>
                        <button className="icon-btn-sm" onClick={cycleFontSize} title={t('header.font_size')}>
                            <Type size={18} />
                            <span className="control-badge">{SCALE_MAP[fontScale] || 'C'}</span>
                        </button>
                        <button className="icon-btn-sm" onClick={onHelpClick} title="Help (`)">
                            <HelpCircle size={18} />
                        </button>
                        <button
                            className="icon-btn-sm"
                            onClick={handleThemeToggle}
                            title={t('header.toggle_theme')}
                            style={{ color: theme === 'dark' ? '#f1c40f' : 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                        >
                            {theme === 'dark' ? <Sun size={18} fill="#f1c40f" /> : <Moon size={18} />}
                        </button>
                    </div>

                    <div className="divider-vertical"></div>

                    {/* User Profile with Dropdown */}
                    <div className="header-profile-wrapper" ref={dropdownRef}>
                        <button
                            className="header-profile-trigger"
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        >
                            <div className="header-avatar">
                                {profileIcon ? (
                                    <img src={profileIcon} alt="Profile" className="header-avatar-img" />
                                ) : (
                                    <span className="header-avatar-initial">{userInitial}</span>
                                )}
                            </div>
                            <div className="header-user-text">
                                <span className="user-name">{user?.name || userInfo.name || 'Admin'}</span>
                                <span className="user-role">{user?.role || userInfo.role || 'Profile'}</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`header-chevron ${showProfileDropdown ? 'rotated' : ''}`}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileDropdown && (
                            <div className="header-profile-dropdown animate-fade-in-down">
                                <div className="dropdown-header">
                                    <div className="dropdown-avatar">
                                        {profileIcon ? (
                                            <img src={profileIcon} alt="Profile" className="dropdown-avatar-img" />
                                        ) : (
                                            <span className="dropdown-avatar-initial">{userInitial}</span>
                                        )}
                                    </div>
                                    <div className="dropdown-user-info">
                                        <span className="dropdown-user-name">{user?.name || userInfo.name}</span>
                                        <span className="dropdown-user-email">{user?.email || userInfo.email}</span>
                                    </div>
                                </div>
                                <div className="dropdown-divider"></div>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setShowProfileDropdown(false);
                                        navigate('/dashboard/profile');
                                    }}
                                >
                                    <User size={16} />
                                    <span>View Profile</span>
                                </button>
                                <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <StatusModal
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
                type="error"
                title="Action Locked"
                message="High Contrast Mode is on. Please turn it off in Settings > Appearance to change themes."
            />
        </>
    );
};

export default Header;
