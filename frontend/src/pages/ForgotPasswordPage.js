import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useLanguage } from '../context/LanguageContext';
import InteractiveBG from '../components/common/InteractiveBG';

const ForgotPasswordPage = () => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { theme } = usePreferences();
    const { t, language } = useLanguage();

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const res = await fetch('http://localhost:17221/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(2);
                setMessage(t('auth.otp_sent'));
            } else {
                if (data.error_code === 'ERR_EMAIL_DISABLED') {
                    setError("Email services are disabled for security purposes.");
                } else {
                    setError((data.message || 'Failed to send OTP') + " (ERR_AUTH_OTP_SEND)");
                }
            }
        } catch (err) {
            setError('Network error (ERR_NET_OTP)');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:17221/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(3);
                setMessage(t('auth.otp_verified'));
            } else {
                setError((data.message || 'Invalid OTP') + " (ERR_AUTH_OTP_INV)");
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError(t('auth.passwords_mismatch') + " (ERR_VAL_PWD_MATCH)");
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:17221/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(t('auth.pwd_reset_success'));
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError((data.message || 'Reset failed') + " (ERR_AUTH_RST_FAIL)");
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Interactive Background */}
            <InteractiveBG />

            <div className="login-card glass-panel bounce-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <KeyRound size={32} className="text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold">{t('auth.reset_password_title')}</h2>
                    <p className="text-gray-400 text-sm mt-2">
                        {step === 1 && t('auth.email_step_desc')}
                        {step === 2 && t('auth.otp_step_desc')}
                        {step === 3 && t('auth.new_pwd_step_desc')}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-sm flex items-center gap-2 animate-shake">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}
                {message && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded text-green-200 text-sm flex items-center gap-2">
                        <CheckCircle size={16} /> {message}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleEmailSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm text-gray-400 mb-2">{t('auth.email_label')}</label>
                            <div className="input-group">
                                <Mail className="input-icon" size={20} />
                                <input
                                    type="email"
                                    required
                                    placeholder={t('auth.email_placeholder')}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <button type="submit" className="primary-glass-btn w-full justify-center" disabled={loading}>
                            {loading ? t('auth.sending_btn') : t('auth.send_otp_btn')}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleOtpSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm text-gray-400 mb-2">{t('auth.otp_label')}</label>
                            <input
                                type="text"
                                required
                                maxLength="6"
                                className="glass-input w-full text-center text-2xl tracking-widest"
                                placeholder="• • • • • •"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="primary-glass-btn w-full justify-center" disabled={loading}>
                            {loading ? t('auth.verifying_btn') : t('auth.verify_otp_btn')}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handlePasswordReset}>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">{t('auth.new_pwd_label')}</label>
                            <div className="input-group">
                                <KeyRound className="input-icon" size={20} />
                                <input
                                    type="password"
                                    required
                                    minLength="6"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm text-gray-400 mb-2">{t('auth.confirm_pwd_label')}</label>
                            <div className="input-group">
                                <KeyRound className="input-icon" size={20} />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <button type="submit" className="primary-glass-btn w-full justify-center" disabled={loading}>
                            {loading ? t('auth.resetting_btn') : t('auth.reset_pwd_btn')}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1">
                        {t('auth.back_to_login')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
