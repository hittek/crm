# S01: Provider + Product Catalog — Plan

## Goal
Schema + CRUD UI for Providers and Products/Services. Unified model that flexes for service-only,
product-only, and mixed orgs. Selling price is either derived (cost + fee + margin) or entered
directly — depends on whether costPrice is set.

## Pricing logic
- type=`service` → `sellingPrice` entered directly; provider/cost/fee/margin hidden in UI
- type=`product` → `costPrice` + `feePercent` + `marginPercent` → `sellingPrice` auto-computed
- Formula: `sellingPrice = costPrice × (1 + feePercent/100) × (1 + marginPercent/100)`
- Manual override: `sellingPrice` can always be edited regardless of type

## Schema changes

### New: `Provider`
```
model Provider {
  id          Int          @id @default(autoincrement())
  orgId       Int
  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name        String
  contactName String?
  email       String?
  phone       String?
  website     String?
  notes       String?
  isActive    Boolean      @default(true)
  products    Product[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  @@index([orgId])
}
```

### New: `Product`
```
model Product {
  id            Int       @id @default(autoincrement())
  orgId         Int
  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  providerId    Int?                        // null = service or standalone product
  provider      Provider? @relation(fields: [providerId], references: [id], onDelete: SetNull)
  name          String
  description   String?
  sku           String?
  type          String    @default("service") // product | service
  unit          String    @default("unit")    // unit | hr | kg | m | m2 | lt | service | month
  costPrice     Float?                       // null = not applicable (service with direct price)
  feePercent    Float     @default(0)
  marginPercent Float     @default(0)
  sellingPrice  Float     @default(0)        // always the final quote price
  currency      String    @default("MXN")
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([orgId])
  @@index([providerId])
}
```

### Modify: `Organization` — add back-relations
```
providers Provider[]
products  Product[]
```

### Modify: `Quote.items` JSON shape
Extend line item shape:
`[{productId?, description, qty, unit, costPrice?, feePercent?, marginPercent?, unitPrice, discount?, total}]`

## Tasks

- [ ] **T01: Schema migration** `est:30m`
  - Add Provider + Product models to prisma/schema.prisma
  - Add back-relations to Organization
  - Run `prisma migrate dev --name add_provider_product`
  - Run `prisma generate`

- [ ] **T02: API routes** `est:1h`
  - `GET/POST /api/providers` — list + create
  - `GET/PATCH/DELETE /api/providers/[id]`
  - `GET/POST /api/products` — list (supports ?providerId= ?type=), create
  - `GET/PATCH/DELETE /api/products/[id]`
  - Auth: `checkOrgAccess`; writes require admin or manager role
  - sellingPrice auto-computed server-side on create/update when costPrice is set

- [ ] **T03: Providers UI** `est:1h`
  - New page `pages/providers.js`
  - Table: name, contact, email, products count, active toggle, edit/delete
  - ProviderModal: name, contactName, email, phone, website, notes; ESC + click-outside

- [ ] **T04: Products UI** `est:2h`
  - New page `pages/products.js`
  - Table: name, sku, type badge (Producto/Servicio), provider, unit, sellingPrice, active
  - ProductModal: adapts to type
    - service mode: name, description, sku, unit (hr/project/month/etc.), sellingPrice
    - product mode: + provider picker, costPrice, feePercent%, marginPercent%, sellingPrice (live preview)
    - Toggle between modes via type selector at top of form
  - Filter bar: All / Servicios / Productos, filter by provider

- [ ] **T05: Sidebar + nav wiring** `est:20m`
  - Add "Catálogo" collapsible group to Layout.js below the CRM group
  - Sub-items: Proveedores + Productos
  - i18n keys: `nav.catalog`, `nav.providers`, `nav.products`
  - Providers link only shown when org has at least one provider OR user is admin/manager
