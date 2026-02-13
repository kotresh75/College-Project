# Summative Assessment - Semester End Examination (SEE)

During the Summative assessment, students shall demonstrate the outcomes of their Capstone project work to the Panel of Examiners comprising a cohort owner and an external Subject expert.

| Sl No | Parameters | Marks |
|:-----:|------------|:-----:|
| 1 | Power point presentation on outcomes of the Capstone project work | 60 |
| 2 | Demonstration of the Capstone project work | 60 |
| 3 | Capstone project Report - Format and Technical writing skill | 40 |
|   | **Total** | **160** |

---

## 1. PowerPoint Presentation on Outcomes (60 Marks)

### 1.1 Presentation Structure

| Slide No. | Topic | Duration | Content |
|-----------|-------|----------|---------|
| 1 | Title Slide | 30 sec | Project name, team members, guide name, date |
| 2 | Problem Statement | 1 min | Current manual system issues |
| 3 | Objectives | 1 min | 6 key objectives of the project |
| 4 | Scope | 1 min | In-scope and out-of-scope features |
| 5 | Technology Stack | 1 min | Electron, React, Node.js, SQLite |
| 6 | System Architecture | 1.5 min | Three-tier desktop architecture diagram |
| 7-8 | Module Overview | 2 min | 9 modules with responsibilities |
| 9-10 | Database Design | 2 min | ER diagram and key tables |
| 11-12 | UI Screenshots | 2 min | Login, Dashboard, Circulation pages |
| 13 | Testing Summary | 1.5 min | 63 test cases, 100% pass rate |
| 14 | Results & Achievements | 1.5 min | Key outcomes and metrics |
| 15 | Challenges & Solutions | 1 min | Problems faced and resolutions |
| 16 | Future Enhancements | 1 min | Mobile app, OPAC, cloud sync |
| 17 | Conclusion | 30 sec | Summary of achievements |
| 18 | Thank You / Q&A | - | Questions from panel |

**Total Duration**: 15-18 minutes

---

### 1.2 Slide Content Details

#### Slide 1: Title Slide
```
GPTK LIBRARY MANAGEMENT SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A Desktop-based Library Automation Solution

Student Name: [Your Name]
Register No: [Your Reg No]
Department: [Your Department]
Guide: [Guide Name]
Date: 09/02/2026
```

#### Slide 2: Problem Statement
**Current Challenges in GPTK Library:**
- ❌ Manual ledger-based book tracking
- ❌ Time-consuming check-in/check-out process
- ❌ Difficulty tracking overdue books
- ❌ No automated fine calculation
- ❌ Paper records prone to damage/loss
- ❌ No real-time inventory visibility

#### Slide 3: Objectives
1. ✅ Automate book circulation with barcode scanning
2. ✅ Centralize book and student database
3. ✅ Automate fine calculation and collection
4. ✅ Enable offline-first operation
5. ✅ Implement role-based access control
6. ✅ Generate real-time reports and analytics

#### Slide 4: Scope

| In-Scope | Out-of-Scope |
|----------|--------------|
| Authentication & RBAC | Mobile application |
| Book Catalog Management | Online payment gateway |
| Student Management | Inter-library loan |
| Issue/Return/Renew | Public web catalog (OPAC) |
| Fine Management | |
| Barcode Scanner Integration | |
| Report Generation | |
| Thermal/A4 Printing | |

#### Slide 5: Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop Container | Electron.js 40.x |
| Frontend | React.js 18.x |
| Backend | Node.js 20.x + Express.js |
| Database | SQLite3 (Embedded) |
| Authentication | JWT + bcrypt |
| Printing | ESC/POS + System Print API |

#### Slide 6: System Architecture
```
┌─────────────────────────────────────────┐
│          ELECTRON CONTAINER             │
├─────────────────────────────────────────┤
│    Presentation Layer (React.js UI)     │
├─────────────────────────────────────────┤
│   Application Layer (Node.js/Express)   │
├─────────────────────────────────────────┤
│     Data Layer (SQLite Database)        │
└─────────────────────────────────────────┘
```

#### Slides 7-8: Module Overview

| Module | Responsibility |
|--------|----------------|
| Authentication | Login, JWT tokens, password reset |
| Dashboard | KPIs, real-time statistics, charts |
| Catalog | Book and copy management |
| Students | Student database CRUD |
| Circulation | Issue, Return, Renew operations |
| Fines | Fine calculation, collection, waivers |
| Reports | Daily/Monthly analytics, exports |
| Audit | System activity logging |
| Settings | System configuration, policies |

