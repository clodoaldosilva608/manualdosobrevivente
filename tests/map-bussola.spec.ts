import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium" });
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

/** Abre o mapa em celular e dispensa o onboarding se ele aparecer. */
async function abrirMapaMobile(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
  const pular = page.getByRole("button", { name: "Pular configuração" });
  const apareceu = await pular
    .waitFor({ state: "visible", timeout: 6_000 })
    .then(() => true)
    .catch(() => false);
  if (apareceu) {
    await pular.click();
    await pular.waitFor({ state: "hidden" });
  }
  // Acomoda a hidratação e a resolução do GPS inicial antes das interações.
  await page.waitForTimeout(2_000);
  return page;
}

describe("bússola tática — miniatura funciona como a completa e mostra os astros", () => {
  it("a configuração de norte é a mesma na miniatura e na bússola completa", async () => {
    const page = await abrirMapaMobile(browser);
    const mini = page.locator('[aria-label="Abrir bússola"]');
    await mini.waitFor({ state: "visible", timeout: 10_000 });

    // Chip VERD/MAG direto na miniatura (padrão: norte verdadeiro).
    const chip = page.locator('[data-test="bussola-mag"]');
    await chip.waitFor({ state: "visible" });
    expect((await chip.textContent())?.trim()).toBe("VERD");

    // Tocar no chip alterna o norte SEM abrir a bússola completa.
    await chip.click();
    await page
      .getByRole("button", { name: "Minimizar bússola" })
      .waitFor({ state: "hidden", timeout: 5_000 });
    expect((await chip.textContent())?.trim()).toBe("MAG");

    // Abrir a bússola completa: a mesma configuração (MAG) aparece no botão central.
    await mini.click();
    const minimizar = page.getByRole("button", { name: "Minimizar bússola" });
    await minimizar.waitFor({ state: "visible", timeout: 10_000 });
    const centro = page.locator('button[title^="Tocar: alinhar ao norte"]');
    await centro.waitFor({ state: "visible" });
    expect((await centro.textContent())?.trim()).toBe("MAG");

    // Voltar para a miniatura: configuração preservada entre remontagens.
    await minimizar.click();
    await chip.waitFor({ state: "visible" });
    expect((await chip.textContent())?.trim()).toBe("MAG");

    // Persistida no aparelho: sobrevive ao recarregamento (a preferência
    // hidrata do IndexedDB — esperar o valor persistido aparecer).
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-test="bussola-mag"]', { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelector('[data-test="bussola-mag"]')?.textContent?.trim() === "MAG",
      { timeout: 15_000 },
    );
    await page.context().close();
  }, 180_000);

  it("mostra o ponto atual do Sol, da Lua e do Cruzeiro do Sul", async () => {
    const page = await abrirMapaMobile(browser);
    const mini = page.locator('[aria-label="Abrir bússola"]');
    await mini.waitFor({ state: "visible", timeout: 10_000 });

    // Na miniatura: o Cruzeiro do Sul é desenhado como uma cruz (duas linhas
    // azuis no hemisfério sul) na posição real do momento.
    const cruz = page.locator('svg line[stroke="#8ecae6"]');
    await cruz.first().waitFor({ state: "visible" });
    expect(await cruz.count()).toBeGreaterThanOrEqual(2);

    // O resumo no título da miniatura traz os três azimutes atuais.
    const titulo = await page
      .locator('[aria-label="Abrir bússola"] div[title^="Sol"]')
      .getAttribute("title");
    expect(titulo).toContain("Sol");
    expect(titulo).toContain("Lua");
    expect(titulo).toContain("Cruzeiro do Sul");

    // Na bússola completa: célula dedicada com azimute e altura do Cruzeiro.
    await mini.click();
    await page
      .getByText("Cruzeiro do Sul", { exact: true })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.context().close();
  }, 180_000);

  it("o sensor do aparelho ativado na miniatura vale para a bússola completa", async () => {
    const page = await abrirMapaMobile(browser);

    // Ativa o sensor direto na miniatura (desktop concede sem diálogo).
    const sensor = page.locator('[data-test="bussola-sensor"]');
    await sensor.waitFor({ state: "visible", timeout: 10_000 });
    await sensor.click();
    const sen = page.locator('[data-test="bussola-sensor-on"]');
    await sen.waitFor({ state: "visible" });
    expect((await sen.textContent())?.trim()).toBe("SEN");

    // Na bússola completa o botão de ativação NÃO aparece (já está ativo).
    await page.locator('[aria-label="Abrir bússola"]').click();
    await page
      .getByRole("button", { name: "Minimizar bússola" })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText("Usar sensor do aparelho").waitFor({ state: "hidden", timeout: 5_000 });
    await page.context().close();
  }, 180_000);

  it("a miniatura acompanha o sensor antes e depois de minimizar", async () => {
    const page = await abrirMapaMobile(browser);
    const sensor = page.locator('[data-test="bussola-sensor"]');
    await sensor.waitFor({ state: "visible", timeout: 10_000 });
    await sensor.click();
    await page.locator('[data-test="bussola-sensor-on"]').waitFor({ state: "visible" });

    // Antes de minimizar: leitura de orientação sintética muda a miniatura
    // (alpha 90 → rumo 270).
    await page.evaluate(() =>
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", { alpha: 90, beta: 0, gamma: 0 }),
      ),
    );
    await page.waitForFunction(
      () =>
        (
          document.querySelector('[aria-label="Abrir bússola"] [data-test="bussola-leitura"]')
            ?.textContent ?? ""
        ).includes("270"),
      null,
      { timeout: 10_000 },
    );

    // Abre a bússola completa e minimiza de volta para a miniatura.
    await page.locator('[aria-label="Abrir bússola"]').click();
    const minimizar = page.getByRole("button", { name: "Minimizar bússola" });
    await minimizar.waitFor({ state: "visible", timeout: 10_000 });
    await minimizar.click();
    await page
      .locator('[aria-label="Abrir bússola"] [data-test="bussola-leitura"]')
      .waitFor({ state: "visible", timeout: 10_000 });

    // Depois de minimizar: continua acompanhando o sensor (alpha 180 → 180).
    await page.evaluate(() =>
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", { alpha: 180, beta: 0, gamma: 0 }),
      ),
    );
    await page.waitForFunction(
      () =>
        (
          document.querySelector('[aria-label="Abrir bússola"] [data-test="bussola-leitura"]')
            ?.textContent ?? ""
        ).includes("180"),
      null,
      { timeout: 10_000 },
    );
    await page.context().close();
  }, 180_000);

  it("acompanha o sensor mesmo com movimento reduzido (acessibilidade)", async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
    const pular = page.getByRole("button", { name: "Pular configuração" });
    const apareceu = await pular
      .waitFor({ state: "visible", timeout: 6_000 })
      .then(() => true)
      .catch(() => false);
    if (apareceu) {
      await pular.click();
      await pular.waitFor({ state: "hidden" });
    }
    const sensor = page.locator('[data-test="bussola-sensor"]');
    await sensor.waitFor({ state: "visible", timeout: 10_000 });
    await sensor.click();
    await page.locator('[data-test="bussola-sensor-on"]').waitFor({ state: "visible" });

    // Sem laço de animação, a leitura ainda segue o sensor (instantânea).
    await page.evaluate(() =>
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", { alpha: 90, beta: 0, gamma: 0 }),
      ),
    );
    await page.waitForFunction(
      () =>
        (
          document.querySelector('[aria-label="Abrir bússola"] [data-test="bussola-leitura"]')
            ?.textContent ?? ""
        ).includes("270"),
      null,
      { timeout: 10_000 },
    );
    await context.close();
  }, 180_000);
});
