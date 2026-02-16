const nodemailer = require('nodemailer');
const db = require('../db');
const { getISTDate } = require('../utils/dateUtils');

// Helper to get email config
const getEmailConfig = () => {
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM system_settings WHERE key = 'email_config'", (err, row) => {
            if (err) return reject(err);
            if (!row || !row.value) return resolve(null);
            try {
                const config = JSON.parse(row.value);
                if (!config.enabled) return resolve(null);
                resolve(config);
            } catch (e) {
                resolve(null);
            }
        });
    });
};

const getEmailEvents = () => {
    return new Promise((resolve) => {
        db.get("SELECT value FROM system_settings WHERE key = 'email_events'", (err, row) => {
            if (err || !row || !row.value) return resolve({});
            try {
                resolve(JSON.parse(row.value));
            } catch (e) {
                resolve({});
            }
        });
    });
};

// Create Transporter
const createTransporter = (config) => {
    if (config.provider === 'smtp') {
        const host = config.host === 'smpt.gmail.com' ? 'smtp.gmail.com' : config.host; // Fix common typo
        return nodemailer.createTransport({
            host: host,
            port: parseInt(config.port) || 587,
            secure: config.secure || config.port === 465,
            auth: {
                user: config.user,
                pass: config.pass
            }
        });
    }
    // Future: Add other providers
    return null;
};

// Helper to check and increment daily usage
const checkAndIncrementUsage = () => {
    return new Promise((resolve) => {
        db.get("SELECT value FROM system_settings WHERE key = 'email_daily_usage'", (err, row) => {
            const today = getISTDate().toISOString().split('T')[0];
            let usage = { count: 0, date: today, limit: 500 };

            if (!err && row && row.value) {
                try {
                    const parsed = JSON.parse(row.value);
                    // Ensure defaults
                    usage = { ...usage, ...parsed };
                } catch (e) {
                    console.error("[Email] Failed to parse usage stats, resetting.");
                }
            }

            // Reset if new day
            if (usage.date !== today) {
                usage.count = 0;
                usage.date = today;
            }

            // Check Limit
            if (usage.count >= usage.limit) {
                console.warn(`[Email] Daily limit reached (${usage.count}/${usage.limit}). Email blocked.`);
                return resolve({ allowed: false, current: usage });
            }

            // Increment
            usage.count++;

            // Save back to DB
            db.run("INSERT OR REPLACE INTO system_settings (key, value, category, data_type, description) VALUES (?, ?, ?, ?, ?)",
                ['email_daily_usage', JSON.stringify(usage), 'Email', 'json', 'Tracks daily email usage'],
                (err) => {
                    if (err) {
                        console.error("[Email] Failed to update usage stats:", err);
                        // Fail open or closed? Let's fail open but log it, to avoid blocking critical emails on DB glitch
                        // But actually, if DB fails, maybe we shouldn't send? 
                        // Let's resolve allowed: true to prioritize delivery over strict limit in error case
                        resolve({ allowed: true, current: usage });
                    } else {
                        resolve({ allowed: true, current: usage });
                    }
                }
            );
        });
    });
};

// Generic Send Function
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
    try {
        // Check Quota
        const quota = await checkAndIncrementUsage();
        if (!quota.allowed) {
            const socketService = require('./socketService');
            socketService.emit('notification', {
                type: 'error',
                title: 'Email Limit Reached',
                message: `Daily email limit of ${quota.current.limit} has been reached. Email to ${to} was not sent.`
            });
            return false;
        }

        // Connectivity Check
        const dns = require('dns').promises;
        try {
            await dns.lookup('google.com');
        } catch (e) {
            console.log(`[Email] Queued/Skipped (Offline): ${subject}`);
            const socketService = require('./socketService');
            socketService.emit('notification', {
                type: 'warning',
                message: `Offline: Email to ${to} could not be sent.`
            });
            return false;
        }

        const config = await getEmailConfig();
        if (!config) {
            console.log(`[Email] Skipped: Service disabled or unconfigured. Subject: ${subject}`);
            return false;
        }

        const transporter = createTransporter(config);
        if (!transporter) {
            console.error(`[Email] Error: Unsupported provider ${config.provider}`);
            return false;
        }

        const info = await transporter.sendMail({
            from: `"${config.fromName || 'GPTK Library'}" <${config.user}>`,
            to,
            subject,
            text,
            html,
            attachments
        });

        console.log(`[Email] Sent to ${to}: ${info.messageId} (Usage: ${quota.current.count}/${quota.current.limit})`);
        return true;
    } catch (error) {
        console.error(`[Email] Failed to send to ${to}:`, error.message);
        const socketService = require('./socketService');
        socketService.emit('notification', {
            type: 'error',
            message: `Email Warning: ${error.message}`
        });
        return false;
    }
};

