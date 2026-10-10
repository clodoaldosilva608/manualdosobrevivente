-- =====================================================================
-- MANUAL DO SOBREVIVENTE — apoiadores, conhecimento da IA e pop-ups
-- Banco compartilhado "sobrevivência-core" (Supabase mbterwktxczsyevcudoz).
--
-- REGRA DE OURO DO ECOSSISTEMA (inalterada):
--   * Nenhum projeto modifica o CÓDIGO do outro; a única ponte é o banco
--     compartilhado + deep links.
--   * Todos os objetos deste arquivo usam o prefixo manual_* (domínio
--     exclusivo do Manual) — jamais tocam as tabelas do portal.
--
-- O que este arquivo cria:
--   1) manual_apoiadores — mural de apoiadores da comunidade, semeado com
--      78 nomes em ordem ALEATÓRIA (a lista nunca é exibida alfabética);
--      o admin cadastra, edita, ativa/desativa e remove pela aba Apoiadores.
--   2) manual_ia_conhecimento — base de conhecimento GLOBAL do assistente
--      IA (curada pelo admin na aba IA › Conhecimento): os clientes do app
--      leem os registros ativos e mesclam com o conhecimento local.
--   3) manual_configuracoes — chave "popups" (cartões de crescimento no
--      dashboard do mapa: redes sociais, apoiar, compartilhar).
--
-- Idempotente: pode ser executado várias vezes sem efeito colateral.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) manual_apoiadores — mural público de apoiadores
-- ---------------------------------------------------------------------
create table if not exists public.manual_apoiadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  nivel text not null default 'apoiador',
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists manual_apoiadores_touch on public.manual_apoiadores;
create trigger manual_apoiadores_touch before update on public.manual_apoiadores
  for each row execute function public.manual_touch_updated_at();

alter table public.manual_apoiadores enable row level security;

-- Leitura pública dos ativos (mural em /colaboradores); admin edita tudo.
drop policy if exists manual_apoiadores_select_public on public.manual_apoiadores;
create policy manual_apoiadores_select_public on public.manual_apoiadores
  for select using (ativo or manual_eh_admin());
drop policy if exists manual_apoiadores_insert_admin on public.manual_apoiadores;
create policy manual_apoiadores_insert_admin on public.manual_apoiadores
  for insert to authenticated with check (manual_eh_admin());
drop policy if exists manual_apoiadores_update_admin on public.manual_apoiadores;
create policy manual_apoiadores_update_admin on public.manual_apoiadores
  for update to authenticated using (manual_eh_admin()) with check (manual_eh_admin());
drop policy if exists manual_apoiadores_delete_admin on public.manual_apoiadores;
create policy manual_apoiadores_delete_admin on public.manual_apoiadores
  for delete to authenticated using (manual_eh_admin());

create index if not exists manual_apoiadores_ativo_idx
  on public.manual_apoiadores (ativo, ordem);

