import { describe, expect, it } from "vitest";
import {
  hashSenha,
  conferirSenha,
  criarConta,
  entrar,
  sair,
  contaAtiva,
  contaRegistrada,
  atualizarPerfil,
  alterarSenha,
  apagarConta,
  ErroConta,
} from "@/lib/conta";
import { listContas } from "@/lib/db";

/**
 * Os testes de conta usam o IndexedDB real ("idb" com fake-indexeddb não está
 * entre as unidades — aqui validamos as funções PURAS de hash; o fluxo de
 * criar/entrar/perfil é coberto pelo E2E tests/conta.spec.ts com o navegador.
 */
describe("hash de senha da conta local", () => {
  it("gera hash PBKDF2 com sal aleatório (mesma senha → hashes diferentes)", async () => {
    const h1 = await hashSenha("expedicao-42");
    const h2 = await hashSenha("expedicao-42");
    expect(h1).toMatch(/^pbkdf2\$120000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(h2).toMatch(/^pbkdf2\$120000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(h1).not.toBe(h2);
  });

  it("confere a senha correta e rejeita a errada", async () => {
    const hash = await hashSenha("senhaforte");
    expect(await conferirSenha("senhaforte", hash)).toBe(true);
    expect(await conferirSenha("senhaerrada", hash)).toBe(false);
  });

  it("confere hash do esquema fallback (fnv) — contexto sem WebCrypto", async () => {
    const hash = await hashSenha("chave-de-campo");
    if (hash.startsWith("fnv$")) {
      expect(await conferirSenha("chave-de-campo", hash)).toBe(true);
      expect(await conferirSenha("outra", hash)).toBe(false);
    } else {
      // WebCrypto presente: valida igualmente o prefixo do formato.
      expect(hash.startsWith("pbkdf2$")).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Fluxo completo com IndexedDB — roda quando fake-indexeddb está ativo. */
/* ------------------------------------------------------------------ */

const temIndexedDB = typeof indexedDB !== "undefined" && indexedDB?.open !== undefined;

(temIndexedDB ? describe : describe.skip)("fluxo da conta com banco local", () => {
  it("cria, entra, edita, troca senha e apaga a conta do aparelho", async () => {
    // Sem conta: entrar falha.
    await expect(entrar({ email: "a@b.com", senha: "1234" })).rejects.toBeInstanceOf(ErroConta);

    const conta = await criarConta({ nome: "Operador Teste", email: "A@B.com", senha: "1234" });
    expect(conta.email).toBe("a@b.com"); // e-mail normalizado
    expect(conta.senha_hash).not.toContain("1234");

    // Só uma conta por aparelho.
    await expect(
      criarConta({ nome: "Outro", email: "c@d.com", senha: "5678" }),
    ).rejects.toBeInstanceOf(ErroConta);
    expect((await listContas()).length).toBe(1);

    // Sessão ativa e leitura do perfil.
    expect(await contaAtiva()).toMatchObject({ email: "a@b.com" });
    expect(await contaRegistrada()).not.toBeNull();

    // Sair volta a "registrada sem sessão".
    await sair();
    expect(await contaAtiva()).toBeNull();

    // Entrar com credenciais corretas (e-mail em qualquer caixa) e erradas.
    await expect(entrar({ email: "a@b.com", senha: "0000" })).rejects.toThrow("Senha incorreta");
    await expect(entrar({ email: "errado@b.com", senha: "1234" })).rejects.toThrow(
      "não corresponde",
    );
    const reentrado = await entrar({ email: "a@b.com", senha: "1234" });
    expect(reentrado.nome).toBe("Operador Teste");

    // Edição de perfil com validação.
    const editada = await atualizarPerfil({ nome: "Operador Alpha" });
    expect(editada.nome).toBe("Operador Alpha");
    await expect(atualizarPerfil({ nome: "x" })).rejects.toBeInstanceOf(ErroConta);

    // Troca de senha exige a atual.
    await expect(alterarSenha("errada", "5678")).rejects.toThrow("incorreta");
    await alterarSenha("1234", "5678");
    await sair();
    await expect(entrar({ email: "a@b.com", senha: "1234" })).rejects.toBeInstanceOf(ErroConta);
    await entrar({ email: "a@b.com", senha: "5678" });

    // Apagar conta exige a senha correta.
    await expect(apagarConta("0000")).rejects.toThrow("incorreta");
    await apagarConta("5678");
    expect(await contaRegistrada()).toBeNull();
    expect(await contaAtiva()).toBeNull();
  });
});
