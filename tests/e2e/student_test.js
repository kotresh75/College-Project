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
        console.log('--- STARTING STUDENT PAGE TEST ---');

        // 1. Navigate
        console.log('1. Navigating to http://localhost:3000/#/dashboard/members...');
        await page.goto('http://localhost:3000/#/dashboard/members');

        // Check if redirected to Login/Landing
        await new Promise(r => setTimeout(r, 2000));
        const url = await page.url();
        console.log(`   Current URL: ${url}`);

        if (!url.includes('dashboard')) {
            console.log('   Redirected to Login/Landing. Attempting to Login...');

            // 1. Landing Page -> Access Portal
            const accessBtn = await clickByText('button', 'Access Portal');
            if (accessBtn) {
                console.log('   Clicked Access Portal.');
                await new Promise(r => setTimeout(r, 1000));
            }

            // 2. Login Form
            // Found name="email" in LoginPage.js
            const userField = await page.$('input[name="email"]');
            const passField = await page.$('input[name="password"]');

            if (userField && passField) {
                console.log('   Found Login inputs. Logging in as system@library.com...');
                await userField.type('system@library.com'); // Seeded system user
                await passField.type('admin123');

                const loginBtn = await page.$('button[type="submit"]');
                if (loginBtn) {
                    await loginBtn.click();
                    console.log('   Clicked Login.');
                    await new Promise(r => setTimeout(r, 3000));

                    // Check for error
                    const errorBanner = await page.$('.error-banner');
                    if (errorBanner) {
                        const errorText = await page.evaluate(el => el.textContent, errorBanner);
                        console.log(`   ! Login Error: ${errorText}`);
                        throw new Error(`Login Failed: ${errorText}`);
                    }
                }
            }

            // Navigate back to members if needed
            if (!page.url().includes('members')) {
                await page.goto('http://localhost:3000/#/dashboard/members');
            }
        }

        // 2. Wait for load
        console.log('2. Waiting for Student content...');
        await page.waitForSelector('.dashboard-content', { timeout: 20000 });
        console.log('   Student Page Loaded.');
        await new Promise(r => setTimeout(r, 2000));

        // 3. Add Student
        console.log('3. Testing "Add Student"...');
        // Find Add Button by text or icon (Plus)
        const addBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.includes('Add Student'));
        });

        if (addBtn.asElement()) {
            await addBtn.asElement().click();
            console.log('   Clicked Add Student button.');

            await page.waitForSelector('input[name="register_no"]');

            const uniqueId = Date.now();
            const regNo = `REG-${uniqueId}`;
            const studentName = `Puppeteer Student ${uniqueId}`;

            // Fill Form
            await page.type('input[name="register_no"]', regNo);
            await page.type('input[name="name"]', studentName);
            await page.type('input[name="father_name"]', 'Bot Father');
            await page.type('input[name="dob"]', '2000-01-01'); // YYYY-MM-DD
            // Email is now optional - Test without it
            // await page.type('input[name="email"]', `student${uniqueId}@gptk.edu.in`);

            // Select Department
            console.log('   Selecting Department...');
            // Need to target specific GlassSelects. 
            // The modal has multiple inputs.
            // Department is typically one of the selects.
            // strategy: Click label 'Department' next sibling or closest Select

            // More robust: Find all glass-select-trigger in modal and click the one corresponding to dept
            // But we can just try clicking the first one found in the form if simpler, 
            // OR use placeholders if available.
            // SmartAddStudentModal: Dept placeholder = t('students.modal.dept_select') -> "Select Department" likely

            // Scope to Modal
            const modal = await page.$('.smart-form-modal');
            const selectTriggers = await modal.$$('.glass-select-trigger');
            console.log(`   Found ${selectTriggers.length} select triggers inside Modal.`);

            // Assuming Dept is the 2nd select (1st is Semester) based on code order:
            // RegNo, Semester (Select), Dept (Select)
            if (selectTriggers.length >= 2) {
                // Check what we are clicking
                const triggerText = await page.evaluate(el => el.textContent, selectTriggers[1]);
                console.log(`   Clicking Trigger [1]: "${triggerText.trim()}"`);

                // Click Dept (Index 1)
                await page.evaluate(el => el.click(), selectTriggers[1]);
                await new Promise(r => setTimeout(r, 1500));

                const options = await page.$$('.dropdown-option');
                console.log(`   Found ${options.length} options in Dept dropdown.`);

                if (options.length > 0) {
                    const optionText = await page.evaluate(el => el.textContent, options[0]);
                    console.log(`   Selecting Option [0]: "${optionText.trim()}"`);

                    await page.evaluate(el => el.click(), options[0]);
                    console.log('   Selected Department.');
                    await new Promise(r => setTimeout(r, 1000)); // Wait for state update
                } else {
                    console.log('   ! No options in Department dropdown.');
                }
            } else {
                console.log('   ! Could not find Department Select.');
            }

            // Submit
            // Submit
            const submitBtn = await page.$('button[type="submit"]');
            if (submitBtn) {
                await submitBtn.click();
                console.log('   Clicked Save.');

                // Wait for modal to close OR error message
                try {
                    await page.waitForFunction(() => !document.querySelector('.smart-form-modal'), { timeout: 5000 });
                    console.log('   Add Student Modal closed.');
                } catch (e) {
                    console.log('   ! Modal did NOT close. Checking for errors...');
                    const errorMsg = await page.$eval('.validation-msg', el => el.textContent).catch(() => null);
                    if (errorMsg) {
                        console.log(`   ! Validation Error: ${errorMsg}`);
                        throw new Error(`Add Student Failed: ${errorMsg}`);
                    }
                    // Capture screenshot if modal stuck without error
                    await page.screenshot({ path: 'student_add_stuck.png' });
                }

                await new Promise(r => setTimeout(r, 3000));
            }

            // 4. Search
            console.log('4. Testing Search...');
            await page.type('input[placeholder*="Search"]', regNo);
            await new Promise(r => setTimeout(r, 2000));

            // Check rows again
            const rows = await page.$$('table.table tbody tr');
            if (rows.length > 0) {
                const rowText = await page.evaluate(el => el.innerText, rows[0]);
                if (rowText.includes(regNo)) {
                    console.log(`   Found student: ${regNo}`);

                    const actionButtons = await rows[0].$$('td:last-child button');

                    // 5. View (Optional)
                    // 6. Edit
                    if (actionButtons.length >= 2) {
                        // Edit is usually 2nd button
                        console.log('5. Testing Edit...');
                        // Use evaluate click for robustness
                        await page.evaluate(el => el.click(), actionButtons[1]);
                        console.log('   Clicked Edit.');

                        await page.waitForSelector('input[name="name"]', { timeout: 5000 });
                        // Change name
                        const nameInput = await page.$('input[name="name"]');
                        await nameInput.click({ clickCount: 3 });
                        await nameInput.type(`${studentName} Edited`);

                        // Save
                        const saveBtn = await page.evaluateHandle(() => {
                            const btns = Array.from(document.querySelectorAll('.smart-form-modal button'));
                            return btns.find(b => b.textContent.includes('Save') || b.textContent.includes('Update'));
                        });
                        if (saveBtn.asElement()) {
                            await saveBtn.asElement().click();
                            console.log('   Clicked Update.');
                            await new Promise(r => setTimeout(r, 3000));
                        }
                    }

                    // 7. Delete
                    console.log('6. Testing Delete...');
                    // Re-fetch rows
                    const finalRows = await page.$$('table.table tbody tr');
                    if (finalRows.length > 0) {
                        const finalActions = await finalRows[0].$$('td:last-child button');
                        const delBtn = finalActions[finalActions.length - 1];

                        await delBtn.click();
                        console.log('   Clicked Delete.');
                        await new Promise(r => setTimeout(r, 1000));

                        // Confirm
                        const confirmBtn = await page.evaluateHandle(() => {
                            const btns = Array.from(document.querySelectorAll('button'));
                            return btns.find(b => b.textContent.includes('Delete') && b.closest('.modal-content'));
                        });

                        if (confirmBtn.asElement()) {
                            await confirmBtn.asElement().click();
                            console.log('   Confirmed Delete.');
                            await new Promise(r => setTimeout(r, 2000));
                        } else {
                            // Fallback for different modal structure
                            const anyDelete = await clickByText('button', 'Delete');
                            if (anyDelete) console.log('   Confirmed Delete (Fallback).');
                        }
                    }

                } else {
                    console.log('   ! Search result did not match RegNo.');
                }
            } else {
                console.log('   ! No rows found after search.');
            }

        } else {
            throw new Error('Add Student button not found');
        }

        console.log('--- TEST COMPLETED ---');
        await page.screenshot({ path: 'student_test_success.png' });

    } catch (e) {
        console.error('Test Failed:', e);
        await page.screenshot({ path: 'student_test_fail.png' });
    } finally {
        await browser.close();
    }
})();
