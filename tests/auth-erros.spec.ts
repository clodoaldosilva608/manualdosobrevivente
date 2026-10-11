import { describe, expect, it } from "vitest";
import { mensagemAmigavelAuth } from "@/lib/auth-erros";

describe("mensagemAmigavelAuth", () => {
  it("traduz os padrões conhecidos do Supabase", () => {
    expect(mensagemAmigavelAuth("Rate limit exceeded. Try again in 60 seconds.")).toMatch(
      /Muitas tentativas/,
    );
    expect(mensagemAmigavelAuth("Invalid login credentials")).toMatch(/E-mail ou senha incorretos/);
    expect(mensagemAmigavelAuth("Email not confirmed")).toMatch(/Confirme seu e-mail/);
    expect(mensagemAmigavelAuth("User already registered")).toMatch(/já tem conta/);
    expect(mensagemAmigavelAuth("Password should be at least 6 characters")).toMatch(
      /6 caracteres/,
    );
    expect(mensagemAmigavelAuth("Unable to validate email address: invalid format")).toMatch(
      /E-mail inválido/,
    );
    expect(mensagemAmigavelAuth("Failed to fetch")).toMatch(/Sem conexão/);
    expect(mensagemAmigavelAuth("Signups not allowed for this instance")).toMatch(
      /Cadastro desativado/,
    );
  });

  it("devolve null para erros desconhecidos e vazios", () => {
    expect(mensagemAmigavelAuth("Erro exótico do provedor X")).toBeNull();
    expect(mensagemAmigavelAuth("")).toBeNull();
    expect(mensagemAmigavelAuth(undefined)).toBeNull();
    expect(mensagemAmigavelAuth(null)).toBeNull();
  });

  it("não confunde mensagem genérica com padrão de rede", () => {
    // "Database error saving new user" não casa com rede — mostra a original.
    expect(mensagemAmigavelAuth("Database error saving new user")).toBeNull();
  });
});
