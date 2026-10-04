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
    // A linha vertical da cruz tem largura zero (box vazia) — presença no DOM
    // é a asserção correta, não a visibilidade do Playwright.
    await page.waitForFunction(
      () => document.querySelectorAll('svg line[stroke="#8ecae6"]').length >= 2,
      null,
      { timeout: 10_000 },
    );
    expect(await page.locator('svg line[stroke="#8ecae6"]').count()).toBeGreaterThanOrEqual(2);

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

/** Normaliza o bearing do mapa exposto para testes (0..359). */
async function bearingAtual(page: Page): Promise<number> {
  return page.evaluate(() => {
    const m = (window as unknown as { __tacticalMap?: { getBearing(): number } }).__tacticalMap;
    return m ? ((m.getBearing() % 360) + 360) % 360 : -1;
  });
}

async function esperarBearing(page: Page, alvo: number, timeout = 10_000) {
  await page.waitForFunction(
    (a) => {
      const m = (window as unknown as { __tacticalMap?: { getBearing(): number } }).__tacticalMap;
      if (!m) return false;
      const b = ((m.getBearing() % 360) + 360) % 360;
      return Math.abs(b - a) < 0.5 || Math.abs(b - a) > 359.5;
    },
    alvo,
    { timeout },
  );
}

async function centroAtual(page: Page): Promise<{ lat: number; lng: number } | null> {
  return page.evaluate(() => {
    const m = (
      window as unknown as { __tacticalMap?: { getCenter(): { lat: number; lng: number } } }
    ).__tacticalMap;
    return m ? m.getCenter() : null;
  });
}

