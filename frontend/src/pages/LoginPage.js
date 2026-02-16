import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, LogIn, Sun, Moon, Type, Globe, ArrowLeft } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useLanguage } from '../context/LanguageContext';
import logo from '../assets/logo.png';
import LogoParticles from '../components/common/LogoParticles';
import InteractiveBG from '../components/common/InteractiveBG';

import StatusModal from '../components/common/StatusModal';

const LoginPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme, fontScale, setFontScale, highContrast } = usePreferences();
    const { t, language, toggleLanguage } = useLanguage();
    const [showWarning, setShowWarning] = useState(false);

    // Map numeric scale to labels
    const SCALE_MAP = { 85: 'S', 100: 'M', 115: 'L', 130: 'XL' };

    // Helper to cycle font sizes
    const cycleFontSize = () => {
        const scales = [85, 100, 115, 130];
        let currentIdx = scales.indexOf(fontScale);
        if (currentIdx === -1) currentIdx = 1;
        const nextIndex = (currentIdx + 1) % scales.length;
        setFontScale(scales[nextIndex]);
    };

    const handleThemeToggle = () => {
        if (highContrast) {
            setShowWarning(true);
            return;
        }
        toggleTheme();
    };

    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [fieldError, setFieldError] = useState(''); // 'email' or 'password'
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        setError('');
        setFieldError('');
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setFieldError('');

        try {
            const response = await axios.post('http://localhost:17221/api/auth/login', credentials);

            // Success
            const { token, user } = response.data;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_info', JSON.stringify(user));

            navigate('/dashboard');
        } catch (err) {
            triggerShake();
            if (err.response) {
                const { message, error_code, field } = err.response.data;
                // Use backend message or map codes if needed
                setError(message || 'Login failed');

                // Highlight specific field if provided
                if (field) {
                    setFieldError(field);
                } else if (error_code === 'ERR_WRONG_PASSWORD') {
                    setFieldError('password');
                } else if (error_code === 'ERR_USER_NOT_FOUND') {
                    setFieldError('email');
                }

                // If specific error code available, we can append it or use it for specialized UI if needed
                // setError(`${message} (${error_code || 'ERR_AUTH'})`);
            } else {
                setError('Server unreachable. Check connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <InteractiveBG />

            {/* Top Right Controls */}
            <div className="login-controls">
                {/* Back Button */}
                <button className="icon-btn" onClick={() => navigate('/')} title={t('common.back') || "Go Back"}>
                    <ArrowLeft size={18} />
                    <span className="lang-code" style={{ fontSize: '0.9rem', marginLeft: '5px' }}>{t('common.back') || "Back"}</span>
                </button>

                {/* Language Toggle */}
                <button className="icon-btn" onClick={toggleLanguage} title="Switch Language">
                    <Globe size={18} />
                    <span className="lang-code">{language === 'en' ? 'KN' : 'EN'}</span>
                </button>

                {/* Font Size Toggle */}
                <button className="icon-btn" onClick={cycleFontSize} title={t('change_font_size')}>
                    <Type size={18} />
                    <span className="lang-code">{SCALE_MAP[fontScale] || 'C'}</span>
                </button>

                {/* Theme Toggle */}
                <button className="icon-btn" onClick={handleThemeToggle} title={t('toggle_theme')}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <div className="login-card glass-panel bounce-in">

                <LogoParticles
                    logoSrc={logo}
                    title={t('auth.welcome_back')}
                    subtitle={t('auth.sign_in_subtitle')}
                    compact
                />

                <form onSubmit={handleSubmit} className="login-form">

                    <div className={`input-group ${fieldError === 'email' ? 'error-glow' : ''} ${shake && fieldError === 'email' ? 'shake-animation' : ''}`}>
                        <Mail className={`input-icon ${fieldError === 'email' ? 'text-red-400' : ''}`} size={20} />
                        <input
                            type="email"
                            name="email"
                            placeholder={t('auth.email_placeholder')}
                            value={credentials.email}
                            onChange={handleChange}
                            required
                            autoFocus
                        />
                    </div>

                    <div className={`input-group ${fieldError === 'password' ? 'error-glow' : ''} ${shake && fieldError === 'password' ? 'shake-animation' : ''}`}>
                        <Lock className={`input-icon ${fieldError === 'password' ? 'text-red-400' : ''}`} size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder={t('auth.password_placeholder')}
                            value={credentials.password}
                            onChange={handleChange}
                            required
                        />
                        <button
                            type="button"
                            className="toggle-eye"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex="-1"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <div className={`error-banner ${shake && !fieldError ? 'shake-animation' : ''}`}>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {error}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="login-btn primary-glass-btn" disabled={loading}>
                        {loading ? <div className="spinner-sm"></div> : (
                            <>
                                <span>{t('auth.sign_in_btn')}</span>
                                <LogIn size={20} className="ml-2" />
                            </>
                        )}
                    </button>

                    <div className="forgot-password">
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}>
                            {t('auth.forgot_password')}
                        </a>
                    </div>

                </form>
            </div>

            <StatusModal
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
                type="error"
                title={t('action_locked')}
                message={t('high_contrast_warning')}
            />
        </div>
    );
};

export default LoginPage;
