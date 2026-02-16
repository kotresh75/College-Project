import React from 'react';
import { Trans } from 'react-i18next';
// Replaced individual image imports with grouped import
import * as ManualImages from '../assets/manual';

import {
    BookOpen, Users, DollarSign, LayoutDashboard, Settings, FileText,
    Layers, ShieldCheck, HelpCircle, Building, UserCog, Keyboard,
    Globe, Lightbulb, AlertTriangle, Info, Eye, Activity,
    Book, Repeat, Mail, Lock, Search, Filter, Plus, Upload, Download, RefreshCcw, IndianRupee, CreditCard, User, ScanLine, ArrowRight
} from 'lucide-react';

// This file is now refactored to be a hook or function to support dynamic translation updates
// Moving content to a component-based structure or hook is better, but to minimize changes,
// we will export a function that returns the data, and call it inside the component.

// This file is now refactored to be a hook or function to support dynamic translation updates
// Moving content to a component-based structure or hook is better, but to minimize changes,
// we will export a function that returns the data, and call it inside the component.

export function getUserManualData() {
    return [
        {
            id: 'intro',
            title: <Trans i18nKey="manual.intro.title" />,
            icon: <HelpCircle size={16} />,
            searchKeywords: ['welcome', 'about', 'overview', 'features', 'offline', 'barcode'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.intro.header" /></h3>
                    <p>
                        <Trans i18nKey="manual.intro.desc" components={{ 1: <strong /> }} />
                    </p>

                    <div className="um-callout tip">
                        <Trans i18nKey="manual.intro.tip_release" components={{ 1: <strong /> }} />
                    </div>

                    <h4><Trans i18nKey="manual.intro.core_title" /></h4>
                    <p><Trans i18nKey="manual.intro.core_desc" /></p>
                    <ul>
                        <li><Trans i18nKey="manual.intro.core_catalog" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.intro.core_circ" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.intro.core_admin" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.intro.core_finance" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.intro.core_insights" components={{ 1: <strong /> }} /></li>
                    </ul>

                    <h4><Trans i18nKey="manual.intro.nav_title" /></h4>
                    <p><Trans i18nKey="manual.intro.nav_desc" /></p>
                    <ul>
                        <li><Trans i18nKey="manual.intro.nav_sidebar" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.intro.nav_dash" components={{ 1: <strong /> }} /></li>
                    </ul>

                    {/* Dashboard Mock (Exact Replication) */}
                    <div className="um-mock-window" style={{ display: 'flex', marginTop: '20px' }}>
                        <div className="um-mock-sidebar">
                            <div className="um-mock-sidebar-item active">
                                <LayoutDashboard size={20} color="#fff" style={{ margin: 8 }} />
                            </div>
                            <div className="um-mock-sidebar-item">
                                <Layers size={20} color="rgba(255,255,255,0.5)" style={{ margin: 8 }} />
                            </div>
                            <div className="um-mock-sidebar-item">
                                <Users size={20} color="rgba(255,255,255,0.5)" style={{ margin: 8 }} />
                            </div>
                        </div >
                        <div style={{ flex: 1, paddingLeft: 20 }}>
                            <div className="um-mock-header">
                                <div className="um-mock-title"><Trans i18nKey="manual.intro.dash_overview" /></div>
                                <div className="um-mock-flex" style={{ gap: 8 }}>
                                    <div className="um-mock-dot"></div>
                                    <div className="um-mock-dot"></div>
                                </div>
                            </div>
                            <div className="um-mock-grid">
                                <div className="um-mock-card blue">
                                    <div className="um-mock-icon-circle" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                                        <Book size={18} color="#3b82f6" />
                                    </div>
                                    <div className="um-mock-card-val">5,200</div>
                                    <div className="um-mock-card-lbl"><Trans i18nKey="manual.intro.total_books" /></div>
                                </div>
                                <div className="um-mock-card purple">
                                    <div className="um-mock-icon-circle" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                                        <Users size={18} color="#8b5cf6" />
                                    </div>
                                    <div className="um-mock-card-val">850</div>
                                    <div className="um-mock-card-lbl"><Trans i18nKey="manual.intro.total_students" /></div>
                                </div>
                                <div className="um-mock-card green">
                                    <div className="um-mock-icon-circle" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                                        <Repeat size={18} color="#10b981" />
                                    </div>
                                    <div className="um-mock-card-val">150</div>
                                    <div className="um-mock-card-lbl"><Trans i18nKey="manual.intro.issued_today" /></div>
                                </div>
                            </div>
                            {/* Fake Chart Area */}
                            <div style={{ marginTop: 20, height: 100, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-end', padding: '0 20px 10px 20px', gap: 15 }}>
                                <div style={{ flex: 1, height: '40%', background: '#3b82f6', borderRadius: '4px 4px 0 0', opacity: 0.5 }}></div>
                                <div style={{ flex: 1, height: '70%', background: '#8b5cf6', borderRadius: '4px 4px 0 0', opacity: 0.6 }}></div>
                                <div style={{ flex: 1, height: '55%', background: '#10b981', borderRadius: '4px 4px 0 0', opacity: 0.8 }}></div>
                                <div style={{ flex: 1, height: '85%', background: '#f97316', borderRadius: '4px 4px 0 0' }}></div>
                            </div>
                        </div>
                    </div >
                    <div className="um-caption"><Trans i18nKey="manual.intro.fig_dash" /></div>
                </div >
            )
        }
        ,
        {
            id: 'getting-started',
            title: <Trans i18nKey="manual.auth.title" />,
            icon: <ShieldCheck size={16} />,
            searchKeywords: ['login', 'password', 'setup', 'launch', 'forgot', 'otp', 'email', 'credentials', 'reset'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.auth.header" /></h3>
                    <p><Trans i18nKey="manual.auth.desc" /></p>

                    <div className="um-callout info">
                        <Trans i18nKey="manual.auth.sec_note" components={{ 1: <strong /> }} />
                    </div>

                    <h4><Trans i18nKey="manual.auth.rbac_title" /></h4>
                    <p>
                        <Trans i18nKey="manual.auth.rbac_desc" components={{ 1: <strong /> }} />
                    </p>
                    <ul className="check-list">
                        <li><Trans i18nKey="manual.auth.role_admin" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.auth.role_staff" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.auth.role_lib" components={{ 1: <strong /> }} /></li>
                    </ul>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', margin: '20px 0' }}>
                        <div className="um-content-image-wrapper" style={{ flex: 1, margin: 0 }}>
                            <img src={ManualImages.loginPageImg} alt="Login Screen" style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption"><Trans i18nKey="manual.auth.fig_login" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p><Trans i18nKey="manual.auth.smart_feat" components={{ 1: <strong /> }} /></p>
                            <ul>
                                <li><Trans i18nKey="manual.auth.feat_lock" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.auth.feat_show" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.auth.feat_enter" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.auth.otp_title" /></h4>
                    <p><Trans i18nKey="manual.auth.otp_desc" /></p>

                    <div className="um-step-card">
                        <h5><Trans i18nKey="manual.auth.rec_flow" /></h5>
                        <ol>
                            <li><Trans i18nKey="manual.auth.step_click" components={{ 1: <strong /> }} /></li>
                            <li><Trans i18nKey="manual.auth.step_enter" components={{ 1: <strong /> }} /></li>
                            <li><Trans i18nKey="manual.auth.step_otp" components={{ 1: <strong /> }} /></li>
                            <li><Trans i18nKey="manual.auth.step_new" components={{ 1: <strong /> }} /></li>
                        </ol>
                    </div>

                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.forgotPasswordImg} alt="Forgot Password" style={{ maxWidth: '600px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.auth.fig_reset" /></div>
                    </div>
                </div>
            )
        }
        ,
        {
            id: 'initial-setup',
            title: <Trans i18nKey="manual.setup.title" />,
            icon: <ShieldCheck size={16} />,
            searchKeywords: ['setup', 'admin', 'create account', 'first time', 'install'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.setup.header" /></h3>
                    <p>
                        <Trans i18nKey="manual.setup.desc" components={{ 1: <strong /> }} />
                    </p>

                    <div className="um-callout tip">
                        <Trans i18nKey="manual.setup.tip_net" components={{ 1: <strong /> }} />
                    </div>

                    <h4><Trans i18nKey="manual.setup.db_title" /></h4>
                    <p><Trans i18nKey="manual.setup.db_desc" /></p>
                    <ul className="check-list">
                        <li><Trans i18nKey="manual.setup.path_db" components={{ 1: <strong />, 2: <code /> }} /></li>
                        <li><Trans i18nKey="manual.setup.path_backup" components={{ 1: <strong />, 2: <code /> }} /></li>
                        <li><Trans i18nKey="manual.setup.path_logs" components={{ 1: <strong />, 2: <code /> }} /></li>
                    </ul>

                    <h4><Trans i18nKey="manual.setup.admin_title" /></h4>
                    <p>
                        <Trans i18nKey="manual.setup.admin_desc" components={{ 1: <strong /> }} />
                    </p>

                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img
                            src={ManualImages.initialSetupImg}
                            alt="Initial Setup Screen"
                            style={{
                                maxWidth: '100%',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                            }}
                        />
                        <div className="um-caption"><Trans i18nKey="manual.setup.fig_admin" /></div>
                    </div>

                    <div className="um-step-card">
                        <h5><Trans i18nKey="manual.setup.config_step" /></h5>
                        <ol>
                            <li><Trans i18nKey="manual.setup.step_launch" components={{ 1: <strong />, 2: <code /> }} /></li>
                            <li><Trans i18nKey="manual.setup.step_id" components={{ 1: <strong /> }} /></li>
                            <li><Trans i18nKey="manual.setup.step_cred" components={{ 1: <strong /> }} /></li>
                            <li><Trans i18nKey="manual.setup.step_shake" components={{ 1: <strong />, 2: <strong /> }} /></li>
                        </ol>
                    </div>

                    <div className="um-callout warning">
                        <Trans i18nKey="manual.setup.warn_close" components={{ 1: <strong /> }} />
                    </div>
                </div>
            )
        }
        ,
        {
            id: 'dashboard',
            title: <Trans i18nKey="manual.dashboard.title" />,
            icon: <LayoutDashboard size={16} />,
            searchKeywords: ['home', 'kpi', 'cards', 'charts', 'stats', 'overview', 'sidebar', 'theme', 'language', 'navigation'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.dashboard.header" /></h3>
                    <p><Trans i18nKey="manual.dashboard.desc" /></p>

                    <h4><Trans i18nKey="manual.dashboard.sidebar_title" /></h4>
                    <p><Trans i18nKey="manual.dashboard.sidebar_desc" /></p>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', margin: '20px 0' }}>
                        <div className="um-content-image-wrapper" style={{ margin: 0, width: '200px' }}>
                            <img src={ManualImages.sidebarImg} alt="Sidebar Navigation" style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.dashboard.core_mod" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.dashboard.circ_desk" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.dashboard.admin_tools" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.dashboard.analytics_tools" components={{ 1: <strong /> }} /></li>
                            </ul>
                            <div className="um-callout tip">
                                <Trans i18nKey="manual.dashboard.tip_nav" components={{ 1: <strong /> }} />
                            </div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.dashboard.live_title" /></h4>
                    <p><Trans i18nKey="manual.dashboard.live_desc" /></p>

                    {/* Dashboard Screenshot */}
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img
                            src={ManualImages.dashboardImg}
                            alt="Dashboard Overview"
                            style={{
                                maxWidth: '100%',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                            }}
                        />
                        <div className="um-caption"><Trans i18nKey="manual.dashboard.fig_realtime" /></div>
                    </div>

                    <h5><Trans i18nKey="manual.dashboard.kpi_title" /></h5>
                    <ul className="check-list">
                        <li><Trans i18nKey="manual.dashboard.kpi_books" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.dashboard.kpi_active" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.dashboard.kpi_velocity" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.dashboard.kpi_overdue" components={{ 1: <strong /> }} /></li>
                    </ul>
                </div>
            )
        },
        {
            id: 'header',
            title: <Trans i18nKey="manual.header.title" />,
            icon: <LayoutDashboard size={16} />,
            searchKeywords: ['header', 'profile', 'logout', 'theme', 'language'],
            content: (
                <div className="um-article">

                    <h3><Trans i18nKey="manual.header.header" /></h3>
                    <p><Trans i18nKey="manual.header.desc" components={{ 1: <strong /> }} /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img
                            src={ManualImages.headerImg}
                            alt="Header Controls"
                            style={{
                                maxWidth: '100%',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                            }}
                        />
                        <div className="um-caption"><Trans i18nKey="manual.header.fig_header" /></div>
                    </div>
                    <ul>
                        <li><Trans i18nKey="manual.header.lang" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.header.font" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.header.theme" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.header.profile" components={{ 1: <strong /> }} /></li>
                    </ul>

                    <h3><Trans i18nKey="manual.header.dash_title" /></h3>
                    <p><Trans i18nKey="manual.header.dash_desc" components={{ 1: <strong /> }} /></p>

                    {/* Dashboard Screenshot */}
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img
                            src={ManualImages.dashboardImg}
                            alt="Dashboard Overview"
                            style={{
                                maxWidth: '100%',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                            }}
                        />
                        <div className="um-caption"><Trans i18nKey="manual.header.fig_content" /></div>
                    </div>
                    <p><Trans i18nKey="manual.header.kpi_intro" components={{ 1: <strong /> }} /></p>
                    <ul>
                        <li><Trans i18nKey="manual.header.kpi_total" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.header.kpi_students" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.header.kpi_issued" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.header.kpi_pending" components={{ 1: <strong /> }} /></li>
                    </ul>
                </div>
            )
        }
        ,
        {
            id: 'books',
            title: <Trans i18nKey="manual.books.title" />,
            icon: <BookOpen size={16} />,
            searchKeywords: ['add book', 'isbn', 'import', 'csv', 'copies', 'accession', 'shelf', 'search', 'filter', 'bulk', 'delete'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.books.header" /></h3>
                    <p><Trans i18nKey="manual.books.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.books.dash_title" /></h4>
                    <p><Trans i18nKey="manual.books.dash_desc" /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.catalogPageImg} alt="Catalog Page" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.books.fig_catalog" /></div>
                    </div>
                    <ul className="check-list">
                        <li><Trans i18nKey="manual.books.search" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.books.filters" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.books.actions" components={{ 1: <strong /> }} /></li>
                    </ul>

                    <h4><Trans i18nKey="manual.books.add_title" /></h4>
                    <p><Trans i18nKey="manual.books.add_desc" /></p>

                    <div className="um-step-card">
                        <h5><Trans i18nKey="manual.books.manual_title" /></h5>
                        <ol>
                            <li><Trans i18nKey="manual.books.step_add" components={{ 1: <strong /> }} /></li>
                            <li><Trans i18nKey="manual.books.step_scan" components={{ 1: <strong /> }} /></li>
                            <li><Trans i18nKey="manual.books.step_meta" components={{ 1: <strong /> }} /></li>
                            <li><Trans i18nKey="manual.books.step_cat" components={{ 1: <strong /> }} /></li>
                        </ol>
                        <div className="um-content-image-wrapper" style={{ marginTop: 15 }}>
                            <img src={ManualImages.addNewBookImg} alt="Add Book" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                    </div>

                    <div className="um-step-card" style={{ marginTop: 20 }}>
                        <h5><Trans i18nKey="manual.books.bulk_title" /></h5>
                        <p><Trans i18nKey="manual.books.bulk_desc" /></p>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <ul className="check-list">
                                    <li><Trans i18nKey="manual.books.bulk_temp" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.books.bulk_val" components={{ 1: <strong /> }} /></li>
                                </ul>
                            </div>
                            <div style={{ flex: 1 }}>
                                <img src={ManualImages.importBooksImg} alt="Import Books" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                            </div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.books.life_title" /></h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 15 }}>
                        <div className="um-card-sm">
                            <h6><Trans i18nKey="manual.books.life_details" /></h6>
                            <p><Trans i18nKey="manual.books.life_det_desc" /></p>
                            <img src={ManualImages.bookDetailsImg} alt="Book Details" style={{ width: '100%', marginTop: 10, borderRadius: 6 }} />
                        </div>
                        <div className="um-card-sm">
                            <h6><Trans i18nKey="manual.books.life_acc" /></h6>
                            <p><Trans i18nKey="manual.books.life_acc_desc" /></p>
                            <img src={ManualImages.manageCopiesImg} alt="Manage Copies" style={{ width: '100%', marginTop: 10, borderRadius: 6 }} />
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'students',
            title: <Trans i18nKey="manual.students.title" />,
            icon: <Users size={16} />,
            searchKeywords: ['member', 'register', 'add student', 'promote', 'semester', 'department', 'alumni', 'roll number'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.students.header" /></h3>
                    <p><Trans i18nKey="manual.students.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.students.dir_title" /></h4>
                    <p><Trans i18nKey="manual.students.dir_desc" /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.studentPageImg} alt="Student List" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.students.fig_dir" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.students.reg_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.students.new_title" /></h5>
                                <ol>
                                    <li><Trans i18nKey="manual.students.step_click" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.students.step_data" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.students.step_acad" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.students.step_contact" components={{ 1: <strong /> }} /></li>
                                </ol>
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.addStudentImg} alt="Add Student" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                    </div>

                    <div className="um-step-card" style={{ marginTop: 20 }}>
                        <h5><Trans i18nKey="manual.students.bulk_title" /></h5>
                        <p><Trans i18nKey="manual.students.bulk_desc" /></p>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <img src={ManualImages.importStudentImg} alt="Import Students" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                                <div className="um-caption"><Trans i18nKey="manual.students.fig_bulk" /></div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <ul className="check-list">
                                    <li><Trans i18nKey="manual.students.bulk_pre" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.students.bulk_pts" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.students.bulk_safe" components={{ 1: <strong /> }} /></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.students.id_title" /></h4>
                    <p><Trans i18nKey="manual.students.id_desc" /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.idCardImg} alt="Student ID Card" style={{ maxWidth: '400px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.students.fig_id" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.students.manage_title" /></h4>
                    <p><Trans i18nKey="manual.students.manage_desc" /></p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '20px 0', alignItems: 'start' }}>
                        <div>
                            <h5><Trans i18nKey="manual.students.prof_title" /></h5>
                            <img src={ManualImages.studentDetailsImg} alt="Student Details" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', marginTop: 10 }} />
                            <div className="um-caption"><Trans i18nKey="manual.students.fig_prof" /></div>
                        </div>
                        <div>
                            <h5><Trans i18nKey="manual.students.edit_title" /></h5>
                            <p><Trans i18nKey="manual.students.edit_desc" /></p>
                            <img src={ManualImages.editStudentImg} alt="Edit Student" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', marginTop: 10 }} />
                            <div className="um-caption"><Trans i18nKey="manual.students.fig_edit" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.students.export_title" /></h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                            <p><Trans i18nKey="manual.students.export_desc" components={{ 1: <strong /> }} /></p>
                            <img src={ManualImages.studentExportImg} alt="Export Students" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                    </div>
                </div>

            )
        }
        ,
        {
            id: 'departments',
            title: <Trans i18nKey="manual.departments.title" />,
            icon: <Building size={16} />,
            searchKeywords: ['department', 'branch', 'hod', 'signature', 'civil', 'mechanical', 'electrical'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.departments.header" /></h3>
                    <p><Trans i18nKey="manual.departments.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.departments.dir_title" /></h4>
                    <p><Trans i18nKey="manual.departments.dir_desc" /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.departmentPageImg} alt="Department List" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.departments.fig_dir" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.departments.create_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.departments.step_guide" /></h5>
                                <ol>
                                    <li><Trans i18nKey="manual.departments.step_click" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.departments.step_name" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.departments.step_code" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.departments.step_save" components={{ 1: <strong /> }} /></li>
                                </ol>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.addDepartmentImg} alt="Add Department" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}>Figure 8.2: Creation Modal</div>
                        </div>
                    </div>

                    <div className="um-callout tip">
                        <Trans i18nKey="manual.departments.tip_code" components={{ 1: <strong /> }} />
                    </div>

                    <h4><Trans i18nKey="manual.departments.mod_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.editDepartmentImg} alt="Edit Department" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.departments.fig_edit" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p><Trans i18nKey="manual.departments.edit_desc" components={{ 1: <strong /> }} /></p>
                            <p><em><Trans i18nKey="manual.departments.edit_note" /></em></p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'circulation',
            title: <Trans i18nKey="manual.circulation.title" />,
            icon: <Layers size={16} />,
            searchKeywords: ['issue', 'return', 'renew', 'borrow', 'scan', 'barcode', 'overdue', 'fine', 'cart', 'f2', 'f3'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.circulation.header" /></h3>
                    <p><Trans i18nKey="manual.circulation.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.circulation.dash_title" /></h4>
                    <p><Trans i18nKey="manual.circulation.dash_desc" /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.circulationPageImg} alt="Circulation Dashboard" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.circulation.fig_dash" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.circulation.issue_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.circulation.workflow" /></h5>
                                <ol>
                                    <li><Trans i18nKey="manual.circulation.issue_step1" components={{ 1: <strong />, 2: <kbd /> }} /></li>
                                    <li><Trans i18nKey="manual.circulation.issue_step2" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.circulation.issue_step3" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.circulation.issue_step4" components={{ 1: <strong />, 2: <strong /> }} /></li>
                                </ol>
                            </div>
                            <div className="um-callout tip" style={{ marginTop: 10 }}>
                                <Trans i18nKey="manual.circulation.issue_tip" components={{ 1: <strong />, 2: <kbd /> }} />
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.issueTabImg} alt="Issue Book Tab" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.circulation.fig_issue" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.circulation.return_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.returnTabImg} alt="Return Book Tab" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.circulation.fig_return" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.circulation.workflow" /></h5>
                                <ol>
                                    <li><Trans i18nKey="manual.circulation.return_step1" components={{ 1: <kbd /> }} /></li>
                                    <li><Trans i18nKey="manual.circulation.return_step2" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.circulation.return_step3" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.circulation.return_step4" components={{ 1: <strong />, 2: <strong /> }} /></li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.circulation.fine_title" /></h4>
                    <p><Trans i18nKey="manual.circulation.fine_desc" components={{ 1: <strong />, 2: <kbd /> }} /></p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
                        <div>
                            <p><Trans i18nKey="manual.circulation.collect_title" components={{ 1: <strong /> }} /></p>
                            <ol>
                                <li><Trans i18nKey="manual.circulation.collect_step1" /></li>
                                <li><Trans i18nKey="manual.circulation.collect_step2" /></li>
                                <li><Trans i18nKey="manual.circulation.collect_step3" components={{ 1: <strong /> }} /></li>
                            </ol>
                            <img src={ManualImages.finesTabImg} alt="Fines Management" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', marginTop: 10 }} />
                            <div className="um-caption"><Trans i18nKey="manual.circulation.fig_pay" /></div>
                        </div>
                        <div>
                            <p><Trans i18nKey="manual.circulation.hist_title" components={{ 1: <strong /> }} /></p>
                            <p><Trans i18nKey="manual.circulation.hist_desc" /></p>
                            <img src={ManualImages.fineHistoryImg} alt="Fine History" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', marginTop: 10 }} />
                            <div className="um-caption"><Trans i18nKey="manual.circulation.fig_hist" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.circulation.receipt_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.verifyReceiptImg} alt="Verify Receipt" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.circulation.fig_verify" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="um-callout tip">
                                <Trans i18nKey="manual.circulation.sec_feat" components={{ 1: <strong /> }} />
                                <p><Trans i18nKey="manual.circulation.sec_desc" /></p>
                            </div>
                            <p><Trans i18nKey="manual.circulation.verify_intro" /></p>
                            <ol>
                                <li><Trans i18nKey="manual.circulation.verify_step1" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.circulation.verify_step2" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.circulation.verify_step3" /></li>
                            </ol>
                        </div>
                    </div>
                </div>
            )
        }
        ,
        {
            id: 'transactions',
            title: <Trans i18nKey="manual.transactions.title" />,
            icon: <DollarSign size={16} />,
            searchKeywords: ['transaction', 'history', 'payment', 'export', 'filter', 'date', 'fine', 'collection'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.transactions.header" /></h3>
                    <p><Trans i18nKey="manual.transactions.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.transactions.log_title" /></h4>
                    <p><Trans i18nKey="manual.transactions.log_desc" /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.transactionHistoryImg} alt="Transaction Log" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.transactions.fig_log" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.transactions.details_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.transactions.inspect_title" /></h5>
                                <ol>
                                    <li><Trans i18nKey="manual.transactions.inspect_step1" /></li>
                                    <li><Trans i18nKey="manual.transactions.inspect_step2" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.transactions.inspect_step3" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.transactions.inspect_step4" components={{ 1: <strong /> }} /></li>
                                </ol>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.transactionDetailsImg} alt="Transaction Details" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.transactions.fig_details" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.transactions.report_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 30 }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.transactionExportImg} alt="Export Transactions" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.transactions.fig_export" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p><Trans i18nKey="manual.transactions.share_desc" /></p>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.transactions.filter_data" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.transactions.one_click" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.transactions.daily_sum" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'reports',
            title: <Trans i18nKey="manual.reports.title" />,
            icon: <FileText size={16} />,
            searchKeywords: ['report', 'analytics', 'export', 'pdf', 'csv', 'print', 'chart', 'graph', 'trend', 'date range'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.reports.header" /></h3>
                    <p><Trans i18nKey="manual.reports.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.reports.daily_title" /></h4>
                    <p><Trans i18nKey="manual.reports.daily_desc" /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.reportActivityImg} alt="Daily Activity" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.reports.fig_daily" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.reports.trends_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.reportAnalyticsImg} alt="Analytics Dashboard" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.reports.fig_trends" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.reports.metrics_title" /></h5>
                                <ul className="check-list">
                                    <li><Trans i18nKey="manual.reports.metric_1" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.reports.metric_2" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.reports.metric_3" components={{ 1: <strong /> }} /></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.reports.custom_title" /></h4>
                    <p><Trans i18nKey="manual.reports.custom_desc" /></p>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 20 }}>
                        <div style={{ flex: 1 }}>
                            <p><Trans i18nKey="manual.reports.export_formats" components={{ 1: <strong /> }} /></p>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.reports.format_pdf" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.reports.format_excel" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.reportExportImg} alt="Report Export" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.reports.fig_custom" /></div>
                        </div>
                    </div>
                </div>
            )
        }
        ,
        {
            id: 'staff',
            title: <Trans i18nKey="manual.staff.title" />,
            icon: <UserCog size={16} />,
            searchKeywords: ['admin', 'librarian', 'roles', 'permissions', 'disable', 'account', 'access'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.staff.header" /></h3>
                    <p><Trans i18nKey="manual.staff.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.staff.dir_title" /></h4>
                    <p><Trans i18nKey="manual.staff.dir_desc" /></p>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.staffPageImg} alt="Staff Directory" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.staff.fig_dir" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.staff.role_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.staff.add_title" /></h5>
                                <ol>
                                    <li><Trans i18nKey="manual.staff.add_step1" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.staff.add_step2" components={{ 1: <strong /> }} />
                                        <ul>
                                            <li><Trans i18nKey="manual.staff.role_lib" components={{ 1: <em /> }} /></li>
                                            <li><Trans i18nKey="manual.staff.role_asst" components={{ 1: <em /> }} /></li>
                                        </ul>
                                    </li>
                                    <li><Trans i18nKey="manual.staff.add_step3" components={{ 1: <strong /> }} /></li>
                                </ol>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.addStaffImg} alt="Add Staff" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.staff.fig_add" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.staff.account_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 20 }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.editStaffImg} alt="Edit Staff" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.staff.fig_edit" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p><Trans i18nKey="manual.staff.edit_actions" components={{ 1: <strong /> }} /></p>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.staff.action_contact" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.staff.action_reset" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.staff.action_deactivate" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'admin',
            title: <Trans i18nKey="manual.admin.title" />,
            icon: <ShieldCheck size={16} />,
            searchKeywords: ['admin', 'super user', 'privileges', 'system', 'access', 'security'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.admin.header" /></h3>
                    <p><Trans i18nKey="manual.admin.desc" components={{ 1: <strong /> }} /></p>

                    <div className="um-callout danger">
                        <Trans i18nKey="manual.admin.sec_warning" components={{ 1: <strong /> }} />
                    </div>

                    <h4><Trans i18nKey="manual.admin.dir_title" /></h4>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.adminPageImg} alt="Admin Directory" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.admin.fig_dir" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.admin.create_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.admin.new_title" /></h5>
                                <ol>
                                    <li><Trans i18nKey="manual.admin.new_step1" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.admin.new_step2" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.admin.new_step3" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.admin.new_step4" components={{ 1: <strong /> }} /></li>
                                </ol>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.newAdminImg} alt="New Admin" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.admin.fig_new" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.admin.manage_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.editAdminImg} alt="Edit Admin" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.admin.fig_manage" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p><Trans i18nKey="manual.admin.mod_title" components={{ 1: <strong /> }} /></p>
                            <p><Trans i18nKey="manual.admin.mod_desc" components={{ 1: <em /> }} /></p>
                        </div>
                    </div>
                </div>
            )
        }
        ,

        {
            id: 'audit',
            title: <Trans i18nKey="manual.audit.title" />,
            icon: <ShieldCheck size={16} />,
            searchKeywords: ['audit', 'log', 'security', 'track', 'changes', 'history', 'timestamp', 'user action'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.audit.header" /></h3>
                    <p><Trans i18nKey="manual.audit.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.audit.monitor_title" /></h4>
                    <p><Trans i18nKey="manual.audit.monitor_desc" /></p>
                    <ul className="check-list">
                        <li><Trans i18nKey="manual.audit.actor" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.audit.action" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.audit.target" components={{ 1: <strong /> }} /></li>
                        <li><Trans i18nKey="manual.audit.timestamp" components={{ 1: <strong /> }} /></li>
                    </ul>
                    <div className="um-content-image-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img src={ManualImages.auditPageImg} alt="Audit Log" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="um-caption"><Trans i18nKey="manual.audit.fig_monitor" /></div>
                    </div>

                    <h4><Trans i18nKey="manual.audit.compliance_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 30 }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.auditExportImg} alt="Audit Export" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.audit.fig_export" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p><Trans i18nKey="manual.audit.export_title" components={{ 1: <strong /> }} /></p>
                            <p><Trans i18nKey="manual.audit.export_desc" /></p>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.audit.format" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.audit.scope" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },

        {
            id: 'policies',
            title: <Trans i18nKey="manual.policies.title" />,
            icon: <Layers size={16} />,
            searchKeywords: ['policy', 'rules', 'borrowing', 'limit', 'fine', 'renew', 'semester', 'loan'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.policies.header" /></h3>
                    <p><Trans i18nKey="manual.policies.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.policies.circ_title" /></h4>
                    <p><Trans i18nKey="manual.policies.circ_desc" /></p>

                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.policies.config_title" /></h5>
                                <ul className="check-list">
                                    <li><Trans i18nKey="manual.policies.max_books" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.policies.loan_period" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.policies.renew_limit" components={{ 1: <strong /> }} /></li>
                                </ul>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.policyBorrowingImg} alt="Borrowing Policies" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.policies.fig_circ" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.policies.fin_title" /></h4>
                    <p><Trans i18nKey="manual.policies.fin_desc" /></p>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 20 }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.policyFinancialImg} alt="Financial Policies" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.policies.fig_fin" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p><Trans i18nKey="manual.policies.fine_settings" components={{ 1: <strong /> }} /></p>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.policies.fine_amount" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.policies.grace_period" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.policies.currency" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        }
        ,
        {
            id: 'settings',
            title: <Trans i18nKey="manual.settings.title" />,
            icon: <Settings size={16} />,
            searchKeywords: ['setting', 'theme', 'printer', 'scanner', 'backup', 'cloud', 'mongodb', 'policy', 'fine per day', 'loan', 'limit'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.settings.header" /></h3>
                    <p><Trans i18nKey="manual.settings.desc" components={{ 1: <strong /> }} /></p>

                    <h4><Trans i18nKey="manual.settings.appearance_title" /></h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                        <div>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.settings.theme" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.lang" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.access" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                        <div className="um-content-image-wrapper" style={{ margin: 0, textAlign: 'center' }}>
                            <img src={ManualImages.settingsAppearanceImg} alt="Appearance" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption"><Trans i18nKey="manual.settings.fig_app" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.settings.hardware_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '20px 0' }}>
                        <div style={{ flex: 1 }}>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.settings.doctor" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.scanner" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.settingsHardwareImg} alt="Hardware" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.settings.fig_hw" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.settings.security_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.settingsSecurityImg} alt="Security" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.settings.fig_sec" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.settings.change_pass" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.session" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.settings.data_title" /></h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
                        <div>
                            <img src={ManualImages.settingsMaintenanceImg} alt="Maintenance" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption"><Trans i18nKey="manual.settings.fig_data" /></div>
                        </div>
                        <div>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.settings.cloud" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.backup" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.auto_backup" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.cache" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.danger" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.settings.enrich_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.settings.auto_fill" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.bulk_photo" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.id_sig" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.id_down" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.settingsEnrichmentImg} alt="Enrichment" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.settings.fig_enrich" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.settings.comm_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 20 }}>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.settingsEmailImg} alt="Email" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.settings.fig_comm" /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.settings.smtp" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.sender" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.test_mail" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.settings.triggers" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>
                </div>

            )
        },
        {
            id: 'system-health',
            title: <Trans i18nKey="manual.health.title" />,
            icon: <Activity size={16} />,
            searchKeywords: ['health', 'cpu', 'ram', 'memory', 'disk', 'usage', 'uptime', 'server', 'performance'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.health.header" /></h3>
                    <p>
                        <Trans i18nKey="manual.health.desc" components={{ 1: <strong /> }} />
                    </p>

                    <h4><Trans i18nKey="manual.health.metrics_title" /></h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                        <div>
                            <div className="um-step-card">
                                <h5><Trans i18nKey="manual.health.indicators_title" /></h5>
                                <ul className="check-list">
                                    <li><Trans i18nKey="manual.health.cpu" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.health.ram" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.health.uptime" components={{ 1: <strong /> }} /></li>
                                    <li><Trans i18nKey="manual.health.disk" components={{ 1: <strong /> }} /></li>
                                </ul>
                            </div>
                        </div>
                        <div className="um-content-image-wrapper" style={{ margin: 0, textAlign: 'center' }}>
                            <img src={ManualImages.systemHealthImg} alt="System Health Dashboard" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption"><Trans i18nKey="manual.health.fig_dash" /></div>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.health.opt_title" /></h4>
                    <div className="um-callout tip">
                        <Trans i18nKey="manual.health.tip" components={{ 1: <strong />, 2: <em /> }} />
                    </div>
                </div>
            )
        },
        {
            id: 'public-pages',
            title: <Trans i18nKey="manual.public.title" />,
            icon: <Globe size={16} />,
            searchKeywords: ['landing', 'about', 'public', 'info', 'team', 'project', 'home'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.public.header" /></h3>
                    <p>
                        <Trans i18nKey="manual.public.desc" components={{ 1: <strong /> }} />
                    </p>

                    <h4><Trans i18nKey="manual.public.landing_title" /></h4>
                    <p><Trans i18nKey="manual.public.landing_desc" /></p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                        <div className="um-content-image-wrapper" style={{ margin: 0, textAlign: 'center' }}>
                            <img src={ManualImages.landingPageImg} alt="Landing Page" style={{ maxWidth: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption"><Trans i18nKey="manual.public.fig_home" /></div>
                        </div>
                        <div>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.public.hero" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.public.stats" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.public.nav" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                    </div>

                    <h4><Trans i18nKey="manual.public.about_title" /></h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <ul className="check-list">
                                <li><Trans i18nKey="manual.public.vision" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.public.team" components={{ 1: <strong /> }} /></li>
                                <li><Trans i18nKey="manual.public.stack" components={{ 1: <strong /> }} /></li>
                            </ul>
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={ManualImages.aboutPageImg} alt="About Page" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="um-caption" style={{ textAlign: 'center' }}><Trans i18nKey="manual.public.fig_about" /></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'shortcuts',
            title: <Trans i18nKey="manual.shortcuts.title" />,
            icon: <Keyboard size={16} />,
            searchKeywords: ['keyboard', 'shortcut', '`', 'backtick', 'tilde', 'f1', 'f2', 'f3', 'escape', 'hotkey', 'key'],
            content: (
                <div className="um-article">
                    <h3><Trans i18nKey="manual.shortcuts.header" /></h3>
                    <div className="um-mock-window">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 20, textAlign: 'center' }}>
                            <div className="um-mock-col">
                                <div className="um-mock-label"><Trans i18nKey="manual.shortcuts.help" /></div>
                                <div style={{ fontSize: '1.5rem' }}><span className="um-kbd" style={{ fontSize: '1.2rem', padding: '4px 10px' }}>`</span></div>
                            </div>
                            <div className="um-mock-col">
                                <div className="um-mock-label"><Trans i18nKey="manual.shortcuts.issue" /></div>
                                <div style={{ fontSize: '1.5rem' }}><span className="um-kbd" style={{ fontSize: '1.2rem', padding: '4px 10px' }}>F1</span></div>
                            </div>
                            <div className="um-mock-col">
                                <div className="um-mock-label"><Trans i18nKey="manual.shortcuts.return" /></div>
                                <div style={{ fontSize: '1.5rem' }}><span className="um-kbd" style={{ fontSize: '1.2rem', padding: '4px 10px' }}>F2</span></div>
                            </div>
                            <div className="um-mock-col">
                                <div className="um-mock-label"><Trans i18nKey="manual.shortcuts.fines" /></div>
                                <div style={{ fontSize: '1.5rem' }}><span className="um-kbd" style={{ fontSize: '1.2rem', padding: '4px 10px' }}>F3</span></div>
                            </div>
                            <div className="um-mock-col">
                                <div className="um-mock-label"><Trans i18nKey="manual.shortcuts.close" /></div>
                                <div style={{ fontSize: '1.5rem' }}><span className="um-kbd" style={{ fontSize: '1.2rem', padding: '4px 10px' }}>Esc</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];
}
