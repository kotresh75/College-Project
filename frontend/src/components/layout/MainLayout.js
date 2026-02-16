import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';


import { useTutorial } from '../../context/TutorialContext';
import '../../styles/animations.css';

const MainLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [user, setUser] = useState(null);
    const { openManual } = useTutorial();
    const location = useLocation();

    useEffect(() => {
        const storedUser = localStorage.getItem('user_info');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Scroll Reveal Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );

        // Observe all .reveal elements within dashboard content
        const revealElements = document.querySelectorAll('.reveal');
        revealElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [location.pathname]); // Re-observe on route change

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <>
            {/* TitleBar is global in App.js, do not include here */}
            <div className="dashboard-layout">
                <div className="layout-sidebar">
                    <Sidebar isCollapsed={isSidebarCollapsed} />
                </div>

                {/* Mobile Overlay Backdrop */}
                {!isSidebarCollapsed && (
                    <div
                        className="sidebar-overlay"
                        onClick={() => setIsSidebarCollapsed(true)}
                    />
                )}

                <div className={`layout-main ${isSidebarCollapsed ? 'expanded' : ''}`}>
                    <Header toggleSidebar={toggleSidebar} user={user} onHelpClick={() => openManual()} />

                    <main className="layout-scroll-container">
                        <div className="page-content page-transition" key={location.pathname}>
                            <Outlet />
                        </div>
                        <Footer />
                    </main>
                </div>
            </div>
        </>
    );
};

export default MainLayout;
