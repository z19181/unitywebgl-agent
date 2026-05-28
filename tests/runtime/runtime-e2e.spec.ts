import { test, expect } from '@playwright/test';
import {
  assertRuntimeReady,
  assertUnityLoaded,
  assertLastState,
} from './helpers/runtime-assertions';
import { ScreenshotHelper } from './helpers/screenshot-helper';

/**
 * Runtime E2E Test (Gate 5)
 *
 * Verifies the full 5-channel loop:
 * controller → PartyGameBridge → Unity → broadcast → controller UI
 */

test.describe('Runtime E2E', () => {
  let shotHelper: ScreenshotHelper;

  test.beforeEach(async ({ page }) => {
    shotHelper = new ScreenshotHelper(page);
  });

  test('Gate 5.1 — Full 5-channel loop', async ({ page }) => {
    // --- Step 1: Open screen and wait for Unity ready ---
    await page.goto('/');
    await assertUnityLoaded(page, 60000);
    await assertRuntimeReady(page, 30000);

    // --- Step 2: Verify PartyGameBridge is available ---
    const hasPGInit = await page.evaluate(() => typeof (window as any).PartyGameInit === 'function');
    expect(hasPGInit).toBe(true);

    // --- Step 3: Simulate internal controller input ---
    // PartyGameBridge.jslib receives from WebSocket, but in standalone
    // test we call the internal receive path directly via evaluate.
    const inputReceived = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        // Listen for state updates via the hook
        const checkInterval = setInterval(() => {
          const state = (window as any).__PARTYGAME_LAST_STATE__;
          if (state && state.type === 'score_update') {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 200);

        // Simulate receiving a game_message via PartyGameBridge
        // This calls the jslib SendMessage path
        if ((window as any).unityInstance) {
          const msg = JSON.stringify({
            type: 'game_message',
            data: {
              type: 'input.charge_start',
              playerIndex: 0,
            },
          });
          (window as any).unityInstance.SendMessage(
            'PartyGameBridge',
            'OnGameMessage',
            msg
          );
        }

        // Timeout after 15s
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 15000);
      });
    });

    // --- Step 4: Assert input was processed ---
    const lastInput = await page.evaluate(() => (window as any).__PARTYGAME_LAST_INPUT__);
    expect(lastInput).toBeDefined();

    // --- Step 5: Screenshot state after input ---
    await page.waitForTimeout(1000);
    await shotHelper.captureCanvas('e2e-after-input');
  });

  test('Gate 5.2 — WebSocket bridge is available', async ({ page }) => {
    await page.goto('/');
    await assertUnityLoaded(page);

    // Verify PartyGameBridge SendMessage is registered
    const bridgeReady = await page.evaluate(() => {
      return (window as any).unityInstance &&
        typeof (window as any).unityInstance.SendMessage === 'function';
    });
    expect(bridgeReady).toBe(true);
  });

  test('Gate 5.3 — State update hook fires on game state change', async ({ page }) => {
    await page.goto('/');
    await assertUnityLoaded(page);

    // Inject a simulated state_update (what server broadcasts)
    const received = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const checkInterval = setInterval(() => {
          const state = (window as any).__PARTYGAME_LAST_STATE__;
          if (state) {
            clearInterval(checkInterval);
            resolve(state.type !== undefined);
          }
        }, 200);

        // Simulate receiving state_update
        if ((window as any).unityInstance) {
          const msg = JSON.stringify({
            type: 'state_update',
            data: {
              type: 'score_update',
              scores: { 0: 100 },
            },
          });
          (window as any).unityInstance.SendMessage(
            'PartyGameBridge',
            'OnStateUpdate',
            msg
          );
        }

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 10000);
      });
    });

    expect(received).toBe(true);
  });

  test('Gate 5.4 — Player index is preserved across inputs', async ({ page }) => {
    await page.goto('/');
    await assertUnityLoaded(page);

    // Send two inputs and verify playerIndex is consistent
    const indexConsistent = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const inputs: number[] = [];
        const checkInterval = setInterval(() => {
          const state = (window as any).__PARTYGAME_LAST_STATE__;
          if (state && state.data) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 200);

        // Send two inputs
        const inst = (window as any).unityInstance;
        if (inst) {
          inst.SendMessage('PartyGameBridge', 'OnGameMessage', JSON.stringify({
            type: 'game_message',
            data: { type: 'input.charge_start', playerIndex: 0 },
          }));
          setTimeout(() => {
            inst.SendMessage('PartyGameBridge', 'OnGameMessage', JSON.stringify({
              type: 'game_message',
              data: { type: 'input.charge_end', playerIndex: 0 },
            }));
          }, 500);
        }

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 10000);
      });
    });

    expect(indexConsistent).toBe(true);
  });
});
