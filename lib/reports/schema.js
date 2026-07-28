/**
 * lib/reports/schema.js
 *
 * Zod v3 schema for the ReportDefinition.definition JSON that Claude generates.
 * Also exports a compact JSON Schema string for embedding in the Claude system prompt.
 */

import { z } from 'zod'
import { WidgetType, ENTITY_FIELDS, AGGREGATE_FNS } from './base.js'

// ─── Filter operators ────────────────────────────────────────────────────────

const FilterOp = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'contains'])

const FilterSchema = z.object({
  field: z.string().min(1),
  op:    FilterOp,
  value: z.union([z.string(), z.number(), z.boolean()]),
})

// ─── Query object ─────────────────────────────────────────────────────────────

const EntityEnum  = z.enum(/** @type {[string, ...string[]]} */ (Object.keys(ENTITY_FIELDS)))
const AggregateEnum = z.enum(/** @type {[string, ...string[]]} */ (AGGREGATE_FNS))

const QuerySchema = z.object({
  entity:    EntityEnum,
  aggregate: AggregateEnum,
  field:     z.string().optional(),          // required for sum/avg/min/max
  groupBy:   z.string().optional(),
  filters:   z.array(FilterSchema).optional().default([]),
  orderBy:   z.string().optional(),
  limit:     z.number().int().positive().optional(),
})

// ─── Widget ───────────────────────────────────────────────────────────────────

const WidgetTypeEnum = z.enum(
  /** @type {[string, ...string[]]} */ (Object.values(WidgetType))
)

export const WidgetSchema = z.object({
  id:       z.string().min(1),
  type:     WidgetTypeEnum,
  title:    z.string().min(1),
  query:    QuerySchema,
  subtitle: z.string().optional(),
  format:   z.enum(['number', 'currency', 'percent']).optional(),
  color:    z.string().optional(),
})

// ─── Full definition ─────────────────────────────────────────────────────────

export const ReportDefinitionSchema = z.object({
  type:    z.string().default('custom'),
  widgets: z.array(WidgetSchema).min(1).max(12),
})

// ─── Compact JSON Schema for Claude prompt ───────────────────────────────────

export const DEFINITION_JSON_SCHEMA = JSON.stringify({
  type: 'object',
  required: ['widgets'],
  properties: {
    type: { type: 'string', description: 'Report type key, e.g. "custom"' },
    widgets: {
      type: 'array', minItems: 1, maxItems: 12,
      items: {
        type: 'object',
        required: ['id', 'type', 'title', 'query'],
        properties: {
          id:       { type: 'string', description: 'Unique widget id, e.g. "w1"' },
          type:     { type: 'string', enum: Object.values(WidgetType) },
          title:    { type: 'string' },
          subtitle: { type: 'string' },
          format:   { type: 'string', enum: ['number', 'currency', 'percent'] },
          query: {
            type: 'object',
            required: ['entity', 'aggregate'],
            properties: {
              entity:    { type: 'string', enum: Object.keys(ENTITY_FIELDS) },
              aggregate: { type: 'string', enum: AGGREGATE_FNS },
              field:     { type: 'string', description: 'Required for sum/avg/min/max' },
              groupBy:   { type: 'string' },
              limit:     { type: 'number' },
              filters: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['field', 'op', 'value'],
                  properties: {
                    field: { type: 'string' },
                    op:    { type: 'string', enum: ['eq','neq','gt','gte','lt','lte','in','notIn','contains'] },
                    value: { description: 'String, number, or boolean. Use template strings for dynamic dates: {{startOf:month}}, {{startOf:week}}, {{startOf:year}}, {{now}}' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}, null, 2)

// ─── Field catalogue for prompt ──────────────────────────────────────────────

export const ENTITY_FIELD_CATALOGUE = Object.entries(ENTITY_FIELDS)
  .map(([entity, fields]) => `${entity}: ${fields.join(', ')}`)
  .join('\n')
