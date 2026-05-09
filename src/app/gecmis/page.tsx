import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type SessionRow = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  message_count: number;
  case: { title: string } | null;
};

const STATUS_LABEL: Record<SessionRow['status'], string> = {
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  abandoned: 'Yarıda bırakıldı',
};

export default async function Page() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await sb
    .from('sessions')
    .select('id, status, started_at, ended_at, message_count, case:cases(title)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false });
  const sessions = (data ?? []) as unknown as SessionRow[];

  return (
    <main className="max-w-3xl mx-auto p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Geçmiş Seanslar</h1>
        <a href="/" className="underline text-sm">
          ← Vakalara dön
        </a>
      </header>
      {sessions.length === 0 ? (
        <p className="text-gray-500">Henüz bir seans yapmadın.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="p-2">Tarih</th>
              <th className="p-2">Vaka</th>
              <th className="p-2">Mesaj</th>
              <th className="p-2">Durum</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-2">{new Date(s.started_at).toLocaleString('tr-TR')}</td>
                <td className="p-2">{s.case?.title ?? '-'}</td>
                <td className="p-2">{s.message_count}</td>
                <td className="p-2">{STATUS_LABEL[s.status]}</td>
                <td className="p-2">
                  {s.status === 'completed' ? (
                    <a href={`/rapor/${s.id}`} className="underline">
                      Raporu gör
                    </a>
                  ) : s.status === 'in_progress' ? (
                    <a href={`/seans/${s.id}`} className="underline">
                      Devam et
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
