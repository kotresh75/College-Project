# Continuous Internal Evaluation - CIE - I conducted at the end of 4th week

| Sl No | Assessment of parameter | Marks |
|:-----:|-------------------------|:-----:|
| 1 | Writing the Capstone project scope document | 20 |
| 2 | **Capstone project Planning**: | 40 |
|   | • Work Breakdown Structure (WBS) - 10 marks | |
|   | • Time-line Schedule - 10 marks | |
|   | • Cost Breakdown Structure (CBS) - 10 marks | |
|   | • Risk Analysis - 10 marks | |
| 3 | Identification of Methodology (Including Literature survey) | 20 |
|   | **Total** | **80** |

---

## 1. Capstone Project Scope Document (20 Marks)

### 1.1 Project Title
**GPTK Library Management System (LMS)**

### 1.2 Problem Statement
The current manual ledger-based system for managing library resources at GPTK is inefficient and prone to human error:
- **Inefficiency**: Checking books in and out manually is time-consuming
- **Lack of Visibility**: Difficult to track real-time status of books (issued, lost, damaged) or calculate total inventory value
- **Data Security**: Paper records are susceptible to loss or damage; student data privacy is hard to maintain
- **Reporting**: Generating reports on usage trends, fines collected, or inventory status is a laborious manual process

### 1.3 Objectives
1. **Automate Circulation**: Streamline issuing, returning, and renewing of books using barcode scanning
2. **Centralize Management**: Maintain a single, accurate database for all books, students, and staff
3. **Enhance Operations**: Reduce administrative burden through automated fine calculations and due date tracking
4. **Ensure Availability**: Provide a robust, offline-first system that functions without continuous internet access
5. **Secure Data**: Implement Role-Based Access Control (RBAC) to protect sensitive information
6. **Provide Insights**: Generate real-time reports on inventory, student activity, and financial transactions

### 1.4 Scope

#### In-Scope
- **Core Modules**: Authentication, Dashboard, Catalog Management, Student Management, Circulation (Issue/Return/Renew)
- **Financials**: Fine calculation (overdue/damage), payment recording, and receipt generation
- **Reporting**: Daily/Monthly transaction reports, inventory status, and audit logs
- **Hardware Integration**: Support for Barcode Scanners and Ticket/A4 Printers
- **Architecture**: Desktop-based Application (Electron) with Local Database (SQLite) and optional Cloud Sync

#### Out-of-Scope
- Mobile application for students
- Online payment gateway integration
- Inter-library loan system
- Public Access Catalog (OPAC) for web access

### 1.5 Proposed Solution
A **Desktop-based Library Management System** tailored for GPTK:
- **Local-First Design**: Standalone executable (Electron) storing data locally (SQLite)
- **Modern Interface**: User-friendly, responsive React.js interface
- **Automation**: One-click barcode scanning for rapid check-outs and check-ins
- **Backup Strategy**: Automated local backups with optional encrypted cloud storage sync

### 1.6 Technology Stack
| Layer | Technology |
|-------|------------|
| Frontend | React.js, CSS Variables |
| Backend/Runtime | Electron.js, Node.js, Express.js |
| Database | SQLite3 (Embedded, Local) |
| Cloud Backup | MongoDB Atlas (Optional) |
| Hardware Interface | WebHID/Serial API for scanners |

### 1.7 Feasibility Study

| Category | Factor | Assessment | Status |
|----------|--------|------------|--------|
| **Technical** | Hardware Readiness | Compatible with existing Windows PCs and standard barcode scanners | **High** |
| | Technology Stack | Electron + SQLite provides proven, robust platform for offline-first desktop apps | **High** |
| | Scalability | SQLite can handle 50,000+ records, sufficient for college needs | **High** |
| **Operational** | Ease of Use | Intuitive UI designed for non-technical staff | **High** |
| | Training Needs | Low; requires only 1-day workshop for library staff | **High** |
| **Economic** | Development Cost | Internal development with open-source stack keeps costs minimal | **High** |
| | Maintenance | Low maintenance with auto-backups and simple file-based database | **High** |
| **Legal** | Data Privacy | Local storage ensures student data is not exposed to public servers | **High** |

---

## 2. Capstone Project Planning (40 Marks)

### 2.1 Work Breakdown Structure (WBS) - 10 Marks

The WBS divides the project into manageable phases and activities:

| WBS ID | Phase / Activity | Description |
|--------|------------------|-------------|
| 1 | Project Initiation & Requirement Analysis | Study of existing system, problem definition, requirement gathering, scope finalization |
| 2 | System Design & Architecture | Desktop application architecture design, database schema, application flow using Electron.js |
| 3 | Backend Development | Authentication, staff management, book management, circulation, fine calculation, audit modules |
| 4 | Database Implementation | SQLite database tables creation, schema validation, data integration |
| 5 | Frontend Development | React-based user interfaces for Admin and Staff with barcode scanner integration |
| 6 | Integration & Testing | Electron container integration, frontend-backend connection, barcode scanner testing |
| 7 | Documentation | Project report, diagrams, screenshots, user guide preparation |
| 8 | Deployment & Submission | Desktop application packaging, local deployment, demonstration, final submission |

```
GPTK LMS Project
├── 1. Initiation & Requirements
├── 2. Design & Architecture
├── 3. Backend Development
├── 4. Database Implementation
├── 5. Frontend Development
├── 6. Integration & Testing
├── 7. Documentation
└── 8. Deployment & Submission
```

### 2.2 Timeline Schedule - 10 Marks

| Phase No. | Project Phase | Activities Covered | Duration (Weeks) |
|-----------|---------------|-------------------|------------------|
| 1 | Project Initiation & Requirement Analysis | Study of existing system, problem definition, requirement gathering | 2 |
| 2 | System Design & Architecture | System architecture design, database schema, use case and workflow design | 2 |
| 3 | Backend Development | Authentication, user management, book management, circulation logic, fine calculation | 4 |
| 4 | Database Implementation | SQLite database design, table creation, validation rules, backend integration | 2 |
| 5 | Frontend Development | UI design, dashboards, forms, barcode integration, API integration | 3 |
| 6 | System Integration & Testing | Electron packaging, module integration, barcode testing, offline functionality testing | 2 |
| 7 | Documentation & Reporting | Report preparation, diagrams, screenshots, test cases | 0.5 |
| 8 | Deployment & Submission | Desktop app packaging, local deployment, demonstration, final submission | 0.5 |
| | **Total Duration** | | **16 Weeks** |

### 2.3 Cost Breakdown Structure (CBS) - 10 Marks

| Cost Category | Item | Estimated Cost (₹) |
|---------------|------|-------------------|
| Software and Tools | Electron.js, React.js, Node.js, Express.js, SQLite, VS Code, Git | 0 (Open-source) |
| Hardware | Development laptop/computer | 0 (Existing) |
| Internet and Research | Internet usage for documentation and research | 500 - 1,000 |
| Documentation | Report printing and binding | 500 - 1,000 |
| Miscellaneous | Electricity, stationery | 500 - 1,000 |
| **Total Estimated Cost** | | **₹1,500 - ₹3,000** |

**Cost Advantage**: The project uses entirely open-source technologies (MIT License), eliminating licensing costs and making it highly economical for academic implementation.

### 2.4 Risk Analysis - 10 Marks

| Sl. No. | Risk Description | Impact | Probability | Mitigation Strategy |
|---------|------------------|--------|-------------|---------------------|
| 1 | Incomplete or unclear requirements | High | Medium | Conduct regular discussions with guide and review requirements before development |
| 2 | Delay in backend development | Medium | Medium | Follow phased development and adhere to planned schedule |
| 3 | Integration issues between frontend and backend | Medium | Medium | Perform early integration and continuous testing |
| 4 | Database design errors | High | Low | Validate schema design and perform testing with sample data |
| 5 | Security issues (authentication/authorization) | High | Low | Implement JWT-based authentication and role-based access control |
| 6 | Data loss or corruption | High | Low | Perform regular backups and data validation using SQLite WAL mode |
| 7 | Testing limitations due to time constraints | Medium | Medium | Prioritize core functionalities during testing |
| 8 | Hardware or system failure | Low | Low | Use reliable systems and maintain backup copies of code |

---

## 3. Identification of Methodology (20 Marks)

### 3.1 Development Methodology: Modular Development Approach

The Library Management System was developed using a **Modular Development Methodology** specifically designed for desktop application development. This approach divides the system into independent, self-contained modules that can be developed, tested, and maintained separately.

