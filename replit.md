# Sistema Contable Interno

## Overview

This is an internal accounting system with a Stripe-inspired dashboard design. The application provides comprehensive financial management capabilities including customer management, invoicing with Dominican NCF (Número de Comprobante Fiscal) support, inventory control, and DGII (Dirección General de Impuestos Internos) tax reporting.

The system is built as a full-stack web application with a modern, clean interface focused on internal business operations rather than public-facing features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack

**Frontend Framework**: React with TypeScript, using Vite as the build tool and development server. The UI is built with shadcn/ui components (Radix UI primitives) and styled with TailwindCSS for a modern, professional appearance inspired by Stripe's design language.

**Backend Framework**: Express.js server running on Node.js, configured to serve both API endpoints and the built React application in production.

**Routing**: Client-side routing implemented with Wouter for a lightweight SPA experience.

**State Management**: TanStack Query (React Query) handles server state management, data fetching, and caching. No global client state management library is used.

**Form Handling**: React Hook Form with Zod for schema validation and type-safe form management.

### Database Architecture

**ORM**: Drizzle ORM provides type-safe database operations with schema definitions in TypeScript.

**Database Type**: PostgreSQL accessed through Neon's serverless driver with WebSocket support for serverless environments.

**Schema Design**: The database schema includes:
- Users table for authentication
- Customers table with RNC/identification, contact info, and province tracking
- Company settings (single-row configuration)
- NCF sequences for managing Dominican tax document numbering
- Products/inventory with SKU, pricing, and cost tracking
- Invoices with comprehensive NCF type support (B01, B02, B11, B12, B13, B14)
- Invoice items for line-by-line billing
- Tax settings for configurable tax rates

### API Structure

**Pattern**: RESTful API endpoints under `/api/*` namespace.

**Endpoints**: CRUD operations for customers, products, invoices, company settings, NCF sequences, and tax settings. All endpoints follow standard HTTP methods (GET, POST, PUT, DELETE).

**Validation**: Zod schemas validate incoming data on both client and server sides, with shared schema definitions ensuring consistency.

**Error Handling**: Validation errors are transformed into user-friendly messages using zod-validation-error.

### Development vs Production

**Development Mode**: Vite dev server runs as middleware within Express, providing HMR and fast refresh. HTML template is dynamically loaded and transformed.

**Production Mode**: Client application is pre-built and served as static files from the `dist/public` directory. The server bundle is created with esbuild.

**Environment Detection**: `NODE_ENV` environment variable controls behavior differences between development and production.

### Module Organization

**Client Structure**: 
- `/client/src/pages` - Page components for each major feature
- `/client/src/components` - Reusable UI components and shadcn/ui components
- `/client/src/hooks` - Custom React hooks
- `/client/src/lib` - Utility functions and query client configuration

**Server Structure**:
- `/server/routes.ts` - API route definitions and handlers
- `/server/storage.ts` - Database access layer abstracting Drizzle operations
- `/server/db.ts` - Database connection configuration

**Shared Code**: `/shared/schema.ts` contains Drizzle table schemas and Zod validation schemas used by both client and server.

### Key Design Decisions

**Component Library Choice**: shadcn/ui was chosen over a traditional component library to maintain full control over component code while benefiting from well-tested Radix UI primitives. This allows customization without fighting framework constraints.

**Monorepo Structure**: Client and server code live in the same repository with shared TypeScript types, reducing duplication and ensuring consistency.

**Type Safety**: End-to-end type safety from database schema through API to UI components using TypeScript, Drizzle, and Zod.

**Styling Approach**: Utility-first CSS with Tailwind provides rapid development and consistent design. Custom CSS variables enable theming with a Stripe-inspired color palette.

**NCF Implementation**: Dominican tax compliance is built into the core invoice system with dedicated tables for NCF sequence management and support for all standard NCF types.

## Printing Receipts - Important Technical Notes

When creating printable receipts (like payment receipts, invoices, etc.) that open in a new window for printing, there are critical CSS considerations to ensure the layout is consistent between the preview window and the browser's print dialog:

### Key Requirements:

1. **@page Margins**: Use explicit margins in @page to compensate for the printer's physical non-printable area (~0.25in):
   ```css
   @page {
     size: 8.5in 5.5in; /* Paper size */
     margin: 0.25in 0.3in 0.3in 0.2in; /* top right bottom left */
   }
   ```

2. **Print Media Height**: In `@media print`, the `html` element must have `height: 100%` and the body needs a `min-height` calculated from the paper size minus @page margins:
   ```css
   @media print {
     html { height: 100%; }
     body { 
       height: 100%; 
       min-height: calc(5.5in - 0.25in - 0.3in); /* Paper height minus top and bottom margins */
     }
   }
   ```

3. **Flexbox for Footer Elements**: To position elements at the bottom (like signatures):
   - Use `display: flex; flex-direction: column;` on the body
   - Add a spacer div with `flex-grow: 1` between content and footer elements
   - Do NOT use `position: absolute` for footer elements (inconsistent between preview and print dialog)

4. **Example Structure**:
   ```html
   <body> <!-- display: flex; flex-direction: column -->
     <div class="page-content">...</div>
     <div class="page-spacer"></div> <!-- flex-grow: 1 -->
     <div class="signatures">...</div>
   </body>
   ```

This approach ensures the layout is identical in both the preview window and the browser's print dialog.

## External Dependencies

### Database Service
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL database accessed via `@neondatabase/serverless` package with WebSocket support for connection pooling.

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives (@radix-ui/react-*) for dialogs, dropdowns, tooltips, and other interactive elements.
- **Lucide React**: Icon library providing consistent SVG icons throughout the application.

### Development Tools
- **Replit Plugins**: Development tooling including vite-plugin-runtime-error-modal, vite-plugin-cartographer, and vite-plugin-dev-banner for enhanced Replit integration.

### Build and Development
- **Vite**: Frontend build tool and dev server with React plugin and TailwindCSS integration.
- **esbuild**: Bundler for server-side production build.
- **tsx**: TypeScript execution for development server.

### Form and Validation
- **React Hook Form**: Form state management with minimal re-renders.
- **Zod**: Runtime type validation and schema definition.
- **@hookform/resolvers**: Integration between React Hook Form and Zod.

### Charts and Visualization
- **Recharts**: Chart library for dashboard visualizations and financial reporting graphs.

### Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions (configured but implementation details not visible in provided code).

### Styling
- **TailwindCSS**: Utility-first CSS framework with custom configuration.
- **class-variance-authority**: Type-safe variant styling for component variants.
- **tailwind-merge & clsx**: Utility functions for conditional class merging.