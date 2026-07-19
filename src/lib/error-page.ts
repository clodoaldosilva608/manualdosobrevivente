export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Esta página não carregou</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; background: #121212; color: #f5f5f5; padding: 24px; }
      .card { max-width: 480px; text-align: center; }
      h1 { color: #FF6B35; font-size: 1.5rem; margin: 0 0 12px; letter-spacing: 0.05em; }
      p { color: #a1a1a1; line-height: 1.5; margin: 0 0 24px; }
      .row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      a, button { font: inherit; padding: 10px 16px; border-radius: 6px; text-decoration: none; cursor: pointer; border: none; }
      .primary { background: #FF6B35; color: #121212; font-weight: 600; }
      .secondary { background: transparent; color: #f5f5f5; border: 1px solid #333; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Esta página não carregou</h1>
      <p>Algo deu errado do nosso lado. Você pode tentar atualizar ou voltar para o início.</p>
      <div class="row">
        <button class="primary" onclick="location.reload()">Atualizar</button>
        <a class="secondary" href="/">Voltar ao início</a>
      </div>
    </div>
  </body>
</html>`;
}
