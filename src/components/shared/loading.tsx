'use client';

import { useState } from 'react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-navy-50 to-white">
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-navy-200 border-t-navy-900" />
        <p className="text-navy-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

export function useLoading() {
  const [loading, setLoading] = useState(false);
  const start = () => setLoading(true);
  const stop = () => setLoading(false);
  return { loading, start, stop };
}