#### Slides 9-10: Database Design
- **11 Core Tables**: admins, staff, students, departments, books, book_copies, circulation, fines, transaction_logs, audit_logs, settings
- **ER Diagram** showing relationships
- **Key Constraints**: Foreign keys, unique constraints, NOT NULL

#### Slides 11-12: UI Screenshots
- Login Page with remember me
- Dashboard with KPI cards and charts
- Circulation page with barcode scanning
- Reports page with export options

#### Slide 13: Testing Summary

| Category | Tests | Pass Rate |
|----------|-------|-----------|
| Authentication | 6 | 100% |
| Catalog | 8 | 100% |
| Students | 6 | 100% |
| Circulation | 9 | 100% |
| Fines | 7 | 100% |
| Reports | 6 | 100% |
| Hardware | 5 | 100% |
| API | 16 | 100% |
| **Total** | **63** | **100%** |

#### Slide 14: Results & Achievements
- ✅ 100% offline functionality
- ✅ 2-second average transaction time
- ✅ 150ms average API response
- ✅ Supports 50,000+ records
- ✅ Bilingual support (English/Kannada)
- ✅ Barcode scanner and printer integration

#### Slide 15: Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| SQLite concurrent writes | WAL mode implementation |
| Large data performance | Pagination and virtual scrolling |
| Printer compatibility | Standardized ESC/POS commands |
| Barcode buffer issues | Debouncing and terminator detection |

#### Slide 16: Future Enhancements
- 📱 Mobile app for students
- 🌐 Public Access Catalog (OPAC)
- ☁️ Cloud backup and sync
- 📧 Email/SMS notifications
- 📊 Advanced analytics dashboard

#### Slide 17: Conclusion
> The GPTK Library Management System successfully automates library operations with offline-first architecture, reducing administrative burden and improving efficiency through barcode integration and automated processes.

---

## 2. Demonstration of Capstone Project Work (60 Marks)

### 2.1 Demonstration Flow

| Step | Module | Actions to Demonstrate | Time |
|------|--------|------------------------|------|
| 1 | **Application Launch** | Start app, show splash screen | 30 sec |
| 2 | **Login** | Admin login with credentials | 1 min |
| 3 | **Dashboard** | Show KPIs, charts, quick actions | 2 min |
| 4 | **Add Book** | Add new book with ISBN | 2 min |
| 5 | **Add Student** | Add student with register number | 2 min |
| 6 | **Issue Book** | Scan barcode, issue to student | 2 min |
| 7 | **Return Book** | Scan barcode, return with fine | 2 min |
| 8 | **Pay Fine** | Collect fine, print receipt | 2 min |
| 9 | **Generate Report** | Daily report, export to Excel | 2 min |
| 10 | **Audit Log** | View system activity | 1 min |
| 11 | **Settings** | Show configuration options | 1 min |
| | | **Total** | **~18 min** |

### 2.2 Key Features to Highlight

#### 2.2.1 Barcode Scanning
- **Demonstrate**: Scan book barcode → Details auto-populate
- **Demonstrate**: Scan student ID → Student info displayed
- **Highlight**: No manual data entry required

#### 2.2.2 Automated Fine Calculation
- **Demonstrate**: Return overdue book
- **Show**: Fine calculated automatically (₹2/day)
- **Highlight**: Accuracy and speed

#### 2.2.3 Receipt Printing
- **Demonstrate**: Complete fine payment
- **Show**: Receipt printed on thermal printer
- **Highlight**: Professional receipts with all details

#### 2.2.4 Report Generation
- **Demonstrate**: Generate daily transaction report
- **Show**: Export to Excel (.xlsx) and PDF
- **Highlight**: Multiple export formats

#### 2.2.5 Offline Functionality
- **Demonstrate**: Disconnect network
- **Show**: All features still working
- **Highlight**: No internet required

### 2.3 Expected Q&A Topics

| Topic | Possible Questions |
|-------|-------------------|
| **Architecture** | Why Electron? Why SQLite? |
| **Security** | How is authentication implemented? |
| **Performance** | How does it handle large data? |
| **Backup** | What if database gets corrupted? |
| **Scalability** | Can it be used in other colleges? |
| **Technology** | Why not a web application? |

### 2.4 Demo Preparation Checklist

- [ ] Application installed and tested
- [ ] Sample data loaded (books, students)
- [ ] Barcode scanner connected and tested
- [ ] Printer connected and tested with paper
- [ ] Backup of working database
- [ ] PowerPoint ready on same machine
- [ ] Screen resolution set for projector
- [ ] All login credentials noted

