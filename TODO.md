# GroosHub - Master TODO List

> **Last Updated**: 2025-12-08
> **Status**: Organized by feature area with priorities
> **Total Items**: ~150 actionable tasks

---

## Priority Legend

- 🚨 **CRITICAL** - Must do ASAP, blocking or breaking
- 🔥 **HIGH** - Important, should do soon
- ⚙️ **MEDIUM** - Should do, improves quality
- 💡 **LOW** - Nice to have, future enhancement

---

## 🗄️ Database Migration

> **⚠️ WARNING**: Old database tables will be deleted soon. Code using them WILL BREAK!
> **Reference**: [/docs/07-database/URGENT-MIGRATION-REQUIRED.md](docs/07-database/URGENT-MIGRATION-REQUIRED.md)

### 🚨 CRITICAL: Code Migration (MUST DO FIRST!)

- [ ] **Search for old table names** in `src/` directory
  ```bash
  grep -r "FROM users\|FROM chats\|FROM projects\|FROM saved_locations" src/
  ```
- [ ] **Update all queries** to use new table names:
  - `users` → `user_accounts`
  - `chats` → `chat_conversations`
  - `chats_messages` → `chat_messages`
  - `chats_messages_votes` → `chat_message_votes`
  - `chat_files` → `file_uploads`
  - `projects` → `project_projects`
  - `saved_locations` → `location_snapshots`
- [ ] **Update TypeScript types** to match new schema
- [ ] **Update foreign key references** in all tables
- [ ] **Remove imports** from legacy database files

### 🚨 CRITICAL: Testing Before Migration

- [ ] All queries use new table names
- [ ] All foreign keys point to new tables
- [ ] API endpoints work with new schema
- [ ] Frontend doesn't break
- [ ] Authentication still works
- [ ] File uploads work
- [ ] Location analysis works
- [ ] LCA calculations work

### 🚨 CRITICAL: Data Migration

- [ ] Create backup of all legacy data
- [ ] Migrate data from `saved_locations` → `location_snapshots`
- [ ] Verify all legacy tables are no longer in use

### ⚙️ MEDIUM: Cleanup (After 30-day Safety Period)

- [ ] Drop legacy tables: `users`, `chats`, `chats_messages`, `chat_files`, `saved_locations`
- [ ] Remove unused imports and commented code
- [ ] Update documentation
- [ ] Performance optimization

---

## 📍 Location Analysis Page

> **Priority**: HIGH - Core feature that needs completion
> **Reference**: [/docs/03-features/location-analysis/](docs/03-features/location-analysis/)

### 🔥 HIGH: Scoring System Enhancements

- [ ] Add support for custom scoring algorithms
- [ ] Implement weighted scoring across multiple indicators
- [ ] Add historical trend analysis
- [ ] Create scoring visualization components
- [ ] Multi-level baseline comparisons (vs municipality, not just national)

### 🔥 HIGH: UI/UX Improvements

- [ ] Improve mobile responsiveness
- [ ] Add loading skeleton screens
- [ ] Enhance error messaging
- [ ] Add data export functionality (PDF, Excel)
- [ ] Create comparison view (multiple locations side-by-side)

### 🔥 HIGH: Data Pipeline Optimization

- [ ] Refactor parsers to use normalizers (reduce duplication)
- [ ] Optimize API calls (batch requests where possible)
- [ ] Improve caching strategy
- [ ] Add retry logic for failed API calls
- [ ] Better error handling for external APIs

### ⚙️ MEDIUM: Feature Additions

- [ ] Add scoring presets for common use cases
- [ ] Support for custom comparison functions
- [ ] Historical data tracking (show trends over time)
- [ ] Add neighborhood comparison feature
- [ ] Amenities search radius customization

### ⚙️ MEDIUM: Testing

- [ ] Unit tests for scoring calculations
- [ ] Integration tests for data pipeline
- [ ] E2E tests for location search flow
- [ ] Performance testing with large datasets
- [ ] API mock testing

---

## 🤖 AI Assistant (Chatbot)

> **Priority**: HIGH - Core feature that needs completion
> **Reference**: [/docs/03-features/ai-chatbot/](docs/03-features/ai-chatbot/)

### 🔥 HIGH: Multimodal Support

#### File Upload Testing
- [ ] Test single image upload (PNG, JPG < 10MB)
- [ ] Test PDF upload (< 50MB)
- [ ] Test multiple file upload (up to 10 mixed types)
- [ ] Verify files appear in R2 bucket
- [ ] Verify metadata in database

