# Codebase Map

Generated: 2026-07-17T18:36:04Z | Files: 194 | Described: 0/194
<!-- gsd:codebase-meta {"generatedAt":"2026-07-17T18:36:04Z","fingerprint":"feffb89539b0badf02dbfeed74e8f1959cef09f5","fileCount":194,"truncated":false} -->

### (root)/
- `.dockerignore`
- `.env.example`
- `.gitignore`
- `.nvmrc`
- `docker-compose.yaml`
- `docker-entrypoint.sh`
- `Dockerfile`
- `jest.config.js`
- `jest.setup.js`
- `LICENSE`
- `middleware.js`
- `next.config.js`
- `package-lock.json`
- `package.json`
- `playwright.config.js`
- `pnpm-lock.yaml`
- `postcss.config.js`
- `prisma.config.js`
- `README.md`
- `tailwind.config.js`

### components/
- `components/CustomerList.js`

### components/chatbot/
- `components/chatbot/ChatPanel.js`

### components/contacts/
- `components/contacts/ActivityTimeline.js`
- `components/contacts/AddressPicker.js`
- `components/contacts/ContactDetail.js`
- `components/contacts/ContactForm.js`
- `components/contacts/ContactList.js`

### components/deals/
- `components/deals/DealDrawer.js`
- `components/deals/DealForm.js`
- `components/deals/Pipeline.js`
- `components/deals/QuoteTab.js`

### components/layout/
- `components/layout/GlobalSearch.js`
- `components/layout/Layout.js`
- `components/layout/NotificationBell.js`
- `components/layout/QuickAddMenu.js`

### components/reports/
- `components/reports/Dashboard.js`

### components/tasks/
- `components/tasks/CalendarView.js`
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
- `components/ui/UpgradeWall.js`

### docker/postgres-init/
- `docker/postgres-init/01-extensions.sql`

### lib/
- `lib/api.js`
- `lib/audit.js`
- `lib/auth.js`
- `lib/AuthContext.js`
- `lib/channelEngine.js`
- `lib/chatbotTools.js`
- `lib/chunker.js`
- `lib/crypto.js`
- `lib/embeddings.js`
- `lib/escalation.js`
- `lib/notifications.js`
- `lib/planLimits.js`
- `lib/prisma.js`
- `lib/rag.js`
- `lib/SettingsContext.js`
- `lib/storage.js`
- `lib/stripe.js`
- `lib/summarize.js`
- `lib/superAdmin.js`
- `lib/utils.js`

### lib/channels/
- `lib/channels/telegram.js`

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
- `pages/admin.js`
- `pages/billing.js`
- `pages/chatbot.js`
- `pages/chatbots.js`
- `pages/contacts.js`
- `pages/conversations.js`
- `pages/deals.js`
- `pages/index.js`
- `pages/login.js`
- `pages/notifications.js`
- `pages/privacidad.js`
- `pages/products.js`
- `pages/profile.js`
- `pages/providers.js`
- `pages/quotes.js`
- `pages/reports.js`
- `pages/settings.js`
- `pages/signup.js`
- `pages/tasks.js`

### pages/api/
- `pages/api/health.js`

### pages/api/activities/
- `pages/api/activities/index.js`

### pages/api/admin/
- `pages/api/admin/orgs.js`

### pages/api/audit/
- `pages/api/audit/index.js`

### pages/api/auth/
- `pages/api/auth/login.js`
- `pages/api/auth/logout.js`
- `pages/api/auth/me.js`
- `pages/api/auth/profile.js`
- `pages/api/auth/signup.js`

### pages/api/billing/
- `pages/api/billing/checkout.js`
- `pages/api/billing/invoices.js`
- `pages/api/billing/portal.js`
- `pages/api/billing/status.js`

### pages/api/chatbot/[kbId]/
- `pages/api/chatbot/[kbId]/chat.js`

### pages/api/chatbot/bots/
- `pages/api/chatbot/bots/[id].js`
- `pages/api/chatbot/bots/index.js`

