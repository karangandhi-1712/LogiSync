import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Where each role lands after signing in or being bounced. */
function roleHome(role?: string): string {
  if (role === 'driver') return '/home';
  if (role === 'fleet_manager') return '/fleet-manage';
  if (role === 'consumer') return '/consumer/orders';
  return '/admin/users';
}

export function RequireRole({ allowed, children }: { allowed: string[]; children: React.ReactNode }) {
  const { user, token, error, isRestoring, refreshMe, logout } = useAuth();
  if (!user && token) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {error || (isRestoring ? 'Loading session…' : 'Your session could not be loaded.')}
          </p>
          {error && (
            <div className="mt-4 flex justify-center gap-3">
              <button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void refreshMe()} disabled={isRestoring}>
                {isRestoring ? 'Connecting…' : 'Retry'}
              </button>
              <button className="rounded-lg border px-4 py-2 text-sm font-semibold" onClick={logout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (!user) return <p className="p-6 text-sm text-slate-500">Loading session…</p>;
  if (!allowed.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}

export { roleHome };
