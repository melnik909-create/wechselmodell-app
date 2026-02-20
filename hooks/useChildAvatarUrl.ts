import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

async function requestSignedDownloadUrl(familyId: string, bucket: string, path: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/create_download_url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ family_id: familyId, bucket, path }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get signed URL');
  }
  const { signedUrl } = await response.json();
  return signedUrl;
}

export function useChildAvatarUrl(
  familyId: string | undefined,
  childId: string | undefined,
  path: string | null
) {
  return useQuery({
    queryKey: ['avatarSignedUrl', familyId, childId, path],
    queryFn: async () => {
      if (!path || !familyId) return null;
      if (path.startsWith('http')) return path;
      try {
        return await requestSignedDownloadUrl(familyId, 'avatars', path);
      } catch (error: any) {
        if (error.message?.includes('Cloud Plus') || error.message?.includes('402') || error.message?.includes('Payment Required'))
          return null;
        throw error;
      }
    },
    enabled: !!path && !!familyId,
    staleTime: 9 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
