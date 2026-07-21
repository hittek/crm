#!/usr/bin/env node
/**
 * scripts/backfill-chatwoot.js
 *
 * Provisions a Chatwoot account + AgentBot for every Organization that
 * doesn't already have chatwootAccountId set.
 *
 * Safe to rerun: skips orgs that already have chatwootAccountId.
 *
 * Usage:
 *   node scripts/backfill-chatwoot.js [--dry-run]
 */

require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const { provisionOrg } = require('../lib/chatwoot')

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { chatwootAccountId: null },
    select: { id: true, name: true, slug: true },
    orderBy: { id: 'asc' },
  })

  console.log(`Found ${orgs.length} org(s) without Chatwoot account.${DRY_RUN ? ' [DRY RUN]' : ''}`)

  let provisioned = 0
  let skipped = 0
  let errors = 0

  for (const org of orgs) {
    if (DRY_RUN) {
      console.log(`  [dry-run] would provision org ${org.id} "${org.name}" (slug: ${org.slug})`)
      skipped++
      continue
    }

    try {
      const ids = await provisionOrg(org)
      await prisma.organization.update({
        where: { id: org.id },
        data: ids,
      })
      console.log(`  provisioned org ${org.id} "${org.name}" → accountId=${ids.chatwootAccountId} botId=${ids.chatwootAgentBotId}`)
      provisioned++
    } catch (err) {
      console.error(`  error provisioning org ${org.id} "${org.name}": ${err.message}`)
      errors++
    }
  }

  console.log(`\nDone. provisioned=${provisioned} skipped=${skipped} errors=${errors}`)
}

main()
  .catch((err) => {
    console.error('Fatal:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
