import { writeFile } from 'node:fs/promises';
import { sitemap } from '../dist-ssr/entry-server.js';

await writeFile('dist/sitemap.xml', sitemap());
