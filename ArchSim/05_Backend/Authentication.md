# ArchSim Backend Authentication Specification

This document details the authentication models, OAuth flow sequences, JWT structures, and verification policies applied in ArchSim.

---

## 1. Authentication Framework & OAuth 2.0
ArchSim uses Spring Security to coordinate authentication and session management.
* **Identity Providers**: Users can log in using credentials (email/password) or via OAuth2 social login (GitHub and Google OAuth apps).
* **Callback Flow**:
  1. Client clicks "Login with GitHub".
  2. Frontend redirects to `/oauth2/authorization/github`.
  3. User completes credentials challenge on GitHub.
  4. Backend receives auth code, exchanges it for user token, saves user account profile to PostgreSQL, and redirects to frontend client with session cookies.

---

## 2. Token Specification & Architecture

### 2.1. Access Token Structure (JWT)
The Access Token is a stateless JWT signed with HMAC-SHA256. It contains the following payload claims:
```json
{
  "iss": "https://api.archsim.io",
  "sub": "usr-8722-ad00",
  "tenantId": "tnt-9932-bb12",
  "roles": ["DEVELOPER", "COLLABORATOR"],
  "iat": 1774328400,
  "exp": 1774329300
}
```

### 2.2. Token Lifecycle Management
* **Access Token**: Set to expire in 15 minutes. Sent via the standard `Authorization: Bearer <JWT>` header in REST and WebSocket initialization calls.
* **Refresh Token**: Stored in PostgreSQL with an expiration window of 7 days. Exposed to the client browser inside a secure, `HttpOnly`, `SameSite=Strict` cookie.
* **Logout / Revocation**: The `/api/v1/auth/logout` endpoint invalidates the active Refresh Token record in PostgreSQL and deletes the client session cookies.
