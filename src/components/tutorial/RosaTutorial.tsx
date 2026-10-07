/**
 * RosaTutorial — bússola interativa para o curso de bússola.
 *
 * Modos:
 * - "explorar": arraste a rosa; a agulha fica apontando o norte (ensina as
 *   partes e o comportamento da agulha).
 * - "marcacao": exercício de luneta — a línea de fé já aponta para o marco;
 *   arraste a luneta até o índice ler o rumo correto (agulha "encaixa").
 * - "rumo": exercício com o sensor do aparelho — gire-se fisicamente até o
 *   rumo-alvo; sem sensor, permite arrastar como simulador.
 *
 * Suporte a teclado e toque: setas ajustam a luneta/rumo em 2° (Shift = 15°).
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { ativarSensorBussola, useSensorBussola } from "@/lib/bussola-sensor";
import { diferencaAngular } from "@/lib/tutorial-bussola";

const norm360 = (g: number) => ((g % 360) + 360) % 360;
const delta180 = (d: number) => ((d + 540) % 360) - 180;

export interface RosaTutorialProps {
  modo: "explorar" | "marcacao" | "rumo";
  rumoAlvo?: number;
  onSucesso?: () => void;
}

/** Tolerância de encaixe do exercício (graus). */
const TOLERANCIA = 4;

