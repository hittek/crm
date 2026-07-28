/**
 * lib/reports/registry.js
 *
 * Singleton registry that maps report type strings to Report class instances.
 * Concrete reports register themselves by importing this module and calling
 * registry.register(). The scheduler and API routes resolve reports via
 * registry.get().
 */

class ReportRegistry {
  constructor() {
    /** @type {Map<string, import('./base.js').Report>} */
    this._map = new Map()
  }

  /**
   * Register a Report instance under a type key.
   * @param {import('./base.js').Report} report
   */
  register(report) {
    if (!report?.type) throw new Error('Report must have a .type property')
    this._map.set(report.type, report)
  }

  /**
   * Resolve a report by type key.
   * @param {string} type
   * @returns {import('./base.js').Report|undefined}
   */
  get(type) {
    return this._map.get(type)
  }

  /** @returns {string[]} */
  types() {
    return [...this._map.keys()]
  }

  /** @returns {import('./base.js').Report[]} */
  all() {
    return [...this._map.values()]
  }
}

export const registry = new ReportRegistry()
