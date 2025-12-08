# GroosHub - Master TODO List

> **Last Updated**: 2025-12-08
> **Status**: Consolidated from 60+ documentation files
> **Total Items**: ~150 actionable tasks

---

## Priority Legend

- 🚨 **CRITICAL** - Must do ASAP, blocking or breaking
- 🔥 **HIGH** - Important, should do soon
- ⚙️ **MEDIUM** - Should do, improves quality
- 💡 **LOW** - Nice to have, future enhancement

---

## 🚨 CRITICAL: Database Migration (MUST DO FIRST!)

> **⚠️ WARNING**: Old database tables will be deleted soon. Code using them WILL BREAK!
> **Reference**: [/docs/07-database/URGENT-MIGRATION-REQUIRED.md](docs/07-database/URGENT-MIGRATION-REQUIRED.md)

### Code Migration

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

### Type Updates

- [ ] **Update TypeScript types** to match new schema
- [ ] **Update foreign key references** in all tables
- [ ] **Remove imports** from legacy database files

### Testing Before Migration

- [ ] All queries use new table names
- [ ] All foreign keys point to new tables
- [ ] API endpoints work with new schema
- [ ] Frontend doesn't break
- [ ] Authentication still works
- [ ] File uploads work
- [ ] LCA calculations work

### Data Migration

- [ ] Create backup of all legacy data
- [ ] Migrate data from `saved_locations` → `location_snapshots`
- [ ] Verify all legacy tables are no longer in use

### Cleanup (After 30-day Safety Period)

- [ ] Drop legacy tables: `users`, `chats`, `chats_messages`, `chat_files`, `saved_locations`
- [ ] Remove unused imports and commented code
- [ ] Update documentation

---

## 🔥 HIGH PRIORITY: Core Features

### LCA Phase 3.3 - UI Components

> **Reference**: [/docs/03-features/lca/project-status.md](docs/03-features/lca/project-status.md)

#### Navigation & Shell (Week 1)

- [ ] Create LCA Sidebar component with project list
- [ ] Create horizontal tab navigation component
- [ ] Create project context menu component (⋮ button)
- [ ] Create 'New Project' modal with 4 start options

#### Dashboard (Week 1-2)

- [ ] Create Dashboard landing page layout
- [ ] Create project cards grid component
- [ ] Create compliance overview visualization
- [ ] Create recent activity feed component
- [ ] Create quick links and tips sections

#### Reusable Components (Week 2)

- [ ] Create MPG Score Badge component (3 states: pass/warning/fail)
- [ ] Create Phase Breakdown Mini Chart component
- [ ] Create Element Category Icon component
- [ ] Create Material Picker modal component
- [ ] Create Layer Editor inline component

#### Project Detail - Overzicht Tab (Week 3)

- [ ] Create Project Detail page with tab structure
- [ ] Create Overzicht tab with project info cards
- [ ] Create project settings form component
- [ ] Create quick statistics overview component

#### Project Detail - Elementen Tab (Week 4)

- [ ] Create Elementen tab layout with search/filters
- [ ] Create Element Card component (collapsed/expanded states)
- [ ] Create Layer Stack display component
- [ ] Create Element Wizard modal (3-step process)
- [ ] Create element suggestions component
- [ ] Wire up element CRUD operations to API

#### Project Detail - Resultaten Tab (Week 5)

- [ ] Enhance existing ResultsDashboard with full layout
- [ ] Create Phase Distribution bar chart component
- [ ] Create Element Distribution pie chart component
- [ ] Create Lifecycle Overview graph component
- [ ] Create LCA Detail Table component
- [ ] Create Insights & Recommendations component

#### Reports & Export (Week 6)

- [ ] Create Rapporten tab layout
- [ ] Create report type selector component
- [ ] Create report options form
- [ ] Create generated reports list component
- [ ] Wire up PDF generation API endpoint
- [ ] Create Export tab with format options
- [ ] Create Excel export functionality
- [ ] Create CSV export functionality
- [ ] Create JSON export functionality

#### Additional Pages (Week 7)

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

#### Settings & Preferences (Week 8)

