import { test, expect } from '@playwright/test';

/**
 * Controller Input Test
 *
 * Verifies input event flow from controller to Unity.
 * Tests each supported input type for correct propagation.
 */

test.describe('Controller Input', () => {
  test('INPUT-001 — charge_start propagates to Unity', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#unity-canvas', { timeout: 30000 });

    // Simulate charge_start input
    const propagated = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let inputReceived = false;
        const checkInterval = setInterval(() => {
          const input = (window as any).__PARTYGAME_LAST_INPUT__;
          if (input && input.type === 'input.charge_start') {
            inputReceived = true;
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 200);

        if ((window as any).unityInstance) {
          (window as any).unityInstance.SendMessage(
            'PartyGameBridge', 'OnGameMessage',
            JSON.stringify({
              type: 'game_message',
              data: { type: 'input.charge_start', playerIndex: 0 },
            })
          );
        }

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(inputReceived);
        }, 10000);
      });
    });

    expect(propagated).toBe(true);
  });

  test('INPUT-002 — charge_end propagates to Unity', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#unity-canvas', { timeout: 30000 });

    const propagated = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let inputReceived = false;
        const checkInterval = setInterval(() => {
          const input = (window as any).__PARTYGAME_LAST_INPUT__;
          if (input && input.type === 'input.charge_end') {
            inputReceived = true;
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 200);

        if ((window as any).unityInstance) {
          (window as any).unityInstance.SendMessage(
            'PartyGameBridge', 'OnGameMessage',
            JSON.stringify({
              type: 'game_message',
              data: { type: 'input.charge_end', playerIndex: 0 },
            })
          );
        }

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(inputReceived);
        }, 10000);
      });
    });

    expect(propagated).toBe(true);
  });

  test('INPUT-003 — tap input propagates to Unity', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#unity-canvas', { timeout: 30000 });

    const propagated = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let inputReceived = false;
        const checkInterval = setInterval(() => {
          const input = (window as any).__PARTYGAME_LAST_INPUT__;
          if (input && input.type === 'input.tap') {
            inputReceived = true;
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 200);

        if ((window as any).unityInstance) {
          (window as any).unityInstance.SendMessage(
            'PartyGameBridge', 'OnGameMessage',
            JSON.stringify({
              type: 'game_message',
              data: { type: 'input.tap', playerIndex: 0 },
            })
          );
        }

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(inputReceived);
        }, 10000);
      });
    });

    expect(propagated).toBe(true);
  });

  test('INPUT-004 — move input propagates to Unity', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#unity-canvas', { timeout: 30000 });

    const propagated = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let inputReceived = false;
        const checkInterval = setInterval(() => {
          const input = (window as any).__PARTYGAME_LAST_INPUT__;
          if (input && input.type === 'input.move') {
            inputReceived = true;
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 200);

        if ((window as any).unityInstance) {
          (window as any).unityInstance.SendMessage(
            'PartyGameBridge', 'OnGameMessage',
            JSON.stringify({
              type: 'game_message',
              data: {
                type: 'input.move',
                playerIndex: 0,
                x: 0.5,
                y: 0.3,
              },
            })
          );
        }

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(inputReceived);
        }, 10000);
      });
    });

    expect(propagated).toBe(true);
  });
});
