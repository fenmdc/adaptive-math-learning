<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Product Boundary

This repository contains only the independent Adaptive Math Learning product. Read `docs/product/PRODUCT_BOUNDARY.md` before changing product behavior, routes, data, dependencies, infrastructure, or documentation.

- Do not add code, content, data, credentials, runtime state, or UI from Bible Study Note Project, the book catalog, ABRSM Theory Studio, the scientific-paper knowledge base, or any future unrelated project.
- Do not directly import from, write to, symlink to, or share a database with another project.
- Reuse across projects is allowed only through an explicit versioned package or documented service contract that preserves independent development and deployment.
- If existing files violate the boundary, identify them and propose migration or removal as a separate change. Do not expand the violation.
- When ownership is unclear, stop and resolve the product boundary before implementation.
