# M005: Quote Generation

## Vision

Sales reps can build and send quotes directly from a Deal. The chatbot can generate quotes mid-conversation. Both flows produce the same Quote record in the CRM. Product catalog is populated manually or by AI extraction from provider PDF price lists.

## Goals

1. **Provider catalog**: manage providers (suppliers) and import their price lists via PDF — AI extracts product rows (sku, name, unit, cost price)
2. **Product catalog**: products and services with cost price, fee %, margin % → derived selling price; linked to provider or standalone
3. **Quote builder**: create quotes from a Deal with line items from catalog or free-form; IVA; status lifecycle Draft → Sent → Accepted → Rejected
4. **PDF + shareable link**: server-side PDF generation; public read-only quote page
5. **Chatbot quote**: Claude `create_quote` tool builds a draft quote from catalog during conversation; saved to CRM

## Constraints

- PDF generation: server-side (pdfkit or @react-pdf/renderer) — no client-side PDF
- Selling price formula: `costPrice × (1 + feePercent/100) × (1 + marginPercent/100)`
- Fee and margin can be set at product level or overridden per quote line
- AI price list extraction: reuses existing PDF processing pipeline; output is structured JSON rows, not embeddings
- No inventory, no purchase orders, no receiving — this is a CRM, not an ERP
- IVA default 16% (configurable per org in settings)

## Requirements Covered

- R021: CRM Quote Builder
- R022: Chatbot Quote Generation
- R023: Provider + Product Catalog (new)
- R024: AI Price List Import (new)

## Success Criteria

- Admin uploads a provider PDF price list → Claude extracts rows → rep reviews & imports → products appear in catalog
- Sales rep opens a Deal → creates quote → picks products from catalog (selling price pre-filled) → saves Draft → generates PDF → copies shareable link
- Chatbot detects quote intent → uses `create_quote` tool → builds draft from catalog → confirms with user → Quote record appears in CRM linked to Deal + Contact
