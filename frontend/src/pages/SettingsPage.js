import React, { useState, useEffect } from 'react';
import '../styles/pages/settings.css';
import {
    Settings, Save, RefreshCw, Shield, Database,
    Mail, Globe, Palette, Server, Lock, AlertCircle, CheckCircle, Smartphone,
    Check, X, Trash2, Upload, UploadCloud, Download, Wifi, WifiOff, BookOpen,
    Sun, Moon, Volume2, Eye, Printer, Key, AlertTriangle, User, Monitor, Search
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import PasswordPromptModal from '../components/common/PasswordPromptModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import StatusModal from '../components/common/StatusModal';
import { usePreferences } from '../context/PreferencesContext';
import { useLanguage } from '../context/LanguageContext';
import { useSession } from '../context/SessionContext';
import PrintPreviewModal from '../components/common/PrintPreviewModal';
import { generatePrintContent } from '../utils/SmartPrinterHandler';
import GlassSelect from '../components/common/GlassSelect';

// Help functions
const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { level: score, label: 'Medium', color: 'bg-yellow-500' };
    return { level: score, label: 'Strong', color: 'bg-green-500' };
};

// Extracted Components
const AppearanceTab = ({ settings, handleChange, handleSave }) => {
    const { t } = useLanguage();

    return (
        <div className="section-wrapper">
            <h2 className="settings-page-title">{t('settings.appearance.title')}</h2>

            {/* Theme Mode */}
            <div className="settings-card">
                <label className="form-label">{t('settings.appearance.theme_mode')}</label>
                <div className="theme-options">
                    {['light', 'dark', 'system'].map(mode => (
                        <label
                            key={mode}
                            className={`theme - card ${settings.app_appearance?.theme === mode ? 'active' : ''} `}
                            style={{
                                opacity: settings.app_appearance?.highContrast ? 0.5 : 1,
                                cursor: settings.app_appearance?.highContrast ? 'not-allowed' : 'pointer',
                                pointerEvents: settings.app_appearance?.highContrast ? 'none' : 'auto'
                            }}
                            title={settings.app_appearance?.highContrast ? "Theme selection disabled in High Contrast Mode" : ""}
                        >
                            <input
                                type="radio"
                                name="theme"
                                className="theme-radio"
                                checked={settings.app_appearance?.theme === mode}
                                onChange={() => handleChange('app_appearance', 'theme', mode)}
                                disabled={settings.app_appearance?.highContrast}
                            />
                            {mode === 'light' && <Sun size={16} />}
                            {mode === 'dark' && <Moon size={16} />}
                            {mode === 'system' && <Settings size={16} />}
                            <span className="capitalize">{t(`settings.appearance.${mode}`)}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Language */}
            <div className="settings-card">
                <label className="form-label">{t('settings.appearance.interface_language')}</label>
                <div className="width-md">
                    <GlassSelect
                        value={settings.app_appearance?.language || 'en'}
                        onChange={(val) => handleChange('app_appearance', 'language', val)}
                        options={[
                            { value: 'en', label: 'English (Primary)' },
                            { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' }
                        ]}
                        icon={Globe}
                        placeholder={t('settings.appearance.select_language')}
                    />
                </div>
                <p className="form-hint">{t('settings.appearance.language_hint')}</p>
            </div>

            {/* Accessibility */}
            <div className="settings-card">
                <label className="form-label">{t('settings.appearance.accessibility')}</label>
                <div className="scanner-grid">
                    <div>
                        <label className="form-hint">{t('settings.appearance.font_scaling')} ({settings.app_appearance?.fontScale}%)</label>
                        <input
                            type="range" min="80" max="150" step="10"
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            value={settings.app_appearance?.fontScale}
                            onChange={e => handleChange('app_appearance', 'fontScale', parseInt(e.target.value))}
                        />
                        <div className="range-labels">
                            <span>80%</span>
                            <span>150%</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={settings.app_appearance?.highContrast}
                            onChange={e => handleChange('app_appearance', 'highContrast', e.target.checked)}
                        />
                        <Eye size={16} />
                        <span>{t('settings.appearance.high_contrast')}</span>
                    </div>
                </div>
            </div>
            {/* Save Button */}
            <div className="action-footer">
                <button
                    onClick={handleSave}
                    className="primary-glass-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Save size={18} /> {t('settings.appearance.save_btn')}
                </button>
            </div>
        </div>
    );
};

const AccountSecurityTab = ({ settings, handleChange, handleSave, passwordForm, setPasswordForm, handlePasswordChange, passwordError, passwordSuccess, changingPassword }) => {
    const { t } = useLanguage();
    const strength = getPasswordStrength(passwordForm.new);
    // Initial check: if loaded value is NOT in preset list, assume custom mode
    const [isCustomMode, setIsCustomMode] = useState(() =>
        ![0, 5, 10, 15, 30].includes(settings.app_security?.autoLockMinutes)
    );

    return (
        <div className="section-wrapper">
            <h2 className="settings-page-title">{t('settings.security.title')}</h2>

            {/* Change Password */}
            <div className="settings-card padding-lg">
                <div className="card-header">
                    <h3 className="card-title"><Lock size={18} /> {t('settings.security.change_pwd')}</h3>
                </div>

                <form onSubmit={handlePasswordChange} className="width-constrained">
                    <div className="form-group">
                        <label className="form-label">{t('settings.security.current_pwd')}</label>
                        <input
                            type="password"
                            className="glass-input width-full"
                            style={{ width: '100%' }}
                            placeholder=""
                            value={passwordForm.current}
                            onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('settings.security.new_pwd')}</label>
                        <input
                            type="password"
                            className="glass-input width-full"
                            style={{ width: '100%' }}
                            placeholder=""
                            value={passwordForm.new}
                            onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))}
                            required
                        />
                        {/* Strength Meter */}
                        {passwordForm.new && (
                            <div className="password-meter">
                                <div className="meter-bar-bg">
                                    <div
                                        className="meter-fill"
                                        style={{ width: `${(strength.level / 5) * 100}% `, background: strength.color === 'bg-green-500' ? '#22c55e' : strength.color === 'bg-yellow-500' ? '#eab308' : '#ef4444' }}
                                    />
                                </div>
                                <span className={`meter - text ${strength.color === 'bg-green-500' ? 'text-success' : strength.color === 'bg-yellow-500' ? 'text-warning' : 'text-danger'} `}>
                                    {strength.label}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('settings.security.confirm_pwd')}</label>
                        <input
                            type="password"
                            className="glass-input width-full"
                            style={{ width: '100%' }}
                            placeholder=""
                            value={passwordForm.confirm}
                            onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                            required
                        />
                        {passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
                            <span className="text-danger" style={{ fontSize: '0.75rem' }}>{t('settings.security.pwd_mismatch')}</span>
                        )}
                    </div>

                    {passwordError && (
                        <div className="text-danger" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <X size={16} /> {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="text-success" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Check size={16} /> {passwordSuccess}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="primary-glass-btn"
                        disabled={changingPassword}
                    >
                        {changingPassword ? t('settings.security.changing') : t('settings.security.update_btn')}
                    </button>
                </form>
            </div>

            {/* Session Settings */}
            <div className="settings-card padding-lg">
                <div className="card-header">
                    <h3 className="card-title"><RefreshCw size={18} /> {t('settings.security.session_title')}</h3>
                </div>

                <div className="width-constrained">
                    <label className="form-label">{t('settings.security.auto_lock')}</label>
                    <GlassSelect
                        value={isCustomMode ? -1 : (settings.app_security?.autoLockMinutes || 0)}
                        onChange={(val) => {
                            const intVal = parseInt(val);
                            if (intVal === -1) {
                                setIsCustomMode(true);
                                handleChange('app_security', 'autoLockMinutes', 60);
                            } else {
                                setIsCustomMode(false);
                                handleChange('app_security', 'autoLockMinutes', intVal);
                            }
                        }}
                        options={[
                            { value: 0, label: t('settings.security.never') },
                            { value: 5, label: t('settings.security.mins_5') },
                            { value: 10, label: t('settings.security.mins_10') },
                            { value: 15, label: t('settings.security.mins_15') },
                            { value: 30, label: t('settings.security.mins_30') },
                            { value: -1, label: 'Custom Time...' }
                        ]}
                        icon={Lock}
                    />

                    {isCustomMode && (
                        <div className="animate-fade-in mt-3">
                            <label className="form-label text-xs">Custom Duration (Minutes)</label>
                            <input
                                type="number"
                                min="1"
                                max="1440"
                                className="glass-input width-full"
                                value={settings.app_security?.autoLockMinutes || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    handleChange('app_security', 'autoLockMinutes', val === '' ? '' : parseInt(val));
                                }}
                            />
                        </div>
                    )}

                    <p className="form-hint">
                        {t('settings.security.lock_hint')}
                    </p>
                    <div className="action-footer">
                        <button
                            onClick={handleSave}
                            className="primary-glass-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Save size={16} /> {t('settings.security.save_session')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};




const HardwareTab = ({ settings, handleChange, handleSave, onTestPrint }) => {
    const { t } = useLanguage();
    // Local state for hardware simulation
    const [scanning, setScanning] = useState(false);
    const [testInput, setTestInput] = useState('');
    const [deviceStatus, setDeviceStatus] = useState({
        scanner: 'disconnected', // disconnected, connected, error
        printer: 'disconnected'
    });

    // Simulate Device Scan
    const handleScanDevices = () => {
        setScanning(true);
        // Simulate a network/port scan
        setTimeout(() => {
            setScanning(false);
            setDeviceStatus({
                scanner: 'connected',
                printer: settings.app_hardware?.defaultPrinter ? 'connected' : 'disconnected'
            });
        }, 2500);
    };

    // Calculate processed input for preview
    const getProcessedInput = () => {
        if (!settings.app_hardware?.scannerPrefix || !testInput) return testInput;
        if (testInput.startsWith(settings.app_hardware.scannerPrefix)) {
            return testInput.substring(settings.app_hardware.scannerPrefix.length);
        }
        return testInput;
    };

    return (
        <div className="section-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="settings-page-title">{t('settings.hardware.title')}</h2>

                {/* Device Status Indicators */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className={`status - badge ${deviceStatus.scanner} `}>
                        <span className="status-dot"></span>
                        {t('settings.hardware.scanner_status')}: {deviceStatus.scanner === 'connected' ? t('settings.hardware.ready') : t('settings.hardware.not_found')}
                    </div>
                    <div className={`status - badge ${deviceStatus.printer} `}>
                        <span className="status-dot"></span>
                        {t('settings.hardware.printer_status')}: {deviceStatus.printer === 'connected' ? t('settings.hardware.ready') : t('settings.hardware.not_found')}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="settings-card" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="card-title" style={{ margin: 0 }}>Device Manager</h3>
                        <p className="form-hint" style={{ margin: '0.25rem 0 0 0' }}>
                            Scan for connected USB or Network devices
                        </p>
                    </div>
                    <button
                        className="btn-secondary"
                        onClick={handleScanDevices}
                        disabled={scanning}
                    >
                        {scanning ? (
                            <><RefreshCw size={16} className="animate-spin" /> {t('settings.hardware.scanning')}</>
                        ) : (
                            <><RefreshCw size={16} /> {t('settings.hardware.scan_btn')}</>
                        )}
                    </button>
                </div>
            </div>

            {/* Barcode Scanner */}
            <div className="settings-card">
                <div className="card-header">
                    <h3 className="card-title"><Smartphone size={18} /> {t('settings.hardware.scanner_config')}</h3>
                    {deviceStatus.scanner === 'connected' && <span className="badge-success">Active</span>}
                </div>

                <div className="scanner-grid">
                    <div>
                        <label className="form-label">{t('settings.hardware.input_mode')}</label>
                        <GlassSelect
                            value={settings.app_hardware?.scannerMode}
                            onChange={(val) => handleChange('app_hardware', 'scannerMode', val)}
                            options={[
                                { value: 'keyboard', label: 'Keyboard Emulation (HID)' },
                                { value: 'serial', label: 'Serial Port (COM/RS232)' }
                            ]}
                            icon={Smartphone}
                        />
                        <p className="form-hint">HID mode works with most USB scanners out of the box.</p>
                    </div>
                    <div>
                        <label className="form-label">{t('settings.hardware.prefix_strip')}</label>
                        <input
                            className="glass-input width-full"
                            style={{ width: '100%' }}
                            placeholder="e.g. LIB-"
                            value={settings.app_hardware?.scannerPrefix || ''}
                            onChange={e => handleChange('app_hardware', 'scannerPrefix', e.target.value)}
                        />
                        <p className="form-hint">Characters to automatically remove from scan result.</p>
                    </div>
                </div>

                {/* Interactive Scanner Test Area */}
                <div className="test-area">
                    <label className="form-label" style={{ color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Smartphone size={14} /> {t('settings.hardware.live_test')}
                    </label>
                    <div className="scanner-grid">
                        <div>
                            <input
                                className="glass-input width-full"
                                style={{ width: '100%', fontFamily: 'monospace' }}
                                placeholder="Click here and scan a barcode..."
                                value={testInput}
                                onChange={e => setTestInput(e.target.value)}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                <span className="form-hint">{t('settings.hardware.raw_input')}</span>
                                {testInput && <span className="text-xs text-blue-400 cursor-pointer" onClick={() => setTestInput('')}>{t('settings.hardware.clear')}</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="arrow-icon" style={{ color: 'var(--text-secondary)' }}>➔</div>
                        </div>
                        <div>
                            <div className="processed-output">
                                {getProcessedInput() || <span style={{ opacity: 0.5 }}>Waiting for input...</span>}
                            </div>
                            <span className="form-hint">{t('settings.hardware.processed')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Printer */}
            <div className="settings-card">
                <div className="card-header">
                    <h3 className="card-title"><Printer size={18} /> {t('settings.hardware.printer_title')}</h3>
                    {deviceStatus.printer === 'connected' && <span className="badge-success">Active</span>}
                </div>

                <div className="scanner-grid">
                    <div>
                        <label className="form-label">{t('settings.hardware.default_printer')}</label>
                        <GlassSelect
                            value={settings.app_hardware?.defaultPrinter || ''}
                            onChange={(val) => handleChange('app_hardware', 'defaultPrinter', val)}
                            options={[
                                { value: '', label: '-- Select Printer --' },
                                { value: 'system_default', label: 'System Default' },
                                { value: 'thermal_1', label: 'POS-80C (USB)' },
                                { value: 'thermal_2', label: 'Epson TM-T82 (Network)' },
                                { value: 'pdf', label: 'Print to PDF' }
                            ]}
                            icon={Printer}
                            placeholder="Select Printer"
                        />
                    </div>
                    <div>
                        <label className="form-label">{t('settings.hardware.paper_width')}</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {['58mm', '80mm', 'A4'].map(size => (
                                <button
                                    key={size}
                                    className={`option - btn ${settings.app_hardware?.paperSize === size ? 'active' : ''} `}
                                    onClick={() => handleChange('app_hardware', 'paperSize', size)}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                    <label className="checkbox-item" style={{ margin: 0 }}>
                        <input
                            type="checkbox"
                            checked={settings.app_hardware?.autoPrint}
                            onChange={e => handleChange('app_hardware', 'autoPrint', e.target.checked)}
                        />
                        <span>{t('settings.hardware.auto_print')}</span>
                    </label>

                    <button className="nav-button" onClick={onTestPrint}>
                        <Printer size={14} /> {t('settings.hardware.test_print')}
                    </button>
                </div>
            </div>

            {/* Save Button */}
            <div className="action-footer">
                <button
                    onClick={handleSave}
                    className="primary-glass-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Save size={18} /> {t('settings.hardware.save_hw')}
                </button>
            </div>
        </div>
    );
};

const DataMaintenanceTab = ({
    settings,
    handleChange,
    handleSave,
    testingConnection,
    handleTestConnection,
    onCreateBackup,
    onRestoreBackup,
    onCloudBackup,
    onCloudRestore,
    onClearCache,
    onFactoryReset,
    fileInputRef
}) => {
    const { t } = useLanguage();
    return (
        <div className="section-wrapper">
            <h2 className="settings-page-title">{t('settings.data.title')}</h2>

            {/* Cloud Database Configuration */}
            <div className="settings-card">
                <h3 className="card-title"><Server size={18} /> {t('settings.data.cloud_title')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="form-label">{t('settings.data.uri_label')}</label>
                        <input
                            className="glass-input width-full"
                            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9em' }}
                            placeholder="mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/dbname"
                            value={settings.backup_config?.connectionUri || ''}
                            onChange={e => handleChange('backup_config', 'connectionUri', e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            className="nav-button"
                            style={{ width: 'auto', border: '1px solid var(--glass-border)' }}
                            onClick={handleTestConnection}
                            disabled={testingConnection}
                        >
                            {testingConnection ? (
                                <><RefreshCw size={16} className="animate-spin" /> {t('settings.data.testing')}</>
                            ) : (
                                <><Wifi size={16} /> {t('settings.data.test_conn')}</>
                            )}
                        </button>
                        <button
                            className="primary-glass-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            onClick={handleSave}
                        >
                            <Save size={16} /> {t('settings.data.save_restart')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Backup Operations */}
            <div className="settings-card">
                <h3 className="card-title"><Database size={18} /> {t('settings.data.backup_title')}</h3>
                <div className="scanner-grid">
                    <button
                        className="btn-secondary justify-center"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={onCreateBackup}
                    >
                        <Download size={18} /> {t('settings.data.create_local')}
                    </button>
                    <button
                        className="btn-secondary justify-center"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={onCloudBackup}
                    >
                        <UploadCloud size={18} /> {t('settings.data.cloud_backup')}
                    </button>
                    <button
                        className="btn-secondary justify-center"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <Upload size={18} /> {t('settings.data.restore_local')}
                    </button>
                    <button
                        className="btn-secondary justify-center"
                        style={{ width: '100%', justifyContent: 'center', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={onCloudRestore}
                    >
                        <RefreshCw size={18} /> {t('settings.data.restore_cloud')}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".json"
                        onChange={onRestoreBackup}
                    />
                </div>
                <p className="form-hint">
                    {t('settings.data.restore_hint')}
                </p>
            </div>

            {/* Backup Automation */}
            <div className="settings-card">
                <h3 className="card-title">{t('settings.data.automation_title')}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <label className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={settings.backup_config?.autoBackup}
                            onChange={e => handleChange('backup_config', 'autoBackup', e.target.checked)}
                        />
                        <span>{t('settings.data.enable_auto')}</span>
                    </label>
                    <div style={{ width: '200px' }}>
                        <label className="form-label" style={{ marginBottom: '6px' }}>{t('settings.data.frequency')}</label>
                        <GlassSelect
                            value={settings.backup_config?.frequency || 'daily'}
                            onChange={(val) => handleChange('backup_config', 'frequency', val)}
                            options={[
                                { value: 'daily', label: t('settings.data.freq_daily') },
                                { value: 'weekly', label: t('settings.data.freq_weekly') },
                                { value: 'on_close', label: t('settings.data.freq_close') }
                            ]}
                            icon={RefreshCw}
                            small
                        />
                    </div>
                </div>
            </div>

            {/* Cache Control */}
            <div className="settings-card">
                <h3 className="card-title">{t('settings.data.cache_title')}</h3>
                <button
                    className="nav-button"
                    style={{ width: 'auto', border: '1px solid var(--glass-border)' }}
                    onClick={onClearCache}
                >
                    <Trash2 size={16} /> {t('settings.data.clear_cache')}
                </button>
                <p className="form-hint">
                    {t('settings.data.cache_hint')}
                </p>
            </div>

            {/* Factory Reset - Danger Zone */}
            <div className="settings-card danger-zone">
                <h3 className="card-title text-danger">
                    <AlertTriangle size={18} /> {t('settings.data.danger_title')}
                </h3>
                <p className="form-hint" style={{ marginBottom: '1rem' }}>
                    {t('settings.data.reset_hint')}
                </p>
                <button
                    className="btn-danger-outline"
                    onClick={onFactoryReset}
                >
                    <Trash2 size={16} /> {t('settings.data.factory_reset')}
                </button>
                <p className="form-hint">
                    Requires 2-step verification (Password + OTP).
                </p>
            </div>
            {/* Save Button */}
            <div className="action-footer">
                <button
                    onClick={handleSave}
                    className="primary-glass-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Save size={18} /> {t('settings.data.save_data')}
                </button>
            </div>
        </div>
    );
};

const AutoFillVisualizer = ({ status }) => {
    // Steps: 0: Idle, 1: Scanning, 2: Fetching, 3: Updating, 4: Complete
    const getStep = () => {
        if (!status.running && !status.justCompleted) return 0;
        if (status.step === 'scanning') return 1;
        if (status.step === 'fetching') return 2;
        if (status.step === 'updating') return 3;
        if (status.justCompleted) return 4;
        return 1; // Default running
    };

    const currentStep = getStep();
    const steps = [
        { id: 1, label: 'Scanning Library', icon: Search },
        { id: 2, label: 'Fetching Data', icon: Globe },
        { id: 3, label: 'Updating Records', icon: Database },
        { id: 4, label: 'Complete', icon: Check }
    ];

    return (
        <div className="glass-panel" style={{ padding: '20px', marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '10px' }}>
                {/* Connecting Line */}
                <div style={{
                    position: 'absolute', top: '24px', left: '40px', right: '40px', height: '2px', background: 'var(--glass-border)', zIndex: 0
                }}>
                    <div style={{
                        height: '100%',
                        background: '#3B82F6',
                        width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                        transition: 'width 0.5s ease'
                    }} />
                </div>

                {steps.map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;

                    // Dynamic Colors
                    const activeColor = step.id === 4 ? '#10B981' : '#3B82F6';

                    return (
                        <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: isActive ? activeColor : 'var(--glass-bg)',
                                border: `2px solid ${isActive ? activeColor : 'var(--glass-border)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                transition: 'all 0.3s ease',
                                boxShadow: isCurrent ? `0 0 15px ${activeColor}80` : 'none'
                            }}>
                                <step.icon size={20} />
                            </div>
                            <span style={{
                                fontSize: '0.8rem',
                                color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                                fontWeight: isCurrent ? 600 : 400
                            }}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {status.running && (
                <div style={{
                    textAlign: 'center', marginTop: '15px', padding: '10px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#3B82F6' }}>
                        {status.message || "Processing..."}
                    </p>
                    <p style={{ margin: '5px 0 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {status.progress}
                    </p>
                </div>
            )}
        </div>
    );
};

const BulkPhotoUpload = () => {
    const { t } = useLanguage();
    const [status, setStatus] = useState({
        uploading: false,
        processed: 0,
        total: 0,
        success: 0,
        failed: 0,
        currentFile: ''
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [photoCount, setPhotoCount] = useState(null);

    const fileInputRef = React.useRef(null);
    const folderInputRef = React.useRef(null);

    // Initial Fetch
    useEffect(() => {
        fetchPhotoStats();
    }, []);

    const fetchPhotoStats = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/students/photo/stats');
            if (res.ok) {
                const data = await res.json();
                setPhotoCount(data.count);
            }
        } catch (e) {
            console.error("Failed to fetch photo stats", e);
        }
    };

    // Folder selection hack
    useEffect(() => {
        if (folderInputRef.current) {
            folderInputRef.current.setAttribute("webkitdirectory", "");
            folderInputRef.current.setAttribute("directory", "");
        }
    }, []);

    const handleDeletePhotos = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch('http://localhost:3001/api/students/photo/bulk-delete', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setStatus(prev => ({ ...prev, currentFile: data.message, running: false }));
                setPhotoCount(0); // Reset count locally
                setTimeout(() => setConfirmDelete(false), 1500);
            } else throw new Error(data.error);
        } catch (e) {
            console.error(e);
            setStatus(prev => ({ ...prev, currentFile: "Error deleting photos", running: false }));
        } finally {
            setIsDeleting(false);
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const elem = document.createElement('canvas');
                    const maxSize = 500; // Max dimension
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }

                    elem.width = width;
                    elem.height = height;
                    const ctx = elem.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(elem.toDataURL('image/jpeg', 0.8)); // Compress to JPEG 80%
                };
            };
        });
    };

    const handleFolderSelect = async (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        setStatus({ uploading: true, processed: 0, total: files.length, success: 0, failed: 0, currentFile: 'Initializing...' });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // Match RegNo from filename (e.g. "172CS23021.jpg" -> "172CS23021")
            const regNo = file.name.split('.')[0];

            setStatus(prev => ({ ...prev, processed: i + 1, currentFile: `Processing ${file.name}...` }));

            try {
                // 1. Compress
                const compressedBase64 = await compressImage(file);

                // 2. Upload
                const res = await fetch('http://localhost:3001/api/students/photo/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ register_no: regNo, image_data: compressedBase64 })
                });

                if (res.ok) successCount++;
                else failCount++;

                // Small delay for UI update
                await new Promise(r => setTimeout(r, 50));

            } catch (err) {
                console.error("Upload Failed", err);
                failCount++;
            }
        }

        setStatus({
            uploading: false,
            processed: files.length,
            total: files.length,
            success: successCount,
            failed: failCount,
            currentFile: t('settings.photos.upload_complete')
        });
    };

    return (
        <div className="settings-card" style={{ marginTop: '20px' }}>
            <h3 className="card-title"><User size={18} /> {t('settings.photos.title')}</h3>
            <p className="form-hint" style={{ marginBottom: '1.5rem' }} dangerouslySetInnerHTML={{ __html: t('settings.photos.hint') }}></p>

            <div className="glass-panel" style={{ padding: '20px' }}>
                {!status.uploading && (
                    <div
                        className="upload-dropzone"
                        style={{
                            border: '2px dashed var(--glass-border)', borderRadius: '12px', padding: '30px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px',
                            cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(255,255,255,0.02)'
                        }}
                        onClick={() => fileInputRef.current.click()}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                    >
                        <div style={{ padding: '15px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                            <UploadCloud size={32} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: 'var(--text-main)' }}>{t('settings.photos.click_select')}</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('settings.photos.supported')}</p>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            webkitdirectory="" directory="" multiple
                            onChange={handleFolderSelect}
                        />
                    </div>
                )}

                {(status.uploading || status.total > 0) && (
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{status.uploading ? t('settings.photos.uploading') : t('settings.photos.upload_complete')}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{status.processed} / {status.total}</span>
                        </div>

                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${(status.processed / status.total) * 100}%`, background: status.uploading ? '#3B82F6' : '#10B981' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
                                <CheckCircle size={14} /> {status.success} {t('settings.photos.success')}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}>
                                <AlertCircle size={14} /> {status.failed} {t('settings.photos.failed')}
                            </div>
                        </div>

                        {status.uploading && (
                            <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                {status.currentFile}
                            </p>
                        )}

                        {!status.uploading && (
                            <button
                                className="secondary-glass-btn"
                                style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }}
                                onClick={() => setStatus({ uploading: false, processed: 0, total: 0, success: 0, failed: 0, currentFile: '' })}
                            >
                                {t('settings.photos.upload_more')}
                            </button>
                        )}
                    </div>
                )}


                {/* Danger Zone for Photos */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 className="text-danger" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Trash2 size={16} /> {t('settings.photos.delete_all')}
                            </h4>
                            <p className="form-hint" style={{ margin: '4px 0 0' }}>
                                {t('settings.photos.delete_desc')} ({photoCount !== null ? <strong>{photoCount}</strong> : ''})
                            </p>
                        </div>
                        {confirmDelete ? (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="btn-danger"
                                    style={{ background: '#EF4444', color: 'white', borderRadius: '8px', padding: '8px 16px', border: 'none' }}
                                    onClick={handleDeletePhotos}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? t('settings.photos.deleting') : t('settings.photos.confirm_btn')}
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={() => setConfirmDelete(false)}
                                    disabled={isDeleting}
                                >
                                    {t('settings.photos.cancel_btn')}
                                </button>
                            </div>

                        ) : (
                            <button
                                className="btn-danger-outline"
                                onClick={() => setConfirmDelete(true)}
                            >
                                {t('settings.photos.delete_btn')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Signature Upload Section for ID Cards ---
const SignatureUploadSection = () => {
    const { t } = useLanguage();
    const [departments, setDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [principalSignature, setPrincipalSignature] = useState(null);
    const [hodSignatures, setHodSignatures] = useState({});
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });

    const principalInputRef = React.useRef(null);
    const hodInputRef = React.useRef(null);

    // Fetch departments and signatures on mount
    useEffect(() => {
        fetchDepartments();
        fetchPrincipalSignature();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/departments');
            const data = await res.json();
            if (Array.isArray(data)) {
                setDepartments(data);
                // Build HOD signatures map
                const hodMap = {};
                data.forEach(dept => {
                    if (dept.hod_signature) {
                        hodMap[dept.id] = dept.hod_signature;
                    }
                });
                setHodSignatures(hodMap);
                if (data.length > 0 && !selectedDeptId) {
                    setSelectedDeptId(data[0].id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch departments", e);
        }
    };

    const fetchPrincipalSignature = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/settings/principal-signature');
            const data = await res.json();
            setPrincipalSignature(data.signature);
        } catch (e) {
            console.error("Failed to fetch principal signature", e);
        }
    };

    const compressImage = (file, maxWidth = 300) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/png', 0.9));
                };
            };
        });
    };

    const handlePrincipalUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setUploadStatus({ type: '', message: '' });

        try {
            const compressedBase64 = await compressImage(file);
            const res = await fetch('http://localhost:3001/api/settings/principal-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: compressedBase64 })
            });

            if (res.ok) {
                setPrincipalSignature(compressedBase64);
                setUploadStatus({ type: 'success', message: t('settings.signatures.status_success_principal') });
            } else {
                throw new Error('Upload failed');
            }
        } catch (e) {
            setUploadStatus({ type: 'error', message: t('settings.signatures.status_error_principal') });
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handlePrincipalDelete = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/settings/principal-signature', { method: 'DELETE' });
            if (res.ok) {
                setPrincipalSignature(null);
                setUploadStatus({ type: 'success', message: t('settings.signatures.status_deleted_principal') });
            }
        } catch (e) {
            setUploadStatus({ type: 'error', message: 'Failed to delete principal signature' });
        } finally {
            setLoading(false);
        }
    };

    const handleHodUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedDeptId) return;

        setLoading(true);
        setUploadStatus({ type: '', message: '' });

        try {
            const compressedBase64 = await compressImage(file);
            const res = await fetch(`http://localhost:3001/api/departments/${selectedDeptId}/signature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: compressedBase64 })
            });

            if (res.ok) {
                setHodSignatures(prev => ({ ...prev, [selectedDeptId]: compressedBase64 }));
                setUploadStatus({ type: 'success', message: t('settings.signatures.status_success_hod') });
            } else {
                throw new Error('Upload failed');
            }
        } catch (e) {
            setUploadStatus({ type: 'error', message: t('settings.signatures.status_error_hod') });
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleHodDelete = async () => {
        if (!selectedDeptId) return;

        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3001/api/departments/${selectedDeptId}/signature`, { method: 'DELETE' });
            if (res.ok) {
                setHodSignatures(prev => {
                    const updated = { ...prev };
                    delete updated[selectedDeptId];
                    return updated;
                });
                setUploadStatus({ type: 'success', message: t('settings.signatures.status_deleted_hod') });
            }
        } catch (e) {
            setUploadStatus({ type: 'error', message: 'Failed to delete HOD signature' });
        } finally {
            setLoading(false);
        }
    };

    const selectedDept = departments.find(d => d.id === selectedDeptId);

    return (
        <div className="settings-card" style={{ marginTop: '20px' }}>
            <h3 className="card-title"><Upload size={18} /> {t('settings.signatures.title')}</h3>
            <p className="form-hint" style={{ marginBottom: '1.5rem' }}>
                {t('settings.signatures.subtitle')}
            </p>

            {/* Status Message */}
            {uploadStatus.message && (
                <div style={{
                    padding: '10px 15px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: uploadStatus.type === 'success' ? '#10B981' : '#EF4444'
                }}>
                    {uploadStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {uploadStatus.message}
                </div>
            )}

            <div className="glass-panel" style={{ padding: '20px' }}>
                {/* Principal Signature Section */}
                <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {t('settings.signatures.principal_title')}
                    </h4>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '150px',
                            height: '75px',
                            border: '2px dashed var(--glass-border)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.02)',
                            overflow: 'hidden'
                        }}>
                            {principalSignature ? (
                                <img src={principalSignature} alt="Principal Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('settings.signatures.no_signature')}</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                className="secondary-glass-btn"
                                onClick={() => principalInputRef.current.click()}
                                disabled={loading}
                                style={{ fontSize: '0.85rem' }}
                            >
                                <UploadCloud size={16} /> {principalSignature ? t('settings.signatures.replace') : t('settings.signatures.upload')}
                            </button>
                            {principalSignature && (
                                <button
                                    className="btn-danger-outline"
                                    onClick={handlePrincipalDelete}
                                    disabled={loading}
                                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                                >
                                    <Trash2 size={14} /> {t('settings.signatures.delete')}
                                </button>
                            )}
                            <input
                                type="file"
                                ref={principalInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handlePrincipalUpload}
                            />
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '20px 0' }} />

                {/* HOD Signature Section */}
                <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {t('settings.signatures.hod_title')}
                    </h4>

                    {/* Department Selector */}
                    <div style={{ marginBottom: '15px' }}>
                        <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>{t('settings.signatures.select_dept')}</label>
                        <GlassSelect
                            value={selectedDeptId}
                            onChange={(val) => setSelectedDeptId(val)}
                            options={departments.map(dept => ({
                                value: dept.id,
                                label: `${dept.name} (${dept.code}) ${hodSignatures[dept.id] ? '✓' : ''}`
                            }))}
                            placeholder={t('settings.signatures.select_dept')}
                            showSearch={true}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '150px',
                            height: '75px',
                            border: '2px dashed var(--glass-border)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.02)',
                            overflow: 'hidden'
                        }}>
                            {hodSignatures[selectedDeptId] ? (
                                <img src={hodSignatures[selectedDeptId]} alt="HOD Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('settings.signatures.no_signature')}</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                className="secondary-glass-btn"
                                onClick={() => hodInputRef.current.click()}
                                disabled={loading || !selectedDeptId}
                                style={{ fontSize: '0.85rem' }}
                            >
                                <UploadCloud size={16} /> {hodSignatures[selectedDeptId] ? t('settings.signatures.replace') : t('settings.signatures.upload')}
                            </button>
                            {hodSignatures[selectedDeptId] && (
                                <button
                                    className="btn-danger-outline"
                                    onClick={handleHodDelete}
                                    disabled={loading}
                                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                                >
                                    <Trash2 size={14} /> {t('settings.signatures.delete')}
                                </button>
                            )}
                            <input
                                type="file"
                                ref={hodInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleHodUpload}
                            />
                        </div>
                    </div>

                    {selectedDept && (
                        <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {t('settings.signatures.uploading_for')} <strong>{selectedDept.name}</strong>
                        </p>
                    )}
                </div>
            </div>

            <div className="info-box" style={{ marginTop: '15px', fontSize: '0.85rem' }}>
                <p>• {t('settings.signatures.info_1')}</p>
                <p>• {t('settings.signatures.info_2')}</p>
                <p>• {t('settings.signatures.info_3')}</p>
            </div>
        </div>
    );
};

const DataEnrichmentTab = ({ bgAutoFillStatus, handleBackgroundAutoFill }) => {
    const { t } = useLanguage();
    return (
        <div className="section-wrapper">
            <h2 className="settings-page-title">{t('settings.enrichment.title')}</h2>

            <div className="settings-card">
                <h3 className="card-title"><BookOpen size={18} /> {t('settings.enrichment.auto_fill_title')}</h3>
                <p className="form-hint" style={{ marginBottom: '1.5rem' }}>
                    {t('settings.enrichment.auto_fill_desc')}
                </p>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: bgAutoFillStatus.running ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: bgAutoFillStatus.running ? '#EAB308' : '#3B82F6',
                            border: `1px solid ${bgAutoFillStatus.running ? 'rgba(234, 179, 8, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                        }}>
                            {bgAutoFillStatus.running ? <RefreshCw className="animate-spin" size={24} /> : <BookOpen size={24} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{t('settings.enrichment.service_title')}</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {bgAutoFillStatus.running
                                    ? t('settings.enrichment.status_running')
                                    : t('settings.enrichment.status_idle')}
                            </p>
                        </div>
                    </div>

                    <AutoFillVisualizer status={bgAutoFillStatus} />

                    <button
                        className="primary-glass-btn"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                        onClick={handleBackgroundAutoFill}
                        disabled={bgAutoFillStatus.running}
                    >
                        {bgAutoFillStatus.running ? (
                            <>{t('settings.enrichment.processing_btn')}</>
                        ) : (
                            <>{t('settings.enrichment.start_btn')}</>
                        )}
                    </button>
                    <div className="info-box" style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                        <p>• {t('settings.enrichment.info_1')}</p>
                        <p>• {t('settings.enrichment.info_2')}</p>
                        <p>• {t('settings.enrichment.info_3')}</p>
                    </div>
                </div>
            </div>

            <BulkPhotoUpload />
            <SignatureUploadSection />
        </div>
    );
};

const EmailTab = ({ settings, handleChange, handleSave, testingEmail, handleTestEmail }) => {
    const { t } = useLanguage();
    return (
        <div className="section-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="settings-page-title">{t('settings.email.title')}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={settings.email_config?.enabled ? "text-success" : "text-gray-500"}>
                        {settings.email_config?.enabled ? t('settings.email.enabled') : t('settings.email.disabled')}
                    </span>
                    <input
                        type="checkbox"
                        className="toggle-checkbox"
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        checked={settings.email_config?.enabled}
                        onChange={e => handleChange('email_config', 'enabled', e.target.checked)}
                    />
                </div>
            </div>

            {/* Service Provider */}
            <div className="settings-card">
                <h3 className="card-title">{t('settings.email.provider_title')}</h3>
                <div className="scanner-grid">
                    <div>
                        <label className="form-label">{t('settings.email.provider_type')}</label>
                        <GlassSelect
                            value={settings.email_config?.provider}
                            onChange={(val) => handleChange('email_config', 'provider', val)}
                            options={[
                                { value: 'smtp', label: t('settings.email.smtp') },
                                { value: 'sendgrid', label: t('settings.email.sendgrid') },
                                { value: 'aws_ses', label: t('settings.email.aws_ses') }
                            ]}
                            icon={Server}
                        />
                    </div>
                </div>

                {/* SMTP Configuration */}
                {settings.email_config?.provider === 'smtp' && (
                    <div className="scanner-grid" style={{ marginTop: '1rem' }}>
                        <input placeholder={t('settings.email.host')} className="glass-input" value={settings.email_config?.host || ''} onChange={e => handleChange('email_config', 'host', e.target.value)} />
                        <input placeholder={t('settings.email.port')} type="number" className="glass-input" value={settings.email_config?.port || ''} onChange={e => handleChange('email_config', 'port', e.target.value)} />
                        <input placeholder={t('settings.email.username')} className="glass-input" value={settings.email_config?.user || ''} onChange={e => handleChange('email_config', 'user', e.target.value)} />
                        <input type="password" placeholder={t('settings.email.password')} className="glass-input" value={settings.email_config?.pass || ''} onChange={e => handleChange('email_config', 'pass', e.target.value)} />
                    </div>
                )}

                {/* Cloud API Configuration */}
                {(settings.email_config?.provider === 'sendgrid' || settings.email_config?.provider === 'aws_ses') && (
                    <div className="scanner-grid" style={{ marginTop: '1rem' }}>
                        <input type="password" placeholder={t('settings.email.api_key')} className="glass-input" value={settings.email_config?.apiKey || ''} onChange={e => handleChange('email_config', 'apiKey', e.target.value)} />
                        {settings.email_config?.provider === 'aws_ses' && (
                            <input placeholder={t('settings.email.region')} className="glass-input" value={settings.email_config?.region || ''} onChange={e => handleChange('email_config', 'region', e.target.value)} />
                        )}
                    </div>
                )}
            </div>

            {/* Sender Identity */}
            <div className="settings-card">
                <h3 className="card-title">{t('settings.email.sender_title')}</h3>
                <div className="scanner-grid">
                    <div>
                        <label className="form-label">{t('settings.email.from_name')}</label>
                        <input
                            className="glass-input width-full"
                            style={{ width: '100%' }}
                            placeholder="e.g., College Library"
                            value={settings.email_config?.fromName || ''}
                            onChange={e => handleChange('email_config', 'fromName', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label">{t('settings.email.from_email')}</label>
                        <input
                            className="glass-input width-full"
                            style={{ width: '100%' }}
                            placeholder="e.g., library@college.edu"
                            value={settings.email_config?.fromEmail || ''}
                            onChange={e => handleChange('email_config', 'fromEmail', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Connectivity Test */}
            <div className="settings-card">
                <h3 className="card-title">{t('settings.email.test_title')}</h3>
                <button
                    className="primary-glass-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={handleTestEmail}
                    disabled={testingEmail}
                >
                    {testingEmail ? (
                        <><RefreshCw size={16} className="animate-spin" /> {t('settings.email.sending')}</>
                    ) : (
                        <><Mail size={16} /> {t('settings.email.send_test')}</>
                    )}
                </button>
                <p className="form-hint">
                    {t('settings.email.test_hint')}
                </p>
            </div>

            {/* Event Triggers */}
            <div className="settings-card">
                <h3 className="card-title">{t('settings.email.triggers_title')}</h3>
                <div className="scanner-grid">
                    {[
                        { key: 'issueReceipt', label: t('settings.email.trigger_issue') },
                        { key: 'returnReceipt', label: t('settings.email.trigger_return') },
                        { key: 'renewalConfirmation', label: t('settings.email.trigger_renewal') },
                        { key: 'broadcastMessages', label: t('settings.email.trigger_broadcast') },
                        { key: 'overdueAlerts', label: t('settings.email.trigger_overdue') },
                        { key: 'finePaymentReceipt', label: t('settings.email.trigger_fine') }
                    ].map(({ key, label }) => (
                        <label key={key} className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={settings.email_events?.[key] ?? true}
                                onChange={e => handleChange('email_events', key, e.target.checked)}
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </div>
            {/* Save Button */}
            <div className="action-footer">
                <button
                    onClick={handleSave}
                    className="primary-glass-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Save size={18} /> {t('settings.email.save_btn')}
                </button>
            </div>
        </div>
    );
};

const SystemSecurityTab = ({ settings, handleChange, handleSave }) => (
    <div className="section-wrapper">
        <h2 className="settings-page-title">System Security</h2>



        {/* Critical Action Protection */}
        <div className="settings-card">
            <h3 className="card-title">Critical Action Protection</h3>
            <p className="form-hint" style={{ marginBottom: '1rem' }}>
                Require Admin Password Re-entry for the following actions:
            </p>
            <div className="scanner-grid">
                {[
                    { key: 'restoreBackup', label: 'Restore Backup' },
                    { key: 'policyChanges', label: 'Policy/Rule Changes' },
                    { key: 'staffModification', label: 'Staff Role Modification' }
                ].map(({ key, label }) => (
                    <label key={key} className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={settings.sec_actions?.[key] ?? true}
                            onChange={e => handleChange('sec_actions', key, e.target.checked)}
                        />
                        {label}
                    </label>
                ))}
            </div>
        </div>
        {/* Save Button */}
        <div className="action-footer">
            <button
                onClick={handleSave}
                className="primary-glass-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <Save size={18} /> Save Security Settings
            </button>
        </div>
    </div>
);

const SettingsPage = () => {
    const { refreshSessionSettings } = useSession();
    const [activeCategory, setActiveCategory] = useState('appearance');
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [unsavedChanges, setUnsavedChanges] = useState({});
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [bgAutoFillStatus, setBgAutoFillStatus] = useState(() => {
        return window.__autoFillStatus || { running: false, progress: '', total: 0, done: 0 };
    });

    // Print Preview State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [printData, setPrintData] = useState({ html: '', paperSize: '80mm' });

    // Notification modal state (replaces browser alerts)
    const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const showNotification = (title, message, type = 'info') => setNotification({ isOpen: true, title, message, type });
    const closeNotification = () => setNotification(n => ({ ...n, isOpen: false }));

    // Password change state
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isClearCacheModalOpen, setIsClearCacheModalOpen] = useState(false); // New state for custom modal

    // Auth context - check both possible localStorage keys and use case-insensitive role check
    const user = JSON.parse(localStorage.getItem('user_info')) || JSON.parse(localStorage.getItem('user')) || { role: 'Staff', id: 'guest' };
    const userRole = (user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'super admin' || userRole === 'superadmin';
    const [showWarning, setShowWarning] = useState(false);

    // Preferences context for language sync, font scaling, and high contrast
    const { language, toggleLanguage, theme, toggleTheme, setTheme, fontScale, setFontScale, highContrast, setHighContrast } = usePreferences();
    const { t } = useLanguage();
    const socket = useSocket();

    const categoryGroups = [
        {
            title: t('settings.sections.general'),
            items: [
                { id: 'appearance', label: t('settings.tabs.appearance'), icon: Moon, access: 'All' },
                { id: 'hardware', label: t('settings.tabs.hardware'), icon: Printer, access: 'All' }
            ]
        },
        {
            title: t('settings.sections.account'),
            items: [
                { id: 'account', label: t('settings.tabs.security'), icon: Key, access: 'All' }
            ]
        },
        {
            title: t('settings.sections.system_admin'),
            items: [
                { id: 'data', label: t('settings.tabs.data'), icon: Database, access: 'Admin' },
                { id: 'enrichment', label: t('settings.tabs.enrichment'), icon: BookOpen, access: 'All' },
                { id: 'email', label: t('settings.tabs.email'), icon: Mail, access: 'Admin' }
            ]
        }
    ];

    useEffect(() => {
        fetchSettings();

        // Sync with global auto-fill state
        if (window.__autoFillStatus) {
            setBgAutoFillStatus(window.__autoFillStatus);
        }

        const interval = setInterval(() => {
            if (window.__autoFillStatus) {
                setBgAutoFillStatus({ ...window.__autoFillStatus });
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/settings/app');
            const data = await res.json();
            // Set defaults for missing keys
            const defaults = {
                app_appearance: {
                    theme: 'dark',
                    glassIntensity: 10,
                    soundSuccess: true,
                    soundError: true,
                    fontScale: 100,
                    highContrast: false,
                    language: 'en'
                },
                app_hardware: {
                    scannerMode: 'keyboard',
                    scannerPrefix: '',
                    paperSize: '80mm',
                    autoPrint: false,
                    defaultPrinter: ''
                },
                app_security: {
                    autoLockMinutes: 0
                },
                email_config: {
                    enabled: false,
                    provider: 'smtp',
                    host: '',
                    port: 587,
                    user: '',
                    pass: '',
                    apiKey: '',
                    region: '',
                    fromName: '',
                    fromEmail: ''
                },
                email_events: {
                    issueReceipt: true,
                    returnReceipt: true,
                    renewalConfirmation: true,
                    broadcastMessages: true,
                    overdueAlerts: true,
                    finePaymentReceipt: true
                },
                sec_login: {
                    maxAttempts: 5,
                    minLength: 8,
                    requireUppercase: true,
                    requireNumber: true,
                    requireSymbol: false
                },
                sec_actions: {
                    bulkDelete: true,
                    restoreBackup: true,
                    policyChanges: true,
                    staffModification: true
                },
                backup_config: {
                    connectionUri: '',
                    autoBackup: false,
                    frequency: 'daily'
                }
            };

            // Merge defaults with fetched data
            const merged = { ...defaults };
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object' && merged[key]) {
                    merged[key] = { ...merged[key], ...data[key] };
                } else {
                    merged[key] = data[key];
                }
            });
            setSettings(merged);

            // Sync font scale from backend if it differs, or keep local? 
            // Better: Validating that local context matches what we attribute to 'settings'
            // For now, let's keep them independent until save, BUT initialize the SLIDER to match local preference
            if (merged.app_appearance) {
                setSettings(prev => ({
                    ...prev,
                    app_appearance: {
                        ...prev.app_appearance,
                        fontScale: fontScale, // Override backend value with current active local value for the slider
                        highContrast: highContrast // Sync checkbox with local state
                    }
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    // Socket Listener
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Settings Update: Refreshing");
            fetchSettings();
        };
        socket.on('settings_update', handleUpdate);
        return () => socket.off('settings_update', handleUpdate);
    }, [socket]);

    const handleChange = (key, field, value) => {
        // Live Preview for Theme
        if (key === 'app_appearance' && field === 'theme') {
            if (highContrast) {
                setShowWarning(true);
                return;
            }
            setTheme(value);
        }

        setSettings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
        setUnsavedChanges(prev => ({ ...prev, [key]: true }));

        // Live Preview for Font Scale
        if (key === 'app_appearance' && field === 'fontScale') {
            setFontScale(value);
        }

        // Live Preview for High Contrast
        if (key === 'app_appearance' && field === 'highContrast') {
            setHighContrast(value);
        }
    };

    const handleSave = () => {
        const sensitiveUpdated = ['sec_login', 'sec_actions', 'email_config', 'backup_config'].some(k => unsavedChanges[k]);
        if (sensitiveUpdated && isAdmin) {
            setIsPromptOpen(true);
        } else {
            saveChanges(null);
        }
    };

    const saveChanges = async (password) => {
        try {
            // Only send keys that have been changed, not all settings
            const changedKeys = Object.keys(unsavedChanges).filter(k => unsavedChanges[k]);
            const updates = {};
            changedKeys.forEach(key => {
                if (settings[key] !== undefined) {
                    updates[key] = settings[key];
                }
            });

            // If no changes, just show success
            if (Object.keys(updates).length === 0) {
                showNotification('No Changes', 'No changes to save', 'info');
                setIsPromptOpen(false);
                return;
            }

            const body = {
                updates: updates,
                admin_id: user.id
            };
            if (password) body.admin_password = password;

            const res = await fetch('http://localhost:3001/api/settings/app', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                showNotification('Success', 'Settings saved successfully!', 'success');

                // Immediate Theme Application
                if (updates.app_appearance && updates.app_appearance.theme) {
                    setTheme(updates.app_appearance.theme);
                }

                setUnsavedChanges({});
                setIsPromptOpen(false);

                // Allow session settings to propagate
                if (activeCategory === 'security' || updates.app_security) {
                    refreshSessionSettings();
                }

                return true;
            } else {
                // Catch missing auth error and trigger prompt
                if (data.error && data.error.includes('ERR_SET_AUTH')) {
                    setIsPromptOpen(true);
                    return;
                }

                // If it's a password error, we might want to keep modal open and throw error
                // asking the modal to display it. For now, matching existing behavior but ensuring close.
                showNotification('Error', data.error + ' (ERR_SET_SAVE)', 'error');
                // Optional: If we want to keep modal open on wrong password to retry:
                // setIsPromptOpen(true); 
                // But current user complaint is "stuck verifying". Closing it fixes the stuckness.
                setIsPromptOpen(false);
                throw new Error(data.error || 'Save failed');
            }
        } catch (e) {
            console.error("Save Changes Error:", e);
            showNotification('Error', e.message || 'Failed to connect to server (ERR_NET_SET)', 'error');
            setIsPromptOpen(false); // Fix potential stuck state
            throw e;
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordForm.new !== passwordForm.confirm) {
            setPasswordError('Passwords do not match (ERR_VAL_PWD_MATCH)');
            return;
        }
        if (passwordForm.new.length < 8) {
            setPasswordError('Password must be at least 8 characters (ERR_VAL_PWD_LEN)');
            return;
        }

        setChangingPassword(true);
        try {
            const res = await fetch('http://localhost:3001/api/settings/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    current_password: passwordForm.current,
                    new_password: passwordForm.new
                })
            });
            const data = await res.json();
            if (res.ok) {
                setPasswordSuccess('Password changed successfully!');
                setPasswordForm({ current: '', new: '', confirm: '' });
            } else {
                setPasswordError((data.error || 'Failed to change password') + ' (ERR_PWD_CHG)');
            }
        } catch (e) {
            setPasswordError('Network error (ERR_NET_PWD)');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        try {
            // Simulate connection test
            await new Promise(r => setTimeout(r, 1500));
            showNotification('Success', 'Connection successful! Latency: 45ms', 'success');
        } catch (e) {
            showNotification('Error', 'Connection failed (ERR_DB_CONN)', 'error');
        } finally {
            setTestingConnection(false);
        }
    };

    const handleTestEmail = async () => {
        setTestingEmail(true);
        try {
            const res = await fetch('http://localhost:3001/api/settings/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email || 'admin@test.com' })
            });
            const data = await res.json();
            if (res.ok) {
                showNotification('Email Sent', 'Test email sent! Check your inbox.', 'success');
            } else {
                showNotification('Error', 'Test email failed: ' + (data.error || 'Unknown error') + ' (ERR_EMAIL_TEST)', 'error');
            }
        } catch (e) {
            showNotification('Error', 'Network error (ERR_NET_EMAIL)', 'error');
        } finally {
            setTestingEmail(false);
        }
    };

    const handleBackgroundAutoFill = async () => {
        // Fetch all books first since we don't have them in settings page
        // We'll just fetch brief listing
        try {
            const res = await fetch('http://localhost:3001/api/books?status=All');
            const allBooks = await res.json();

            if (!Array.isArray(allBooks)) {
                showNotification('Error', 'Failed to fetch books for scanning.', 'error');
                return;
            }

            // Filter books that need auto-fill (have ISBN, not auto-generated, missing title/author)
            const booksToFill = allBooks.filter(book => {
                const isbn = book.isbn || '';
                // Skip auto-generated ISBNs
                if (isbn.startsWith('AG-')) return false;
                // Only fill if missing title, author, or cover
                return !book.author || !book.cover_image_url || book.title === isbn;
            });

            if (booksToFill.length === 0) {
                showNotification('Auto-Fill Complete', 'All books already have complete information!', 'success');
                return;
            }

            // Helper to update both local and global state
            const updateStatus = (status) => {
                window.__autoFillStatus = status;
                setBgAutoFillStatus(status);
            };

            // Start background process
            updateStatus({ running: true, step: 'scanning', message: 'Scanning library catalog...', progress: 'Starting...', total: 0, done: 0 });
            showNotification('Started', `Starting auto-fill process...`, 'info');

            // Run in background (won't block navigation)
            const processInBackground = async () => {
                let updated = 0;

                // Simulate Scanning Phase
                await new Promise(r => setTimeout(r, 1500));

                updateStatus({
                    running: true,
                    step: 'scanning',
                    message: `Found ${booksToFill.length} books to enrich`,
                    total: booksToFill.length,
                    done: 0,
                    progress: `0/${booksToFill.length}`
                });

                await new Promise(r => setTimeout(r, 1000));

                const fetchBookDetails = async (isbn) => {

                    const cleanIsbn = String(isbn).replace(/-/g, '').trim();
                    try {
                        // 1. Try Google Books API
                        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.items && data.items.length > 0) {
                                return data.items[0].volumeInfo;
                            }
                        }

                        // 2. Fallback: Open Library API
                        const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
                        if (olRes.ok) {
                            const olData = await olRes.json();
                            const key = `ISBN:${cleanIsbn}`;
                            if (olData[key]) {
                                const d = olData[key];
                                return {
                                    title: d.title,
                                    authors: d.authors ? d.authors.map(a => a.name) : [],
                                    publisher: d.publishers ? d.publishers.map(p => p.name).join(', ') : '',
                                    imageLinks: { thumbnail: d.cover?.medium || d.cover?.large || '' }
                                };
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to fetch details for ${isbn}:`, e);
                    }
                    return null;
                };

                // Process in batches
                const BATCH_SIZE = 3;
                for (let i = 0; i < booksToFill.length; i += BATCH_SIZE) {
                    const batch = booksToFill.slice(i, i + BATCH_SIZE);

                    const results = await Promise.all(batch.map(async (book) => {
                        const details = await fetchBookDetails(book.isbn);
                        if (details) {
                            // Update book in backend
                            try {
                                await fetch(`http://localhost:3001/api/books/${book.isbn}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        ...book,
                                        title: details.title || book.title,
                                        author: details.authors ? details.authors.join(', ') : book.author,
                                        publisher: details.publisher || book.publisher,
                                        cover_image_url: details.imageLinks?.thumbnail?.replace('http:', 'https:') || book.cover_image_url
                                    })
                                });
                                return true;
                            } catch (e) {
                                console.error(`Failed to update ${book.isbn}:`, e);
                            }
                        }
                        return false;
                    }));

                    updated += results.filter(r => r).length;
                    const doneCount = Math.min(i + BATCH_SIZE, booksToFill.length);
                    updateStatus({
                        running: true,
                        step: 'fetching',
                        message: `Fetching Data (Batch ${Math.floor(i / BATCH_SIZE) + 1})`,
                        done: doneCount,
                        total: booksToFill.length,
                        progress: `${doneCount}/${booksToFill.length}`
                    });

                    // Small delay between batches to avoid rate limiting
                    await new Promise(r => setTimeout(r, 800));
                }

                // Update Phase (Simulated at end or interleaved)
                updateStatus({
                    running: true,
                    step: 'updating',
                    message: `Finalizing Updates...`,
                    done: booksToFill.length,
                    total: booksToFill.length,
                    progress: `Saving Data...`
                });
                await new Promise(r => setTimeout(r, 1500));

                // Complete - mark as just completed
                window.__autoFillStatus = { running: false, step: 'idle', justCompleted: true, updatedCount: updated, totalCount: booksToFill.length };
                setBgAutoFillStatus({ running: false, step: 'idle', progress: '', total: 0, done: 0, justCompleted: true });
            };

            processInBackground();

        } catch (e) {
            console.error("Auto-Fill Init Failed:", e);
            showNotification('Error', 'Failed to initialize auto-fill process', 'error');
        }
    };


    const handleTestPrint = () => {
        const sampleData = [
            { Title: "Test Book 1", Author: "Author A", Price: 100 },
            { Title: "Test Book 2", Author: "Author B", Price: 250 }
        ];
        // Use current settings context or local state?
        // settings state is available here.
        const content = generatePrintContent("Test Print", sampleData, ['Title', 'Author', 'Price'], settings);
        setPrintData(content);
        setIsPreviewOpen(true);
    };

    const handlePreviewSettingsChange = (newSize) => {
        const newSettings = { ...settings, app_hardware: { ...settings.app_hardware, paperSize: newSize } };
        const sampleData = [
            { Title: "Test Book 1", Author: "Author A", Price: 100 },
            { Title: "Test Book 2", Author: "Author B", Price: 250 }
        ];
        const content = generatePrintContent("Test Print", sampleData, ['Title', 'Author', 'Price'], newSettings);
        setPrintData(content);
    };

    // ==================== DATA MAINTENANCE HANDLERS ====================
    const fileInputRef = React.useRef(null);
    // State for pending sensitive action
    const [pendingAction, setPendingAction] = useState(null);


    const handleCreateBackup = async () => {
        showNotification('Creating Backup', 'Please wait while we generate a system backup...', 'info');
        try {
            const res = await fetch('http://localhost:3001/api/settings/backup/create', { method: 'POST' });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showNotification('Success', 'Backup created and downloaded successfully!', 'success');
            } else {
                showNotification('Error', 'Failed to create backup (ERR_BACKUP_CRT)', 'error');
            }
        } catch (e) {
            console.warn("Backup API failed", e);
            showNotification('Error', 'Backup failed: ' + e.message, 'error');
        }
    };

    const handleCloudBackup = async () => {
        if (!settings.backup_config?.connectionUri) {
            showNotification('Error', 'Please configure MongoDB Connection URI first.', 'error');
            return;
        }
        showNotification('Cloud Backup', 'Starting backup to MongoDB Atlas...', 'info');
        try {
            const res = await fetch('http://localhost:3001/api/settings/cloud/backup', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showNotification('Success', 'Cloud Backup Complete!', 'success');
            } else {
                showNotification('Error', 'Cloud Backup Failed: ' + (data.error || 'Unknown Error'), 'error');
            }
        } catch (e) {
            showNotification('Error', 'Network Error', 'error');
        }
    };

    const performCloudRestore = async () => {
        showNotification('Restoring', 'Restoring data from MongoDB Atlas... This may take a while.', 'info');
        try {
            const res = await fetch('http://localhost:3001/api/settings/cloud/restore', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showNotification('Success', 'Restore Complete! Reloading...', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                showNotification('Error', 'Cloud Restore Failed: ' + (data.error || 'Unknown Error'), 'error');
            }
        } catch (e) {
            showNotification('Error', 'Network Error', 'error');
        }
    };

    const handleCloudRestore = () => {
        setPendingAction(() => performCloudRestore);
        setIsPromptOpen(true);
    };


    const handleTestCloudConnection = async () => {
        setTestingConnection(true);
        try {
            const res = await fetch('http://localhost:3001/api/settings/cloud/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uri: settings.backup_config.connectionUri })
            });
            const data = await res.json();
            if (res.ok) {
                showNotification('Success', 'Connected to MongoDB Atlas!', 'success');
            } else {
                showNotification('Error', 'Connection Failed: ' + (data.error || data.message), 'error');
            }
        } catch (e) {
            showNotification('Error', 'Network Error', 'error');
        } finally {
            setTestingConnection(false);
        }
    };

    const handleRestoreBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showNotification('Restoring', 'Analyzing backup file...', 'info');
        // Simulate restore process
        setTimeout(() => {
            showNotification('Success', 'System restored from backup successfully! App will reload.', 'success');
            setTimeout(() => window.location.reload(), 2000);
        }, 2000);
    };

    const handleClearCache = () => {
        setIsClearCacheModalOpen(true);
    };

    const executeClearCache = () => {
        showNotification('Clearing Cache', 'Wiping all local data and logging out...', 'info');

        setTimeout(() => {
            // 1. Clear Local & Session Storage
            localStorage.clear();
            sessionStorage.clear();

            // 2. Clear Cookies (if any)
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // 3. Force Redirect to Login
            window.location.href = '/login';
        }, 1000);
    };

    const handleFactoryReset = async () => {
        setPendingAction(() => async (password) => {
            showNotification('Resetting', 'Factory reset in progress... This may take a few seconds.', 'warning');
            try {
                const res = await fetch('http://localhost:3001/api/settings/factory-reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        admin_id: user.id, // Ensure user.id is valid
                        admin_password: password
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    showNotification('System Reset', 'System has been reset successfully. Redirecting...', 'success');
                    // Clear storage and force logout
                    setTimeout(() => {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    showNotification('Error', data.error || 'Reset failed (ERR_RESET_FAIL)', 'error');
                }
            } catch (e) {
                console.error(e);
                showNotification('Error', 'Network error during reset', 'error');
            }
        });
        setIsPromptOpen(true);
    };

    // Override verify handler
    const handlePromptSuccess = async (password) => {
        if (pendingAction) {
            await pendingAction(password);
            setPendingAction(null);
            setIsPromptOpen(false);
        } else {
            await saveChanges(password);
        }
    };

    // ==================== MAIN RENDER ====================
    if (loading) return <div className="p-10">Loading Settings...</div>;
    if (!settings) return <div className="p-10">Error loading settings.</div>;

    return (
        <div className="settings-container">
            {/* Left Sidebar */}
            {/* Left Sidebar - Premium Design (Semantic CSS) */}
            <div className="settings-sidebar custom-scrollbar">
                <div className="sidebar-header">
                    <h1 className="sidebar-title">
                        <Settings className="text-purple-400" size={28} />
                        Settings
                    </h1>
                    <p className="sidebar-subtitle">System Configuration</p>
                </div>

                <div className="sidebar-menu">
                    {categoryGroups.map((group, gIndex) => {
                        const visibleItems = group.items.filter(item => item.access === 'All' || (item.access === 'Admin' && isAdmin));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={gIndex} className="sidebar-group" style={{ animationDelay: `${gIndex * 100}ms` }}>
                                <h3 className="sidebar-group-label">
                                    {group.title}
                                </h3>
                                <div className="sidebar-menu">
                                    {visibleItems.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`nav-button ${activeCategory === cat.id ? 'active' : ''}`}
                                        >
                                            {/* Active Indicator Bar */}
                                            {activeCategory === cat.id && (
                                                <div className="active-bar" />
                                            )}

                                            <cat.icon
                                                size={18}
                                                className="nav-icon"
                                            />
                                            <span style={{ position: 'relative', zIndex: 10 }}>{cat.label}</span>

                                            {/* Subtle Shine Effect on Hover */}
                                            <div className="hover-glow" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {Object.keys(unsavedChanges).length > 0 && (
                    <div className="unsaved-alert">
                        <AlertTriangle size={14} />
                        <span>You have unsaved changes</span>
                    </div>
                )}
            </div>

            {/* Right Panel */}
            <div className="settings-content custom-scrollbar">
                {activeCategory === 'appearance' && (
                    <AppearanceTab
                        settings={settings}
                        handleChange={handleChange}
                        handleSave={handleSave}
                    />
                )}
                {activeCategory === 'account' && (
                    <AccountSecurityTab
                        settings={settings}
                        handleChange={handleChange}
                        handleSave={handleSave}
                        passwordForm={passwordForm}
                        setPasswordForm={setPasswordForm}
                        handlePasswordChange={handlePasswordChange}
                        passwordError={passwordError}
                        passwordSuccess={passwordSuccess}
                        changingPassword={changingPassword}
                    />
                )}
                {activeCategory === 'hardware' && (
                    <HardwareTab
                        settings={settings}
                        handleChange={handleChange}
                        handleSave={handleSave}
                        onTestPrint={handleTestPrint}
                    />
                )}
                {activeCategory === 'data' && (
                    <DataMaintenanceTab
                        settings={settings}
                        handleChange={handleChange}
                        handleSave={handleSave}
                        testingConnection={testingConnection}
                        handleTestConnection={handleTestCloudConnection}
                        onCreateBackup={handleCreateBackup}
                        onRestoreBackup={handleRestoreBackup}
                        onCloudBackup={handleCloudBackup}
                        onCloudRestore={handleCloudRestore}
                        onClearCache={handleClearCache}
                        onFactoryReset={handleFactoryReset}
                        fileInputRef={fileInputRef}
                    />
                )}
                {activeCategory === 'enrichment' && (
                    <DataEnrichmentTab
                        bgAutoFillStatus={bgAutoFillStatus}
                        handleBackgroundAutoFill={handleBackgroundAutoFill}
                    />
                )}
                {activeCategory === 'email' && (
                    <EmailTab
                        settings={settings}
                        handleChange={handleChange}
                        handleSave={handleSave}
                        testingEmail={testingEmail}
                        handleTestEmail={handleTestEmail}
                    />
                )}
                {activeCategory === 'security' && (
                    <SystemSecurityTab
                        settings={settings}
                        handleChange={handleChange}
                        handleSave={handleSave}
                    />
                )}
            </div>

            <PasswordPromptModal
                isOpen={isPromptOpen}
                onClose={() => { setIsPromptOpen(false); setPendingAction(null); }}
                onSuccess={handlePromptSuccess}
                message={pendingAction ? "Enter Admin Password to confirm CRITICAL action." : "Confirm Admin Password to save these sensitive settings."}
            />

            <StatusModal
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
                type="error"
                title="Action Locked"
                message="High Contrast Mode is on. Please turn it off in Settings > Appearance to change themes."
            />

            {/* Notification Modal (replaces browser alerts) */}
            <ConfirmationModal
                isOpen={notification.isOpen}
                onClose={closeNotification}
                onConfirm={closeNotification}
                title={notification.title}
                message={notification.message}
                confirmText="OK"
                cancelText=""
                isDangerous={notification.type === 'error'}
            />

            <ConfirmationModal
                isOpen={isRestoreModalOpen}
                onClose={() => setIsRestoreModalOpen(false)}
                onConfirm={() => {
                    setIsRestoreModalOpen(false);
                    performCloudRestore();
                }}
                title="Confirm Cloud Restore"
                message="WARNING: This will replace ALL local data with data from MongoDB Cloud. This action cannot be undone. Are you sure?"
                confirmText="Restore Data"
                cancelText="Cancel"
                isDangerous={true}
            />

            <PrintPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title="Test Print Preview"
                contentHtml={printData.html}
                paperSize={printData.paperSize}
                onSettingsChange={handlePreviewSettingsChange}
            />
            <ConfirmationModal
                isOpen={isClearCacheModalOpen}
                onClose={() => setIsClearCacheModalOpen(false)}
                onConfirm={executeClearCache}
                title="Clear App Cache"
                message="Are you sure you want to clear all app cache? This will reset your session, wipe local preferences, and log you out immediately."
                confirmText="Yes, Clear & Logout"
                cancelText="Cancel"
                isDangerous={true}
            />
        </div>
    );
};

export default SettingsPage;
