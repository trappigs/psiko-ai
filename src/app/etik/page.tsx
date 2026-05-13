import fs from 'fs/promises';
import path from 'path';

export default async function Page() {
  const md = await fs.readFile(path.join(process.cwd(), 'docs/ETIK.md'), 'utf8');
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <header className="mb-8">
        <a href="/" className="btn-quiet text-xs">← Geri</a>
        <p className="label-caps mt-6 mb-2">Etik & konumlandırma</p>
      </header>
      <article className="prose prose-stone max-w-none whitespace-pre-wrap text-sm leading-relaxed">
        {md}
      </article>
    </main>
  );
}
