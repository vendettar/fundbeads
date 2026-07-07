import type { BeadColor, MardPaletteGroup } from "./palette";
import type { ColorUsage } from "./pattern-model";

export type PatternReplaceColorGroup = {
  family: string;
  colors: BeadColor[];
};

export function getPatternReplaceSourceColors(sourceUsage: readonly ColorUsage[], pinnedColorCode?: string | null) {
  const availableUsage = pinnedColorCode ? sourceUsage.filter(({ color }) => color.code === pinnedColorCode) : sourceUsage;
  return availableUsage.map(({ color }) => color);
}

export function getPatternReplaceTargetColors(palette: readonly BeadColor[], sourceColorCode: string | null | undefined) {
  return sourceColorCode ? palette.filter((color) => color.code !== sourceColorCode) : [...palette];
}

export function getValidPatternReplaceTargetCode(palette: readonly BeadColor[], sourceColorCode: string | null | undefined, targetColorCode: string) {
  const targetColors = getPatternReplaceTargetColors(palette, sourceColorCode);
  return targetColors.some((color) => color.code === targetColorCode) ? targetColorCode : (targetColors[0]?.code ?? targetColorCode);
}

export function getPatternReplaceColorGroups(colors: readonly BeadColor[], paletteGroups: readonly MardPaletteGroup[]): PatternReplaceColorGroup[] {
  const colorsByFamily = new Map<string, BeadColor[]>();

  for (const color of colors) {
    const family = getMardFamilyFromCode(color.code);
    const familyColors = colorsByFamily.get(family);
    if (familyColors) {
      familyColors.push(color);
    } else {
      colorsByFamily.set(family, [color]);
    }
  }

  return paletteGroups.flatMap((group) => {
    const familyColors = colorsByFamily.get(group.prefix) ?? [];
    return familyColors.length > 0 ? [{ family: group.prefix, colors: familyColors }] : [];
  });
}

function getMardFamilyFromCode(colorCode: string) {
  return colorCode.match(/^[A-Z]+/)?.[0] ?? colorCode;
}
