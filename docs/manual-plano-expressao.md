# Plano de Expressão — Aba MANUAL DE SOBREVIVÊNCIA

> Documento-guia da expansão da base de conhecimento offline do Manual do Sobrevivente.
> Define o mapa de tópicos, o formato editorial padrão (ilustração + passo a passo + checklist)
> e as ondas de produção até cobrir todos os domínios de sobrevivência.

---

## 1. Missão e princípios

A aba é a **base de conhecimento offline** do aplicativo: funciona sem sinal, é consultável por
busca e serve como referência de campo e material de estudo. Três princípios editores:

1. **Cada verbete resolve uma situação concreta** — não é enciclopédia, é manual operacional.
2. **Ilustração própria em todo verbete** — estilo tático de linha (SVG leve, offline, nítido
   em qualquer zoom), com os elementos-chave rotulados.
3. **Passo a passo de execução em todo verbete** — sequência operacional numerada, além do
   corpo explicativo e do checklist de campo com marcação persistente no aparelho.

## 2. Domínios cobertos (mapa de categorias)

| Categoria                     | Escopo                                                                 | Verbetes                      |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| Primeiros Socorros            | feridas, sangramento, hipotermia, traumatismo, queimadura, intoxicação | 2 atuais + onda 2             |
| Fogo                          | acendimento, local e montagem, fogo na chuva, fogão de campo           | 2 atuais                      |
| Água                          | purificação, coleta na natureza, estocagem urbana                      | 2 atuais                      |
| Abrigo                        | escolha do local, tarps, abrigo de emergência, cama                    | 2 atuais                      |
| Nós                           | nós essenciais e aplicação                                             | 1 atual                       |
| Navegação                     | bússola, mapa, azimute, orientação natural                             | 1 atual + tutorial interativo |
| Fundamentos                   | filosofia de preparação, riscos, prioridades                           | 7 atuais (pôsteres)           |
| Mentalidade                   | controle emocional, decisão, disciplina                                | 3 atuais (pôsteres)           |
| Equipamento                   | mochila 72 h, EDC, manutenção, kits por cenário                        | 2 atuais                      |
| **Sinalização e Resgate**     | espelho, fumaça, SOS no chão, apito, radioescuta                       | 1 novo                        |
| **Alimentos e Forrageamento** | teste universal, plantas BR, pesca/improviso                           | 1 novo + onda 2               |
| **Desastres Naturais**        | enchente, incêndio florestal, terremoto, tempestade severa             | 3 novos + onda 2              |
| **Comunicação**               | rádio de emergência, plano familiar, mensagens                         | 1 novo + onda 2               |
| **Higiene e Saúde**           | sanitário de campo, mãos, pés, doenças                                 | 1 novo                        |
| **Meio Urbano**               | apagão, falta d'água, confinamento, evacuação urbana                   | 1 novo + onda 2               |

**Estado atual: 29 verbetes** (17 originais + 12 novos, todos com ilustração e passo a passo).

## 3. Formato padrão de cada verbete

```
slug                 — id estável (URL, checklist persistido)
title / category     — título de campo + categoria
summary              — uma linha que vende o verbete
image / imageAlt     — ilustração SVG tática (320×240) com alt descritivo
body (markdown)      — 3 seções: por que importa · como funciona · armadilhas
passos[]             — PASSO A PASSO DE EXECUÇÃO (5–8 passos numerados, imperativos)
checklist[]          — CHECKLIST DE CAMPO (itens marcáveis, persistidos no aparelho)
```

Regras de estilo: imperativo direto ("Aplique", "Confira"), números sempre absolutos
(“15 cm”, “60 m”, “1 minuto”), avisos críticos em maiúsculas dentro do corpo, sem jargão
sem explicação, e uma frase-máxima por seção — conteúdo denso, zero enchimento.

## 4. Ilustrações — especificação

- Formato **SVG** (importado pelo Vite como URL; offline por natureza, ~2 KB cada).
- Gramática visual única: fundo verde-oliva escuro (#141c10) com grade, traço cáqui
  (#d6c9a3), acento laranja tático (#f97316), verde de apoio (#7d9b5a), rótulos em
  monoespaçada.
- Todo elemento decisivo rotulado; a ilustração tem de ser lida SEM o corpo do texto.
- Gerador versionado em `scripts/manual_svgs.mjs` — novas ilustrações entram no script,
  nunca em binário.

## 5. Ondas de produção

| Onda                  | Conteúdo                                                                                                                                                         | Prazo sugerido             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Onda 1 (entregue)** | 12 verbetes novos em 6 categorias novas + passos nos 17 originais + 12 ilustrações SVG                                                                           | concluída                  |
| Onda 2                | Primeiros socorros avançados (trauma, queimadura, intoxicação); tempestade severa e raios; pesca de improviso; plano familiar de comunicação; evacuação urbana   | próxima janela de conteúdo |
| Onda 3                | Kits por cenário (carro, trabalho, escola); animais peçonhentos; inverno/frio urbano; segurança alimentar prolongada                                             | segunda janela             |
| Onda 4                | Tradução progressiva dos verbetes prioritários (en/es/ru/zh/ja) — conteúdo permanece pt-BR até a onda (política i18n do app: tradução progressiva, nunca quebra) | contínua                   |

## 6. Métricas de sucesso

- Cobertura: ≥ 40 verbetes ao fim da onda 3, sem categoria órfã.
- Uso: % de operadores que abrem o Manual por semana (telemetria local/futura).
- Qualidade: todo verbete novo sai com ilustração + passos + checklist — revisão por pares
  do checklist de campo (marcação persistida deve refletir fluxo real de execução).
- Offline: 100% dos assets do Manual elegíveis para cache no Service Worker (sw.js).