**Key Characteristics of Modular Approach:**
- **Independent Modules**: Each module (Authentication, Circulation, Catalog, Reports) is developed as a standalone unit
- **Loose Coupling**: Modules communicate through well-defined APIs and IPC channels
- **High Cohesion**: Related functionalities are grouped within the same module
- **Parallel Development**: Multiple modules can be developed simultaneously
- **Easy Maintenance**: Changes in one module do not affect others

### 3.2 Why Modular Development?

| Factor | Justification |
|--------|---------------|
| **Complexity Management** | Breaking the system into modules makes development manageable |
| **Reusability** | Modules can be reused or replaced without affecting the entire system |
| **Testing Efficiency** | Each module can be unit tested independently |
| **Team Collaboration** | Different team members can work on different modules simultaneously |
| **Scalability** | New features can be added as new modules without modifying existing code |
| **Maintainability** | Bug fixes and updates are isolated to specific modules |

### 3.3 Literature Survey

#### Existing Library Management Systems Reviewed:

| System | Type | Limitations |
|--------|------|-------------|
| Koha | Web-based, Open-source | Requires server setup, internet dependency |
| OpenBiblio | Web-based | Limited offline functionality |
| SOUL 2.0 | Desktop-based | Proprietary, high licensing cost |
| Manual Ledger System | Traditional | Error-prone, time-consuming, no reporting |

#### Key Findings from Literature:
1. **Automation Benefits**: Studies show 60-70% reduction in administrative time with automated LMS
2. **Barcode Integration**: Significantly reduces book identification time from minutes to seconds
3. **Offline Functionality**: Critical for institutions with unreliable internet connectivity
4. **Role-Based Access**: Essential for security and accountability in multi-user systems

### 3.4 Technology Stack Selection Rationale

| Technology | Reason for Selection |
|------------|---------------------|
| **Electron.js** | Cross-platform desktop development with web technologies, offline capability |
| **React.js** | Component-based UI, responsive design, large ecosystem |
| **Node.js/Express** | JavaScript unification, efficient API development |
| **SQLite** | Serverless, embedded database ideal for offline desktop applications |

### 3.5 System Design Approach

The system follows a **three-tier desktop architecture**:

```
┌─────────────────────────────────────────┐
│          Electron Container             │
├─────────────────────────────────────────┤
│  Presentation Layer (React.js UI)       │
├─────────────────────────────────────────┤
│  Application Layer (Node.js/Express)    │
├─────────────────────────────────────────┤
│  Data Layer (SQLite Database)           │
└─────────────────────────────────────────┘
```

### 3.6 Key Methodological Decisions

1. **Desktop-First Approach**: Chosen over web-based solution for:
   - Complete offline functionality
   - Enhanced data privacy (local storage)
   - No recurring hosting costs
   - Better hardware integration (barcode scanners, printers)

2. **Local-First Data Architecture**:
   - SQLite for immediate data access without network latency
   - Optional cloud sync for backup purposes only

3. **Modular Architecture**:
   - Independent modules for authentication, circulation, catalog, reports
   - Each module has its own controller, routes, and UI components
   - Easier testing, debugging, and maintenance

### 3.7 Module Breakdown

| Module | Responsibility | Key Components |
|--------|----------------|----------------|
| **Authentication** | Login, JWT tokens, password reset | `authController.js`, `LoginPage.js` |
| **Circulation** | Issue, Return, Renew operations | `circulationHandler.js`, `CirculationPage.js` |
| **Catalog** | Book and copy management | `bookController.js`, `CatalogPage.js` |
| **Students** | Student database management | `studentController.js`, `StudentManager.js` |
| **Fines** | Fine calculation and collection | `fineController.js`, `FineManagementPage.js` |
| **Reports** | Analytics and export | `reportsController.js`, `ReportsPage.js` |
| **Audit** | System activity logging | `auditController.js`, `AuditPage.js` |
| **Dashboard** | KPIs and real-time stats | `dashboardController.js`, `DashboardHome.js` |
| **Settings** | System configuration | `policyController.js`, `SettingsPage.js` |

### 3.8 Summary

The **Modular Development Methodology** was chosen as it perfectly aligns with the project's requirements for:
- Clear separation of concerns between different library functions
- Independent development and testing of each module
- Easy future enhancements by adding new modules
- Structured codebase that is easy to understand and maintain

This methodology, combined with structured planning (WBS, Timeline, CBS, Risk Analysis) and comprehensive literature review, ensures the delivery of a functional, secure, and user-friendly Library Management System within the academic timeline.
