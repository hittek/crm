/**
 * lib/reports/base.js
 *
 * Base Report class, widget type enum, and the Zod-validated
 * ReportDefinition schema.  All concrete reports extend Report.
 */

// ─── Widget types ──────────────────────────────────────────────────────────

export const WidgetType = {
  NUMBER_CARD:  'number_card',   // single KPI with optional trend delta
  BAR_CHART:    'bar_chart',     // grouped / stacked bars
  LINE_CHART:   'line_chart',    // time-series
  PIE_CHART:    'pie_chart',     // distribution
  TABLE:        'table',         // row-level detail
  PROGRESS_BAR: 'progress_bar',  // goal vs actual
}

// ─── Supported query entities & their allowed filter/group fields ──────────

export const ENTITY_FIELDS = {
  deal:         ['stage', 'value', 'actualClose', 'createdAt', 'updatedAt', 'assignedTo.name', 'contact.firstName', 'contact.lastName'],
  contact:      ['createdAt', 'updatedAt', 'city', 'state', 'country', 'ownerId', 'owner.name'],
  task:         ['status', 'dueDate', 'createdAt', 'type', 'assignedTo.name', 'priority'],
  conversation: ['status', 'createdAt', 'updatedAt', 'channel'],
  activity:     ['type', 'createdAt'],
  quote:        ['status', 'total', 'createdAt', 'currency'],
}

export const AGGREGATE_FNS = ['count', 'sum', 'avg', 'min', 'max']

// ─── Template variables for time window expressions ───────────────────────

export const TIME_TEMPLATES = {
  '{{startOf:day}}':          () => { const d = new Date(); d.setHours(0,0,0,0); return d },
  '{{startOf:week}}':         () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d },
  '{{startOf:month}}':        () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  '{{startOf:lastMonth}}':    () => new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
  '{{endOf:lastMonth}}':      () => new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59),
  '{{startOf:year}}':         () => new Date(new Date().getFullYear(), 0, 1),
  '{{now}}':                  () => new Date(),
}

export function resolveTemplateValue(val) {
  if (typeof val !== 'string') return val
  const fn = TIME_TEMPLATES[val]
  return fn ? fn() : val
}

// ─── ReportData shape returned by generate() ──────────────────────────────

/**
 * @typedef {Object} WidgetData
 * @property {string} id          - matches WidgetDef.id
 * @property {string} type        - WidgetType value
 * @property {string} title
 * @property {any}    data        - chart/table data, type-specific
 * @property {Object} [meta]      - optional extra context (trend, total, etc.)
 */

/**
 * @typedef {Object} ReportData
 * @property {string}       reportId
 * @property {string}       name
 * @property {WidgetData[]} widgets
 * @property {Date}         generatedAt
 * @property {string}       windowKey  - e.g. "2026-07-28"
 */

// ─── Base Report class ────────────────────────────────────────────────────

export class Report {
  /** @param {string} type  - registry key, e.g. 'daily-digest' */
  constructor(type) {
    this.type = type
  }

  /**
   * Generate report data for an organisation over a time window.
   * @param {Object} org        - { id, name, timezone, orgSettings, ... }
   * @param {Object} window     - { key: string, start: Date, end: Date }
   * @returns {Promise<ReportData>}
   */
  // eslint-disable-next-line no-unused-vars
  async generate(org, window) {
    throw new Error(`Report.generate() not implemented for type: ${this.type}`)
  }

  /**
   * Human-readable display name for this report type.
   * Subclasses should override.
   */
  get displayName() {
    return this.type
  }
}

// ─── Window helpers ────────────────────────────────────────────────────────

/**
 * Build a time window object for "today" in the given timezone.
 * windowKey is always YYYY-MM-DD in that timezone.
 */
export function buildDailyWindow(timezone = 'America/Mexico_City') {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    key:   dateStr,
    start: new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - tzOffsetMs(timezone, now)),
    end:   new Date(Date.UTC(year, month - 1, day, 23, 59, 59) - tzOffsetMs(timezone, now)),
  }
}

function tzOffsetMs(timezone, date) {
  const local  = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  const utc    = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  return local - utc
}
