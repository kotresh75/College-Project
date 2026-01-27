import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Database, RefreshCw, ChevronLeft, ChevronRight, Table, AlertTriangle } from 'lucide-react';

const DatabaseGuiTab = () => {
    const { t } = useLanguage();
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [error, setError] = useState('');

    // Fetch Tables on Mount
    useEffect(() => {
        fetchTables();
    }, []);

    // Fetch Data when Table or Page Changes
    useEffect(() => {
        if (selectedTable) {
            fetchTableData(selectedTable, pagination.page);
        }
    }, [selectedTable, pagination.page]);

    const fetchTables = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/db/tables');
            if (res.ok) {
                const data = await res.json();
                setTables(data.map(t => t.name));
            } else {
                setError('Failed to fetch tables');
            }
        } catch (e) {
            setError('Network error fetching tables');
        } finally {
            setLoading(false);
        }
    };

    const fetchTableData = async (tableName, page) => {
        setLoadingData(true);
        setError('');
        try {
            // First fetch schema if we don't have it (or just rely on first row keys? safer to get schema for empty tables)
            // For simplicity, let's just use data keys first, if empty, we won't see columns.
            // Actually, let's fetch schema too for better UX

            const schemaRes = await fetch(`http://localhost:3001/api/db/schema/${tableName}`);
            if (schemaRes.ok) {
                const schema = await schemaRes.json();
                setColumns(schema.map(c => c.name));
            }

            const res = await fetch(`http://localhost:3001/api/db/query?table=${tableName}&page=${page}&limit=${pagination.limit}`);
            if (res.ok) {
                const result = await res.json();
                setTableData(result.data);
                setPagination(prev => ({ ...prev, ...result.pagination }));
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to fetch data');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoadingData(false);
        }
    };

    const handleTableChange = (tableName) => {
        setSelectedTable(tableName);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleRefresh = () => {
        if (selectedTable) fetchTableData(selectedTable, pagination.page);
        else fetchTables();
    };

    return (
        <div className="section-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="settings-page-title">{t('settings.db.title') || 'Database Inspector'}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="nav-button"
                        onClick={handleRefresh}
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading || loadingData ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="settings-card" style={{
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '1rem'
                }}>
                    <AlertTriangle size={20} color="#ef4444" />
                    <span style={{ color: '#ef4444' }}>{error}</span>
                </div>
            )}

            <div className="settings-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', minHeight: '500px' }}>
                {/* Sidebar: Table List */}
                <div style={{
                    width: '250px',
                    borderRight: '1px solid var(--glass-border)',
                    background: 'rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Database size={14} /> Tables ({tables.length})
                        </span>
                    </div>
                    <div className="layout-scroll-container" style={{ flex: 1, padding: '0.5rem' }}>
                        {loading && tables.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', fontStyle: 'italic', opacity: 0.6 }}>Loading...</div>
                        ) : (
                            tables.map(table => (
                                <button
                                    key={table}
                                    onClick={() => handleTableChange(table)}
                                    className={`nav-button ${selectedTable === table ? 'active' : ''}`}
                                    style={{
                                        width: '100%', justifyContent: 'flex-start', marginBottom: '4px',
                                        background: selectedTable === table ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                        border: selectedTable === table ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                                        color: selectedTable === table ? '#3b82f6' : 'var(--text-main)'
                                    }}
                                >
                                    <Table size={14} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{table}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content: Data Grid */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {selectedTable ? (
                        <>
                            {/* Toolbar (Pagination mainly) */}
                            <div style={{
                                padding: '0.75rem',
                                borderBottom: '1px solid var(--glass-border)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span style={{ fontWeight: 600 }}>{selectedTable}</span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {/* Rows Per Page Selector */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Rows:</span>
                                        <select
                                            value={pagination.limit}
                                            onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                                            style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid var(--glass-border)',
                                                color: 'var(--text-main)',
                                                borderRadius: '4px',
                                                padding: '2px 4px',
                                                outline: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value={10}>10</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={500}>500</option>
                                            <option value={10000}>All</option>
                                        </select>
                                    </div>

                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {pagination.limit >= 10000 ? (
                                            `Total ${pagination.total} records`
                                        ) : (
                                            `Rows ${((pagination.page - 1) * pagination.limit) + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`
                                        )}
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            className="nav-button"
                                            disabled={pagination.page <= 1 || loadingData || pagination.limit >= 10000}
                                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                            style={{ padding: '4px 8px' }}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            className="nav-button"
                                            disabled={pagination.page >= pagination.totalPages || loadingData || pagination.limit >= 10000}
                                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                            style={{ padding: '4px 8px' }}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Table Container */}
                            <div className="layout-scroll-container" style={{ flex: 1, position: 'relative' }}>
                                {loadingData ? (
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(0,0,0,0.1)'
                                    }}>
                                        <RefreshCw className="animate-spin" size={32} />
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr>
                                                    {columns.map(col => (
                                                        <th key={col} style={{
                                                            textAlign: 'left', padding: '8px 12px',
                                                            borderBottom: '1px solid var(--glass-border)',
                                                            color: 'var(--text-secondary)', fontWeight: 600,
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tableData.length > 0 ? (
                                                    tableData.map((row, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            {columns.map(col => (
                                                                <td key={col} style={{
                                                                    padding: '8px 12px',
                                                                    color: 'var(--text-main)',
                                                                    maxWidth: '300px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }} title={row[col]}>
                                                                    {row[col] !== null ? String(row[col]) : <span style={{ fontStyle: 'italic', opacity: 0.5 }}>NULL</span>}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                                                            No data found in this table.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.5 }}>
                            <Database size={48} style={{ marginBottom: '1rem' }} />
                            <p>Select a table to inspect schema and data.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatabaseGuiTab;