### pages/api/chatbot/bots/[id]/channels/
- `pages/api/chatbot/bots/[id]/channels/index.js`

### pages/api/chatbot/knowledge-bases/
- `pages/api/chatbot/knowledge-bases/index.js`

### pages/api/chatbot/knowledge-bases/[id]/
- `pages/api/chatbot/knowledge-bases/[id]/index.js`

### pages/api/chatbot/knowledge-bases/[id]/documents/
- `pages/api/chatbot/knowledge-bases/[id]/documents/[docId].js`
- `pages/api/chatbot/knowledge-bases/[id]/documents/index.js`

### pages/api/contacts/
- `pages/api/contacts/[id].js`
- `pages/api/contacts/index.js`

### pages/api/conversations/
- `pages/api/conversations/index.js`

### pages/api/conversations/[id]/
- `pages/api/conversations/[id]/index.js`
- `pages/api/conversations/[id]/messages.js`
- `pages/api/conversations/[id]/status.js`

### pages/api/customers/
- `pages/api/customers/[id].js`
- `pages/api/customers/index.js`

### pages/api/deals/
- `pages/api/deals/[id].js`
- `pages/api/deals/index.js`

### pages/api/internal/
- `pages/api/internal/apply-migration.js`
- `pages/api/internal/register-webhooks.js`

### pages/api/notifications/
- `pages/api/notifications/count.js`
- `pages/api/notifications/index.js`

### pages/api/products/
- `pages/api/products/bulk.js`
- `pages/api/products/index.js`

### pages/api/products/[id]/
- `pages/api/products/[id]/index.js`
- `pages/api/products/[id]/upload-image.js`

### pages/api/providers/
- `pages/api/providers/[id].js`
- `pages/api/providers/index.js`

### pages/api/providers/[id]/
- `pages/api/providers/[id]/extract-prices.js`
- `pages/api/providers/[id]/import-products.js`

### pages/api/q/
- `pages/api/q/[token].js`

### pages/api/quotes/
- `pages/api/quotes/[id].js`
- `pages/api/quotes/index.js`

### pages/api/quotes/[id]/
- `pages/api/quotes/[id]/share.js`

### pages/api/reports/
- `pages/api/reports/dashboard.js`

### pages/api/search/
- `pages/api/search/index.js`

### pages/api/settings/
- `pages/api/settings/index.js`
- `pages/api/settings/upload-logo.js`

### pages/api/tasks/
- `pages/api/tasks/[id].js`
- `pages/api/tasks/index.js`

### pages/api/uploads/
- `pages/api/uploads/[...path].js`

### pages/api/users/
- `pages/api/users/[id].js`
- `pages/api/users/index.js`

### pages/api/webhook/facebook/
- `pages/api/webhook/facebook/index.js`

### pages/api/webhook/telegram/
- `pages/api/webhook/telegram/[apiKey].js`

### pages/api/webhook/whatsapp/
- `pages/api/webhook/whatsapp/index.js`

### pages/api/webhooks/
- `pages/api/webhooks/stripe.js`

### pages/q/
- `pages/q/[token].js`

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

### prisma/migrations/20260518_add_contact_coordinates/
- `prisma/migrations/20260518_add_contact_coordinates/migration.sql`

### public/
- `public/.gitkeep`

### scripts/
- `scripts/check-dims.cjs`
- `scripts/dev.sh`
- `scripts/reindex-embeddings.cjs`

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
- `tests/e2e/audit-report.md`
- `tests/e2e/chatbot-escalation.spec.js`
- `tests/e2e/crm.spec.js`
- `tests/e2e/i18n.spec.js`
- `tests/e2e/notifications.spec.js`
- `tests/e2e/profile.spec.js`
- `tests/e2e/settings.spec.js`
- `tests/e2e/test.config.js`

### tests/e2e/helpers/
- `tests/e2e/helpers/login.js`
