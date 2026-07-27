(() => {
  const parts = Array.from({ length: 7 }, (_, index) =>
    `app-parts/part${String(index).padStart(2, '0')}.txt`
  );

  Promise.all(parts.map(async (path) => {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
    return response.text();
  }))
    .then(async (chunks) => {
      // Части исходного файла разделены в произвольных местах, иногда прямо
      // внутри строк. Поэтому между ними нельзя вставлять перевод строки.
      const source = chunks.join('');
      new Function(source)();

      // Дополнение библиотеки запускаем отдельно, чтобы его ошибка никогда
      // не блокировала основное приложение.
      try {
        const response = await fetch('library-media-patch.js', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Не удалось загрузить library-media-patch.js: ${response.status}`);
        const patch = await response.text();
        new Function(patch)();
      } catch (error) {
        console.warn('Дополнительные примеры упражнений временно недоступны:', error);
      }
    })
    .catch((error) => {
      console.error(error);
      const root = document.getElementById('app');
      if (root) {
        root.innerHTML = `<section class="card"><h2>Не удалось запустить приложение</h2><p class="muted">Обнови страницу. Если ошибка повторится, проверь доступность файлов приложения.</p><pre>${String(error.message || error)}</pre></section>`;
      }
    });
})();