export default function RosaTutorial({ modo, rumoAlvo = 0, onSucesso }: RosaTutorialProps) {
  const { sensorOn, rumoAparelho } = useSensorBussola();
  const [luneta, setLuneta] = useState(modo === "marcacao" ? 120 : 0);
  const [simulado, setSimulado] = useState(0); // rumo simulado (modo rumo sem sensor)
  const [sucesso, setSucesso] = useState(false);
  const arrasteRef = useRef<{ anguloInicial: number; valorInicial: number } | null>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const sucessoDisparado = useRef(false);

  const rumoOperador = modo === "rumo" ? (rumoAparelho ?? (sensorOn ? null : simulado)) : null;

  // Leitura do índice: em "marcacao" é o valor da luneta; em "rumo" é o rumo do operador.
  const leitura = modo === "marcacao" ? norm360(-luneta) : modo === "rumo" ? rumoOperador : null;

  const alvoAtendido = leitura != null && diferencaAngular(leitura, rumoAlvo) <= TOLERANCIA;

  // Sucesso sustentado: 1,2 s dentro da tolerância antes de liberar.
  useEffect(() => {
    if (!alvoAtendido || modo === "explorar") return;
    if (sucessoDisparado.current) return;
    const t = window.setTimeout(() => {
      sucessoDisparado.current = true;
      setSucesso(true);
      onSucesso?.();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [alvoAtendido, modo, onSucesso]);

  // Reinicia quando o componente troca de exercício.
  useEffect(() => {
    sucessoDisparado.current = false;
    setSucesso(false);
    setLuneta(modo === "marcacao" ? norm360(-(rumoAlvo + 120)) : 0);
  }, [modo, rumoAlvo]);

  const anguloDoToque = (e: React.PointerEvent): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const r = svg.getBoundingClientRect();
    const px = e.clientX - (r.left + r.width / 2);
    const py = e.clientY - (r.top + r.height / 2);
    return (Math.atan2(px, -py) * 180) / Math.PI; // 0° = para cima, horário
  };

  const aoApertar = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const inicio = anguloDoToque(e);
    const valorAtual = modo === "rumo" && !sensorOn ? simulado : luneta;
    arrasteRef.current = { anguloInicial: inicio, valorInicial: valorAtual };
  };
  const aoArrastar = (e: React.PointerEvent) => {
    if (!arrasteRef.current) return;
    const d = delta180(anguloDoToque(e) - arrasteRef.current.anguloInicial);
    const valor = norm360(arrasteRef.current.valorInicial + d);
    if (modo === "rumo" && !sensorOn) setSimulado(valor);
    else setLuneta(valor);
  };
  const aoSoltar = () => {
    // Explorar: qualquer arrasto já conta como exploração concluída.
    if (arrasteRef.current && modo === "explorar" && !sucessoDisparado.current) {
      sucessoDisparado.current = true;
      setSucesso(true);
      onSucesso?.();
    }
    arrasteRef.current = null;
  };

  // Teclado: ajuste fino do rumo/luneta.
  const aoTeclar = (e: React.KeyboardEvent) => {
    const passo = e.shiftKey ? 15 : 2;
    if (e.key === "ArrowLeft") {
      if (modo === "rumo" && !sensorOn) setSimulado((v) => norm360(v - passo));
      else setLuneta((v) => norm360(v + passo));
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      if (modo === "rumo" && !sensorOn) setSimulado((v) => norm360(v + passo));
      else setLuneta((v) => norm360(v - passo));
      e.preventDefault();
    }
  };

  // Em "rumo" com sensor: a CÁPSULA gira com o aparelho (agulha fixa no norte).
  const rotacaoCapsula = modo === "rumo" ? -(rumoOperador ?? 0) : luneta;
  const encaixada = modo === "marcacao" && alvoAtendido;

  return (
    <div className="flex flex-col items-center gap-3" data-test="rosa-tutorial">
      <div
        ref={svgRef}
        role="slider"
        tabIndex={0}
        aria-label={
          modo === "rumo"
            ? "Rumo do aparelho — ajuste com as setas"
            : "Luneta da bússola — ajuste com as setas"
        }
        aria-valuenow={Math.round(leitura ?? 0)}
        aria-valuemin={0}
        aria-valuemax={359}
        className="relative h-60 w-60 touch-none select-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-tactical-orange md:h-72 md:w-72"
        onPointerDown={aoApertar}
        onPointerMove={aoArrastar}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onKeyDown={aoTeclar}
      >
        <svg viewBox="0 0 240 240" className="h-full w-full">
          {/* Corpo */}
          <circle cx="120" cy="120" r="114" fill="oklch(0.16 0 0)" stroke="oklch(0.3 0.005 95)" />
          {/* Indicação de correção do exercício de rumo */}
          {modo === "rumo" && leitura != null && !sucesso && (
            <text x="120" y="240" textAnchor="middle" fontSize="0" fill="#FFC857">
              {delta180(rumoAlvo - leitura) > 0 ? "direita" : "esquerda"}
            </text>
          )}
          {/* Luneta + rosa (giram juntas) */}
          <g transform={`rotate(${rotacaoCapsula} 120 120)`}>
            <circle
              cx="120"
              cy="120"
              r="92"
              fill="oklch(0.2 0.005 95)"
              stroke="oklch(0.35 0.005 95)"
              strokeWidth="2"
            />
            {/* Ticks a cada 15° */}
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * 360) / 24;
              const principal = i % 3 === 0;
              return (
                <line
                  key={`tick-${i}`}
                  x1="120"
                  y1={principal ? "34" : "38"}
                  x2="120"
                  y2="46"
                  stroke={principal ? "oklch(0.75 0.01 95)" : "oklch(0.5 0.01 95)"}
                  strokeWidth={principal ? 2 : 1}
                  transform={`rotate(${a} 120 120)`}
                />
              );
            })}
            {/* Números a cada 45° */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <text
                key={`num-${a}`}
                x="120"
                y="64"
                textAnchor="middle"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fill="oklch(0.65 0.01 95)"
                transform={`rotate(${a} 120 120)`}
              >
                {a === 0 ? "360" : a}
              </text>
            ))}
            {/* Letras cardeais na rosa */}
            {[
              { r: "N", a: 0 },
              { r: "L", a: 90 },
              { r: "S", a: 180 },
              { r: "O", a: 270 },
            ].map(({ r, a }) => (
              <text
                key={r}
                x="120"
                y={a === 0 ? "26" : "80"}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
                fill={a === 0 ? "#FF6B35" : "oklch(0.8 0.01 95)"}
                transform={`rotate(${a} 120 120)`}
              >
                {r}
              </text>
            ))}
            {/* Seta de orientação da cápsula (encaixe da agulha) */}
            <polygon points="120,42 113,58 127,58" fill="#38BDF8" opacity={encaixada ? 1 : 0.85} />
            <rect x="117.5" y="182" width="5" height="14" fill="#38BDF8" opacity="0.85" rx="1" />
          </g>
          {/* Agulha: vermelha apontando o norte da tela, com pulso sutil. */}
          <g style={{ transformOrigin: "120px 120px" }}>
            <polygon points="120,44 112,120 128,120" fill="#E63946">
              <animate
                attributeName="opacity"
                values="1;0.85;1"
                dur="3s"
                repeatCount="indefinite"
              />
            </polygon>
            <polygon points="120,196 112,120 128,120" fill="oklch(0.85 0.01 95)" />
            <circle
              cx="120"
              cy="120"
              r="7"
              fill="oklch(0.25 0.01 95)"
              stroke="oklch(0.6 0.01 95)"
            />
          </g>
          {/* Índice (linha de leitura no topo) */}
          <polygon points="120,6 114,18 126,18" fill="#FF6B35" />
        </svg>

        {/* Leitura digital */}
        <div className="pointer-events-none absolute inset-x-0 -bottom-1 text-center">
          <span className="mono rounded bg-background/80 px-2 py-0.5 text-xs font-bold text-tactical-orange">
            {leitura == null ? "—" : `${Math.round(leitura).toString().padStart(3, "0")}°`}
            {modo === "rumo" ? "" : ` / alvo ${Math.round(rumoAlvo).toString().padStart(3, "0")}°`}
          </span>
        </div>
      </div>

      {/* Estado do exercício */}
      {modo === "rumo" && !sensorOn && (
        <button
          type="button"
          className="mono glove-tap flex items-center gap-1.5 rounded-md border border-tactical-orange/60 px-3 py-2 text-[10px] uppercase tracking-widest text-tactical-orange"
          onClick={() => void ativarSensorBussola()}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Ativar sensor do aparelho
        </button>
      )}
      {modo === "rumo" && sensorOn && rumoAparelho == null && (
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Aguardando leitura do sensor… mova o aparelho
        </p>
      )}
      {sucesso && (
        <p
          className="mono flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-tactical-green"
          data-test="tutorial-sucesso"
        >
          <CheckCircle2 className="h-4 w-4" /> Rumo encaixado — exercício concluído
        </p>
      )}
    </div>
  );
}
