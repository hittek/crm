# M005: Quote Generation

## Vision

Sales reps can build and send quotes directly from a Deal. The chatbot can generate quotes mid-conversation. Both flows produce the same Quote record in the CRM.

## Goals

- CRM quote builder: line items, quantities, unit prices, discount, totals, tax (IVA 16%)
- PDF generation from quote (downloadable, sendable via email link)
- Chatbot quote generation: when knowledge base contains pricing data, chatbot can construct a quote in response to user intent
- Quotes linked to Deals and Contacts in CRM
- Quote status lifecycle: Draft → Sent → Accepted → Rejected

## Constraints

- PDF generation: prefer server-side (Puppeteer or pdfkit) — no client-side PDF
- Chatbot quote generation requires structured pricing data in knowledge base (org-defined format)
- Email delivery via existing SMTP config (or Resend API)

## Requirements Covered

- R021: CRM Quote Builder
- R022: Chatbot Quote Generation

## Success Criteria

- Sales rep opens a Deal, creates a quote with 3 line items, generates PDF, sends link to contact
- Chatbot identifies pricing intent, retrieves pricing from KB, outputs a structured quote in conversation
- Quote record appears in CRM linked to the correct Deal and Contact