---

## 3. Capstone Project Report - Format and Technical Writing (40 Marks)

### 3.1 Report Structure

| Chapter | Title | Pages | Content |
|---------|-------|-------|---------|
| - | Title Page | 1 | Project name, student details, guide |
| - | Certificate | 1 | College and guide certification |
| - | Declaration | 1 | Originality declaration |
| - | Acknowledgement | 1 | Thanks to guide, HOD, family |
| - | Abstract | 1 | 200-word project summary |
| - | Table of Contents | 1-2 | Chapter-wise listing |
| - | List of Figures | 1 | Figure numbers and titles |
| - | List of Tables | 1 | Table numbers and titles |
| - | List of Abbreviations | 1 | LMS, RBAC, JWT, etc. |
| 1 | Introduction | 5-6 | Background, objectives, scope |
| 2 | Project Planning | 8-10 | WBS, timeline, CBS, risk analysis |
| 3 | Approach & Methodology | 5-6 | Development methodology, tech stack |
| 4 | Implementation | 10-15 | Modules, code snippets, UI |
| 5 | Testing & Results | 8-10 | Test cases, results, inference |
| 6 | Conclusion | 2-3 | Summary, future work |
| - | References | 1-2 | Books, websites, papers |
| - | Appendices | 5-10 | Additional diagrams, code |

**Total Pages**: 50-70 pages

### 3.2 Formatting Guidelines

| Element | Specification |
|---------|---------------|
| **Paper Size** | A4 |
| **Margins** | Left: 1.5", Top/Right/Bottom: 1" |
| **Font** | Times New Roman |
| **Body Text** | 12pt, 1.5 line spacing |
| **Headings** | Chapter: 16pt Bold, Section: 14pt Bold |
| **Page Numbers** | Bottom center, starting from Chapter 1 |
| **Header** | Chapter title on even pages |
| **Binding** | Spiral or hard binding |

### 3.3 Technical Writing Guidelines

| Aspect | Guidelines |
|--------|------------|
| **Tense** | Use past tense for completed work |
| **Voice** | Prefer passive voice in technical sections |
| **Clarity** | Short sentences, avoid jargon |
| **Figures** | All figures must be labeled and referenced |
| **Tables** | All tables must have captions |
| **Code** | Use monospace font, syntax highlighting |
| **References** | IEEE citation format |

### 3.4 Report Evaluation Criteria

| Criteria | Marks | Focus Areas |
|----------|-------|-------------|
| **Content Accuracy** | 15 | Technical correctness, completeness |
| **Format Compliance** | 10 | Margins, fonts, page structure |
| **Diagrams Quality** | 5 | Clear, labeled, referenced |
| **Language & Grammar** | 5 | Error-free, professional |
| **Code Documentation** | 5 | Proper comments, snippets |
| **Total** | **40** | |

### 3.5 Common Mistakes to Avoid

| ❌ Mistake | ✅ Correct Approach |
|-----------|---------------------|
| Copy-pasting from internet | Write in your own words |
| Missing figure references | Reference every figure in text |
| Inconsistent formatting | Use styles consistently |
| Screenshots without labels | Add figure numbers and captions |
| Incomplete test cases | Document all major test scenarios |
| Missing page numbers | Number all pages appropriately |
| Wrong citation format | Follow IEEE format strictly |

---

## Summary

The Semester End Examination (SEE) evaluates your complete capstone project through three components:

| Component | Marks | Key Focus |
|-----------|-------|-----------|
| **Presentation** | 60 | Clear communication of project outcomes |
| **Demonstration** | 60 | Live working demo of all features |
| **Report** | 40 | Professional documentation quality |
| **Total** | **160** | |

### Preparation Tips
1. **Practice presentation** multiple times with timer
2. **Test demonstration** on actual exam machine
3. **Review report** for formatting and grammar
4. **Prepare for Q&A** with expected questions
5. **Keep backup** of all files (PPT, database, report)

---

## Quick Reference: File Locations

| Document | Location |
|----------|----------|
| Project Report | `Docs/Temp Report.md` |
| Technical Documentation | `Docs/Technical & Functional Documentation.md` |
| CIE 1 (Scope, Planning) | `Docs/CIE 1.md` |
| CIE 2 (Project Details) | `Docs/CIE 2.md` |
| CIE 3 (Testing, Results) | `Docs/CIE 3.md` |
| System Diagrams | `Docs/System_Design_Diagrams.md` |
