# CubeLogs Frontend App (`frontend-app`)

Unified Workforce Engine & Attendance Platform Frontend built with Next.js App Router, React, and Django REST Framework SessionAuthentication.

---

## 1. Overview & Architecture

`frontend-app` is structured into a clean, feature-driven, modular architecture designed for developer predictability, maintainability, and scalability.

```
frontend-app/
├── app/                        # Route pages and layouts only (thin page composition)
├── components/
│   ├── ui/                     # Base atomic UI elements (Button, Input, Badge, LoadingSpinner, EmptyState)
│   ├── layout/                 # Shared structural components (Header, Sidebar, PageWrapper, ThemeProvider)
│   └── shared/                 # Modals (CustomAlertModal, ConfirmModal, PwaUpdater)
├── features/                   # Business domain modules (auth, employees, attendance, leaves, holidays, tasks, organization)
├── providers/                  # Application-wide providers (AppProvider)
├── lib/
│   ├── api/                    # Centralized fetch client (apiClient.js)
│   ├── services/               # Domain API services (authService, employeeService, etc.)
│   ├── constants/              # Permissions, route maps
│   └── utilities/              # Helper functions
├── types/                      # TypeScript domain definitions
└── tests/                      # Jest test suites
```

---

## 2. Technology Stack

- **Framework**: Next.js 16.2.7 (App Router)
- **UI Library**: React 19.2.4
- **Language**: JavaScript / TypeScript 6
- **Styling**: Vanilla CSS / Tailwind utilities
- **Testing**: Jest 30 & React Testing Library

---

## 3. Session Authentication & CSRF Flow

Authentication is powered by Django server-side **SessionAuthentication**:

1. **Cookies**: Browser stores HttpOnly `sessionid` and readable `csrftoken` cookies.
2. **API Client (`lib/api/apiClient.js`)**:
   - Sends `credentials: "include"` on all requests.
   - Automatically attaches `X-CSRFToken` header for unsafe HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Zero local storage of access/refresh JWT tokens.
3. **Session Initialization**:
   - `AppProvider` calls `authService.fetchMe()` on mount.
   - Restores user session without full page reloads.

---

## 4. AuthProvider & Permission Checking

Access the auth context using the `useApp()` hook:

```javascript
import { useApp } from '@/context/AppContext';

function MyComponent() {
  const { currentUser, hasPermission, isFeatureUnlocked } = useApp();

  if (!hasPermission('admin:employees')) {
    return <p>Access Denied</p>;
  }

  return <div>Welcome, {currentUser.name}</div>;
}
```

---

## 5. Development & Build Commands

- **Start Development Server**: `npm run dev`
- **Run Unit Tests**: `npm test`
- **Run Linter**: `npm run lint`
- **Production Build**: `npm run build`
- **Start Production Server**: `npm start`

---

## 6. How to Add New Functionality

### Adding a New Route
1. Create a folder under `app/your-route/` with a `page.js`.
2. Keep `page.js` minimal by importing and composing components from `features/your-feature/`.

### Adding a New Feature
1. Create a directory under `features/your-feature/components/`.
2. Define domain-specific UI and business logic inside that folder.

### Adding a New API Service
1. Create a new service file under `lib/services/yourService.js`.
2. Use `apiFetch` from `lib/api/apiClient` to communicate with backend endpoints.
3. Re-export your service in `lib/services/apiService.js`.

---

## 7. Troubleshooting Notes

- **CSRF Verification Failed**: Ensure Django `CSRF_TRUSTED_ORIGINS` includes your frontend origin and `credentials: "include"` is used.
- **401 Unauthorized**: Session expired or user logged out. The app automatically transitions `authStatus` to `unauthenticated`.