describe("bússola tática — mapa gira junto e trava em coordenadas digitadas", () => {
  it("a rotação do mapa segue o rumo do sensor e desliga quando o switch desliga", async () => {
    const page = await abrirMapaMobile(browser);

    // Sensor ativo na miniatura antes de abrir o painel.
    const sensor = page.locator('[data-test="bussola-sensor"]');
    await sensor.waitFor({ state: "visible", timeout: 10_000 });
    await sensor.click();
    await page.locator('[data-test="bussola-sensor-on"]').waitFor({ state: "visible" });

    // Abre o painel e liga a rotação do mapa.
    await page.locator('[aria-label="Abrir bússola"]').click();
    const rotacao = page.locator('[data-test="mapa-rotacao"]');
    await rotacao.waitFor({ state: "visible", timeout: 10_000 });
    await rotacao.click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-test="mapa-rotacao"]')?.getAttribute("data-state") ===
        "checked",
      null,
      { timeout: 5_000 },
    );

    // alpha 90 → rumo 270 → o mapa gira para o bearing 270.
    await page.evaluate(() =>
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", { alpha: 90, beta: 0, gamma: 0 }),
      ),
    );
    await esperarBearing(page, 270);

    // alpha 180 → rumo 180 → bearing 180.
    await page.evaluate(() =>
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", { alpha: 180, beta: 0, gamma: 0 }),
      ),
    );
    await esperarBearing(page, 180);

    // Desliga o switch: o bearing para de seguir o sensor.
    await rotacao.click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-test="mapa-rotacao"]')?.getAttribute("data-state") ===
        "unchecked",
      null,
      { timeout: 5_000 },
    );
    await page.evaluate(() =>
      window.dispatchEvent(
        new DeviceOrientationEvent("deviceorientation", { alpha: 45, beta: 0, gamma: 0 }),
      ),
    );
    await page.waitForTimeout(800);
    const b = await bearingAtual(page);
    expect(Math.abs(b - 180)).toBeLessThan(1);
    await page.context().close();
  }, 180_000);

  it("trava o mapa nas coordenadas digitadas e o destrava (inclusive após reload)", async () => {
    const page = await abrirMapaMobile(browser);
    await page.locator('[aria-label="Abrir bússola"]').click();

    // Digita as coordenadas e trava.
    const lat = page.locator('[data-test="mapa-lat"]');
    await lat.waitFor({ state: "visible", timeout: 10_000 });
    await lat.fill("-15.79");
    await page.locator('[data-test="mapa-lng"]').fill("-47.88");
    await page.locator('[data-test="mapa-travar"]').click();

    // Seção MAPA mostra o ponto travado e o mapa voa até ele.
    await page
      .locator('[data-test="mapa-travado-valores"]')
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForFunction(
      (t) => {
        const m = (
          window as unknown as {
            __tacticalMap?: { getCenter(): { lat: number; lng: number } };
          }
        ).__tacticalMap;
        if (!m) return false;
        const c = m.getCenter();
        return Math.abs(c.lat - t.lat) < 1e-4 && Math.abs(c.lng - t.lng) < 1e-4;
      },
      { lat: -15.79, lng: -47.88 },
      { timeout: 15_000 },
    );

    // Arrasto fica desativado e o centro não sai do lugar.
    const dragPanOff = await page.evaluate(
      () =>
        !(
          window as unknown as { __tacticalMap?: { dragPan: { isEnabled(): boolean } } }
        ).__tacticalMap?.dragPan.isEnabled(),
    );
    expect(dragPanOff).toBe(true);
    const caixa = await page.locator(".maplibregl-canvas").boundingBox();
    if (caixa) {
      await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
      await page.mouse.down();
      await page.mouse.move(caixa.x + caixa.width / 2 + 120, caixa.y + caixa.height / 2 + 60, {
        steps: 5,
      });
      await page.mouse.up();
    }
    await page.waitForTimeout(800);
    const parado = await centroAtual(page);
    expect(
      parado && Math.abs(parado.lat + 15.79) < 1e-4 && Math.abs(parado.lng + 47.88) < 1e-4,
    ).toBe(true);

    // Persistida: após reload a trava volta e o mapa re-centra no ponto.
    // O modo miniatura é forçado para o chip flutuante ser a única saída estável
    // (sem a corrida do localStorage restaurando o painel depois da hidratação).
    await page.evaluate(() => localStorage.setItem("tgis:compass-mode", "mini"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-test="mapa-travado"]').waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForFunction(
      (t) => {
        const m = (
          window as unknown as {
            __tacticalMap?: { getCenter(): { lat: number; lng: number } };
          }
        ).__tacticalMap;
        if (!m) return false;
        const c = m.getCenter();
        return Math.abs(c.lat - t.lat) < 1e-4 && Math.abs(c.lng - t.lng) < 1e-4;
      },
      { lat: -15.79, lng: -47.88 },
      { timeout: 15_000 },
    );

    // Destravar pelo chip: arrasto volta a funcionar.
    await page.locator('[data-test="mapa-travado"]').click();
    await page.locator('[data-test="mapa-travado"]').waitFor({ state: "hidden", timeout: 5_000 });
    const dragPanOn = await page.evaluate(
      () =>
        !!(
          window as unknown as { __tacticalMap?: { dragPan: { isEnabled(): boolean } } }
        ).__tacticalMap?.dragPan.isEnabled(),
    );
    expect(dragPanOn).toBe(true);
    await page.context().close();
  }, 180_000);

  it("o chip da posição travada não cobre a miniatura nem a navegação", async () => {
    const page = await abrirMapaMobile(browser);
    await page.locator('[aria-label="Abrir bússola"]').click();
    const lat = page.locator('[data-test="mapa-lat"]');
    await lat.waitFor({ state: "visible", timeout: 10_000 });
    await lat.fill("-15.79");
    await page.locator('[data-test="mapa-lng"]').fill("-47.88");
    await page.locator('[data-test="mapa-travar"]').click();

    // Minimiza a bússola: o chip flutuante assume (única saída no modo mini).
    await page.getByRole("button", { name: "Minimizar bússola" }).click();
    await page.locator('[aria-label="Abrir bússola"]').waitFor({ state: "visible" });
    await page.locator('[data-test="mapa-travado"]').waitFor({ state: "visible", timeout: 5_000 });

    const caixa = (loc: ReturnType<Page["locator"]>) =>
      loc.boundingBox() as Promise<{
        x: number;
        y: number;
        width: number;
        height: number;
      } | null>;
    const chip = await caixa(page.locator('[data-test="mapa-travado"]'));
    const mini = await caixa(page.locator('[aria-label="Abrir bússola"]'));
    const nav = await caixa(page.locator("nav"));
    expect(chip && mini && nav).toBeTruthy();
    if (chip && mini && nav) {
      const sobrepoe = (
        a: { x: number; y: number; width: number; height: number },
        b: { x: number; y: number; width: number; height: number },
      ) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(sobrepoe(chip, mini)).toBe(false);
      expect(sobrepoe(chip, nav)).toBe(false);
    }

    // Tocar no chip destrava (arrasto volta a funcionar).
    await page.locator('[data-test="mapa-travado"]').click();
    await page.locator('[data-test="mapa-travado"]').waitFor({ state: "hidden", timeout: 5_000 });
    const dragPanOn = await page.evaluate(
      () =>
        !!(
          window as unknown as { __tacticalMap?: { dragPan: { isEnabled(): boolean } } }
        ).__tacticalMap?.dragPan.isEnabled(),
    );
    expect(dragPanOn).toBe(true);
    await page.context().close();
  }, 180_000);
});
