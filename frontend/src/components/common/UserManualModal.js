import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { X, Search, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '../../context/TutorialContext';
import { getUserManualData } from '../../data/userManual';
import '../../styles/components/user-manual.css';

const UserManualModal = () => {
    const { t } = useTranslation();
    const { isOpen, closeManual, activeSectionId, setActiveSectionId } = useTutorial();
    const contentRef = useRef(null);
    const searchRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch data inside component to ensure Trans components are refreshed
    const userManualData = useMemo(() => getUserManualData(), [t]);

    // Filter sections by search
    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return userManualData;
        const q = searchQuery.toLowerCase();
        return userManualData.filter(s =>
            s.title.toLowerCase().includes(q) ||
            (s.searchKeywords && s.searchKeywords.some(k => k.toLowerCase().includes(q)))
        );
    }, [searchQuery]);

    // Current section
    const activeSection = useMemo(() => {
        return userManualData.find(s => s.id === activeSectionId) || userManualData[0];
    }, [activeSectionId]);

    // Current index in full list (for prev/next)
    const currentIndex = useMemo(() => {
        return userManualData.findIndex(s => s.id === activeSectionId);
    }, [activeSectionId]);

    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < userManualData.length - 1;

    const goToPrev = useCallback(() => {
        if (canGoPrev) {
            setActiveSectionId(userManualData[currentIndex - 1].id);
        }
    }, [canGoPrev, currentIndex, setActiveSectionId]);

    const goToNext = useCallback(() => {
        if (canGoNext) {
            setActiveSectionId(userManualData[currentIndex + 1].id);
        }
    }, [canGoNext, currentIndex, setActiveSectionId]);

    // Keyboard: Escape to close, Arrow keys to nav
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeManual();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                if (document.activeElement !== searchRef.current) {
                    e.preventDefault();
                    goToPrev();
                }
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                if (document.activeElement !== searchRef.current) {
                    e.preventDefault();
                    goToNext();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeManual, goToPrev, goToNext]);

    // Scroll to top when section changes
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [activeSectionId]);

    // Focus search on open
    useEffect(() => {
        if (isOpen && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 100);
        }
        if (isOpen) setSearchQuery('');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="um-overlay" onClick={closeManual}>
            <div className="um-modal" onClick={e => e.stopPropagation()}>

                {/* ── Sidebar ── */}
                <div className="um-sidebar">
                    <div className="um-sidebar-header">
                        <div className="um-sidebar-title">
                            <div className="um-sidebar-title-icon">
                                <BookOpen size={18} />
                            </div>
                            {t('manual.title')}
                        </div>
                        <div className="um-search-wrap">
                            <Search size={14} />
                            <input
                                ref={searchRef}
                                className="um-search"
                                type="text"
                                placeholder={t('manual.search_placeholder')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="um-nav">
                        {filteredSections.length === 0 ? (
                            <div className="um-nav-empty">{t('manual.no_results')}</div>
                        ) : (
                            filteredSections.map(section => (
                                <button
                                    key={section.id}
                                    className={`um-nav-item ${activeSectionId === section.id ? 'active' : ''}`}
                                    onClick={() => setActiveSectionId(section.id)}
                                >
                                    <div className="um-nav-icon">
                                        {section.icon}
                                    </div>
                                    <span>{section.title}</span>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="um-sidebar-footer">
                        {t('manual.navigation_help')}
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="um-content">
                    <div className="um-content-header">
                        <div className="um-content-title">
                            <div className="um-content-title-icon">
                                {activeSection.icon}
                            </div>
                            {activeSection.title}
                        </div>
                        <button className="um-close-btn" onClick={closeManual} title="Close (Esc)">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="um-content-body" ref={contentRef} key={activeSectionId}>
                        <div className="um-article">
                            {activeSection.content}
                        </div>
                    </div>

                    <div className="um-content-footer">
                        <button
                            className="um-nav-btn"
                            onClick={goToPrev}
                            disabled={!canGoPrev}
                        >
                            <ChevronLeft size={14} />
                            {t('manual.previous')}
                        </button>
                        <span className="um-page-indicator">
                            {currentIndex + 1} / {userManualData.length}
                        </span>
                        <button
                            className="um-nav-btn"
                            onClick={goToNext}
                            disabled={!canGoNext}
                        >
                            {t('manual.next')}
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManualModal;
