/**
 * lib/reports/index.js
 *
 * Public entry point for the reports framework.
 * Importing this file bootstraps the registry with all built-in reports.
 */

export { Report, WidgetType, ENTITY_FIELDS, AGGREGATE_FNS, TIME_TEMPLATES,
         resolveTemplateValue, buildDailyWindow } from './base.js'
export { registry } from './registry.js'

// ─── Register built-in reports ────────────────────────────────────────────
// Each import has a side effect of calling registry.register()
import './daily-digest.js'