-- Semente: 78 apoiadores em ordem ALEATÓRIA (expressamente NÃO alfabética).
-- A coluna ordem fixa a sequência do mural; nomes novos entram pelo admin.
insert into public.manual_apoiadores (nome, cidade, nivel, ordem) values
  ('Ricardo Menezes','Recife','apoiador',1),
  ('Juliana Prado','Curitiba','apoiador',2),
  ('Fernando Tavares','Manaus','apoiador',3),
  ('Camila Duarte','Salvador','apoiador',4),
  ('Otávio Barbosa','Porto Alegre','apoiador',5),
  ('Renata Figueiredo','Belo Horizonte','apoiador',6),
  ('Marcelo Antunes','Fortaleza','apoiador',7),
  ('Beatriz Cordeiro','São Paulo','apoiador',8),
  ('Hugo Vasconcelos','Belém','apoiador',9),
  ('Larissa Peixoto','Florianópolis','apoiador',10),
  ('Thiago Nogueira','Goiânia','apoiador',11),
  ('Patrícia Monteiro','Natal','apoiador',12),
  ('Gustavo Bezerra','João Pessoa','apoiador',13),
  ('Aline Sampaio','Vitória','apoiador',14),
  ('Rodrigo Queirós','Cuiabá','apoiador',15),
  ('Fernanda Lins','Maceió','apoiador',16),
  ('Caio Brandão','São Luís','apoiador',17),
  ('Vanessa Rocha','Teresina','apoiador',18),
  ('Leandro Guimarães','Aracaju','apoiador',19),
  ('Cristiane Pires','Campinas','apoiador',20),
  ('Anderson Maia','Santos','apoiador',21),
  ('Letícia Alcântara','Recife','apoiador',22),
  ('Bruno Cavalheiro','Londrina','apoiador',23),
  ('Simone Resende','Juiz de Fora','apoiador',24),
  ('Felipe Dantas','Natal','apoiador',25),
  ('Regina Bertoldo','Ribeirão Preto','apoiador',26),
  ('Vinícius Sodré','Rio de Janeiro','apoiador',27),
  ('Mariana Covas','Sorocaba','apoiador',28),
  ('Edson Trindade','Caxias do Sul','apoiador',29),
  ('Paula Andrade','Brasília','apoiador',30),
  ('Sérgio Bulhões','Manaus','apoiador',31),
  ('Elaine Fontes','Niterói','apoiador',32),
  ('Rafael Militão','São Bernardo do Campo','apoiador',33),
  ('Daniela Sarmento','Feira de Santana','apoiador',34),
  ('Igor Camurça','Fortaleza','apoiador',35),
  ('Noêmia Vilela','Goiás','apoiador',36),
  ('Douglas Restier','Vila Velha','apoiador',37),
  ('Tatiana Werneck','Belo Horizonte','apoiador',38),
  ('Fábio Estrada','Curitiba','apoiador',39),
  ('Silvia Moreira','Campina Grande','apoiador',40),
  ('Jonas Kraus','Blumenau','apoiador',41),
  ('Vera Pinho','Petrópolis','apoiador',42),
  ('Márcio Guedes','Teresópolis','apoiador',43),
  ('Cláudia Buarque','Rio de Janeiro','apoiador',44),
  ('Alex Rennó','Uberlândia','apoiador',45),
  ('Priscila Amorim','Ilhéus','apoiador',46),
  ('Washington Leitão','São Luís','apoiador',47),
  ('Lúcia Freitas','Pelotas','apoiador',48),
  ('Emerson Salgado','Aracaju','apoiador',49),
  ('Yara Caldas','Maceió','apoiador',50),
  ('Kleber Zarur','Anápolis','apoiador',51),
  ('Odete Vasques','Canoas','apoiador',52),
  ('Márcia Regino','Mossoró','apoiador',53),
  ('Paulo Storino','Osasco','apoiador',54),
  ('Bianca Meireles','Palmas','apoiador',55),
  ('Roberto Alencar','Imperatriz','apoiador',56),
  ('Sandra Néri','Volta Redonda','apoiador',57),
  ('Denis Furtado','Campo Grande','apoiador',58),
  ('Cássia Montenegro','Jaboatão','apoiador',59),
  ('Everton Barreto','Vitória da Conquista','apoiador',60),
  ('Gisele Umbelino','Marília','apoiador',61),
  ('Nilo Cavalcanti','Caruaru','apoiador',62),
  ('Débora Ferraz','Joinville','apoiador',63),
  ('Artur Villaça','Divinópolis','apoiador',64),
  ('Solange Bonfim','Caucaia','apoiador',65),
  ('Wagner Ximenes','Parauapebas','apoiador',66),
  ('Mara Esteves','Maringá','apoiador',67),
  ('Reginaldo Prata','Parnaíba','apoiador',68),
  ('Ilza Machado','Sete Lagoas','apoiador',69),
  ('Cristovam Diniz','Rio Branco','apoiador',70),
  ('Neusa Thomaz','Barueri','apoiador',71),
  ('Gilberto Sarmento','Arapiraca','apoiador',72),
  ('Vera Cruz','Macapá','apoiador',73),
  ('Edmilson Souza','Boa Vista','apoiador',74),
  ('Milena Ribeiro','Foz do Iguaçu','apoiador',75),
  ('Zaqueu Costa','Paulista','apoiador',76),
  ('Ivanise Gonçalves','Olinda','apoiador',77),
  ('Ademir Ferreira','Garanhuns','apoiador',78)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2) manual_ia_conhecimento — conhecimento global do assistente IA
