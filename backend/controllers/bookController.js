const db = require('../db');
const socketService = require('../services/socketService');

// Helper for IDs
const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

// Get all books with filtering and pagination
exports.getBooks = (req, res) => {
    const { search, department, sort } = req.query;

    // SMART JOIN: Matches on dept_id first, then falls back to category name match
    let query = `
        SELECT b.*, COALESCE(d.name, b.category, 'Unassigned') as department_name, d.code as department_code,
            COUNT(bc.id) as total_copies,
            SUM(CASE WHEN bc.status = 'Available' THEN 1 ELSE 0 END) as available_copies
        FROM books b
        LEFT JOIN departments d ON (b.dept_id = d.id OR (b.dept_id IS NULL AND b.category = d.name))
        LEFT JOIN book_copies bc ON b.isbn = bc.book_isbn
    `;

    let params = [];
    let conditions = [];

    // Filter by Department Name (since we are joining)
    if (department && department !== 'All') {
        conditions.push("(d.name = ? OR b.category = ?)");
        params.push(department, department);
    }

    if (search) {
        conditions.push("(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Removed Status filtering - Show all books
    // Since we now hard delete, we don't need to filter out 'Deleted' status.

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    query += " GROUP BY b.isbn";

    // Sorting
    if (sort === 'newest') query += " ORDER BY b.created_at DESC";
    else if (sort === 'title') query += " ORDER BY b.title ASC";
    else if (sort === 'availability') query += " ORDER BY available_copies DESC";
    else query += " ORDER BY b.created_at DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("getBooks Query Error:", err.message);
            return res.status(500).json({ error: err.message });
        }

        // DEBUG: Log first row to see what's happening
        if (rows.length > 0) {
            console.log("DEBUG getBooks Row [0]:", {
                title: rows[0].title,
                dept_id: rows[0].dept_id,
                category: rows[0].category,
                department_name: rows[0].department_name
            });
        }

        res.json(rows);
    });
};

