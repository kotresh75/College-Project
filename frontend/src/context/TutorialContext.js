import React, { createContext, useContext, useState, useEffect } from 'react';

const TutorialContext = createContext();

export const useTutorial = () => {
    return useContext(TutorialContext);
};

export const TutorialProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState('intro');
    const [contextSectionId, setContextSectionId] = useState('intro'); // Default context

    // Function to open manual, optionally to a specific section
    const openManual = (sectionId = null) => {
        if (sectionId) {
            setActiveSectionId(sectionId);
        } else {
            // Open to current context if no specific section requested
            setActiveSectionId(contextSectionId);
        }
        setIsOpen(true);
    };

    const closeManual = () => {
        setIsOpen(false);
    };

    // Function for pages to set their relevant manual section
    const setPageContext = (sectionId) => {
        setContextSectionId(sectionId);
    };

    // Global F1 Key Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === '`' || e.code === 'Backquote') {
                e.preventDefault();
                openManual(contextSectionId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [contextSectionId]); // Re-bind when context changes

    return (
        <TutorialContext.Provider value={{
            isOpen,
            openManual,
            closeManual,
            activeSectionId,
            setActiveSectionId,
            setPageContext
        }}>
            {children}
        </TutorialContext.Provider>
    );
};
