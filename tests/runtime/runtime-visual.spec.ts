import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './helpers/screenshot-helper';
import {
  assertCanvasVisible,
  assertUnityLoaded,
  assertRuntimeReady,
  assertNoConsoleErrors,
  assertCanvasNotBlack,
} from './helpers/runtime-assertions';

/**
 * Runtime Visual Test (Gate 4)
 *
 * Verifies:
 * - Unity canvas renders
 * - No black screen
 * - Runtime hooks available
 * - No console errors
 * - Screenshot captured
 */

test.describe('Runtime Visual', () => {
  let shotHelper: ScreenshotHelper;

  test.beforeEach(async ({ page }) => {
    shotHelper = new ScreenshotHelper(page);
  });

  test('Gate 4.1 — Canvas renders and is not black', async ({ page }) => {
    // Navigate to screen
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify canvas element exists and is visible
    await assertCanvasVisible(page);
    await shotHelper.captureCanvas('canvas-initial');

    // Wait for Unity to finish loading
    await assertUnityLoaded(page);

    // Extra wait for first frame to render
    await page.waitForTimeout(2000);

    // Screenshot the fully loaded canvas
    await shotHelper.captureCanvas('canvas-loaded');
    await shotHelper.captureFullPage('screen-fullpage');

    // Assert canvas is not black
    await assertCanvasNotBlack(page);
  });

  test('Gate 4.2 — Runtime hooks available', async ({ page }) => {
    await page.goto('/');
    
    // Wait for runtime ready hook
    await assertRuntimeReady(page, 60000);

    // Verify hook values
    const ready = await page.evaluate(() => (window as any).__PARTYGAME_RUNTIME_READY__);
    expect(ready).toBe(true);

    // Verify PartyGameBridge is loaded
    const hasPartyGame = await page.evaluate(() => {
      return typeof (window as any).PartyGameInit === 'function';
    });
    expect(hasPartyGame).toBe(true);
  });

  test('Gate 4.3 — No console errors', async ({ page }) => {
    await page.goto('/');
    await assertUnityLoaded(page);
    await assertNoConsoleErrors(page);
  });

  test('Gate 4.4 — DOM integrity at runtime', async ({ page }) => {
    await page.goto('/');

    // Check partygame-template.js loaded
    const hasPGScript = await page.evaluate(() => {
      return !!document.querySelector('script[src*="partygame-template.js"]');
    });
    expect(hasPGScript).toBe(true);

    // Check WebGL loader loaded
    const hasLoader = await page.evaluate(() => {
      return !!document.querySelector('script[src*=".loader.js"]');
    });
    expect(hasLoader).toBe(true);

    // Check pg-overlay exists (PartyGameSDK UI bar)
    const hasOverlay = await page.evaluate(() => {
      return !!document.querySelector('#pg-overlay');
    });
    expect(hasOverlay).toBe(true);
  });
});