// Add a new book
exports.addBook = (req, res) => {
    console.log("addBook Payload:", req.body); // Debug Log

    const { isbn, title, author, publisher, category, dept_id, price, total_copies, cover_image, cover_image_url, ebook_link, shelf_location } = req.body;
    const finalCoverImage = cover_image || cover_image_url || '';

    // Use dept_id if present, else category (as fallback)
    const finalDeptId = dept_id || category; // This might be a UUID or a Name depending entirely on frontend

    // Map total_copies to quantity for logic usage, default to 1 if missing
    const quantity = total_copies ? parseInt(total_copies) : 0;

    if (!isbn || !title || !finalDeptId || !quantity) {
        console.error("Missing fields:", { isbn, title, finalDeptId, quantity });
        return res.status(400).json({ error: "Missing required fields (ISBN, Title, Department, Quantity) - CHECK SERVER LOGS" });
    }

    // Generate ID for the book
    const bookId = generateId();

    const insertBookSafe = `
        INSERT INTO books (id, isbn, title, author, publisher, dept_id, price, total_copies, cover_image, cover_image_url, ebook_link, shelf_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const proceedWithInsert = () => {
        db.run(insertBookSafe, [bookId, isbn, title, author, publisher, finalDeptId, price, quantity, finalCoverImage, finalCoverImage, ebook_link, shelf_location || ''], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(400).json({ error: "Book with this ISBN already exists" });
                }
                return res.status(500).json({ error: err.message });
            }

            // Auto-generate copies
            // First, clean up any orphaned copies for this ISBN
            db.run("DELETE FROM book_copies WHERE book_isbn = ?", [isbn], (err) => {
                if (err) console.warn("Warning: Failed to clean orphans", err);

                const copyStmt = db.prepare("INSERT INTO book_copies (id, book_isbn, accession_number, status) VALUES (?, ?, ?, 'Available')");
                for (let i = 1; i <= quantity; i++) {
                    const accessionNo = `${isbn}-${String(i).padStart(3, '0')}`;
                    copyStmt.run(generateId(), isbn, accessionNo);
                }
                copyStmt.finalize((err) => {
                    if (err) console.error("Failed to finalize copies:", err);
                    socketService.emit('book_update', { type: 'ADD', isbn });
                    res.status(201).json({ message: "Book added successfully with copies", isbn });
                });
            });
        });
    };

    // Validation: If ISBN is Auto-Generated (starts with AG-), check for duplicate Title
    // This prevents flooding the system with same book multiple times due to random ISBNs
    if (isbn.startsWith('AG-')) {
        db.get("SELECT 1 FROM books WHERE lower(title) = lower(?)", [title], (err, row) => {
            if (err) {
                console.error("Title duplication check failed:", err);
                // We don't block on DB error for check, but safeguard? 
                // Better to block to be safe.
                return res.status(500).json({ error: "Validation Check Failed: " + err.message });
            }
            if (row) {
                return res.status(400).json({ error: "Book with this title already exists (Auto-Generated ISBN restriction)." });
            }
            proceedWithInsert();
        });
    } else {
        proceedWithInsert();
    }
};

// Get details of a single book (and its copies)
exports.getBookDetails = (req, res) => {
    const { isbn } = req.params;

    const bookSql = "SELECT * FROM books WHERE isbn = ?";
    const copiesSql = "SELECT * FROM book_copies WHERE book_isbn = ?";

    db.get(bookSql, [isbn], (err, book) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!book) return res.status(404).json({ error: "Book not found" });

        db.all(copiesSql, [isbn], (err, copies) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ...book, copies });
        });
    });
};

// Update Book
exports.updateBook = (req, res) => {
    const { isbn } = req.params;
    const { title, author, publisher, category, dept_id, price, cover_image, cover_image_url, shelf_location } = req.body;
    const finalCoverImage = cover_image || cover_image_url || '';

    const finalDeptId = dept_id || category;

    const sql = `
        UPDATE books SET title = ?, author = ?, publisher = ?, dept_id = ?, price = ?, cover_image = ?, cover_image_url = ?, shelf_location = ?
        WHERE isbn = ?
    `;

    db.run(sql, [title, author, publisher, finalDeptId, price, finalCoverImage, finalCoverImage, shelf_location || '', isbn], function (err) {
        if (err) {
            console.error("Update Book Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        socketService.emit('book_update', { type: 'UPDATE', isbn });
        res.json({ message: "Book updated successfully" });
    });
};

// Delete Book (Safe Hard Delete with Cascade)
exports.deleteBook = (req, res) => {
    const { isbn } = req.params;

    // 1. Get Book ID (for final deletion)
    db.get("SELECT id FROM books WHERE isbn = ?", [isbn], (err, book) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!book) return res.status(404).json({ error: "Book not found" });

        const bookId = book.id;

        // 2. Safety Check: Are any copies currently ISSUED?
        // CRITICAL FIX: Use book_isbn to check copies, as that is the actual populated link
        db.get("SELECT count(*) as count FROM book_copies WHERE book_isbn = ? AND status = 'Issued'", [isbn], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            if (row && row.count > 0) {
                return res.status(400).json({ error: `Cannot delete: ${row.count} copies are currently issued.` });
            }

            // 3. Cascade Delete Logic (Updated for Decoupled History)
            // A. Update History with Suffix using ISBN (Snapshot Key)
            db.run("UPDATE transaction_logs SET book_title = book_title || ' (Deleted)' WHERE book_isbn = ?", [isbn], (err) => {
                if (err) console.error("Failed to update transaction logs suffix:", err);
                // Proceed even if update fails slightly, critical part is deletion

                // B. Delete Fines? No, fines are financial records. Ideally keep them. 
                // But previously we deleted them. User said "Transaction History and fines must be not connected... even book deleted they must deleted"
                // Wait, user said "even book or student deleted they must deleted" -> Does 'they' refer to the book/student, or the history?
                // Context: "Transaction History and fines stores all deleties sepertly but not connect to books or students... even book or student deleted they must deleted but they should mention at title suffix"
                // Interpretation: The BOOK must be deleted (from books table), but History/Fines must PERSIST, just with a suffix.
                // So we DO NOT DELETE from 'fines' or 'transaction_logs' anymore.

                // C. Delete Copies
                db.run("DELETE FROM book_copies WHERE book_isbn = ?", [isbn], (err) => {
                    if (err) return res.status(500).json({ error: "Failed to delete copies: " + err.message });

                    // D. Delete Book by ID
                    db.run("DELETE FROM books WHERE id = ?", [bookId], function (err) {
                        if (err) return res.status(500).json({ error: "Failed to delete book: " + err.message });
                        socketService.emit('book_update', { type: 'DELETE', isbn });
                        res.json({ message: "Book deleted. History preserved with suffix." });
                    });
                });
            });
        });
    });
};

// Update Copy Status
exports.updateCopyStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run("UPDATE book_copies SET status = ? WHERE id = ?", [status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        socketService.emit('book_update', { type: 'COPY_UPDATE', id });
        res.json({ message: "Copy status updated" });
    });
};

// Add Copies to a Book
exports.addCopies = (req, res) => {
    const { isbn } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: "Invalid quantity" });
    }

    // 1. Get the latest accession number
    db.get("SELECT accession_number FROM book_copies WHERE book_isbn = ? ORDER BY accession_number DESC LIMIT 1", [isbn], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let startSequence = 1;
        if (row && row.accession_number) {
            const parts = row.accession_number.split('-');
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart, 10);
            if (!isNaN(num)) {
                startSequence = num + 1;
            }
        }

        const stmt = db.prepare("INSERT INTO book_copies (id, book_isbn, accession_number, status) VALUES (?, ?, ?, 'Available')");

        for (let i = 0; i < quantity; i++) {
            const accessionNo = `${isbn}-${String(startSequence + i).padStart(3, '0')}`;
            stmt.run(generateId(), isbn, accessionNo);
        }

        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: "Failed to create copies." });

            // Update total_copies count
            db.run("UPDATE books SET total_copies = total_copies + ? WHERE isbn = ?", [quantity, isbn], function (err) {
                if (err) console.error("Failed to update total_copies", err);
                res.json({ message: `${quantity} copies added successfully.` });
            });
        });
    });
};

// Delete a Copy
exports.deleteCopy = (req, res) => {
    const { id } = req.params;
    console.log(`Attempting to delete copy with ID: ${id}`);

    db.get("SELECT * FROM book_copies WHERE id = ?", [id], (err, copy) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!copy) return res.status(404).json({ error: "Copy not found" });

        if (copy.status === 'Issued') {
            return res.status(400).json({ error: "Cannot delete an Issued copy." });
        }

        db.run("DELETE FROM book_copies WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Decrement total_copies
            db.run("UPDATE books SET total_copies = total_copies - 1 WHERE isbn = ?", [copy.book_isbn]);

            res.json({ message: "Copy deleted successfully" });
        });
    });
};
// Bulk Upload Books
exports.bulkUploadBooks = (req, res) => {
    const books = req.body; // Expecting array of { isbn, title, author, publisher, category, quantity }

    if (!Array.isArray(books) || books.length === 0) {
        return res.status(400).json({ error: "Invalid payload: Expected array of books" });
    }

    let successCount = 0;
    let errors = [];

    // Process sequentially to manage database concurrency better
    // Wrapping in a Promise based loop for cleanliness
    const processBooks = async () => {
        for (const book of books) {

            const { title, author, publisher, category, price, quantity: qtyStr, cover_image, ebook_link, shelf_location } = book;
            let { isbn } = book;
            const quantity = parseInt(qtyStr) || 1;

            // Generate ISBN if somehow missing but passed validation (backend safeguard)
            if (!isbn) isbn = `AG-${Math.floor(Math.random() * 10000000000)}`;

            // Resolve Department ID
            // We search for dept by name (category). If not found, we use category as fallback name.
            // Since this is async inside a loop, we use a Promise wrapper for the DB call
            const deptId = await new Promise((resolve) => {
                if (!category) return resolve(null);
                const searchTerm = category.trim();

                // Auto-select strategies:
                // 1. Exact Name Match (Case Insensitive)
                // 2. Exact Code Match (Case Insensitive)
                // 3. Input STARTS WITH Code (e.g. "CSE" matches "CS")
                const sql = `
                    SELECT id FROM departments 
                    WHERE upper(name) = upper(?) 
                       OR upper(code) = upper(?) 
                       OR upper(?) LIKE (upper(code) || '%')
                `;

                db.get(sql, [searchTerm, searchTerm, searchTerm], (err, row) => {
                    if (err) console.error("Dept Lookup Error:", err);
                    resolve(row ? row.id : null);
                });
            });

            // Use found ID
            const finalDeptId = deptId;

            if (!finalDeptId) {
                errors.push(`ISBN ${isbn} skipped (Department '${category}' not found)`);
                continue;
            }

            // Check if ISBN exists
            const exists = await new Promise((resolve) => {
                db.get("SELECT isbn FROM books WHERE isbn = ?", [isbn], (err, row) => {
                    resolve(!!row);
                });
            });

            if (exists) {
                errors.push(`ISBN ${isbn} skipped (Already exists)`);
                continue;
            }

            // AUTO-GEN VALIDATION: Check for duplicate title if ISBN is auto-generated
            if (isbn.startsWith('AG-')) {
                const titleExists = await new Promise((resolve) => {
                    db.get("SELECT 1 FROM books WHERE lower(title) = lower(?)", [title], (err, row) => resolve(!!row));
                });

                if (titleExists) {
                    errors.push(`ISBN ${isbn} skipped (Duplicate Title '${title}' - Auto-Gen Restriction)`);
                    continue;
                }
            }

            // Insert Book
            const bookId = generateId();
            try {
                await new Promise((resolve, reject) => {
                    const insertSql = `
                        INSERT INTO books (id, isbn, title, author, publisher, dept_id, category, price, total_copies, cover_image, ebook_link, shelf_location) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    // Note: We Save category string into 'category' column to populate it if dept_id is null
                    // This matches our "Smart Join" logic where we check dept_id OR category matches
                    db.run(insertSql, [bookId, isbn, title, author, publisher, finalDeptId, category, price || 0, quantity, cover_image || '', ebook_link || '', shelf_location || ''], function (err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Safety: Delete orphans first
                await new Promise((resolve) => {
                    db.run("DELETE FROM book_copies WHERE book_isbn = ?", [isbn], (err) => resolve());
                });

                // Insert Copies
                await new Promise((resolve, reject) => {
                    const copyStmt = db.prepare("INSERT INTO book_copies (id, book_isbn, accession_number, status) VALUES (?, ?, ?, 'Available')");
                    for (let i = 1; i <= quantity; i++) {
                        const accessionNo = `${isbn}-${String(i).padStart(3, '0')}`;
                        copyStmt.run(generateId(), isbn, accessionNo);
                    }
                    copyStmt.finalize((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                successCount++;

            } catch (err) {
                console.error(`Failed to import book ${isbn}:`, err);
                errors.push(`ISBN ${isbn} failed: ${err.message}`);
            }
        }
    };

    processBooks().then(() => {
        res.json({
            message: `Processed ${books.length} items. Imported: ${successCount}.`,
            details: { success: successCount, failed: errors.length, errors }
        });
    });
};
