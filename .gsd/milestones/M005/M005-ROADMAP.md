# M005: Quote Generation — Roadmap

## Slices

- [ ] **S01: CRM Quote Builder** `risk:high` `depends:[]`
  > After this: sales rep opens a Deal, adds line items (product, qty, price, discount), sees running total with IVA, saves as Draft, generates a PDF, and copies a shareable link — quote linked to Deal and Contact

- [ ] **S02: Chatbot Quote Generation** `risk:high` `depends:[S01]`
  > After this: when knowledge base contains structured pricing, chatbot detects quote intent, retrieves matching pricing chunks, and outputs a formatted quote summary in conversation — quote saved as Draft in CRM
