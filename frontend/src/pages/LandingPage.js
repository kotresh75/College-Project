import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Type, LogIn, Globe, Info } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useLanguage } from '../context/LanguageContext';
import logo from '../assets/logo.png';
import StatusModal from '../components/common/StatusModal';
import LogoParticles from '../components/common/LogoParticles';
import InteractiveBG from '../components/common/InteractiveBG';

const LandingPage = () => {
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

    return (
        <div className="landing-container">
            {/* Interactive Background Animation Layer */}
            <InteractiveBG />

            {/* Main Content Layout */}
            <div className="landing-panel glass-panel">

                {/* 1. Top Navigation Bar */}
                <header className="landing-header">
                    <div className="logo-section">
                        <img src={logo} alt="College Logo" className="college-logo" />
                        <div className="brand-info">
                            <span className="brand-name">GPTK LMS</span>
                            <span className="brand-tagline">v1.0.0</span>
                        </div>
                    </div>

                    <div className="header-actions flex gap-2">
                        {/* Language Toggle */}
                        <button className="icon-btn" onClick={toggleLanguage} title="Switch Language">
                            <Globe size={18} />
                            <span className="lang-code">{language === 'en' ? 'KN' : 'EN'}</span>
                        </button>

                        {/* Font Size Toggle */}
                        <button className="icon-btn" onClick={cycleFontSize} title={t('landing.change_font_size') || "Change Font Size"}>
                            <Type size={18} />
                            <span className="lang-code">{SCALE_MAP[fontScale] || 'C'}</span>
                        </button>

                        {/* About Project Button */}
                        <button className="icon-btn" onClick={() => navigate('/about')} title="About Project">
                            <Info size={18} />
                        </button>

                        {/* Theme Toggle */}
                        <button className="icon-btn" onClick={handleThemeToggle} title={t('landing.toggle_theme') || "Toggle Theme"}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                {/* 2. Hero Content */}
                <main className="landing-hero">
                    <LogoParticles
                        logoSrc={logo}
                        title={t('landing.welcome')}
                        subtitle={t('landing.subtitle')}
                        hideLogo
                    />

                    <p className="hero-description">
                        {t('landing.description')}
                    </p>

                    {/* 3. Call to Action */}
                    <div className="cta-section">
                        <button className="primary-glass-btn" onClick={() => navigate('/login')}>
                            <span className="flex items-center gap-2">
                                {t('landing.access_portal')} <LogIn size={20} />
                            </span>
                        </button>
                        <p className="login-hint">
                            {t('landing.restricted_msg')}
                        </p>
                    </div>
                </main>

                <footer className="landing-footer">
                    <p className="copyright">{t('landing.copyright').replace('{year}', new Date().getFullYear())}</p>
                </footer>
            </div>

            <StatusModal
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
                type="error"
                title={t('landing.action_locked') || "Action Locked"}
                message={t('landing.high_contrast_warning') || "High Contrast Mode is on. Please turn it off in Settings > Appearance to change themes."}
            />
        </div>
    );
};

export default LandingPage;
