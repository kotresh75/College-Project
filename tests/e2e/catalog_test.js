const puppeteer = require('puppeteer');

(async () => {
    // Launch browser
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    const page = await browser.newPage();

    // Helper: clickByText
    const clickByText = async (tag, text) => {
        const elements = await page.$$(tag);
        for (const el of elements) {
            const content = await page.evaluate(element => element.textContent, el);
            if (content.includes(text)) {
                await el.click();
                return true;
            }
        }
        return false;
    };

    try {
        console.log('--- STARTING CATALOG PAGE TEST ---');

        // 1. Navigate
        console.log('1. Navigating to http://localhost:3000/#/dashboard/books...');
        await page.goto('http://localhost:3000/#/dashboard/books');

        // 2. Wait for load
        console.log('2. Waiting for Catalog content...');
        await page.waitForSelector('.dashboard-content', { timeout: 10000 });
        console.log('   Catalog Page Loaded.');
        await new Promise(r => setTimeout(r, 2000));

        // 3. Add Book
        console.log('3. Testing "Add Book"...');
        const addBtn = await clickByText('button', 'Add Book');
        if (!addBtn) throw new Error('Add Book button not found');
        console.log('   Clicked Add Book button.');

        await page.waitForSelector('input[name="title"]');

        // Fill Form
        const uniqueId = Date.now();
        await page.type('input[name="title"]', `Puppeteer Book ${uniqueId}`);
        await page.type('input[name="isbn"]', `PUP-${String(uniqueId).slice(-10)}`);
        await page.type('input[name="author"]', 'Auto Bot');
        await page.type('input[name="publisher"]', 'Test Pub');
        await page.type('input[name="price"]', '100');
        await page.type('input[name="total_copies"]', '5');

        // Select Department - Robust Method (Direct Option Click)
        console.log('   Selecting Department...');
        const deptSelectTrigger = await page.$('.glass-select-trigger');
        if (deptSelectTrigger) {
            await deptSelectTrigger.click();
            await new Promise(r => setTimeout(r, 2000)); // Increased wait for dropdown animation

            // Click first option
            const firstOption = await page.$('.dropdown-option');
            if (firstOption) {
                await firstOption.click();
                console.log('   Selected first department.');
            } else {
                console.log('   ! No department options found.');
            }
        }

        // Submit
        const submitBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.includes('Add Book') && b.type === 'submit');
        });

        if (submitBtn.asElement()) {
            await submitBtn.asElement().click();
            console.log('   Clicked Submit Button.');
            await new Promise(r => setTimeout(r, 3000));
        }

        // 4. Search
        console.log('4. Testing Search...');
        await page.type('input[placeholder*="Search"]', 'Puppeteer');
        await new Promise(r => setTimeout(r, 2000));

        // Rows
        let rows = await page.$$('table.table tbody tr');

        // 5. View Details
        console.log('5. Testing View Details...');
        if (rows.length > 0) {
            const actionButtons = await rows[0].$$('td:last-child button');
            if (actionButtons.length > 0) {
                await actionButtons[0].click();
                console.log('   Clicked View button.');
                await new Promise(r => setTimeout(r, 2000));

                const modalText = await page.evaluate(() => document.body.innerText);
                if (modalText.includes('Book Details') || modalText.includes('ISBN')) {
                    console.log('   View Modal opened successfully.');
                    await page.keyboard.press('Escape');
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }

        // 6. Edit Book
        console.log('6. Testing Edit Book...');
        // Refresh rows
        rows = await page.$$('table.table tbody tr');
        if (rows.length > 0) {
            const actionButtons = await rows[0].$$('td:last-child button');
            if (actionButtons.length > 1) {
                // Force click Edit (index 1)
                await page.evaluate(el => el.click(), actionButtons[1]);
                console.log('   Clicked Edit button (via evaluate).');

                // Wait for modal
                try {
                    await page.waitForSelector('input[name="price"]', { timeout: 10000 });
                    console.log('   Edit Modal opened.');

                    const priceInput = await page.$('input[name="price"]');
                    await priceInput.click({ clickCount: 3 });
                    await priceInput.type('150');
                    console.log('   Changed price to 150.');

                    // Save
                    const saveBtn = await page.evaluateHandle(() => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        return btns.find(b => b.textContent.includes('Save') || b.textContent.includes('Update'));
                    });
                    if (saveBtn.asElement()) {
                        await saveBtn.asElement().click();
                        console.log('   Clicked Save/Update.');
                        await new Promise(r => setTimeout(r, 3000));
                    }
                } catch (e) {
                    console.log('   ! Edit Modal failed to open or time out.');
                    throw e;
                }
            }
        }

        // 7. Export
        console.log('7. Testing Export...');
        const exportBtn = await page.$('button[title*="Export"]');
        if (exportBtn) {
            await exportBtn.click();
            console.log('   Clicked Export button.');
            await new Promise(r => setTimeout(r, 2000));

            const body = await page.evaluate(() => document.body.innerText);
            if (body.includes('Export Options') || body.includes('Format')) {
                console.log('   Export Modal opened.');
                await page.keyboard.press('Escape');
                await new Promise(r => setTimeout(r, 1000));
            }
        } else {
            console.log('   Export button not found.');
        }

        // 8. Delete
        console.log('8. Testing Delete...');
        rows = await page.$$('table.table tbody tr'); // Re-fetch
        if (rows.length > 0) {
            const firstRowText = await page.evaluate(el => el.innerText, rows[0]);
            if (firstRowText.includes('Puppeteer')) {
                const actionButtons = await rows[0].$$('td:last-child button');
                const delBtn = actionButtons[actionButtons.length - 1]; // Last button

                await delBtn.click();
                console.log('   Clicked Delete.');
                await new Promise(r => setTimeout(r, 1000));

                const confirmed = await clickByText('button', 'Delete') || await clickByText('button', 'Confirm');
                if (confirmed) {
                    console.log('   Confirmed Delete.');
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        } else {
            console.log('   No rows to delete.');
        }

        console.log('--- TEST COMPLETED ---');
        await page.screenshot({ path: 'catalog_test_success.png' });

    } catch (e) {
        console.error('Test Failed:', e);
        await page.screenshot({ path: 'catalog_test_fail.png' });
    } finally {
        await browser.close();
    }
})();
