import assert from 'node:assert/strict';
import test from 'node:test';
import { THEME_PALETTES, ThemePalette } from '../src/context/ThemeContext';

function relativeLuminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)?.map((value) => Number.parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Expected a six-digit hex colour, received ${hex}.`);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function assertContrast(name: string, foreground: string, background: string, minimum = 4.5): void {
  assert.ok(contrast(foreground, background) >= minimum, `${name} must meet ${minimum}:1 contrast; received ${contrast(foreground, background).toFixed(2)}:1.`);
}

test('every theme palette keeps standard foreground roles readable on shared surfaces', () => {
  Object.entries(THEME_PALETTES).forEach(([name, palette]) => {
    const value: ThemePalette = palette;
    [value.canvas, value.surface, value.inset, value.raised].forEach((surface, index) => {
      assertContrast(`${name} text on surface ${index + 1}`, value.text, surface);
      assertContrast(`${name} muted text on surface ${index + 1}`, value.muted, surface);
    });
    assertContrast(`${name} primary text on surface`, value.primary, value.surface);
    assertContrast(`${name} secondary text on surface`, value.secondary, value.surface);
    assertContrast(`${name} success text on surface`, value.success, value.surface);
    assertContrast(`${name} warning text on surface`, value.warning, value.surface);
    assertContrast(`${name} danger text on surface`, value.danger, value.surface);
    assertContrast(`${name} warm emphasis text on surface`, value.warmText, value.surface);
    assertContrast(`${name} warm emphasis foreground`, value.warmForeground, value.warm);
  });
});
