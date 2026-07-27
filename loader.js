(() => {
  const parts = Array.from({ length: 7 }, (_, index) =>
    `app-parts/part${String(index).padStart(2, '0')}.txt`
  );
  const sources = [...parts, 'library-media-patch.js'];

  Promise.all(sources.map(async (path) => {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
    return response.text();
  }))
    .then((chunks) => {
      const source = chunks.join('\n');
      new Function(source)();
    })
    .catch((error) => {
      console.error(error);
      const root = document.getElementById('app');
      if (root) {
        root.innerHTML = `<section class="card"><h2>Не удалось запустить приложение</h2><p class="muted">Обнови страницу. Если ошибка повторится, проверь доступность файлов приложения.</p><pre>${String(error.message || error)}</pre></section>`;
      }
    });
})();