- [ ] Create Settings page layout
- [ ] Create default values settings section
- [ ] Create calculation settings section
- [ ] Create interface preferences section
- [ ] Wire up settings persistence

#### Polish & Integration (Week 9-10)

- [ ] Integrate all components with existing backend
- [ ] Add loading states and error handling
- [ ] Add responsive design for mobile/tablet
- [ ] Add keyboard shortcuts and accessibility
- [ ] Performance optimization and code splitting
- [ ] Add comprehensive user feedback (toasts, alerts)
- [ ] Final testing and bug fixes

### LCA Backend Setup

> **Reference**: [/docs/03-features/lca/overview.md](docs/03-features/lca/overview.md)

- [ ] Database integration (verify schema is current)
- [ ] Dependencies installation (check package.json)
- [ ] Data acquisition (Ökobaudat)
- [ ] Data import scripts
- [ ] API endpoints documentation
- [ ] Frontend components integration

---

## ⚙️ MEDIUM PRIORITY: Testing & Quality

### Testing Infrastructure

> **Reference**: [/docs/08-testing/testing-strategy.md](docs/08-testing/testing-strategy.md)

#### Unit Tests (Database Queries)

- [ ] Users queries
- [ ] Chats queries
- [ ] Locations queries
- [ ] LCA queries
- [ ] Projects queries

#### API Integration Tests

- [ ] Projects API (`/api/projects/*`)
- [ ] Users API (`/api/users/*`, `/api/auth/*`)
- [ ] Chats API (`/api/chat/*`)
- [ ] Locations API (`/api/location/*`)
- [ ] LCA API (`/api/lca/*`)

#### Component Tests

- [ ] ProjectsSidebar
- [ ] ProjectOverview
- [ ] NewProjectForm
- [ ] ProjectsListClient
- [ ] Chat components
- [ ] Location analysis components

#### Database Migration Tests

- [ ] Forward migration (all migrations)
- [ ] Data integrity verification
- [ ] Rollback procedure
- [ ] Re-migration after rollback

### End-to-End Testing

- [ ] Test all API endpoints with Postman/Insomnia
- [ ] Verify encryption/decryption in production-like environment
- [ ] Test project creation flow end-to-end
- [ ] Test user authentication and session management
- [ ] Verify database migrations on staging
- [ ] Test rollback procedure
- [ ] Performance test under load (100+ concurrent users)

### Quality Assurance

- [ ] Security audit of API endpoints
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing (iOS, Android)
- [ ] Accessibility testing (screen readers, keyboard navigation)
- [ ] SEO optimization
- [ ] Performance profiling

### Multimodal Testing

> **Reference**: [/docs/03-features/ai-chatbot/multimodal-support.md](docs/03-features/ai-chatbot/multimodal-support.md)

#### File Upload Testing

- [ ] Upload single image (PNG < 10MB)
- [ ] Upload single image (JPG < 10MB)
- [ ] Verify file appears in R2 bucket
- [ ] Verify metadata in database
- [ ] Upload single PDF (< 50MB)
- [ ] Upload multiple files (up to 10, mixed types)
- [ ] Verify all files uploaded correctly

#### Validation Testing

- [ ] Try uploading > 10MB image (should fail)
- [ ] Try uploading > 50MB PDF (should fail)
- [ ] Try uploading unsupported type (.txt, .docx) - should fail
- [ ] Try uploading > 10 files (should fail)

#### Access Control Testing

- [ ] Get presigned URL for uploaded file
- [ ] Verify URL works in browser
- [ ] Verify URL expires after time limit
- [ ] Try accessing another user's file (should fail 403)
- [ ] Try accessing without login (should fail 401)

#### File Management Testing

- [ ] Delete uploaded file
- [ ] Verify file removed from R2
- [ ] Verify metadata removed from database

#### Vision Model Testing

- [ ] Test GPT-4o with image
- [ ] Test Claude Sonnet with image
- [ ] Test Gemini with image
- [ ] Test non-vision model with image (should show warning)

---

## 💡 LOW PRIORITY: Future Enhancements

