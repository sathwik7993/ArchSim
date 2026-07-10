# ArchSim Security Specification

This document outlines the security architecture, data isolation, sandboxing rules, and API protection measures implemented in ArchSim.

---

## 1. Authentication & Authorization
* **OAuth 2.0 / OIDC Integration**: Supports login via GitHub, Google, and email accounts.
* **JSON Web Tokens (JWT)**: On successful authentication, the API Gateway issues a short-lived JWT ($15\text{ minutes}$) and a secure HTTP-Only refresh token ($7\text{ days}$).
* **Access Control**: Users are restricted to their own workspaces. Collaborative rooms require explicit invite link tokens, which are verified by the API Gateway before establishing WebSocket handshakes.

---

## 2. Tenant & Data Isolation
* **Row-Level Security (RLS)**: PostgreSQL tables enforce RLS, ensuring that users can only query project designs, simulation runs, and user records matching their tenant ID:
  ```sql
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  CREATE POLICY project_tenant_isolation ON projects 
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));
  ```
* **Metrics Isolation**: Time-series tables partition metrics by `project_id` and `user_id`.

---

## 3. Sandboxing & Execution Isolation
* **Simulation Core Security**: Simulation code is entirely mathematical and declarative, written in Java/Kotlin. It does **not** evaluate raw code or run arbitrary scripts uploaded by users. All component configurations are validated against static schemas before execution begins.
* **No OS Access**: The simulation containers run inside isolated Kubernetes namespaces with minimal OS privileges (root privileges disabled, read-only file systems, memory caps).

---

## 4. API & WebSocket Protection
* **Rate-Limiting (API Gateway)**: Enforces IP-based and user-based token bucket rate limits (e.g., maximum 60 REST requests/minute per client).
* **Payload Sanitation**: Canvas JSON inputs are validated using schema parsers (Jackson/TypeScript validation) to prevent Cross-Site Scripting (XSS) and JSON deserialization vulnerabilities.
* **HTTPS & WSS Force Policies**: All connections are encrypted in transit using TLS 1.3. Plain HTTP and WS requests are automatically redirected to HTTPS and WSS.
