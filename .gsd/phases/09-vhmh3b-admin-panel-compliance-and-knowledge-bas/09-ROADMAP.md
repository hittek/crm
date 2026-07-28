# M009-vhmh3b: Admin Panel, Compliance, and Knowledge Base Hardening

**Vision:** Hittek staff have a complete admin panel to manage all tenant orgs; signup is legally auditable; the KB document pipeline supports URL scraping and surfaces errors clearly.

## Success Criteria

- Admin panel shows chatbot/conv counts and supports org creation + search
- Every signup records privacyConsentAt and consentIp on the user row
- KB accepts URL sources and indexes scraped content

## Slices

- [x] **S01: Admin Panel Completions** `risk:low` `depends:[]`
  > After this: Admin can create a new org, search existing orgs, and see chatbot + conversation counts per org

- [x] **S02: Signup Consent Audit Trail** `risk:low` `depends:[]`
  > After this: New signup records privacyConsentAt + consentIp on the user row; visible in admin org detail

- [x] **S03: Knowledge Base URL Scrape Source** `risk:medium` `depends:[]`
  > After this: User pastes a URL in the Add Document modal; page is scraped, chunked, and indexed; shows as a document

## Boundary Map

Not provided.
