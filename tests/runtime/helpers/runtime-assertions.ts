import { Page, expect } from '@playwright/test';

/**
 * Runtime assertion helpers for PartyGameSDK.
 */

/**
 * Assert that the Unity runtime is ready on the page.
 */
export async function assertRuntimeReady(page: Page, timeoutMs = 60000): Promise<void> {
  await page.waitForFunction(
    () => (window as any).__PARTYGAME_RUNTIME_READY__ === true,
    { timeout: timeoutMs }
  );
}

/**
 * Assert that the Unity canvas exists and is visible.
 */
export async function assertCanvasVisible(page: Page): Promise<void> {
  const canvas = page.locator('#unity-canvas');
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await expect(canvas).toHaveAttribute('width');
  await expect(canvas).toHaveAttribute('height');
}

/**
 * Assert that the loading bar has been hidden (Unity loaded).
 */
export async function assertUnityLoaded(page: Page, timeoutMs = 60000): Promise<void> {
  await page.waitForFunction(
    () => {
      const bar = document.querySelector('#unity-loading-bar') as HTMLElement;
      return bar && (bar.style.display === 'none' || bar.offsetParent === null);
    },
    { timeout: timeoutMs }
  );
}

/**
 * Assert no console errors of forbidden types.
 */
export async function assertNoConsoleErrors(
  page: Page,
  forbiddenPatterns: RegExp[] = [
    /Shader not supported/,
    /failed to compile shader/,
    /GL_INVALID_OPERATION/,
    /WebGL: INVALID_VALUE/,
    /MissingReferenceException/,
    /NullReferenceException/,
    /Uncaught/,
  ]
): Promise<void> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  // Wait for runtime to settle
  await page.waitForTimeout(5000);

  for (const err of errors) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(err)) {
        throw new Error(`Forbidden console error detected: ${err}`);
      }
    }
  }
}

/**
 * Assert that PartyGameSDK last state contains expected data.
 */
export async function assertLastState(
  page: Page,
  expectedType: string,
  timeoutMs = 15000
): Promise<void> {
  await page.waitForFunction(
    (type: string) => {
      const s = (window as any).__PARTYGAME_LAST_STATE__;
      return s && s.type === type;
    },
    expectedType,
    { timeout: timeoutMs }
  );
}

/**
 * Assert that the canvas is NOT black (has rendered content).
 */
export async function assertCanvasNotBlack(page: Page): Promise<void> {
  const isBlack = await page.evaluate(() => {
    const canvas = document.querySelector('#unity-canvas') as HTMLCanvasElement;
    if (!canvas) return true;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return true;
    const data = ctx.getImageData(
      Math.floor(w / 2 - 2),
      Math.floor(h / 2 - 2),
      4,
      4
    ).data;
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += data[i] + data[i + 1] + data[i + 2];
    }
    return totalBrightness / (16 * 3) < 10;
  });

  if (isBlack) {
    throw new Error('Unity canvas is rendering black — screen is not painting content');
  }
}