#### Validation Testing
- [ ] Test file size limits (should reject oversized files)
- [ ] Test unsupported file types (should reject)
- [ ] Test file count limit (max 10)

#### Access Control
- [ ] Test presigned URL generation and expiration
- [ ] Test cross-user file access (should deny)
- [ ] Test unauthenticated access (should deny)
- [ ] Test file deletion from R2 and database

#### Vision Model Integration
- [ ] Test GPT-4o with images
- [ ] Test Claude Sonnet with images
- [ ] Test Gemini with images
- [ ] Show warning for non-vision models

### 🔥 HIGH: Memory System Improvements

- [ ] Add memory summarization when > 2000 tokens
- [ ] Implement memory correction UI
- [ ] Add user control over memory (view/edit/delete)
- [ ] Improve memory extraction accuracy
- [ ] Add project memory isolation

### 🔥 HIGH: Chat Features

- [ ] Add conversation search
- [ ] Implement message editing
- [ ] Add conversation export (PDF, Markdown)
- [ ] Improve streaming response handling
- [ ] Add code syntax highlighting
- [ ] Support for @mentions (reference saved locations, LCA projects)

### ⚙️ MEDIUM: Model Management

- [ ] Add model selection UI
- [ ] Show model capabilities (vision, function calling)
- [ ] Display token usage and costs per conversation
- [ ] Add conversation cost tracking
- [ ] Model comparison feature

### ⚙️ MEDIUM: Performance

- [ ] Optimize memory loading time
- [ ] Reduce latency for first message
- [ ] Implement conversation pagination
- [ ] Add message caching
- [ ] Optimize database queries

---

## ✅ Testing & Quality Assurance

> **Priority**: MEDIUM - Essential for reliability
> **Reference**: [/docs/08-testing/](docs/08-testing/)

### ⚙️ MEDIUM: Unit Tests

#### Database Queries
- [ ] Users queries
- [ ] Chats queries
- [ ] Locations queries
- [ ] Projects queries
- [ ] LCA queries

#### Data Processing
- [ ] Scoring calculations
- [ ] Data parsers
- [ ] Normalizers
- [ ] Aggregators
- [ ] Cache logic

### ⚙️ MEDIUM: Integration Tests

#### API Endpoints
- [ ] Projects API (`/api/projects/*`)
- [ ] Users API (`/api/users/*`, `/api/auth/*`)
- [ ] Chats API (`/api/chat/*`)
- [ ] Locations API (`/api/location/*`)
- [ ] LCA API (`/api/lca/*`)
- [ ] File upload API (`/api/upload`)

### ⚙️ MEDIUM: Component Tests

#### Location Components
- [ ] LocationSearch
- [ ] DemographicsView
- [ ] ScoreDisplay
- [ ] AmenitiesMap

#### Chat Components
- [ ] ChatMessages
- [ ] ChatInput
- [ ] ChatSidebar
- [ ] FileUpload

#### Shared Components
- [ ] Button variants
- [ ] Card variations
- [ ] Sidebar behavior
- [ ] NavigationBar

### ⚙️ MEDIUM: E2E Testing

- [ ] Test location search to results flow
- [ ] Test chat conversation with file upload
- [ ] Test user authentication and session
- [ ] Test project creation and management
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing (iOS, Android)
- [ ] Accessibility testing (screen readers, keyboard navigation)

### ⚙️ MEDIUM: Performance & Security

- [ ] Performance test under load (100+ concurrent users)
- [ ] Security audit of API endpoints
- [ ] Verify rate limiting on sensitive endpoints
- [ ] Check audit logging coverage
- [ ] Review encryption key management
- [ ] Scan for OWASP Top 10 vulnerabilities

---

## 🏢 LCA (Life Cycle Assessment)

> **Priority**: LOW - New feature, can be completed after Location & AI Assistant
> **Reference**: [/docs/03-features/lca/](docs/03-features/lca/)

### 💡 LOW: Phase 3.3 - Navigation & Shell (Week 1)

- [ ] Create LCA Sidebar component with project list
- [ ] Create horizontal tab navigation component
- [ ] Create project context menu component (⋮ button)
- [ ] Create 'New Project' modal with 4 start options

### 💡 LOW: Phase 3.3 - Dashboard (Week 1-2)

