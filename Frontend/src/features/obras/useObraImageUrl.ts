import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getObraImageBlob } from './api';

export function useObraImageUrl(obraId: number) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const imageQuery = useQuery({
    queryKey: ['obra-image', obraId],
    queryFn: () => getObraImageBlob(obraId),
    enabled: Number.isFinite(obraId),
    retry: false,
  });

  useEffect(() => {
    if (!imageQuery.data) {
      setImageUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
      return;
    }

    const nextUrl = URL.createObjectURL(imageQuery.data);
    setImageUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return nextUrl;
    });

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [imageQuery.data]);

  return {
    imageUrl,
    isLoading: imageQuery.isLoading,
    isError: imageQuery.isError,
    hasImage: !!imageQuery.data,
  };
}
