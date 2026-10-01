# Correção final do mapa e relatórios configuráveis

A auditoria confirmou que Ajustes, SOS, Manual, downloads offline, dashboard, sincronização, testes em português e CI já estão implementados. Esta fase corrige a falha visual ainda presente na bússola flutuante e conclui as duas lacunas reais: backup automático e relatórios por e-mail configuráveis.

## 1. Corrigir a bússola flutuante no mapa

- Manter a miniatura fixa no canto inferior direito e o mapa utilizável.
- No modo intermediário, limitar a altura ao espaço disponível e permitir rolagem interna, sem deixar os botões de minimizar e tela cheia fora da tela.
- Manter os controles de tamanho sempre fixos no topo do painel.
- Ajustar largura e posição para não cobrir o painel de coordenadas nem a barra inferior em celulares.
- Preservar os três estados: miniatura, painel e tela cheia, incluindo a preferência salva.
- Validar visualmente e por interação em celular e desktop: abrir, ampliar, reduzir e minimizar.

## 2. Fortalecer a garantia de português do Brasil

- Ampliar a auditoria para detectar formatação direta com `Intl` fora do utilitário central.
- Remover permissões genéricas que possam esconder palavras inglesas visíveis, mantendo exceções apenas para siglas e chaves internas.
- Incluir todas as rotas críticas no teste SSR e confirmar `lang="pt-BR"`, metadados próprios e ausência de texto em inglês.
- Manter o bloqueio no build e em cada pull request.

## 3. Backup automático entre dispositivos

- Executar sincronização após alterações locais em waypoints, mochila, checklist e preferências, quando houver sessão ativa e conexão disponível.
- Fazer a mesclagem inicial ao entrar na conta e registrar a última sincronização.
- Manter os botões manuais de enviar e trazer como alternativa de recuperação.
- Evitar conflitos usando a atualização mais recente de cada registro.

## 4. Relatório semanal configurável pelo usuário

- Adicionar em Ajustes um controle para ativar/desativar o relatório, escolher dia da semana e horário.
- Enviar ao e-mail da conta um resumo de waypoints, mochila/checklist e preferências salvas.
- Adicionar “Enviar agora” para disparo manual.
- Criar um histórico com data, destinatário, totais e resultado de cada envio.
- Proteger o disparo agendado e processar apenas usuários cujo horário configurado chegou.
- Conectar uma conta remetente do Gmail antes da implementação do envio; o aplicativo usará essa conta somente para enviar os relatórios.

## 5. Dados e segurança

- Criar tabelas próprias para preferências de relatório e histórico de envios, com acesso restrito ao proprietário e permissões explícitas.
- Não expor credenciais de e-mail ao navegador.
- Garantir que cada envio consulte somente os dados do destinatário.

## 6. Verificação final

- Percorrer Mapa, Ajustes, SOS, Manual, Offline e Dashboard em tela móvel.
- Confirmar abertura dos tópicos e imagens do Manual, opções de compartilhamento do SOS, localização inicial e retorno ao último local.
- Executar lint, auditoria pt-BR, testes de formatação, SSR e responsividade do mapa.

## Detalhes técnicos

- O painel da bússola atualmente existe e o botão de tela cheia também; o teste confirmou que ele fica fora da área clicável em 390×844 por causa da altura do conteúdo. A correção será de contenção e rolagem, não uma reconstrução.
- O relatório automático usará uma rota de servidor autenticada por segredo e uma rotina semanal que verifica as preferências individuais.
- O histórico será persistente e exibido em Ajustes.