- [ ] Create Dashboard landing page layout
- [ ] Create project cards grid component
- [ ] Create compliance overview visualization
- [ ] Create recent activity feed component
- [ ] Create quick links and tips sections

### 💡 LOW: Phase 3.3 - Reusable Components (Week 2)

- [ ] Create MPG Score Badge component (3 states: pass/warning/fail)
- [ ] Create Phase Breakdown Mini Chart component
- [ ] Create Element Category Icon component
- [ ] Create Material Picker modal component
- [ ] Create Layer Editor inline component

### 💡 LOW: Phase 3.3 - Project Detail - Overzicht Tab (Week 3)

- [ ] Create Project Detail page with tab structure
- [ ] Create Overzicht tab with project info cards
- [ ] Create project settings form component
- [ ] Create quick statistics overview component

### 💡 LOW: Phase 3.3 - Project Detail - Elementen Tab (Week 4)

- [ ] Create Elementen tab layout with search/filters
- [ ] Create Element Card component (collapsed/expanded states)
- [ ] Create Layer Stack display component
- [ ] Create Element Wizard modal (3-step process)
- [ ] Create element suggestions component
- [ ] Wire up element CRUD operations to API

### 💡 LOW: Phase 3.3 - Project Detail - Resultaten Tab (Week 5)

- [ ] Enhance existing ResultsDashboard with full layout
- [ ] Create Phase Distribution bar chart component
- [ ] Create Element Distribution pie chart component
- [ ] Create Lifecycle Overview graph component
- [ ] Create LCA Detail Table component
- [ ] Create Insights & Recommendations component

### 💡 LOW: Phase 3.3 - Reports & Export (Week 6)

- [ ] Create Rapporten tab layout
- [ ] Create report type selector component
- [ ] Create report options form
- [ ] Create generated reports list component
- [ ] Wire up PDF generation API endpoint
- [ ] Create Export tab with format options
- [ ] Create Excel export functionality
- [ ] Create CSV export functionality
- [ ] Create JSON export functionality

### 💡 LOW: Phase 3.3 - Additional Pages (Week 7)

- [ ] Create Materials Database page layout
- [ ] Create material search and filters component
- [ ] Create Material Card component
- [ ] Create Material Detail Modal component
- [ ] Create material pagination component
- [ ] Wire up material search API endpoint
- [ ] Create Templates page layout
- [ ] Create Template Card component
- [ ] Create Template Preview Modal
- [ ] Create template usage flow
- [ ] Wire up template API endpoints

### 💡 LOW: Phase 3.3 - Settings & Preferences (Week 8)

- [ ] Create Settings page layout
- [ ] Create default values settings section
- [ ] Create calculation settings section
- [ ] Create interface preferences section
- [ ] Wire up settings persistence

### 💡 LOW: Phase 3.3 - Polish & Integration (Week 9-10)

- [ ] Integrate all components with existing backend
- [ ] Add loading states and error handling
- [ ] Add responsive design for mobile/tablet
- [ ] Add keyboard shortcuts and accessibility
- [ ] Performance optimization and code splitting
- [ ] Add comprehensive user feedback (toasts, alerts)
- [ ] Final testing and bug fixes

### 💡 LOW: Future LCA Features

#### Material Database Enhancements
- [ ] NMD integration (Dutch national database)
- [ ] Custom material creation
- [ ] Material verification workflow
- [ ] EPD upload and parsing

#### AI-Powered Features
- [ ] Suggest alternative materials
- [ ] AI-powered optimization suggestions
- [ ] Cost-impact balance analysis
- [ ] Circular economy score

#### Collaboration Features
- [ ] Multi-user projects
- [ ] Comments and annotations
- [ ] Version history
- [ ] Project templates sharing

---

## 🚀 Infrastructure & DevOps

> **Priority**: MEDIUM - Improves development workflow
> **Reference**: Various

### ⚙️ MEDIUM: Database

- [ ] Add missing database indexes
- [ ] Optimize slow queries (identify first with profiling)
- [ ] Review and optimize API response sizes
- [ ] Consider adding Redis caching for frequently accessed data
- [ ] Set up automated database backups
- [ ] Implement database migration rollback testing

### ⚙️ MEDIUM: Performance

