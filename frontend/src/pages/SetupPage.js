import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, Sun, Moon, Type, Globe } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useLanguage } from '../context/LanguageContext';
import logo from '../assets/logo.png';
import LogoParticles from '../components/common/LogoParticles';
import StatusModal from '../components/common/StatusModal';
import InteractiveBG from '../components/common/InteractiveBG';

const SetupPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme, fontScale, setFontScale, highContrast } = usePreferences();
    const { t, language, toggleLanguage } = useLanguage();
    const [showWarning, setShowWarning] = useState(false);

    const SCALE_MAP = { 85: 'S', 100: 'M', 115: 'L', 130: 'XL' };

    const cycleFontSize = () => {
        const scales = [85, 100, 115, 130];
        let currentIdx = scales.indexOf(fontScale);
        if (currentIdx === -1) currentIdx = 1;
        const nextIndex = (currentIdx + 1) % scales.length;
        setFontScale(scales[nextIndex]);
    };

    const handleThemeToggle = () => {
        if (highContrast) { setShowWarning(true); return; }
        toggleTheme();
    };

    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    // On mount, verify that setup is actually needed
    useEffect(() => {
        axios.get('http://localhost:17221/api/auth/setup-status')
            .then(res => {
                if (!res.data.needsSetup) {
                    navigate('/login', { replace: true });
                } else {
                    setChecking(false);
                }
            })
            .catch(() => setChecking(false));
    }, [navigate]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim()) return setError(t('auth.setup.err_name'));
        if (!form.email.trim()) return setError(t('auth.setup.err_email'));
        if (form.password.length < 6) return setError(t('auth.setup.err_password'));
        if (form.password !== form.confirmPassword) return setError(t('auth.setup.err_mismatch'));

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:17221/api/auth/setup', {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password
            });

            const { token, user } = response.data;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_info', JSON.stringify(user));
            navigate('/dashboard', { replace: true });
        } catch (err) {
            if (err.response) {
                setError(err.response.data.error || t('auth.setup.err_failed'));
            } else {
                setError(t('auth.setup.err_server'));
            }
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="login-container">
                <InteractiveBG />
                <div className="login-card glass-panel bounce-in" style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div className="spinner-sm" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>{t('auth.setup.checking')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <InteractiveBG />

            {/* Top Right Controls */}
            <div className="login-controls">
                <button className="icon-btn" onClick={toggleLanguage} title={t('header.language')}>
                    <Globe size={18} />
                    <span className="lang-code">{language === 'en' ? 'KN' : 'EN'}</span>
                </button>
                <button className="icon-btn" onClick={cycleFontSize} title={t('header.font_size')}>
                    <Type size={18} />
                    <span className="lang-code">{SCALE_MAP[fontScale] || 'C'}</span>
                </button>
                <button className="icon-btn" onClick={handleThemeToggle} title={t('header.toggle_theme')}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <div className="login-card glass-panel bounce-in" style={{ maxWidth: '460px' }}>
                <LogoParticles
                    logoSrc={logo}
                    title={t('auth.setup.title')}
                    subtitle={t('auth.setup.subtitle')}
                    compact
                    titleIcon={<ShieldCheck size={24} style={{ color: 'var(--accent-primary)' }} />}
                />

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <User className="input-icon" size={20} />
                        <input
                            type="text"
                            name="name"
                            placeholder={t('auth.setup.name_placeholder')}
                            value={form.name}
                            onChange={handleChange}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <Mail className="input-icon" size={20} />
                        <input
                            type="email"
                            name="email"
                            placeholder={t('auth.setup.email_placeholder')}
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder={t('auth.setup.password_placeholder')}
                            value={form.password}
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

                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            name="confirmPassword"
                            placeholder={t('auth.setup.confirm_placeholder')}
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && (
                        <div className="error-banner">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {error}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="login-btn primary-glass-btn" disabled={loading}>
                        {loading ? <div className="spinner-sm" /> : (
                            <>
                                <span>{t('auth.setup.submit_btn')}</span>
                                <ShieldCheck size={20} className="ml-2" />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <StatusModal
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
                type="error"
                title={t('landing.action_locked')}
                message={t('landing.high_contrast_warning')}
            />
        </div>
    );
};

export default SetupPage;
