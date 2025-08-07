# Add These Security Components to Your App

## 1. Update src/App.tsx

Add these imports at the top:
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGuard } from './components/AuthGuard';
```

Wrap your App component:
```typescript
function App() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        {/* Your existing app content */}
        <Routes>
          {/* Your routes */}
        </Routes>
      </AuthGuard>
    </ErrorBoundary>
  );
}
```

## 2. Update src/main.tsx

Wrap the entire app:
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

## 3. Test that it works

1. Start the dev server: npm run dev
2. You should be redirected to /login if not authenticated
3. Any crashes should show the error boundary
