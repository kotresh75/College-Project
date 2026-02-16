import React, { useState } from 'react';
import { ArrowLeftRight, BookOpen, RefreshCcw, IndianRupee } from 'lucide-react';
import IssueTab from '../components/circulation/IssueTab';
import ReturnTab from '../components/circulation/ReturnTab';
import FinesTab from '../components/circulation/FinesTab';
import { useLanguage } from '../context/LanguageContext';
import { useTutorial } from '../context/TutorialContext';

import { useLocation } from 'react-router-dom';

const CirculationPage = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('issue');
    const { t } = useLanguage();
    const { setPageContext } = useTutorial();


    // Handle Route Navigation State
    React.useEffect(() => {
        setPageContext('circulation');
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    // Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                setActiveTab('issue');
            } else if (e.key === 'F2') {
                e.preventDefault();
                setActiveTab('return');
            } else if (e.key === 'F3') {
                e.preventDefault();
                setActiveTab('fines');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="dashboard-content flex flex-col">

            {/* Header / Tab Switcher */}
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h1 className="page-title mb-1">
                        <ArrowLeftRight size={24} className="text-info" /> {t('circulation.title')}
                    </h1>

                </div>

                <div className="glass-panel flex gap-1 p-1 rounded-full">
                    <button
                        onClick={() => setActiveTab('issue')}
                        title="Shortcut: F1"
                        className={`btn rounded-full flex items-center gap-2 ${activeTab === 'issue' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <BookOpen size={18} /> {t('circulation.tab_issue')}
                    </button>
                    <button
                        onClick={() => setActiveTab('return')}
                        title="Shortcut: F2"
                        className={`btn rounded-full flex items-center gap-2 ${activeTab === 'return' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <RefreshCcw size={18} /> {t('circulation.tab_return')}
                    </button>
                    <button
                        onClick={() => setActiveTab('fines')}
                        title="Shortcut: F3"
                        className={`btn rounded-full flex items-center gap-2 ${activeTab === 'fines' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <IndianRupee size={18} /> {t('circulation.tab_fines')}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
                {activeTab === 'issue' ? <IssueTab /> : activeTab === 'return' ? <ReturnTab /> : <FinesTab initialTab={location.state?.fineSubTab} />}
            </div>

        </div>
    );
};

export default CirculationPage;