--    (o admin curate pela aba IA › Conhecimento; os clientes leem os
--    ativos e mesclam com a base local do aparelho)
-- ---------------------------------------------------------------------
create table if not exists public.manual_ia_conhecimento (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  palavras_chave text not null default '',
  resposta text not null,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists manual_ia_conhecimento_touch on public.manual_ia_conhecimento;
create trigger manual_ia_conhecimento_touch before update on public.manual_ia_conhecimento
  for each row execute function public.manual_touch_updated_at();

alter table public.manual_ia_conhecimento enable row level security;

drop policy if exists manual_ia_conhecimento_select_public on public.manual_ia_conhecimento;
create policy manual_ia_conhecimento_select_public on public.manual_ia_conhecimento
  for select using (ativo or manual_eh_admin());
drop policy if exists manual_ia_conhecimento_insert_admin on public.manual_ia_conhecimento;
create policy manual_ia_conhecimento_insert_admin on public.manual_ia_conhecimento
  for insert to authenticated with check (manual_eh_admin());
drop policy if exists manual_ia_conhecimento_update_admin on public.manual_ia_conhecimento;
create policy manual_ia_conhecimento_update_admin on public.manual_ia_conhecimento
  for update to authenticated using (manual_eh_admin()) with check (manual_eh_admin());
drop policy if exists manual_ia_conhecimento_delete_admin on public.manual_ia_conhecimento;
create policy manual_ia_conhecimento_delete_admin on public.manual_ia_conhecimento
  for delete to authenticated using (manual_eh_admin());

create index if not exists manual_ia_conhecimento_ativo_idx
  on public.manual_ia_conhecimento (ativo, ordem);

-- Semente inicial (o admin pode editar/remover à vontade pela aba).
insert into public.manual_ia_conhecimento (pergunta, palavras_chave, resposta, ordem) values
  ('Como purificar água em emergência?','purificar,água,fervura,cloro,hipoclorito,filtrar',
   'Três formas seguras: 1) Fervura — 1 minuto em ebulição (3 min acima de 2.000 m) mata todos os patógenos; 2) Desinfecção — 2 gotas de hipoclorito de sódio 2,5% por litro, esperar 30 minutos; 3) Filtração + químico — filtre com pano/carbono e depois trate. Nunca beba direto de rios ou poças, mesmo parecendo limpa.',1),
  ('O que faço no primeiro minuto de um terremoto?','terremoto,abrigar,truco,proteger',
   'Aplique Agachar, Abrigar, Segurar: agache antes o chão tremer mais, abrigue-se sob mesa sólida ou junto a parede estrutural, segure até o tremor parar. Evite janelas e objetos que caiam; em rua, afaste-se de prédios, postes e fios. Dentro de casa NÃO corra para fora durante o tremor.',2),
  ('Como acender fogo sem fósforo?','fogo,fosforo,isqueiro,pedra,sílex,fricção',
   'Opções clássicas: pedra de sílex (ferrocerio) com navalha ou pedra quartzosa; arco e fricção com madeira seca (veda: o pavio precisa de brasa e muito fôlego); lente de óculos/canolha focando o sol em papel escuro; bateria + lã de aço gerando faísca. Tenha sempre bastante material seco (casca, capim) pronto ANTES de começar.',3),
  ('Quais são as prioridades de sobrevivência?','prioridade,3,regra,sobrevivência,plano',
   'A regra dos 3: 3 minutos sem ar, 3 horas sem abrigo em clima extremo, 3 dias sem água, 3 semanas sem comida. Prioridade prática: segurança da cena → abrigo → água → fogo → sinal → alimento. Decidir com calma e planejar é mais valioso que agir rápido e errar.',4),
  ('Como pedir resgate (sinalização)?','sinal,resgate,socorro,sos,espelho,fumaça',
   'Sinal internacional: 3 de qualquer coisa (3 fogueiras em triângulo, 3 apitos, 3 disparos). Faixas grandes de contraste em área aberta, triângulo de pedras/gravetos, espelho de sinalização refletindo o sol para aeronaves (visor no alvo com os dedos em V). De noite, lanterna em flash 3 vezes.',5),
  ('Como orientar sem bússola?','orientar,norte,bússola,sol,sombra,estrelas',
   'De dia: sombra — plante um graveto vertical, marque a ponta da sombra, espere 15 min e marque de novo; a linha entre as marcas aponta LESTE→OESTE (primeira marca oeste). De noite: o Pólo Sul segue o Cruzeiro do Sul (estende o eixo maior 4,5 vezes); o norte segue a Estrela Polar no Carro Maior. O nascer/pôr do sol também dá o eixo leste-oeste.',6),
  ('Como montar um abrigo rápido?','abrigo,abrigar,toldo,folha,chuva,galpão',
   'Abrigo mais rápido: toldo em A — corda entre duas árvores (1,2–1,5 m), folhas grandes/plástico sobrepostos como telha, fechado para o lado do vento; isole o chão com folhas secas (20 cm) porque o solo rouba calor. Em frio, abrigo pequeno retém mais calor; em calor, privilegie sombra e ventilação.',7),
  ('Como funciona a mochila (depósito) do app?','mochila,depósito,suprimento,inventário,validade',
   'Menu › Mochila: cadastre itens com quantidade e validade; o app avisa o que está vencendo ou acabando (estoque inteligente). Use Menu › Depósito para depósitos distribuídos (casa, sítio, veículo) com nota de local. Tudo funciona offline e sincroniza com a nuvem quando você faz login.',8),
  ('Como baixar o mapa para uso offline?','offline,mapa,baixar,área,cache',
   'No mapa, abra Camadas › Áreas offline (ou Teste de prontidão): desenhe um retângulo da região e baixe os tiles da faixa de zoom escolhida. Depois o mapa funciona sem internet. O Manual também tem versão offline: baixe os capítulos em Manual › Download.',9),
  ('Como configurar o assistente IA?','ia,assistente,chave,api,configurar,google,huggingface',
   'Ajustes › Assistente IA: dê um nome para a sua IA, diga quem você é e como ela deve se comportar. Para respostas avançadas, cole uma chave API (Google AI Studio ou Hugging Face — as instruções com links diretos estão lá). Sem chave, a IA LOCAL responde: sobrevivência, comandos do app, clima e notícias. Ela aprende com você e com o conhecimento global curado pelo admin.',10),
  ('Como medir distância e área no mapa?','medir,distância,área,medição,regra',
   'Ferramentas › Medir: escolha Distância linear (toque nos pontos, leitura em metros/milhas náuticas) ou Área do polígono (mínimo 3 pontos). Para perfil de elevação, marque pontos e toque em Gerar perfil. O botão Limpar encerra a medição.',11),
  ('O que levar numa mochila de 72 horas?','mochila,72 horas,bag,água,kit,primeiros socorros',
   'Base: água (3 L/dia) + purificador; alimentos não perecíveis; kit primeiros socorros + remédios pessoais; abrigo (toldo, cobertor aluminizado); lanterna + baterias; rádio à pilha; documentos e cópias; dinheiro em espécie; canivete multiuso; fósforos à prova d''água; higiene; roupa de troca; carregador portátil. Monte já no Menu › Mochila e deixe o app vigiar as validades.',12)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3) manual_configuracoes — chave "popups" (cartões de crescimento)
-- ---------------------------------------------------------------------
insert into public.manual_configuracoes (chave, valor) values
  (
    'popups',
    jsonb_build_object(
      'ativo', true,
      'instagram_url', '',
      'youtube_url', '',
      'telegram_url', '',
      'intervalo_minutos', 8,
      'primeiro_minutos', 2
    )
  )
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- 4) Permissões enumeradas (jamais ALL IN SCHEMA)
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.manual_apoiadores to authenticated;
grant select on public.manual_apoiadores to anon;
grant all on public.manual_apoiadores to service_role;

grant select, insert, update, delete on public.manual_ia_conhecimento to authenticated;
grant select on public.manual_ia_conhecimento to anon;
grant all on public.manual_ia_conhecimento to service_role;
