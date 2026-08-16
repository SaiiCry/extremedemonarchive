import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-slate-300">404</h1>
        <p className="text-xl text-slate-600">Page Not Found</p>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