- [ ] Implement code splitting for large bundles
- [ ] Optimize image loading (lazy loading, WebP format)
- [ ] Add service worker for offline support
- [ ] Optimize CSS delivery (critical CSS)
- [ ] Implement CDN for static assets
- [ ] Add performance monitoring (Web Vitals)

### ⚙️ MEDIUM: Developer Experience

- [ ] Set up pre-commit hooks (linting, formatting)
- [ ] Add commit message linting (conventional commits)
- [ ] Implement automatic code formatting (Prettier)
- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Set up automated testing on PR
- [ ] Add code coverage reporting
- [ ] Create development environment Docker setup
- [ ] Add API documentation generation (Swagger/OpenAPI)

### ⚙️ MEDIUM: Documentation

- [ ] Update API documentation with new endpoints
- [ ] Create migration guide for developers
- [ ] Update README with new architecture overview
- [ ] Document security features (encryption, audit logging)
- [ ] Create video tutorials for key features
- [ ] Add inline code documentation (JSDoc/TSDoc)
- [ ] Create troubleshooting guide

---

## Progress Tracking

### Recently Completed ✅

- [x] Consolidated documentation into `/docs/` structure
- [x] Archived old migration files
- [x] Moved test files to `/tests/` directory
- [x] Removed 10 unnecessary analysis .js files
- [x] Created comprehensive database schema documentation
- [x] Created URGENT migration warning document
- [x] Updated CLAUDE.md with new doc structure
- [x] Created consolidated TODO list
- [x] Removed duplicate .md files from root
- [x] Removed old Documentation/ folder

### Current Sprint

**Focus**: Database Migration + Location Page + AI Assistant

#### This Week
1. ✅ Complete file organization cleanup
2. 🚨 Start database migration audit
3. 🔥 Location page: Identify critical improvements
4. 🔥 AI Assistant: Test multimodal support

#### Next Week
1. 🚨 Complete database migration (update all queries)
2. 🔥 Location page: Implement scoring enhancements
3. 🔥 AI Assistant: Memory system improvements
4. ⚙️ Begin comprehensive testing setup

---

## How to Use This List

### For Location Team

**Your Section**: [📍 Location Analysis Page](#-location-analysis-page)

Focus on:
- 🔥 HIGH priority items first
- Scoring system improvements
- UI/UX enhancements
- Data pipeline optimization

### For AI Assistant Team

**Your Section**: [🤖 AI Assistant](#-ai-assistant-chatbot)

Focus on:
- 🔥 HIGH priority items first
- Multimodal support testing
- Memory system improvements
- Chat feature enhancements

### For LCA Team

**Your Section**: [🏢 LCA](#-lca-life-cycle-assessment)

**Note**: Lower priority - start after Location & AI Assistant are stable

Focus on:
- 💡 LOW priority items (but still important!)
- Phase 3.3 components (when ready)
- Work in weekly sprints as outlined

### For QA Team

**Your Section**: [✅ Testing & Quality Assurance](#-testing--quality-assurance)

Focus on:
- ⚙️ MEDIUM priority items
- Set up testing infrastructure first
- Write tests for Location & AI Assistant features
- E2E testing for critical flows

### Daily Workflow

1. **Check your team's section**
2. Pick items matching current sprint goals
3. Start with highest priority (🚨 → 🔥 → ⚙️ → 💡)
4. Mark as complete: `- [ ]` → `- [x]`
5. Update "Progress Tracking" section weekly

---

## Getting Help

- **Database Migration**: See [/docs/07-database/URGENT-MIGRATION-REQUIRED.md](docs/07-database/URGENT-MIGRATION-REQUIRED.md)
- **Location Analysis**: See [/docs/03-features/location-analysis/](docs/03-features/location-analysis/)
- **AI Assistant**: See [/docs/03-features/ai-chatbot/](docs/03-features/ai-chatbot/)
- **LCA**: See [/docs/03-features/lca/](docs/03-features/lca/)
- **Testing**: See [/docs/08-testing/](docs/08-testing/)
- **General Questions**: Check [/docs/README.md](docs/README.md)

---

## Notes

- 🚨 **Database migration is BLOCKING** - must complete ASAP (affects all teams)
- 🔥 **Location & AI Assistant are current focus** - these must be completed first
- 💡 **LCA is lower priority** - start after core features are stable
- ⚙️ **Testing should run parallel** - QA team can start setting up infrastructure now

---

**Last Review**: 2025-12-08
**Next Review**: Weekly (every Monday)
**Maintained By**: Development Team
