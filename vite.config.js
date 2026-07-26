import { defineConfig } from 'vite';

// Относительный base нужен, чтобы сборка работала и в подпапке GitHub Pages
// (https://<user>.github.io/BeforeAfter-Slider/), и на любом другом
// статическом хостинге, куда просто скопирована папка dist.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
