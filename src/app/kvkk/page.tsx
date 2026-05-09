import fs from 'fs/promises';
import path from 'path';

export default async function Page() {
  const md = await fs.readFile(path.join(process.cwd(), 'docs/KVKK.md'), 'utf8');
  return (
    <article className="prose max-w-2xl mx-auto p-6 whitespace-pre-wrap text-sm">{md}</article>
  );
}
