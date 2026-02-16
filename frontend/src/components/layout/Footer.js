import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="glass-footer">
            <div className="footer-content">
                <span className="footer-copy">
                    © {new Date().getFullYear()} GPTK Library Management System
                </span>
                <span className="footer-dot">•</span>
                <span className="footer-made">
                    Made with <Heart size={12} className="footer-heart" /> by GPTK
                </span>
                <span className="footer-dot">•</span>
                <span className="footer-version">v1.0.0</span>
            </div>
        </footer>
    );
};

export default Footer;