// --- Templates ---

const baseTemplate = (content, footerInfo = '') => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">GPTK Library</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Govt Polytechnic, Kampli</p>
    </div>
    <div style="padding: 30px 20px; background-color: #f9fafb;">
        ${content}
    </div>
    <div style="background-color: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0;">&copy; ${getISTDate().getFullYear()} GPTK Library Management System</p>
        ${footerInfo ? `<p style="margin: 5px 0;">${footerInfo}</p>` : ''}
    </div>
</div>
`;

exports.sendTransactionReceipt = async (type, student, details) => {
    // type: 'ISSUE', 'RETURN', 'RENEW'
    const subjectMap = {
        'ISSUE': `📚 Book Issued: ${details.title}`,
        'RETURN': `↩️ Book Returned: ${details.title}`,
        'RENEW': `🔄 Book Renewed: ${details.title}`
    };

    const typeKeyMap = {
        'ISSUE': 'issueReceipt',
        'RETURN': 'returnReceipt',
        'RENEW': 'renewalConfirmation'
    };

    const events = await getEmailEvents();
    if (events && events[typeKeyMap[type]] === false) {
        console.log(`[Email] ${type} receipt skipped (Disabled in settings)`);
        return false;
    }

    const subject = subjectMap[type] || 'Library Transaction';

    let bodyContent = '';
    if (type === 'ISSUE') {
        bodyContent = `
            <h2 style="color: #2563eb; margin-top: 0;">Book Issued Successfully</h2>
            <p>Dear <strong>${student.name}</strong>,</p>
            <p>You have successfully borrowed the following book:</p>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Title:</strong> ${details.title}</p>
                <p style="margin: 5px 0;"><strong>Accession No:</strong> ${details.accession}</p>
                <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(details.due_date).toLocaleDateString()}</p>
            </div>
            <p>Please return the book on or before the due date to avoid fines.</p>
        `;
    } else if (type === 'RETURN') {
        bodyContent = `
            <h2 style="color: #10b981; margin-top: 0;">Book Returned Successfully</h2>
            <p>Dear <strong>${student.name}</strong>,</p>
            <p>We have received the following book:</p>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Title:</strong> ${details.title}</p>
                <p style="margin: 5px 0;"><strong>Returned On:</strong> ${getISTDate().toLocaleDateString()}</p>
                ${details.fine_amount > 0 ? `<p style="margin: 5px 0; color: #ef4444;"><strong>Fine Generated:</strong> ₹${details.fine_amount}</p>` : '<p style="margin: 5px 0; color: #10b981;"><strong>Status:</strong> No Dues</p>'}
            </div>
        `;
    } else if (type === 'RENEW') {
        bodyContent = `
            <h2 style="color: #8b5cf6; margin-top: 0;">Book Renewed Successfully</h2>
            <p>Dear <strong>${student.name}</strong>,</p>
            <p>The borrowing period for the following book has been extended:</p>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Title:</strong> ${details.title}</p>
                <p style="margin: 5px 0;"><strong>New Due Date:</strong> ${new Date(details.new_due_date).toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Renewals Used:</strong> ${details.renewals_used}</p>
            </div>
        `;
    }

    return sendEmail({
        to: student.email,
        subject,
        html: baseTemplate(bodyContent)
    });
};

exports.sendFineReceipt = async (student, receipt) => {
    const events = await getEmailEvents();
    if (events && events.finePaymentReceipt === false) {
        console.log(`[Email] Fine receipt skipped (Disabled in settings)`);
        return false;
    }

    const subject = `💰 Payment Receipt: ₹${receipt.total}`;

    const itemsHtml = receipt.items.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${item.description}</td>
            <td style="padding: 10px; text-align: right;">₹${item.amount.toFixed(2)}</td>
        </tr>
    `).join('');

    // Ensure Receipt ID has REC- prefix
    const displayReceiptId = receipt.id.toString().startsWith('REC-') ? receipt.id : `REC-${receipt.id}`;

    const bodyContent = `
        <h2 style="color: #10b981; margin-top: 0;">Payment Received</h2>
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>Thank you for your payment. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white;">
            <thead>
                <tr style="background: #f3f4f6; color: #6b7280; font-size: 12px; text-transform: uppercase;">
                    <th style="padding: 10px; text-align: left;">Description</th>
                    <th style="padding: 10px; text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr style="font-weight: bold; background: #f9fafb;">
                    <td style="padding: 10px; text-align: right;">Total Paid:</td>
                    <td style="padding: 10px; text-align: right;">₹${receipt.total.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
        <p style="font-size: 12px; color: #9ca3af;">Receipt ID: ${displayReceiptId}</p>
    `;

    return sendEmail({
        to: student.email,
        subject,
        html: baseTemplate(bodyContent)
    });
};

