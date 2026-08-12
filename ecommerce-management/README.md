# ShopEase — E-Commerce Management System

A complete e-commerce management project built with **Node.js + Express** on the
backend and plain **HTML/CSS/JavaScript** on the frontend (no frameworks or build
step required). Includes a customer-facing storefront and a full admin management
panel.

## Features

**Storefront (public)**
- Browse products with search, category filter, and sort (price/newest)
- Customer registration & login (JWT auth)
- Shopping cart (persisted in localStorage)
- Checkout that creates a real order and decrements stock
- Order history for logged-in customers

**Admin Panel** (`/admin`)
- Secure admin login
- Dashboard: revenue, order count, product count, customer count, low-stock alerts,
  top-selling products, recent orders
- Product management: create, edit, delete, stock & price control
- Order management: view all orders, update order status
  (pending → processing → shipped → delivered / cancelled)
- Category management: create/delete categories

## Tech S

- **Backend:** Node.js, Express
- **Auth:** JWT (jsonwebtoken) + bcrypt password hashing
- **Storage:** JSON file database (`server/data/db.json`) — no external DB required,
  zero setup
- **Frontend:** Vanilla HTML/CSS/JavaScript (fetch API)

## Project Structure

```
ecommerce-management/
├── package.json
├── server/
│   ├── index.js              # Express app entry point
│   ├── db.js                 # JSON file read/write helper
│   ├── data/
│   │   └── db.json           # Database (users, products, orders, categories)
│   ├── middleware/
│   │   └── auth.js           # JWT auth + admin-only middleware
│   └── routes/
│       ├── auth.js           # register / login / me
│       ├── products.js       # product CRUD
│       ├── categories.js     # category CRUD
│       ├── orders.js         # place order / list / update status
│       └── dashboard.js      # admin stats
└── public/
    ├── index.html            # storefront
    ├── admin.html            # admin panel
    ├── css/style.css
    └── js/
        ├── app.js            # storefront logic
        └── admin.js          # admin panel logic
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Open in your browser**
   - Storefront: http://localhost:3000/
   - Admin panel: http://localhost:3000/admin

## Default Admin Login

```
Email:    admin@shop.com
Password: admin123
```

## API Overview

| Method | Endpoint                | Auth  | Description                     |
|--------|--------------------------|-------|----------------------------------|
| POST   | /api/auth/register       | —     | Create a customer account        |
| POST   | /api/auth/login          | —     | Login, returns JWT               |
| GET    | /api/auth/me             | Token | Get current user                 |
| GET    | /api/products            | —     | List/search/filter products      |
| GET    | /api/products/:id        | —     | Get one product                  |
| POST   | /api/products            | Admin | Create product                   |
| PUT    | /api/products/:id        | Admin | Update product                   |
| DELETE | /api/products/:id        | Admin | Delete product                   |
| GET    | /api/categories          | —     | List categories                  |
| POST   | /api/categories          | Admin | Create category                  |
| DELETE | /api/categories/:id      | Admin | Delete category                  |
| POST   | /api/orders              | Token | Place an order                   |
| GET    | /api/orders              | Token | List own orders (all, if admin)  |
| GET    | /api/orders/:id          | Token | Get one order                    |
| PUT    | /api/orders/:id/status   | Admin | Update order status              |
| GET    | /api/dashboard/stats     | Admin | Dashboard statistics             |

## Notes & Next Steps

- Data is stored in `server/data/db.json` — easy to inspect/reset, but not meant for
  concurrent production traffic. Swap `server/db.js` for a real database
  (PostgreSQL/MongoDB) for production use.
- Set a real `JWT_SECRET` environment variable before deploying:
  ```bash
  JWT_SECRET=your-long-random-secret npm start
  ```
- Product images use placeholder URLs (picsum.photos) — replace with real product
  photos or wire up file uploads (the `multer` dependency is already included for
  this purpose).

## License

Free to use and modify for personal or commercial projects.
