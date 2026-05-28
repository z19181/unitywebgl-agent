import { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Screenshot helper for PartyGameSDK runtime tests.
 */

export class ScreenshotHelper {
  private page: Page;
  private artifactDir: string;

  constructor(page: Page, artifactDir = 'artifacts') {
    this.page = page;
    this.artifactDir = artifactDir;
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
  }

  /**
   * Screenshot the Unity canvas element.
   */
  async captureCanvas(name: string): Promise<string> {
    const canvas = this.page.locator('#unity-canvas');
    const filepath = path.join(this.artifactDir, `${name}.png`);
    await canvas.screenshot({ path: filepath });
    return filepath;
  }

  /**
   * Screenshot the full page.
   */
  async captureFullPage(name: string): Promise<string> {
    const filepath = path.join(this.artifactDir, `${name}.png`);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  /**
   * Screenshot a specific element.
   */
  async captureElement(selector: string, name: string): Promise<string> {
    const el = this.page.locator(selector);
    const filepath = path.join(this.artifactDir, `${name}.png`);
    await el.screenshot({ path: filepath });
    return filepath;
  }

  /**
   * Check if a screenshot is mostly black (indicates rendering failure).
   * Crude heuristic: sample a few pixels from center.
   */
  async isMostlyBlack(filepath: string): Promise<boolean> {
    // Use page evaluate to check canvas pixels
    const result = await this.page.evaluate(() => {
      const canvas = document.querySelector('#unity-canvas') as HTMLCanvasElement;
      if (!canvas) return true; // No canvas = black
      const ctx = canvas.getContext('2d');
      if (!ctx) return true;
      // Sample center 4x4 pixels
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(w / 2 - 2, h / 2 - 2, 4, 4).data;
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += data[i] + data[i + 1] + data[i + 2];
      }
      const avgBrightness = totalBrightness / (16 * 3); // 16 pixels, 3 channels
      return avgBrightness < 10; // Very dark = effectively black
    });
    return result;
  }
}