exports.sendOverdueNotice = async (student, loans) => {
    const events = await getEmailEvents();
    if (events && events.overdueAlerts === false) {
        console.log(`[Email] Overdue notice skipped (Disabled in settings)`);
        return false;
    }

    const subject = `⚠️ Overdue Alert: You have ${loans.length} overdue item(s)`;

    const itemsHtml = loans.map(loan => `
        <li style="margin-bottom: 10px;">
            <strong>${loan.book_title}</strong><br>
            <span style="font-size: 12px; color: #ef4444;">Due: ${new Date(loan.due_date).toLocaleDateString()} (${loan.overdue_days} days late)</span>
        </li>
    `).join('');

    const bodyContent = `
        <h2 style="color: #ef4444; margin-top: 0;">Overdue Notice</h2>
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>This is a reminder that you have <strong>${loans.length}</strong> book(s) that are past their due date.</p>
        <ul style="background: white; padding: 20px 40px; border-radius: 6px; border: 1px solid #fee2e2;">
            ${itemsHtml}
        </ul>
        <p>Please return them as soon as possible to minimize late fines.</p>
    `;

    return sendEmail({
        to: student.email,
        subject,
        html: baseTemplate(bodyContent)
    });
};

exports.sendDailySummary = async (admin, stats) => {
    const events = await getEmailEvents();
    if (events && events.dailySummary === false) {
        console.log(`[Email] Daily summary skipped (Disabled in settings)`);
        return false;
    }

    const subject = `📊 Daily Library Summary - ${new Date().toLocaleDateString()}`;

    const bodyContent = `
        <h2 style="color: #2563eb; margin-top: 0;">Daily Library Summary</h2>
        <p>Dear <strong>${admin.name}</strong>,</p>
        <p>Here is the status of the library for today:</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Books</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1f2937;">${stats.totalBooks}</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Active Loans</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #2563eb;">${stats.activeLoans}</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Overdue Books</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #ef4444;">${stats.overdueBooks}</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Today's Issues</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #10b981;">${stats.issuedToday}</p>
            </div>
        </div>

        <p style="text-align: center; margin-top: 20px;">
            <a href="http://localhost:3000" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Dashboard</a>
        </p>
    `;

    return sendEmail({
        to: admin.email,
        subject,
        html: baseTemplate(bodyContent)
    });
};

exports.sendBroadcast = async (recipient, subject, message, attachment = null) => {
    const events = await getEmailEvents();
    if (events && events.broadcastMessages === false) {
        console.log(`[Email] Broadcast skipped (Disabled in settings)`);
        return false;
    }

    let isImage = false;
    // Check if attachment is an image
    if (attachment && attachment.filename) {
        const ext = attachment.filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            isImage = true;
            attachment.cid = 'broadcast-image-' + Date.now(); // Unique CID
        }
    }

    // recipient: { name, email }
    const bodyContent = `
        <h2 style="color: #4b5563; margin-top: 0;">Notice from Library</h2>
        <p>Dear <strong>${recipient.name}</strong>,</p>
        <div style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
        </div>
        ${isImage ? `<div style="text-align: center; margin-top: 20px;"><img src="cid:${attachment.cid}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" alt="Attached Image" /></div>` : ''}
        ${attachment && !isImage ? `<p style="margin-top: 20px; font-size: 14px; color: #6b7280;">📎 Attachment: <strong>${attachment.filename}</strong></p>` : ''}
    `;

    return sendEmail({
        to: recipient.email,
        subject: `📢 ${subject}`,
        html: baseTemplate(bodyContent),
        attachments: attachment ? [attachment] : []
    });
};

module.exports = {
    sendTransactionReceipt: exports.sendTransactionReceipt,
    sendFineReceipt: exports.sendFineReceipt,
    sendOverdueNotice: exports.sendOverdueNotice,
    sendDailySummary: exports.sendDailySummary,
    sendBroadcast: exports.sendBroadcast,
    sendEmail // Export generic too just in case
};
