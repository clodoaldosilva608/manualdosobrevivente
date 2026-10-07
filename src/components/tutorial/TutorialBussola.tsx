/**
 * Treinamento de campo — módulo BÚSSOLA (player do curso).
 *
 * Passos com teoria + exercício interativo, progresso salvo no aparelho e
 * quiz de verificação ao final. Insígnia "OPERADOR ORIENTADO" quando tudo
 * concluído — o objetivo é criar a rotina de prática, não só ler.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import RosaTutorial from "@/components/tutorial/RosaTutorial";
import {
  PASSOS_BUSSOLA,
  QUIZ_BUSSOLA,
  QUIZ_MINIMO,
  carregarProgresso,
  salvarProgresso,
  treinadoCompleto,
  type ProgressoTutorial,
} from "@/lib/tutorial-bussola";
import { toast } from "sonner";

type Etapa = "curso" | "quiz" | "final";

export default function TutorialBussola() {
  const [progresso, setProgresso] = useState<ProgressoTutorial>({ passos: [], quiz: null });
  const [indice, setIndice] = useState(0);
  const [etapa, setEtapa] = useState<Etapa>("curso");
  const [exercicioOk, setExercicioOk] = useState(false);
  const [respostas, setRespostas] = useState<Record<number, number>>({});

  useEffect(() => {
    setProgresso(carregarProgresso());
  }, []);

  const passo = PASSOS_BUSSOLA[indice];
  const concluido = useCallback((id: string) => progresso.passos.includes(id), [progresso.passos]);

  const marcarPasso = useCallback((id: string) => {
    setProgresso((p) => {
      if (p.passos.includes(id)) return p;
      const proximo = { ...p, passos: [...p.passos, id] };
      salvarProgresso(proximo);
      return proximo;
    });
  }, []);

  const avancar = () => {
    const precisaExercicio =
      passo.exercicio &&
      passo.exercicio.modo !== "explorar" &&
      !exercicioOk &&
      !concluido(passo.id);
    if (precisaExercicio) {
      toast.message("Conclua o exercício para avançar", {
        description: "É rápido — e é a parte que fixa o aprendizado.",
      });
      return;
    }
    marcarPasso(passo.id);
    setExercicioOk(false);
    if (indice + 1 < PASSOS_BUSSOLA.length) {
      setIndice(indice + 1);
    } else {
      setEtapa("quiz");
    }
  };

  const voltar = () => {
    setExercicioOk(false);
    if (indice > 0) setIndice(indice - 1);
    else setEtapa("curso");
  };

  const respostaQuizCorreta = useCallback(
    (i: number) => respostas[i] === QUIZ_BUSSOLA[i].correta,
    [respostas],
  );

  const respostasDadas = useMemo(() => Object.keys(respostas).length, [respostas]);
  const acertos = useMemo(
    () => QUIZ_BUSSOLA.reduce((n, _q, i) => n + (respostaQuizCorreta(i) ? 1 : 0), 0),
    [respostaQuizCorreta],
  );

  // Quiz concluído (todas respondidas) → registra e vai para a tela final.
  useEffect(() => {
    if (etapa !== "quiz" || respostasDadas < QUIZ_BUSSOLA.length) return;
    const registro = { acertos, total: QUIZ_BUSSOLA.length };
    setProgresso((p) => {
      const proximo = { ...p, quiz: registro };
      salvarProgresso(proximo);
      return proximo;
    });
    const t = window.setTimeout(() => setEtapa("final"), 900);
    return () => window.clearTimeout(t);
  }, [etapa, respostasDadas, acertos]);

  const reiniciar = () => {
    const zerado: ProgressoTutorial = { passos: [], quiz: null };
    salvarProgresso(zerado);
    setProgresso(zerado);
    setIndice(0);
    setEtapa("curso");
    setRespostas({});
    setExercicioOk(false);
  };

  const completo = treinadoCompleto(progresso);
  const passosFeitos = progresso.passos.length;

  // ── Tela final: insígnia ──
  if (etapa === "final") {
    return (
      <div className="container mx-auto max-w-2xl p-4 pb-8 md:p-8">
        <div
          className="rounded-md border border-border bg-card p-8 text-center"
          data-test="tutorial-final"
        >
          <Award
            className={`mx-auto mb-4 h-16 w-16 ${completo ? "text-tactical-amber" : "text-muted-foreground"}`}
          />
          {completo ? (
            <>
              <h1 className="mono text-xl font-bold tracking-widest text-tactical-amber">
                OPERADOR ORIENTADO
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Curso de bússola concluído: {passosFeitos}/{PASSOS_BUSSOLA.length} lições e quiz{" "}
                {progresso.quiz?.acertos}/{progresso.quiz?.total}.
              </p>
              <p className="mt-4 text-sm">
                Pratique um percurso curto esta semana e use o <strong>Guia de Rota</strong> do mapa
                para consolidar — navegação é músculo.
              </p>
            </>
          ) : (
            <>
              <h1 className="mono text-xl font-bold tracking-widest">QUASE LÁ</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Faltou pouco: você precisa de todas as lições e de pelo menos {QUIZ_MINIMO}/
                {QUIZ_BUSSOLA.length} acertos no quiz (hoje: {passosFeitos}/{PASSOS_BUSSOLA.length}{" "}
                lições, {progresso.quiz?.acertos ?? 0} acertos).
              </p>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                setEtapa("curso");
                setIndice(0);
              }}
            >
              Rever lições
            </Button>
            {progresso.quiz && !completo && (
              <Button
                variant="outline"
                onClick={() => {
                  setRespostas({});
                  setEtapa("quiz");
                }}
              >
                Refazer quiz
              </Button>
            )}
            <Button variant="ghost" onClick={reiniciar} data-test="tutorial-reiniciar">
              <RotateCcw className="h-4 w-4" /> Zerar progresso
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ──
  if (etapa === "quiz") {
    return (
      <div className="container mx-auto max-w-2xl p-4 pb-8 md:p-8">
        <header className="mb-6">
          <p className="mono text-[10px] uppercase tracking-widest text-tactical-orange">
            Treinamento · verificação
          </p>
          <h1 className="mono text-2xl font-bold tracking-wider md:text-3xl">QUIZ DE CAMPO</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {respostasDadas}/{QUIZ_BUSSOLA.length} respondidas · mínimo {QUIZ_MINIMO} acertos
          </p>
        </header>
        <div className="space-y-4">
          {QUIZ_BUSSOLA.map((q, i) => {
            const respondida = respostas[i] != null;
            return (
              <div key={q.pergunta} className="rounded-md border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold">
                  {i + 1}. {q.pergunta}
                </p>
                <div className="space-y-2">
                  {q.alternativas.map((alt, j) => {
                    const correta = j === q.correta;
                    const escolhida = respostas[i] === j;
                    const estilo = !respondida
                      ? escolhida
                        ? "border-tactical-orange text-foreground"
                        : "border-border text-muted-foreground hover:border-tactical-orange/60"
                      : correta
                        ? "border-tactical-green text-tactical-green"
                        : escolhida
                          ? "border-tactical-red text-tactical-red"
                          : "border-border text-muted-foreground opacity-70";
                    return (
                      <button
                        key={alt}
                        type="button"
                        disabled={respondida}
                        onClick={() => setRespostas((r) => ({ ...r, [i]: j }))}
                        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs glove-tap ${estilo}`}
                      >
                        {respondida &&
                          (correta ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                          ) : escolhida ? (
                            <XCircle className="h-4 w-4 shrink-0" />
                          ) : null)}
                        {alt}
                      </button>
                    );
                  })}
                </div>
                {respondida && (
                  <p className="mt-3 rounded border border-border bg-background/50 p-2 text-xs text-muted-foreground">
                    {q.explicacao}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Curso (lição a lição) ──
  return (
    <div className="container mx-auto max-w-3xl p-4 pb-8 md:p-8">
      <header className="mb-4">
        <p className="mono text-[10px] uppercase tracking-widest text-tactical-orange">
          Treinamento de campo · módulo bússola
        </p>
        <h1 className="mono text-2xl font-bold tracking-wider md:text-3xl">
          APRENDA A USAR A BÚSSOLA
        </h1>
        {/* Progresso */}
        <div className="mt-3 flex items-center gap-2" data-test="tutorial-progresso">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-tactical-orange transition-all"
              style={{
                width: `${Math.round(
                  ((passosFeitos + (progresso.quiz ? 1 : 0)) / (PASSOS_BUSSOLA.length + 1)) * 100,
                )}%`,
              }}
            />
          </div>
          <span className="mono text-[10px] text-muted-foreground">
            {passosFeitos}/{PASSOS_BUSSOLA.length}
            {completo ? " · OPERADOR ORIENTADO" : ""}
          </span>
        </div>
        {/* Trilha de passos */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PASSOS_BUSSOLA.map((p, i) => (
            <button
              key={p.id}
              type="button"
              title={p.titulo}
              onClick={() => {
                setIndice(i);
                setExercicioOk(false);
              }}
              className={`mono flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold ${
                concluido(p.id)
                  ? "border-tactical-green text-tactical-green"
                  : i === indice
                    ? "border-tactical-orange text-tactical-orange"
                    : "border-border text-muted-foreground"
              }`}
            >
              {concluido(p.id) ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </button>
          ))}
          <button
            type="button"
            title="Quiz de verificação"
            onClick={() => setEtapa("quiz")}
            className={`mono flex h-7 items-center gap-1 rounded-full border px-2 text-[10px] font-bold ${
              progresso.quiz
                ? "border-tactical-green text-tactical-green"
                : "border-border text-muted-foreground"
            }`}
          >
            {progresso.quiz ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            QUIZ
          </button>
        </div>
      </header>

      <article className="rounded-md border border-border bg-card p-5 md:p-6">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Lição {indice + 1} de {PASSOS_BUSSOLA.length} · {passo.resumo}
        </p>
        <h2 className="mt-1 text-xl font-bold md:text-2xl">{passo.titulo}</h2>
        <div className="prose prose-invert prose-headings:text-tactical-orange prose-strong:text-foreground mt-4 max-w-none text-sm">
          <ReactMarkdown>{passo.corpo}</ReactMarkdown>
        </div>

        {passo.exercicio && (
          <div className="mt-6 rounded-md border border-tactical-orange/40 bg-tactical-orange/5 p-4">
            <p className="mono mb-3 text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
              Exercício interativo
            </p>
            <p className="mb-4 text-xs text-muted-foreground">{passo.exercicio.instrução}</p>
            <RosaTutorial
              modo={passo.exercicio.modo}
              rumoAlvo={passo.exercicio.rumoAlvo}
              onSucesso={() => setExercicioOk(true)}
            />
          </div>
        )}
      </article>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="outline" onClick={voltar} disabled={indice === 0 && etapa === "curso"}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button onClick={avancar} data-test="tutorial-avancar" className="glove-tap">
          {indice + 1 < PASSOS_BUSSOLA.length ? (
            <>
              Próxima lição <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Ir para o quiz <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
