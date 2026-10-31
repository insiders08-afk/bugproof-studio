import { z } from "zod";

export const BrowserAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), text: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal("fill"), label: z.string().trim().min(1).max(200), text: z.string().max(2000) }),
  z.object({ type: z.literal("press"), key: z.enum(["Enter", "Tab", "Escape", "ArrowDown", "ArrowUp"]) }),
  z.object({ type: z.literal("scroll"), direction: z.enum(["up", "down"]) }),
  z.object({ type: z.literal("wait"), milliseconds: z.number().int().min(250).max(5000) }),
]);
export type Action = z.infer<typeof BrowserAction>;
export const Decision = z.object({
  done: z.boolean(), reason: z.string().max(1000), action: BrowserAction.nullable(),
  expectedTexts: z.array(z.string().trim().min(1).max(200)).max(5),
});
export const PlanSchema = z.object({
  steps: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
  expectedTexts: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
  forbiddenTexts: z.array(z.string().trim().min(1).max(200)).max(5),
});

const literalRegex = (text: string) => `new RegExp(${JSON.stringify(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))}, "i")`;
export function actionCode(action: Action): string {
  if (action.type === "click") return `{
    const matches = page.getByText(${literalRegex(action.text)}, { exact: true });
    const visible = [];
    for (let i = 0; i < await matches.count(); i++) if (await matches.nth(i).isVisible()) visible.push(matches.nth(i));
    if (visible.length !== 1) throw new Error("Expected one visible target: " + ${JSON.stringify(action.text)} + "; found " + visible.length);
    await visible[0].click({ timeout: 12000 });
  }`;
  if (action.type === "fill") return `await page.getByLabel(${literalRegex(action.label)}, { exact: true }).fill(${JSON.stringify(action.text)}, { timeout: 12000 });`;
  if (action.type === "press") return `await page.keyboard.press(${JSON.stringify(action.key)});`;
  if (action.type === "scroll") return `await page.mouse.wheel(0, ${action.direction === "down" ? 650 : -650});`;
  return `await page.waitForTimeout(${action.milliseconds});`;
}

// Scroll only the viewport to trigger lazy photos, then restore it. Do not wait on
// networkidle: analytics and realtime connections can keep it busy indefinitely.
export const settleCode = `
await page.waitForTimeout(1200);
await page.evaluate(async () => {
  const start = scrollY;
  const limit = Math.min(document.documentElement.scrollHeight, innerHeight * 4);
  for (let y = 0; y < limit; y += innerHeight) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
  scrollTo(0, start);
  document.querySelectorAll('img').forEach(img => { if (img.getBoundingClientRect().top < innerHeight && img.getBoundingClientRect().bottom > 0) img.loading = 'eager'; });
});
await page.waitForFunction(() => {
  const imgs = [...document.images].filter(img => { const r = img.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0; });
  return imgs.every(img => img.complete);
}, null, { timeout: 12000 }).catch(() => {});
await page.evaluate(async () => {
  await Promise.race([Promise.all([...document.images].filter(i => i.complete && i.naturalWidth > 0).map(i => i.decode().catch(() => {}))), new Promise(r => setTimeout(r, 2000))]);
});
`;

export const observationCode = `${settleCode}
const observation = await page.evaluate(() => {
  const images = [...document.images].filter(img => { const r = img.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0; });
  return {
    text: document.body.innerText.slice(0, 16000),
    images: { total: images.length, loaded: images.filter(i => i.complete && i.naturalWidth > 0).length, pending: images.filter(i => !i.complete).length, broken: images.filter(i => i.complete && i.naturalWidth === 0).length },
    controls: [...document.querySelectorAll('button, a, input, textarea, [role="button"]')].filter(el => el.getBoundingClientRect().width > 0).map(el => ({ text: el.textContent?.trim().slice(0, 180), label: el.getAttribute('aria-label') || el.getAttribute('placeholder') })).slice(0, 80)
  };
});
console.log("RG_OBSERVATION:" + JSON.stringify({ ...observation, statusCode: navigationStatus, url: page.url(), title: await page.title(), screenshot: "data:image/jpeg;base64," + (await page.screenshot({ type: "jpeg", quality: 65, fullPage: false })).toString("base64"), actionError }));
`;

export function recipe(url: string, actions: Action[], expectedTexts: string[]) {
  return `import { test, expect } from "@playwright/test";

test("verified website flow", async ({ page }) => {
  const response = await page.goto(${JSON.stringify(url)}, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);
  ${settleCode}
  ${actions.map(a => `${actionCode(a)}\n${settleCode}`).join("\n")}
  ${expectedTexts.map(t => `await expect(page.getByText(${literalRegex(t)}).first()).toBeVisible();`).join("\n  ")}
});`;
}