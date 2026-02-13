/**
 * SmartPrinterHandler
 * Handles data formatting and PDF generation (Printing removed)
 */
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const getPrintStyles = (paperSize) => {
    const baseStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-container { width: 100%; max-width: 100%; box-sizing: border-box; }
        
        /* Modern Header styling */
        .print-header { 
            display: flex; 
            align-items: center; 
            gap: 20px;
            padding-bottom: 20px; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #4f46e5; /* Indigo accent */
            background: #fff;
        }
        .print-logo { height: 80px; width: auto; object-fit: contain; }
        .header-text { display: flex; flex-direction: column; justify-content: center; }
        .org-name { font-size: 24px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2; margin: 0; }
        .doc-title { font-size: 16px; font-weight: 600; color: #475569; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .print-date { font-size: 12px; color: #64748b; font-weight: 500; margin-top: 2px; }

        /* Premium Table Styling */
        table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 25px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; table-layout: auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
        th { 
            background-color: #f8fafc; 
            color: #334155; 
            font-weight: 700; 
            font-size: 11px; 
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            border-bottom: 2px solid #e2e8f0; 
        }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) td { background-color: #f8fafc; }
        tr:hover td { background-color: #f1f5f9; }
        
        /* Section styling */
        .section-title {
            font-size: 14px; font-weight: 700; color: #1e293b;
            margin: 30px 0 12px 0; padding: 8px 16px;
            background: linear-gradient(90deg, #eff6ff, transparent);
            border-left: 4px solid #3b82f6; border-radius: 0 4px 4px 0;
            display: flex; align-items: center; gap: 8px;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        @page { size: auto; margin: 10mm; }
    `;

    // Smart Landscape Overrides
    const landscapeStyles = `
        /* Landscape Optimization */
        @media print and (orientation: landscape) {
            @page { margin: 5mm; } /* Tighter margins in landscape to fit more cols */
            .print-container { width: 100% !important; max-width: none !important; }
            table { width: 100%; font-size: 0.85em; table-layout: fixed; } /* Slightly smaller font for dense data */
            th, td { padding: 8px 10px; overflow: hidden; text-overflow: ellipsis; } /* Compact padding */
            .section-title { margin-top: 20px; }
        }
    `;

    // Thermal Specific Styles (58mm / 80mm) - Keep Simple
    if (paperSize === '58mm' || paperSize === '80mm') {
        return `
            ${baseStyles}
            body { font-family: 'Courier New', monospace; font-size: 12px; }
            .print-container { width: ${paperSize === '58mm' ? '58mm' : '80mm'}; margin: 0 auto; }
            .print-header { border-bottom: 1px dashed #000; background: none; }
            .org-name { font-size: 1.1em; }
            .doc-title { font-size: 1em; }
            table { font-size: 11px; border: none; box-shadow: none; border-radius: 0; }
            th, td { padding: 4px 2px; border: none; border-bottom: 1px dashed #ccc; }
            th { background: transparent; border-bottom: 1px solid #000; }
        `;
    }

    // A4 (Standard)
    return `
        ${baseStyles}
        ${landscapeStyles}
        body { font-size: 14px; }
        table { font-size: 12px; }
    `;
};

const formatTableData = (data, columns, title) => {
    if (!data || !data.length) return '<p class="text-center">No Data Available</p>';

    const headers = columns.map(col => `<th>${col.label || col}</th>`).join('');
    const rows = data.map(item => {
        const cells = columns.map(col => {
            // Handle obj based or simple string columns
            const val = typeof col === 'object' ?
                (col.render ? col.render(item) : item[col.key]) :
                item[col]; // If columns are just keys

            // Clean simple render outputs if they are React elements (not supported in raw HTML print)
            // For now assuming primitive values or simple strings
            return `<td>${val !== undefined && val !== null ? val : '-'}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `
        <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

const formatReceiptHtml = (transaction, paperSize) => {
    // Helper to format date in DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const formatTime = (dateString) => {
        const d = dateString ? new Date(dateString) : new Date();
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const isThermal = paperSize === '58mm' || paperSize === '80mm';
    const width = isThermal ? paperSize : '320px';
    const receiptId = transaction.receipt_number || transaction.id || '';
    const displayId = receiptId.replace('REC-', '');
    const totalAmount = parseFloat(transaction.total || transaction.amount || 0).toFixed(2);

    // Items Rows
    const items = transaction.items && transaction.items.length > 0
        ? transaction.items
        : [{ description: 'Fine Payment', amount: transaction.amount }];

    const itemsHtml = items.map((item, i) => `
        <tr>
            <td style="padding:4px 0;font-size:${isThermal ? '11px' : '13px'};color:#374151;">${i + 1}. ${item.description || 'Fine'}</td>
            <td style="padding:4px 0;font-size:${isThermal ? '11px' : '13px'};color:#111;font-weight:600;text-align:right;white-space:nowrap;">₹${parseFloat(item.amount).toFixed(2)}</td>
        </tr>
    `).join('');

    // ===== THERMAL RECEIPT (58mm / 80mm) =====
    if (isThermal) {
        return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; }
            body {
                font-family: 'JetBrains Mono', 'Courier New', monospace;
                font-size: 11px;
                color: #000;
                background: #fff;
                padding: 6px;
                width: ${width};
                margin: 0 auto;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .r-box { width: 100%; }
            .r-center { text-align: center; }
            .r-bold { font-weight: 700; }
            .r-divider {
                border: none;
                border-top: 1px dashed #999;
                margin: 6px 0;
            }
            .r-double-divider {
                border: none;
                border-top: 2px double #555;
                margin: 6px 0;
            }
            .r-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 1px 0;
                font-size: 11px;
            }
            .r-row .r-label { color: #555; flex-shrink: 0; }
            .r-row .r-value { text-align: right; font-weight: 500; word-break: break-all; }
            .r-items th {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #666;
                padding: 2px 0;
                text-align: left;
                border-bottom: 1px solid #999;
            }
            .r-items th:last-child { text-align: right; }
            .r-total-row {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                font-weight: 700;
                padding: 4px 0;
                letter-spacing: 0.3px;
            }
            .r-footer {
                text-align: center;
                font-size: 9px;
                color: #777;
                margin-top: 8px;
                line-height: 1.5;
            }
            .r-cut {
                text-align: center;
                font-size: 9px;
                color: #aaa;
                margin-top: 10px;
                letter-spacing: 3px;
            }
            @media print {
                body { padding: 0; }
            }
        </style>

        <div class="r-box">
            <!-- Header -->
            <div class="r-center" style="margin-bottom:4px;">
                <div style="font-size:14px;font-weight:700;letter-spacing:0.5px;">GPT KAMPLI LIBRARY</div>
                <div style="font-size:9px;color:#666;margin-top:1px;">Govt Polytechnic, Kampli - 583132</div>
            </div>

            <hr class="r-double-divider">

            <div class="r-center" style="font-size:12px;font-weight:700;letter-spacing:1.5px;padding:2px 0;">
                ✦ PAYMENT RECEIPT ✦
            </div>

            <hr class="r-divider">

            <!-- Info -->
            <div style="padding:2px 0;">
                <div class="r-row"><span class="r-label">Receipt #</span><span class="r-value r-bold">${receiptId}</span></div>
                <div class="r-row"><span class="r-label">Date</span><span class="r-value">${formatDate(transaction.date)} ${formatTime(transaction.date)}</span></div>
                <div class="r-row"><span class="r-label">Student</span><span class="r-value r-bold">${transaction.student_name || '-'}</span></div>
                <div class="r-row"><span class="r-label">Reg No</span><span class="r-value">${transaction.roll_number || '-'}</span></div>
            </div>

            <hr class="r-divider">

            <!-- Items -->
            <table class="r-items" style="width:100%;border-collapse:collapse;">
                <thead><tr><th>Description</th><th>Amt</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            <hr class="r-double-divider">

            <!-- Total -->
            <div class="r-total-row">
                <span>TOTAL PAID</span>
                <span>₹${totalAmount}</span>
            </div>

            <div class="r-row" style="margin-top:2px;">
                <span class="r-label">Payment</span>
                <span class="r-value" style="text-transform:uppercase;">${transaction.payment_method || 'Cash'}</span>
            </div>

            <hr class="r-divider">

            <!-- Receipt ID -->
            <div class="r-center" style="padding:4px 0;">
                <div style="font-size:8px;letter-spacing:3px;color:#999;">${displayId}</div>
            </div>

            <!-- Footer -->
            <div class="r-footer">
                Thank you for clearing your dues!<br>
                Computer Generated Receipt
            </div>

            <!-- Cut Line -->
            <div class="r-cut">✂ - - - - - - - - - - - - - - ✂</div>
        </div>
        `;
    }

    // ===== NORMAL PRINTER RECEIPT (A4 centered) =====
    return `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 13px;
            color: #1e293b;
            background: #fff;
            display: flex;
            justify-content: center;
            padding: 30px 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .receipt-card {
            width: ${width};
            max-width: 360px;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .receipt-header {
            background: linear-gradient(135deg, #1e3a5f 0%, #0f2940 100%);
            color: #fff;
            padding: 18px 20px;
            text-align: center;
        }
        .receipt-header h1 {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .receipt-header p {
            font-size: 11px;
            opacity: 0.7;
            font-weight: 400;
        }
        .receipt-badge {
            display: inline-block;
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 6px;
            padding: 4px 14px;
            margin-top: 10px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .receipt-body {
            padding: 16px 20px;
        }
        .receipt-info-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 5px 12px;
            margin-bottom: 14px;
            font-size: 12px;
        }
        .receipt-info-grid .label {
            color: #64748b;
            font-weight: 500;
            white-space: nowrap;
        }
        .receipt-info-grid .value {
            color: #1e293b;
            font-weight: 600;
            text-align: right;
            word-break: break-all;
        }
        .receipt-section-divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #cbd5e1, transparent);
            margin: 12px 0;
        }
        .receipt-items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .receipt-items-table thead th {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #94a3b8;
            font-weight: 700;
            padding: 6px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .receipt-items-table thead th:first-child { text-align: left; }
        .receipt-items-table thead th:last-child { text-align: right; }
        .receipt-items-table tbody td { padding: 6px 0; }
        .receipt-total-bar {
            background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 10px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .receipt-total-bar .label {
            font-size: 12px;
            font-weight: 700;
            color: #166534;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .receipt-total-bar .amount {
            font-size: 18px;
            font-weight: 800;
            color: #15803d;
        }
        .receipt-payment-mode {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            padding: 4px 0;
        }
        .receipt-payment-mode .label { color: #64748b; font-weight: 500; }
        .receipt-payment-mode .value { font-weight: 600; text-transform: uppercase; color: #334155; }
        .receipt-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 12px 20px;
            text-align: center;
        }
        .receipt-footer .receipt-id {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 2px;
            color: #94a3b8;
            margin-bottom: 6px;
        }
        .receipt-footer p {
            font-size: 11px;
            color: #94a3b8;
            line-height: 1.5;
        }
        @media print {
            body { padding: 20px 0; }
            .receipt-card { box-shadow: none; border: 1px solid #ddd; }
        }
    </style>

    <div class="receipt-card">
        <!-- Header -->
        <div class="receipt-header">
            <h1>GPT KAMPLI LIBRARY</h1>
            <p>Govt Polytechnic, Kampli - 583132</p>
            <div class="receipt-badge">PAYMENT RECEIPT</div>
        </div>

        <!-- Body -->
        <div class="receipt-body">
            <!-- Info Grid -->
            <div class="receipt-info-grid">
                <span class="label">Receipt #</span>
                <span class="value">${receiptId}</span>
                <span class="label">Date</span>
                <span class="value">${formatDate(transaction.date)} · ${formatTime(transaction.date)}</span>
                <span class="label">Student</span>
                <span class="value">${transaction.student_name || '-'}</span>
                <span class="label">Reg No</span>
                <span class="value">${transaction.roll_number || '-'}</span>
            </div>

            <div class="receipt-section-divider"></div>

            <!-- Items -->
            <table class="receipt-items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align:right;">Amount</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            <!-- Total -->
            <div class="receipt-total-bar">
                <span class="label">Total Paid</span>
                <span class="amount">₹${totalAmount}</span>
            </div>

            <!-- Payment Mode -->
            <div class="receipt-payment-mode">
                <span class="label">Payment Method</span>
                <span class="value">${transaction.payment_method || 'Cash'}</span>
            </div>
        </div>

        <!-- Footer -->
        <div class="receipt-footer">
            <div class="receipt-id">${displayId}</div>
            <p>Thank you for clearing your dues!<br>Computer Generated Receipt</p>
        </div>
    </div>
    `;
};

export const generateReceiptContent = (transaction, settings = {}) => {
    // Determine Settings
    const hardware = settings.app_hardware || {};
    const paperSize = hardware.paperSize || '80mm'; // Default receipts to 80mm usually

    const fullHtml = formatReceiptHtml(transaction, paperSize);

    return { html: fullHtml, paperSize };
};

export const generatePrintContent = (title, data, columns, settings = {}) => {
    // Determine Settings (Default to A4 if missing)
    const hardware = settings.app_hardware || {};
    const paperSize = hardware.paperSize || 'A4';

    // Organization Info (could be from settings too)
    // Organization Info
    const orgName = "GPT Kampli Library";
    const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    // Generate HTML
    const styles = getPrintStyles(paperSize);

    // Visual Analytics — Generate HTML from raw data instead of screenshot
    let visualHtml = '';
    if (settings.visualData) {
        const vd = settings.visualData;
        const snaps = vd.summary?.snapshots || {};
        const fin = vd.fin?.summary || {};
        const topBooks = vd.circ?.top_books || [];
        const dailyData = vd.summary?.data || [];

        // --- Metric Cards ---
        const metricCards = [
            { label: 'Active Issues', value: snaps.active_issues || 0, color: '#3b82f6', icon: '📖' },
            { label: 'Overdue Books', value: snaps.overdue_books || 0, color: '#ef4444', icon: '⚠️' },
            { label: 'Total Books', value: snaps.total_books || 0, color: '#10b981', icon: '📚' },
            { label: 'Total Members', value: snaps.total_members || 0, color: '#8b5cf6', icon: '👥' },
        ];

        const cardsHtml = metricCards.map(m => `
            <div style="flex:1; min-width:110px; padding:14px; border-radius:10px; border: 1.5px solid ${m.color}22; background: linear-gradient(135deg, ${m.color}08, ${m.color}15); text-align:center;">
                <div style="font-size:1.6em; margin-bottom:4px;">${m.icon}</div>
                <div style="font-size:1.8em; font-weight:800; color:${m.color};">${m.value}</div>
                <div style="font-size:0.75em; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-top:2px;">${m.label}</div>
            </div>
        `).join('');

        // --- Financial Summary ---
        const collected = (fin.collected || 0);
        const pending = (fin.pending || 0);
        const finHtml = `
            <div style="display:flex; gap:12px; margin-top:16px;">
                <div style="flex:1; padding:14px; border-radius:10px; background:linear-gradient(135deg, #10b98118, #10b98108); border:1.5px solid #10b98130;">
                    <div style="font-size:0.75em; font-weight:600; color:#64748b; text-transform:uppercase;">Fines Collected</div>
                    <div style="font-size:1.5em; font-weight:800; color:#10b981; margin-top:4px;">₹${collected.toFixed(2)}</div>
                </div>
                <div style="flex:1; padding:14px; border-radius:10px; background:linear-gradient(135deg, #f59e0b18, #f59e0b08); border:1.5px solid #f59e0b30;">
                    <div style="font-size:0.75em; font-weight:600; color:#64748b; text-transform:uppercase;">Fines Pending</div>
                    <div style="font-size:1.5em; font-weight:800; color:#f59e0b; margin-top:4px;">₹${pending.toFixed(2)}</div>
                </div>
            </div>`;

        // --- Top Books Bar Chart ---
        let topBooksHtml = '';
        if (topBooks.length > 0) {
            const maxCount = Math.max(...topBooks.map(b => b.count), 1);
            const barsHtml = topBooks.map((b, i) => {
                const pct = Math.round((b.count / maxCount) * 100);
                const barColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];
                const c = barColors[i % barColors.length];
                return `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                    <div style="width:28px; height:28px; border-radius:50%; background:${c}; color:white; display:flex; align-items:center; justify-content:center; font-size:0.75em; font-weight:700; flex-shrink:0;">${i + 1}</div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:0.85em; font-weight:600; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.title}</div>
                        <div style="height:8px; border-radius:4px; background:#e2e8f0; margin-top:3px; overflow:hidden;">
                            <div style="height:100%; width:${pct}%; border-radius:4px; background:linear-gradient(90deg, ${c}, ${c}cc);"></div>
                        </div>
                    </div>
                    <div style="font-size:0.9em; font-weight:700; color:${c}; flex-shrink:0;">${b.count}</div>
                </div>`;
            }).join('');

            topBooksHtml = `
            <div style="margin-top:16px;">
                <div style="font-size:0.85em; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">📈 Most Demanded Books</div>
                ${barsHtml}
            </div>`;
        }

        // --- Daily Activity Mini Chart ---
        let dailyChartHtml = '';
        if (dailyData.length > 0) {
            const last7 = dailyData.slice(-7);
            const maxIssues = Math.max(...last7.map(d => (d.issues || 0) + (d.returns || 0)), 1);
            const barsHtml = last7.map(d => {
                const total = (d.issues || 0) + (d.returns || 0);
                const h = Math.round((total / maxIssues) * 60);
                const dateLabel = d.date ? new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
                return `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:3px;">
                    <div style="font-size:0.7em; font-weight:600; color:#334155;">${total}</div>
                    <div style="width:100%; max-width:32px; height:${h}px; border-radius:4px 4px 0 0; background:linear-gradient(180deg, #4f46e5, #4f46e5aa);"></div>
                    <div style="font-size:0.6em; color:#94a3b8; font-weight:500;">${dateLabel}</div>
                </div>`;
            }).join('');

            dailyChartHtml = `
            <div style="margin-top:16px;">
                <div style="font-size:0.85em; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">📅 Recent Activity (Last 7 Days)</div>
                <div style="display:flex; align-items:flex-end; gap:6px; padding:8px 0; border-bottom:2px solid #e2e8f0;">
                    ${barsHtml}
                </div>
            </div>`;
        }

        // --- Assemble Visual Section ---
        visualHtml = `
        <div style="margin-top:32px; page-break-before: auto;">
            <div style="
                background: linear-gradient(135deg, #4f46e5, #7c3aed);
                color: white; padding: 10px 18px;
                font-size: 1em; font-weight: 700;
                letter-spacing: 0.03em;
                border-radius: 10px 10px 0 0;
            ">📊 Visual Analytics Summary</div>
            <div style="
                border: 2px solid #e2e8f0; border-top: none;
                border-radius: 0 0 10px 10px;
                padding: 20px; background: #fdfdfe;
            ">
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    ${cardsHtml}
                </div>
                ${finHtml}
                ${topBooksHtml}
                ${dailyChartHtml}
            </div>
        </div>`;
    } else if (settings.visualImage) {
        // Fallback: use screenshot if visualData not provided
        visualHtml = `
        <div style="margin-top: 30px; text-align: center;">
            <img src="${settings.visualImage}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 6px;" />
        </div>`;
    }

    // Section accent colors for multi-table headers
    const sectionColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];

    // Detect multi-section data: array of objects with title/data/columns
    let tableHtml = '';
    if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object' && data[0].title && data[0].data) {
        // Multi-section mode
        tableHtml = data.map((section, idx) => {
            const color = sectionColors[idx % sectionColors.length];
            const sectionTitle = `
                <div style="
                    display: flex; align-items: center; gap: 8px;
                    margin: ${idx === 0 ? '0' : '28px'} 0 12px 0;
                    padding: 8px 14px;
                    background: linear-gradient(90deg, ${color}15, transparent);
                    border-left: 4px solid ${color};
                    border-radius: 0 8px 8px 0;
                ">
                    <span style="
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 24px; height: 24px; border-radius: 50%;
                        background: ${color}; color: white;
                        font-size: 0.75em; font-weight: 700;
                    ">${idx + 1}</span>
                    <span style="font-size: 1.05em; font-weight: 700; color: #1e293b;">${section.title}</span>
                </div>`;
            const sectionTable = formatTableData(section.data, section.columns || [], section.title);
            return sectionTitle + sectionTable;
        }).join('');
    } else {
        // Single-table mode (backwards compatible)
        tableHtml = formatTableData(data, columns, title);
    }

    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print - ${title}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="print-container">
                <div class="print-header">
                    <img src="/College_Logo.png" alt="Logo" class="print-logo" onerror="this.style.display='none'" />
                    <div class="header-text">
                        <div class="org-name">${orgName}</div>
                        <div class="doc-title">${title}</div>
                        <div class="print-date">Generated on: ${dateStr}</div>
                    </div>
                </div>
                ${tableHtml}
                ${visualHtml}
                <div class="print-footer" style="text-align:center; font-size:0.8em; margin-top:20px; color:#888;">
                    Generated by LibMaster
                </div>
            </div>
        </body>
        </html>
    `;

    return { html: fullHtml, paperSize };
};



// Helper: Convert an image URL to base64 using Image() + canvas (most reliable method)
const imageToBase64 = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        } catch (e) {
            reject(e);
        }
    };
    img.onerror = () => reject(new Error('Image load failed: ' + src));
    img.src = src;
});

// Helper: Wait for all <img> elements inside a container to finish loading
const waitForImages = (container, timeoutMs = 3000) => new Promise((resolve) => {
    const images = container.querySelectorAll('img');
    if (images.length === 0) return resolve();

    let loaded = 0;
    const total = images.length;
    const done = () => { if (++loaded >= total) resolve(); };

    images.forEach(img => {
        if (img.complete && img.naturalHeight > 0) {
            done();
        } else {
            img.addEventListener('load', done);
            img.addEventListener('error', done); // Don't block on broken images
        }
    });

    // Safety timeout
    setTimeout(resolve, timeoutMs);
});

// Browser-side PDF Generation
const generateBrowserPdf = async (htmlContent, options = {}) => {
    let container = null;
    try {
        // --- Step 1: Pre-load logo as Base64 ---
        let logoBase64 = null;
        try {
            logoBase64 = await imageToBase64('/College_Logo.png');
            console.log('Logo converted to base64 successfully');
        } catch (e) {
            console.warn('Logo base64 conversion failed:', e.message);
        }

        // --- Step 2: Create off-screen container ---
        container = document.createElement('div');
        const isLandscape = options.landscape;
        container.style.cssText = `
            position: fixed; top: 0; left: 0; z-index: -9999;
            background: #ffffff; overflow: visible;
            width: ${isLandscape ? '297mm' : '210mm'};
            min-height: ${isLandscape ? '210mm' : '297mm'};
        `;

        // Replace logo src with base64 in HTML
        let processedContent = htmlContent;
        if (logoBase64) {
            // Replace all occurrences of the logo path with base64
            processedContent = processedContent.replace(/src="\/College_Logo\.png"/g, `src="${logoBase64}"`);
            processedContent = processedContent.replace(/src='\/College_Logo\.png'/g, `src='${logoBase64}'`);
        }
        // Remove onerror that hides the image on failure
        processedContent = processedContent.replace(/onerror="this\.style\.display='none'"/g, '');

        // Strip <html>, <head>, <body> wrappers
        const cleanContent = processedContent
            .replace(/<\/?html[^>]*>/g, '')
            .replace(/<\/?body[^>]*>/g, '')
            .replace(/<head>/g, '<div class="virtual-head">')
            .replace(/<\/head>/g, '</div>');

        container.innerHTML = cleanContent;
        document.body.appendChild(container);

        // --- Step 3: Wait for all images to actually load ---
        await waitForImages(container, 3000);
        // Extra small delay for fonts
        await new Promise(resolve => setTimeout(resolve, 300));

        // --- Step 4: Capture with html2canvas ---
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: container.scrollWidth,
            windowHeight: container.scrollHeight,
        });

        document.body.removeChild(container);
        container = null;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // --- Step 5: Build multi-page PDF ---
        const orient = isLandscape ? 'l' : 'p';
        const fmt = options.pageSize ? options.pageSize.toLowerCase() : 'a4';
        const docPdf = new jsPDF({ orientation: orient, unit: 'mm', format: fmt });

        const pdfW = docPdf.internal.pageSize.getWidth();
        const pdfH = docPdf.internal.pageSize.getHeight();
        const imgProps = docPdf.getImageProperties(imgData);
        const scaledH = (imgProps.height * pdfW) / imgProps.width;

        const totalPages = Math.max(1, Math.ceil(scaledH / pdfH));

        for (let p = 0; p < totalPages; p++) {
            if (p > 0) docPdf.addPage();
            docPdf.addImage(imgData, 'JPEG', 0, -(p * pdfH), pdfW, scaledH);
        }

        // --- Step 6: Return base64 ---
        const dataUri = docPdf.output('datauristring');
        return dataUri.split(',')[1];

    } catch (error) {
        console.error('Browser PDF Generation Failed:', error);
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        return null;
    }
};

export const generatePdf = async (htmlContent, options = {}) => {
    if (window.electron && window.electron.printToPDF) {
        try {
            return await window.electron.printToPDF(htmlContent, options);
        } catch (error) {
            console.warn("Electron PDF generation failed, falling back to browser-side generation:", error);
        }
    }

    // Fallback to browser-side generation
    console.log("Using browser-side PDF generation...");
    return await generateBrowserPdf(htmlContent, options);
};
