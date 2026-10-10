# FabricOps

**Textile Manufacturing Operating System**

A unified, production-oriented monorepo platform designed to replace notebooks, phone calls, paper inspection slips, and manual registers across yarn procurement, weaving, quality control, dispatches, and operator accounting.

---

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide icons, Recharts, Socket.IO Client
- **Backend**: Node.js, Express.js (ES Modules), Mongoose ODM, Socket.IO
- **Database**: MongoDB with Replica Set support for multi-document ACID transactions
- **Authentication**: JWT stored in secure HTTP-only cookies, RBAC authorization
- **Testing**: Vitest & Supertest
- **Pluggable Extensions**: IoT Defect Scanner adapter interface & AI Quality Vision adapter interface

---

## Monorepo Layout

```
FabriCops/
├── backend/
│   ├── src/
│   │   ├── config/             # DB, environment, logger
│   │   ├── controllers/        # Express route handlers
│   │   ├── middleware/         # Auth, RBAC, error handling, request logging
│   │   ├── models/             # Mongoose schemas & indexes
│   │   ├── routes/             # Versioned REST endpoints (/api/v1)
│   │   ├── services/           # Business logic & IoT/AI adapter interfaces
│   │   ├── sockets/            # Real-time room socket manager
│   │   ├── app.js              # Express app definition
│   │   └── server.js           # HTTP + WebSocket entrypoint
│   └── tests/                  # Integration & unit test suite
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable shadcn/ui components & AppShell
│   │   ├── pages/              # Role-specific workspaces & dashboards
│   │   ├── lib/                # API client with credentials & utilities
│   │   ├── App.jsx             # Shell container & active role simulator
│   │   └── main.jsx
├── package.json                # Root workspace configuration
└── README.md
```

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
```bash
# Backend
copy backend\.env.example backend\.env

# Frontend
copy frontend\.env.example frontend\.env
```

### 3. Run Backend & Frontend in Development
```bash
# Start backend (Port 5000)
npm run dev:backend

# Start frontend (Port 5173)
npm run dev:frontend
```

### 4. Run Test Suite
```bash
npm run test
```

