# Conclusão dos relatórios e auditoria completa de sobreposições

Esta etapa conclui o trabalho já iniciado e amplia a validação visual para todas as páginas, abas, painéis e janelas, garantindo que textos, botões e controles permaneçam acessíveis sem se cobrirem.

## 1. Finalizar a bússola sobre o mapa

- Manter a miniatura no canto inferior direito, acima da navegação e sem bloquear os controles do mapa.
- Conter o painel intermediário dentro da altura disponível, com rolagem interna e os botões de minimizar e tela cheia sempre acessíveis.
- Validar os três estados da bússola em celular e desktop: miniatura, painel e tela cheia.
- Conferir conflitos com coordenadas, localização atual, perfil de elevação, ferramentas laterais e barra inferior.

## 2. Concluir backup automático e relatórios

- Finalizar a sincronização automática de waypoints, mochila, checklist e preferências após alterações, entrada na conta e reconexão.
- Preservar a mesclagem pelo registro mais recente e os botões manuais de recuperação.
- Concluir em Ajustes os controles de dia, horário, destinatário, ativação, envio imediato e histórico.
- Finalizar o envio semanal protegido e registrar cada sucesso ou falha no histórico.
- Ativar o agendamento depois que a conta remetente do Gmail estiver conectada.

## 3. Auditoria visual de todas as páginas e abas

- Percorrer Mapa, Manual, tópicos do Manual, Mochila, SOS, Painel, Offline, Ajustes e Conta.
- Verificar larguras móveis estreitas, celular padrão, tablet e desktop.
- Testar conteúdo curto e longo, números extensos, coordenadas, mensagens de erro, listas cheias e estados vazios.
- Corrigir qualquer colisão entre cabeçalhos, cartões, botões, campos, navegação fixa, menus, painéis, janelas de compartilhamento e avisos.
- Garantir quebra de linha, rolagem adequada, áreas de toque estáveis e espaço inferior suficiente acima da navegação.
- Conferir que abrir teclado, seletor, compartilhamento ou painel não deixe ações importantes fora da área visível.

## 4. Garantia automatizada

- Ampliar o teste de responsividade para cobrir as rotas principais, não apenas o mapa.
- Adicionar verificações de estouro horizontal e interseção com a navegação fixa nos tamanhos críticos.
- Manter a auditoria de português do Brasil, metadados próprios por página e formatação centralizada.
- Executar lint, testes de formatação, SSR, responsividade e compilação final.

## Resultado esperado

- Nenhum elemento sobreposto ou inacessível nas páginas e abas verificadas.
- Bússola utilizável sobre o mapa nos três tamanhos.
- Backup automático ativo para usuários conectados.
- Relatório semanal configurável, com envio imediato e histórico; o envio real dependerá somente da conexão da conta Gmail remetente.
