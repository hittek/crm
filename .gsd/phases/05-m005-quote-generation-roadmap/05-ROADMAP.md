# M005: M005: Quote Generation — Roadmap

**Vision:** 

## Slices

- [x] **S01: Provider + Product Catalog** `risk:medium` `depends:[]`
  > After this: org can create Providers and Products/Services with cost price, fee %, margin % → computed selling price. CRUD UI in Settings (or dedicated /products page). Schema migrated.

- [x] **S02: AI Price List Import** `risk:high` `depends:[S01]`
  > After this: upload a provider PDF price list → Claude extracts structured product rows (sku, name, unit, costPrice) → review UI → one-click import into catalog. Reuses existing PDF processing pipeline.

- [x] **S03: Quote Builder** `risk:high` `depends:[S01]`
  > After this: sales rep opens a Deal → creates a Quote → adds line items from catalog (selling price auto-filled) or free-form → sees subtotal + IVA + total → saves Draft → status lifecycle Draft → Sent → Accepted → Rejected.

- [x] **S04: PDF + Shareable Link** `risk:medium` `depends:[S03]`
  > After this: Quote has a "Generate PDF" button (server-side, downloadable) and a public read-only shareable link the rep can send to the contact.

- [x] **S05: Chatbot Quote Generation** `risk:high` `depends:[S01,S03]`
  > After this: chatbot detects quote intent during conversation → Claude `create_quote` tool builds draft from product catalog → confirms with user → Quote record appears in CRM linked to the Deal + Contact.
