import type { SVGProps } from "react";

/**
 * Logos oficiais das redes e serviços usados no compartilhamento.
 *
 * Os caminhos vêm do simple-icons (glyphs vetoriais oficiais) e as cores são
 * as de marca de cada rede, para identificação instantânea no escuro:
 *  - WhatsApp  #25D366 (verde oficial)
 *  - Telegram  gradiente oficial #2AABEE → #229ED9
 *  - Facebook  #0866FF (azul oficial)
 *  - X         quadrado preto com glifo branco (aparição oficial em tema escuro)
 *  - Google Maps    pin com as 4 cores oficiais do Google (#4285F4/#EA4335/#FBBC04/#34A853)
 *  - Obsidian  gema roxa com gradiente da marca
 *  - SMS       bolha verde (verde de mensagens #34C759)
 *  - E-mail    envelope vermelho (#EA4335)
 */

export type IconeProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function IconeWhatsApp(props: IconeProps) {
  return (
    <Svg fill="#25D366" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </Svg>
  );
}

export function IconeTelegram(props: IconeProps) {
  return (
    <Svg {...props}>
      <defs>
        <linearGradient id="grad-telegram" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2AABEE" />
          <stop offset="1" stopColor="#229ED9" />
        </linearGradient>
      </defs>
      <path
        fill="url(#grad-telegram)"
        d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
      />
    </Svg>
  );
}

export function IconeFacebook(props: IconeProps) {
  return (
    <Svg fill="#0866FF" {...props}>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </Svg>
  );
}

export function IconeX(props: IconeProps) {
  return (
    <Svg {...props}>
      <rect width="24" height="24" rx="5.4" fill="#000000" />
      <path
        fill="#FFFFFF"
        transform="translate(4.5 4.5) scale(0.625)"
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
      />
    </Svg>
  );
}

/**
 * Pin do Google Maps com as quatro cores oficiais do Google:
 * azul (#4285F4) na parte superior esquerda, vermelho (#EA4335) na superior
 * direita, amarelo (#FBBC04) na inferior esquerda e verde (#34A853) na inferior
 * direita, convergindo na ponta — como no ícone oficial do aplicativo.
 */
export function IconeGoogleMaps(props: IconeProps) {
  return (
    <Svg {...props}>
      <path fill="#4285F4" d="M12 3 A6.5 6.5 0 0 0 5.5 9.5 L12 9.5 Z" />
      <path fill="#EA4335" d="M12 3 A6.5 6.5 0 0 1 18.5 9.5 L12 9.5 Z" />
      <path fill="#FBBC04" d="M5.5 9.5 A6.5 6.5 0 0 0 6.448 12.88 L12 22 L12 9.5 Z" />
      <path fill="#34A853" d="M18.5 9.5 A6.5 6.5 0 0 1 17.552 12.88 L12 22 L12 9.5 Z" />
    </Svg>
  );
}

export function IconeObsidian(props: IconeProps) {
  return (
    <Svg {...props}>
      <defs>
        <linearGradient id="grad-obsidian" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A48AF0" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path
        fill="url(#grad-obsidian)"
        d="M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5zM8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531zM5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831zM9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z"
      />
    </Svg>
  );
}

/** Bolha de mensagem verde — leitura imediata de "SMS/mensagens". */
export function IconeSms(props: IconeProps) {
  return (
    <Svg fill="#34C759" {...props}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </Svg>
  );
}

/** Envelope vermelho — leitura imediata de "e-mail". */
export function IconeEmail(props: IconeProps) {
  return (
    <Svg fill="#EA4335" {...props}>
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
    </Svg>
  );
}