### LCA Future Features

> **Reference**: [/docs/03-features/lca/project-status.md](docs/03-features/lca/project-status.md)

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

### Scoring System Enhancements

> **Reference**: [/docs/archive/SCORING_SYSTEM.md](docs/archive/SCORING_SYSTEM.md)

- [ ] Add support for custom scoring algorithms
- [ ] Implement weighted scoring across multiple indicators
- [ ] Add historical trend analysis
- [ ] Create scoring visualization components
- [ ] Refactor parsers to use normalizers (reduce duplication)
- [ ] Add scoring presets for common use cases
- [ ] Support for custom comparison functions
- [ ] Multi-level baseline comparisons (vs municipality, not just national)

### Performance Optimizations

> **Reference**: [/docs/07-database/restructuring-roadmap.md](docs/07-database/restructuring-roadmap.md)

- [ ] Add missing database indexes
- [ ] Optimize slow queries (identify first)
- [ ] Review and optimize API response sizes
- [ ] Consider adding Redis caching for frequently accessed data
- [ ] Implement code splitting for large bundles
- [ ] Optimize image loading (lazy loading, WebP)
- [ ] Database query optimization

### Security Improvements

- [ ] Review all API endpoints for proper authentication
- [ ] Verify rate limiting is applied to sensitive endpoints
- [ ] Check audit logging coverage
- [ ] Review encryption key management
- [ ] Scan for security vulnerabilities (OWASP Top 10)
- [ ] Implement CSP headers
- [ ] Add input sanitization middleware

### Documentation

- [ ] Update API documentation with new endpoints
- [ ] Create migration guide for developers
- [ ] Update README with new architecture overview
- [ ] Document security features (encryption, audit logging)
- [ ] Create video tutorials for key features
- [ ] Add inline code documentation (JSDoc)
- [ ] Create troubleshooting guide

### Developer Experience

- [ ] Set up pre-commit hooks
- [ ] Add commit message linting
- [ ] Implement automatic code formatting (Prettier)
- [ ] Add CI/CD pipeline
- [ ] Set up automated testing on PR
- [ ] Add code coverage reporting
- [ ] Create development environment Docker setup

---

## Progress Tracking

### Completed Recently ✅

- [x] Consolidated documentation into `/docs/` structure
- [x] Archived old migration files
- [x] Moved test files to `/tests/` directory
- [x] Removed 10 unnecessary analysis .js files
- [x] Created comprehensive database schema documentation
- [x] Created URGENT migration warning document
- [x] Updated CLAUDE.md with new doc structure

### Current Sprint

**Focus**: Database Migration + LCA Phase 3.3 Navigation

**This Week**:
1. Complete database migration audit
2. Update all queries to new table names
3. Test thoroughly before dropping old tables
4. Start LCA sidebar and navigation components

**Next Week**:
1. Continue LCA dashboard components
2. Begin comprehensive testing setup
3. Security audit of API endpoints

---

## How to Use This List

### Daily Workflow

1. Pick **one** item from CRITICAL section (if any remain)
2. Pick **1-2** items from HIGH PRIORITY section
3. Work through them systematically
4. Check off completed items
5. Update this file regularly

### Updating This File

```bash
# Mark item as complete - change [ ] to [x]
- [x] Completed item

# Add new tasks as discovered
- [ ] New task description

# Update "Completed Recently" section weekly
# Move completed items from other sections to "Completed Recently"
```

### Getting Help

- **Database Migration**: See `/docs/07-database/URGENT-MIGRATION-REQUIRED.md`
- **LCA Implementation**: See `/docs/03-features/lca/project-status.md`
- **Testing**: See `/docs/08-testing/testing-strategy.md`
- **General Questions**: Check `/docs/README.md` for doc index

---

## Notes

- **Database migration is BLOCKING** - must complete before old tables are deleted
- **LCA Phase 3.3** is the next major feature release
- **Testing infrastructure** needs to be set up before adding more features
- **Security audit** should happen before production deployment

---

**Last Review**: 2025-12-08
**Next Review**: Weekly (every Monday)
**Maintained By**: Development Team
