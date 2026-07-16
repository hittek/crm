# Codebase Map

Generated: 2026-07-16T16:47:03Z | Files: 112 | Described: 0/112
<!-- gsd:codebase-meta {"generatedAt":"2026-07-16T16:47:03Z","fingerprint":"50328d24a822059a87246c14712a9afa58d84097","fileCount":112,"truncated":false} -->

### (root)/
- `.env.example`
- `.gitignore`
- `docker-compose.yaml`
- `jest.config.js`
- `jest.setup.js`
- `LICENSE`
- `next.config.js`
- `package-lock.json`
- `package.json`
- `playwright.config.js`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `postcss.config.js`
- `prisma.config.js`
- `README.md`
- `tailwind.config.js`

### components/
- `components/CustomerList.js`

### components/contacts/
- `components/contacts/ActivityTimeline.js`
- `components/contacts/ContactDetail.js`
- `components/contacts/ContactForm.js`
- `components/contacts/ContactList.js`

### components/deals/
- `components/deals/DealDrawer.js`
- `components/deals/DealForm.js`
- `components/deals/Pipeline.js`

### components/layout/
- `components/layout/GlobalSearch.js`
- `components/layout/Layout.js`
- `components/layout/NotificationBell.js`
- `components/layout/QuickAddMenu.js`

### components/reports/
- `components/reports/Dashboard.js`

### components/tasks/
- `components/tasks/TaskForm.js`
- `components/tasks/TaskList.js`

### components/ui/
- `components/ui/Avatar.js`
- `components/ui/Chip.js`
- `components/ui/EmptyState.js`
- `components/ui/Icons.js`
- `components/ui/InlineEdit.js`
- `components/ui/Modal.js`
- `components/ui/Spinner.js`

### lib/
- `lib/api.js`
- `lib/audit.js`
- `lib/auth.js`
- `lib/AuthContext.js`
- `lib/notifications.js`
- `lib/prisma.js`
- `lib/SettingsContext.js`
- `lib/utils.js`

### lib/i18n/
- `lib/i18n/index.js`

### lib/i18n/translations/
- `lib/i18n/translations/en.js`
- `lib/i18n/translations/es.js`

### migrations/
- `migrations/migration_lock.toml`

### migrations/20260116194252_add_users_audit_visibility/
- `migrations/20260116194252_add_users_audit_visibility/migration.sql`

### pages/
- `pages/_app.js`
- `pages/deals.js`
- `pages/index.js`
- `pages/login.js`
- `pages/notifications.js`
- `pages/profile.js`
- `pages/reports.js`
- `pages/settings.js`
- `pages/tasks.js`

### pages/api/activities/
- `pages/api/activities/index.js`

### pages/api/audit/
- `pages/api/audit/index.js`

### pages/api/auth/
- `pages/api/auth/login.js`
- `pages/api/auth/logout.js`
- `pages/api/auth/me.js`
- `pages/api/auth/profile.js`

### pages/api/contacts/
- `pages/api/contacts/[id].js`
- `pages/api/contacts/index.js`

### pages/api/customers/
- `pages/api/customers/[id].js`
- `pages/api/customers/index.js`

### pages/api/deals/
- `pages/api/deals/[id].js`
- `pages/api/deals/index.js`

### pages/api/notifications/
- `pages/api/notifications/index.js`

### pages/api/reports/
- `pages/api/reports/dashboard.js`

### pages/api/search/
- `pages/api/search/index.js`

### pages/api/settings/
- `pages/api/settings/index.js`

### pages/api/tasks/
- `pages/api/tasks/[id].js`
- `pages/api/tasks/index.js`

### pages/api/users/
- `pages/api/users/[id].js`
- `pages/api/users/index.js`

### playwright-report/
- `playwright-report/index.html`

### prisma/
- `prisma/schema.prisma`
- `prisma/seed.js`

### prisma/migrations/
- `prisma/migrations/migration_lock.toml`

### prisma/migrations/20260116195313_update_users_audit_visibility/
- `prisma/migrations/20260116195313_update_users_audit_visibility/migration.sql`

### prisma/migrations/20260120210207_add_organization_multitenancy/
- `prisma/migrations/20260120210207_add_organization_multitenancy/migration.sql`

### prisma/migrations/20260120211405_add_settings_organization/
- `prisma/migrations/20260120211405_add_settings_organization/migration.sql`

### prisma/migrations/20260120212533_remove_settings_model/
- `prisma/migrations/20260120212533_remove_settings_model/migration.sql`

### styles/
- `styles/globals.css`

### tests/
- `tests/i18n.test.js`

### tests/api/
- `tests/api/activities.test.js`
- `tests/api/audit.test.js`
- `tests/api/auth.test.js`
- `tests/api/contacts-id.test.js`
- `tests/api/contacts.test.js`
- `tests/api/deals-id.test.js`
- `tests/api/deals.test.js`
- `tests/api/notifications.test.js`
- `tests/api/profile.test.js`
- `tests/api/reports.test.js`
- `tests/api/search.test.js`
- `tests/api/settings.test.js`
- `tests/api/tasks-id.test.js`
- `tests/api/tasks.test.js`
- `tests/api/users.test.js`

### tests/e2e/
- `tests/e2e/crm.spec.js`
- `tests/e2e/i18n.spec.js`
- `tests/e2e/notifications.spec.js`
- `tests/e2e/profile.spec.js`
- `tests/e2e/settings.spec.js`
- `tests/e2e/test.config.js`

### tests/e2e/helpers/
- `tests/e2e/helpers/login.js`
