# Component Specification: OAuth Provider

This document details the token issuance properties, remote verification paths, and request handling rules for OAuth Providers.

---

## 1. Configuration Fields
* **Token Expiration**: Access token TTL (minutes) and Refresh token TTL (days).
* **Signing Algorithm**: HMAC-SHA256 (symmetric) or RSA-256 (asymmetric).
* **Verification Protocol**: `LOCAL_JWKS` (gateway decodes JWT using cached keys) or `INTROSPECT_ENDPOINT` (gateway calls IdP endpoint).

---

## 2. Runtime State Variables
* **Issued Tokens**: Active session count in memory database.
* **Token Verification QPS**: Check rate of authentication headers.
* **IdP Latency Overhead**: Current execution queue delay on the auth server.

---

## 3. Failure Modes
* **Token Leak Outage**: Invalidation of JWKS keys forces all clients to fetch new token certificates, creating traffic spikes on the Auth Provider.
* **Introspection Timeout**: If IdP is slow, gateway authentication blocks, returning `HTTP 401 Unauthorized` for healthy user requests.

---

## 4. Simulation Logic
When a client requests token generation or validation:
1. **Introspection Case**: The API Gateway forwards token strings to the IdP.
2. **IdP Processing**: The OAuth Provider consumes CPU cores, verify signature bits, and returns a JSON payload:
   * If CPU utilization is 100%, processing time scales exponentially.
3. **Cache Invalidation**: On keys rotation, JWKS cache hits decrease to zero, forcing remote calls.
