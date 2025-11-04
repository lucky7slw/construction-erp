import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

export function useModuleAccess() {
  const [visibleModules, setVisibleModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    fetchModules();
  }, [accessToken]);

  const fetchModules = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/v1/module-access/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setVisibleModules(data.modules || []);
    } catch (error) {
      console.error('Failed to fetch module access:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAccess = (module: string) => {
    if (visibleModules.length === 0) return true; // No restrictions
    return visibleModules.includes(module);
  };

  return { visibleModules, canAccess, loading };
}
