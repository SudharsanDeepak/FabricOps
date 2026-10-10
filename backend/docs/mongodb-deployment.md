# MongoDB Deployment & Replica-Set Configuration Guide
## Everest Textile OS — Manufacturing Operating System

### 1. Replica Set Requirement for Multi-Document Transactions

MongoDB multi-document ACID transactions (used in `Quotation -> Order` conversion and `Dispatch -> Invoice -> Stock Movement` workflows) require a **MongoDB Replica Set** (MongoDB 4.0+). Transactions cannot run on a standalone, un-replicated `mongod` instance.

```mermaid
graph TD
    API["Express Backend API Server"] -->|Transactions / Reads / Writes| Primary["Primary Node (rs0:27017)"]
    Primary -->|Oplog Replication| Secondary1["Secondary Node 1 (rs0:27018)"]
    Primary -->|Oplog Replication| Secondary2["Secondary Node 2 (rs0:27019)"]
```

---

### 2. Local Development Configuration

#### Option A: Docker Compose with Single-Node Replica Set (Recommended)

Save the following as `docker-compose.yml` in your development environment:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: everest-mongo
    command: ["--replSet", "rs0", "--bind_ip_all", "--port", "27017"]
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: test $$(mongosh --port 27017 --quiet --eval "try {rs.initiate()} catch(e) {rs.status().ok}") -eq 1
      interval: 10s
      start_period: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo_data:
```

Start the container and initiate the replica set:
```bash
docker compose up -d
docker exec -it everest-mongo mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })"
```

Connection URI for `.env`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/everest_textile_os?replicaSet=rs0&retryWrites=true&w=majority
```

#### Option B: Standalone mongod with Replica Set on Windows/Linux

If running `mongod` directly on Windows:
```powershell
mongod --dbpath "C:\data\db" --replSet rs0 --port 27017
```

In a separate terminal, initiate the replica set using `mongosh`:
```javascript
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "127.0.0.1:27017" }]
})
```

---

### 3. Production Deployment Architecture

For high availability and durability on factory networks:
* **Topology**: Minimum 3 voting nodes (1 Primary, 2 Secondaries) or 2 data nodes + 1 arbiter.
* **Write Concern**: `w: 'majority'`, `j: true` (journaled).
* **Read Preference**: `readPreference=primaryPreferred` for operational data, `secondaryPreferred` for analytics/reports.
* **Oplog Sizing**: Minimum 50GB oplog to withstand high-frequency loom telemetry writes during peak factory shifts.
* **Indexes**: All indexes synchronized via `npm run migrate:indexes`.

Production URI format:
```env
MONGODB_URI=mongodb://everest-admin:SecurePass123@node1.internal:27017,node2.internal:27017,node3.internal:27017/everest_textile_os?replicaSet=everest-rs&ssl=true&authSource=admin&retryWrites=true&w=majority
```

---

### 4. Concurrency & Data Isolation Design Patterns

1. **Atomic Stock Decrement**:
   Never fetch stock, verify in code, and save later. All inventory reservations use conditional `$expr`:
   ```javascript
   InventoryItem.findOneAndUpdate(
     {
       _id: itemId,
       $expr: { $gte: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, requestedAmount] }
     },
     { $inc: { quantityReserved: requestedAmount } },
     { new: true, session }
   );
   ```

2. **Optimistic Locking (`optimisticConcurrency: true`)**:
   Enabled on `InventoryItem` and `Order`. Automatically adds `__v` checks to prevent the "lost update" anomaly during simultaneous warehouse adjustments.

3. **Idempotency Keys**:
   Dispatches and payments carry unique `idempotencyKey` / `referenceNumber` constraints. Retried HTTP requests resolve to the existing transaction record rather than generating duplicate gate passes or double payments.

4. **Customer Data Isolation**:
   Every inquiry, quotation, order, dispatch, and invoice model enforces `{ customerId: 1 }` indexing. Backend queries must strictly scope lookups by authenticated customer session ID.

