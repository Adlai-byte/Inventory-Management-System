# BATISTIL Inventory Management System

A modern inventory management system built with Next.js 16, React 19, TypeScript, and MySQL.

## Features

- **Product Management** - CRUD operations for inventory items with SKU/barcode support
- **Category & Supplier Management** - Organize products by category and supplier
- **Stock Movements** - Track inbound, outbound, and adjustment transactions
- **Purchase Orders** - Create and manage supplier orders
- **Barcode Scanner** - Scan barcodes via camera or keyboard input
- **Reports & Analytics** - Sales reports, inventory valuation, low stock alerts
- **User Management** - Role-based access (Admin, Manager, Staff)
- **Activity Logging** - Full audit trail of all system changes
- **Dark/Light Theme** - Built with shadcn/ui and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: MySQL (mysql2)
- **Authentication**: JWT with bcryptjs
- **Charts**: Recharts
- **PDF Export**: jsPDF + jspdf-autotable

## Prerequisites

- Node.js 18+
- MySQL 8.0+

## Installation

1. **Clone the repository**
   ```bash
   cd Inventory-Management-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create `.env.local` in the project root:
   ```env
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=bmm_db
   JWT_SECRET=your-secret-key-min-32-chars
   ```

4. **Set up the database**
   
   Run the schema file in MySQL:
   ```bash
   mysql -u root -p < sql/inventory_schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   - URL: http://localhost:3000
   - Default login: `admin` / `admin123`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run start:lan` | Start server accessible on LAN |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login/Register pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
│       ├── auth/          # Authentication endpoints
│       ├── products/      # Products CRUD
│       ├── categories/    # Categories CRUD
│       ├── suppliers/     # Suppliers CRUD
│       ├── stock-movements/
│       ├── purchase-orders/
│       ├── reports/
│       ├── scanner/
│       ├── users/
│       ├── alerts/
│       ├── activity-log/
│       └── notifications/
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── reports/          # Report components
└── lib/                  # Utility functions
    ├── db.ts             # MySQL connection pool
    ├── auth.ts           # Authentication helpers
    ├── route-auth.ts     # Route authorization
    ├── rate-limit.ts     # Rate limiting
    ├── activity-logger.ts
    ├── validations/      # Zod validation schemas
    └── types.ts          # TypeScript types
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access - manage users, all CRUD operations |
| **Manager** | View all, create/edit products, stock movements, orders |
| **Staff** | View products, record sales/restock, scanner |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (paginated, filterable)
- `POST /api/products` - Create product (Admin/Manager)
- `PUT /api/products/[id]` - Update product (Admin/Manager)
- `DELETE /api/products/[id]` - Delete product (Admin/Manager)

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create (Admin/Manager)
- `PUT /api/categories/[id]` - Update (Admin/Manager)
- `DELETE /api/categories/[id]` - Delete (Admin/Manager)

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create (Admin/Manager)
- `PUT /api/suppliers/[id]` - Update (Admin/Manager)
- `DELETE /api/suppliers/[id]` - Delete (Admin/Manager)

### Stock Movements
- `GET /api/stock-movements` - List movements
- `POST /api/stock-movements` - Create movement

### Purchase Orders
- `GET /api/purchase-orders` - List orders
- `POST /api/purchase-orders` - Create order (Admin/Manager)
- `PUT /api/purchase-orders/[id]` - Update order (Admin/Manager)

### Reports
- `GET /api/reports?type=summary` - Summary stats
- `GET /api/reports?type=sales&period=daily&date=YYYY-MM-DD` - Sales data
- `GET /api/reports?type=topproducts` - Top products by value
- `GET /api/reports?type=lowstock` - Low stock items
- `GET /api/reports?type=category` - Category breakdown

### Users
- `GET /api/users` - List users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/[id]` - Update user (Admin only)
- `DELETE /api/users/[id]` - Delete user (Admin only)

## Database Schema

The system uses these main tables:
- `inv_users` - User accounts with roles
- `inv_categories` - Product categories
- `inv_suppliers` - Supplier information
- `inv_warehouses` - Warehouse/location data
- `inv_products` - Inventory items
- `inv_stock_movements` - Stock transactions
- `inv_purchase_orders` + `inv_purchase_order_items` - PO system
- `inv_activity_log` - Audit trail
- `inv_notifications` - User notifications

## Security Features

- JWT-based authentication with HTTP-only cookies
- Role-based route protection
- Rate limiting on auth & API endpoints
- Input validation with Zod
- Password hashing with bcrypt
- SQL injection prevention (parameterized queries)

## License

Private - BATISTIL Minimart