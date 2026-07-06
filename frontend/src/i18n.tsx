import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { getLocalStorage } from "./browser-storage";
import type { InterfaceStyleId } from "./interface-style";
import type { BeadColor } from "./palette";
import type { ThemeId } from "./themes";

export const localeStorageKey = "fundbeads.locale";

export const locales = [
  { id: "en", label: "English", shortLabel: "EN", htmlLang: "en" },
  { id: "zh-Hans", label: "简体中文", shortLabel: "简", htmlLang: "zh-Hans" },
  { id: "zh-Hant", label: "繁體中文", shortLabel: "繁", htmlLang: "zh-Hant" },
  { id: "ja", label: "日本語", shortLabel: "日", htmlLang: "ja" },
  { id: "ko", label: "한국어", shortLabel: "한", htmlLang: "ko" },
  { id: "es", label: "Español", shortLabel: "ES", htmlLang: "es" },
] as const;

export type Locale = (typeof locales)[number]["id"];

export const defaultLocale: Locale = "en";

type MessageParams = Record<string, string | number>;

type Messages = {
  appName: string;
  title: string;
  subtitle: string;
  uploadImage: string;
  gridSize: string;
  patternLongestEdge: string;
  outputDimensions: string;
  decreasePatternLongestEdge: string;
  increasePatternLongestEdge: string;
  language: string;
  theme: string;
  interfaceStyle: string;
  waitingForImage: string;
  processing: string;
  unsupportedImage: string;
  processFailed: string;
  emptyTitle: string;
  emptyBody: string;
  zoomOut: string;
  zoomIn: string;
  summaryTitle: string;
  patternSummary: string;
  headerStats: string;
  gridZoomStatus: string;
  cellTitle: string;
  dropzoneTitle: string;
  dropzoneBody: string;
  dropzoneHint: string;
  originalPreviewTitle: string;
  originalPreviewAlt: string;
  mardPaletteTitle: string;
  mardPaletteSummary: string;
  paletteFamilyTitle: string;
};

export const messages: Record<Locale, Messages> = {
  en: {
    appName: "Fundbeads",
    title: "Image to Perler Bead Pattern",
    subtitle: "Convert a local JPG or PNG into a labeled MARD bead grid. Processing stays in your browser.",
    uploadImage: "Upload image",
    gridSize: "Pattern size",
    patternLongestEdge: "Longest edge",
    outputDimensions: "Output size",
    decreasePatternLongestEdge: "Decrease longest edge",
    increasePatternLongestEdge: "Increase longest edge",
    language: "Language",
    theme: "Theme",
    interfaceStyle: "Interface",
    waitingForImage: "Waiting for image",
    processing: "Processing",
    unsupportedImage: "Upload a JPG or PNG image.",
    processFailed: "Could not process this image.",
    emptyTitle: "Upload an image to generate a bead chart",
    emptyBody: "The generated grid will include top, bottom, left, and right axes, per-cell MARD codes, and color counts.",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    summaryTitle: "Summary",
    patternSummary: "Pattern [{width}x{height} / {colors} Colors / Total {total} Beads]",
    headerStats: "{colors} Colors / Total {total} Beads",
    gridZoomStatus: "{width}x{height} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "Drop an image here",
    dropzoneBody: "Click or drag a local JPG/PNG into this workspace to generate a bead pattern. The image stays in your browser.",
    dropzoneHint: "JPG / PNG",
    originalPreviewTitle: "Original",
    originalPreviewAlt: "Original image preview for {fileName}",
    mardPaletteTitle: "MARD 221 Palette",
    mardPaletteSummary: "{colors} colors across {families} families",
    paletteFamilyTitle: "{family} family / {count} colors",
  },
  "zh-Hans": {
    appName: "Fundbeads",
    title: "图片转拼豆图纸",
    subtitle: "把本地 JPG 或 PNG 转成带 MARD 编号的拼豆网格。所有处理都在浏览器本地完成。",
    uploadImage: "上传图片",
    gridSize: "图纸尺寸",
    patternLongestEdge: "图纸最长边",
    outputDimensions: "输出尺寸",
    decreasePatternLongestEdge: "减少图纸最长边",
    increasePatternLongestEdge: "增加图纸最长边",
    language: "语言",
    theme: "主题",
    interfaceStyle: "界面",
    waitingForImage: "等待图片",
    processing: "处理中",
    unsupportedImage: "请上传 JPG 或 PNG 图片。",
    processFailed: "无法处理这张图片。",
    emptyTitle: "上传图片以生成拼豆图纸",
    emptyBody: "生成的网格会包含上下左右坐标轴、每格 MARD 编号和颜色用量统计。",
    zoomOut: "缩小",
    zoomIn: "放大",
    summaryTitle: "统计",
    patternSummary: "图纸 [{width}x{height} / {colors} 色 / 共 {total} 颗]",
    headerStats: "{colors} 色 / 共 {total} 颗",
    gridZoomStatus: "{width}x{height} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "把图片拖到这里",
    dropzoneBody: "点击或拖入本地 JPG/PNG 图片以生成拼豆图纸。图片只会在浏览器本地处理。",
    dropzoneHint: "JPG / PNG",
    originalPreviewTitle: "原图",
    originalPreviewAlt: "{fileName} 的原图预览",
    mardPaletteTitle: "MARD 221 色卡",
    mardPaletteSummary: "{families} 个色系，共 {colors} 色",
    paletteFamilyTitle: "{family} 色系 / {count} 色",
  },
  "zh-Hant": {
    appName: "Fundbeads",
    title: "圖片轉拼豆圖紙",
    subtitle: "把本機 JPG 或 PNG 轉成帶 MARD 編號的拼豆網格。所有處理都在瀏覽器本機完成。",
    uploadImage: "上傳圖片",
    gridSize: "圖紙尺寸",
    patternLongestEdge: "圖紙最長邊",
    outputDimensions: "輸出尺寸",
    decreasePatternLongestEdge: "減少圖紙最長邊",
    increasePatternLongestEdge: "增加圖紙最長邊",
    language: "語言",
    theme: "主題",
    interfaceStyle: "介面",
    waitingForImage: "等待圖片",
    processing: "處理中",
    unsupportedImage: "請上傳 JPG 或 PNG 圖片。",
    processFailed: "無法處理這張圖片。",
    emptyTitle: "上傳圖片以產生拼豆圖紙",
    emptyBody: "產生的網格會包含上下左右座標軸、每格 MARD 編號和顏色用量統計。",
    zoomOut: "縮小",
    zoomIn: "放大",
    summaryTitle: "統計",
    patternSummary: "圖紙 [{width}x{height} / {colors} 色 / 共 {total} 顆]",
    headerStats: "{colors} 色 / 共 {total} 顆",
    gridZoomStatus: "{width}x{height} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "把圖片拖到這裡",
    dropzoneBody: "點擊或拖入本機 JPG/PNG 圖片以產生拼豆圖紙。圖片只會在瀏覽器本機處理。",
    dropzoneHint: "JPG / PNG",
    originalPreviewTitle: "原圖",
    originalPreviewAlt: "{fileName} 的原圖預覽",
    mardPaletteTitle: "MARD 221 色卡",
    mardPaletteSummary: "{families} 個色系，共 {colors} 色",
    paletteFamilyTitle: "{family} 色系 / {count} 色",
  },
  ja: {
    appName: "Fundbeads",
    title: "画像からアイロンビーズ図案へ",
    subtitle: "ローカルの JPG または PNG を、MARD コード付きのビーズグリッドに変換します。処理はブラウザー内で完結します。",
    uploadImage: "画像をアップロード",
    gridSize: "図案サイズ",
    patternLongestEdge: "図案の最長辺",
    outputDimensions: "出力サイズ",
    decreasePatternLongestEdge: "図案の最長辺を減らす",
    increasePatternLongestEdge: "図案の最長辺を増やす",
    language: "言語",
    theme: "テーマ",
    interfaceStyle: "表示",
    waitingForImage: "画像待ち",
    processing: "処理中",
    unsupportedImage: "JPG または PNG 画像をアップロードしてください。",
    processFailed: "この画像を処理できませんでした。",
    emptyTitle: "画像をアップロードしてビーズ図案を作成",
    emptyBody: "生成されるグリッドには上下左右の座標、各セルの MARD コード、色別の個数が含まれます。",
    zoomOut: "縮小",
    zoomIn: "拡大",
    summaryTitle: "集計",
    patternSummary: "図案 [{width}x{height} / {colors} 色 / 合計 {total} 個]",
    headerStats: "{colors} 色 / 合計 {total} 個",
    gridZoomStatus: "{width}x{height} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "ここに画像をドロップ",
    dropzoneBody: "ローカルの JPG/PNG をクリックまたはドラッグして、ビーズ図案を生成します。画像はブラウザー内で処理されます。",
    dropzoneHint: "JPG / PNG",
    originalPreviewTitle: "元画像",
    originalPreviewAlt: "{fileName} の元画像プレビュー",
    mardPaletteTitle: "MARD 221 パレット",
    mardPaletteSummary: "{families} 系統 / {colors} 色",
    paletteFamilyTitle: "{family} 系統 / {count} 色",
  },
  ko: {
    appName: "Fundbeads",
    title: "이미지를 펄러비즈 패턴으로 변환",
    subtitle: "로컬 JPG 또는 PNG를 MARD 코드가 표시된 비즈 그리드로 변환합니다. 모든 처리는 브라우저에서만 이루어집니다.",
    uploadImage: "이미지 업로드",
    gridSize: "패턴 크기",
    patternLongestEdge: "패턴 최장변",
    outputDimensions: "출력 크기",
    decreasePatternLongestEdge: "패턴 최장변 줄이기",
    increasePatternLongestEdge: "패턴 최장변 늘리기",
    language: "언어",
    theme: "테마",
    interfaceStyle: "인터페이스",
    waitingForImage: "이미지 대기 중",
    processing: "처리 중",
    unsupportedImage: "JPG 또는 PNG 이미지를 업로드하세요.",
    processFailed: "이 이미지를 처리할 수 없습니다.",
    emptyTitle: "이미지를 업로드해 비즈 도안을 생성하세요",
    emptyBody: "생성된 그리드에는 상하좌우 좌표, 셀별 MARD 코드, 색상별 개수가 포함됩니다.",
    zoomOut: "축소",
    zoomIn: "확대",
    summaryTitle: "요약",
    patternSummary: "패턴 [{width}x{height} / {colors}색 / 총 {total}개]",
    headerStats: "{colors}색 / 총 {total}개",
    gridZoomStatus: "{width}x{height} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "이미지를 여기에 놓으세요",
    dropzoneBody: "로컬 JPG/PNG를 클릭하거나 끌어와 비즈 도안을 생성합니다. 이미지는 브라우저에서만 처리됩니다.",
    dropzoneHint: "JPG / PNG",
    originalPreviewTitle: "원본",
    originalPreviewAlt: "{fileName} 원본 이미지 미리보기",
    mardPaletteTitle: "MARD 221 팔레트",
    mardPaletteSummary: "{families}개 계열 / {colors}색",
    paletteFamilyTitle: "{family} 계열 / {count}색",
  },
  es: {
    appName: "Fundbeads",
    title: "Imagen a patrón de Perler Beads",
    subtitle: "Convierte un JPG o PNG local en una cuadrícula de cuentas con códigos MARD. Todo se procesa en tu navegador.",
    uploadImage: "Subir imagen",
    gridSize: "Tamaño del patrón",
    patternLongestEdge: "Lado más largo",
    outputDimensions: "Tamaño de salida",
    decreasePatternLongestEdge: "Reducir lado más largo",
    increasePatternLongestEdge: "Aumentar lado más largo",
    language: "Idioma",
    theme: "Tema",
    interfaceStyle: "Interfaz",
    waitingForImage: "Esperando imagen",
    processing: "Procesando",
    unsupportedImage: "Sube una imagen JPG o PNG.",
    processFailed: "No se pudo procesar esta imagen.",
    emptyTitle: "Sube una imagen para generar un patrón",
    emptyBody: "La cuadrícula generada incluirá ejes en los cuatro lados, códigos MARD por celda y conteos por color.",
    zoomOut: "Alejar",
    zoomIn: "Acercar",
    summaryTitle: "Resumen",
    patternSummary: "Patrón [{width}x{height} / {colors} colores / Total {total} cuentas]",
    headerStats: "{colors} colores / Total {total} cuentas",
    gridZoomStatus: "{width}x{height} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "Arrastra una imagen aquí",
    dropzoneBody: "Haz clic o arrastra un JPG/PNG local al espacio de trabajo para generar un patrón. La imagen se procesa en tu navegador.",
    dropzoneHint: "JPG / PNG",
    originalPreviewTitle: "Original",
    originalPreviewAlt: "Vista previa original de {fileName}",
    mardPaletteTitle: "Paleta MARD 221",
    mardPaletteSummary: "{colors} colores en {families} familias",
    paletteFamilyTitle: "Familia {family} / {count} colores",
  },
};

export const paletteLabels: Record<Locale, Record<string, string>> = {
  en: {},
  "zh-Hans": {},
  "zh-Hant": {},
  ja: {},
  ko: {},
  es: {},
};

export const themeLabels: Record<Locale, Record<ThemeId, string>> = {
  en: {
    classic: "Classic",
    midnight: "Midnight",
    ocean: "Ocean",
    candy: "Candy",
    mono: "Mono",
  },
  "zh-Hans": {
    classic: "经典",
    midnight: "午夜",
    ocean: "海洋",
    candy: "糖果",
    mono: "单色",
  },
  "zh-Hant": {
    classic: "經典",
    midnight: "午夜",
    ocean: "海洋",
    candy: "糖果",
    mono: "單色",
  },
  ja: {
    classic: "クラシック",
    midnight: "ミッドナイト",
    ocean: "オーシャン",
    candy: "キャンディ",
    mono: "モノクロ",
  },
  ko: {
    classic: "클래식",
    midnight: "미드나이트",
    ocean: "오션",
    candy: "캔디",
    mono: "모노",
  },
  es: {
    classic: "Clásico",
    midnight: "Medianoche",
    ocean: "Océano",
    candy: "Dulce",
    mono: "Monocromo",
  },
};

export const interfaceStyleLabels: Record<Locale, Record<InterfaceStyleId, string>> = {
  en: {
    modern: "Modern",
    pixel: "Pixel",
  },
  "zh-Hans": {
    modern: "现代",
    pixel: "像素",
  },
  "zh-Hant": {
    modern: "現代",
    pixel: "像素",
  },
  ja: {
    modern: "モダン",
    pixel: "ピクセル",
  },
  ko: {
    modern: "모던",
    pixel: "픽셀",
  },
  es: {
    modern: "Moderno",
    pixel: "Píxel",
  },
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: string) => void;
  t: (key: keyof Messages, params?: MessageParams) => string;
  formatNumber: (value: number) => string;
  paletteLabel: (color: BeadColor) => string;
  themeLabel: (theme: ThemeId) => string;
  interfaceStyleLabel: (style: InterfaceStyleId) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-sg" || normalized.startsWith("zh-hans")) {
    return "zh-Hans";
  }
  if (normalized === "zh-tw" || normalized === "zh-hk" || normalized === "zh-mo" || normalized.startsWith("zh-hant")) {
    return "zh-Hant";
  }
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }
  if (normalized === "ja" || normalized.startsWith("ja-")) {
    return "ja";
  }
  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko";
  }
  if (normalized === "es" || normalized.startsWith("es-")) {
    return "es";
  }

  return null;
}

export function resolveLocale(storedLocale: string | null | undefined, browserLocales: readonly string[]): Locale {
  const stored = normalizeLocale(storedLocale);
  if (stored) {
    return stored;
  }

  for (const browserLocale of browserLocales) {
    const matched = normalizeLocale(browserLocale);
    if (matched) {
      return matched;
    }
  }

  return defaultLocale;
}

export function translate(locale: Locale, key: keyof Messages, params: MessageParams = {}): string {
  const template = messages[locale][key] ?? messages[defaultLocale][key];
  return template.replaceAll(/\{(\w+)\}/g, (_, paramName: string) => String(params[paramName] ?? `{${paramName}}`));
}

export function getPaletteLabel(locale: Locale, color: BeadColor): string {
  return paletteLabels[locale][color.code] ?? color.label;
}

export function getThemeLabel(locale: Locale, theme: ThemeId): string {
  return themeLabels[locale][theme] ?? themeLabels[defaultLocale][theme];
}

export function getInterfaceStyleLabel(locale: Locale, style: InterfaceStyleId): string {
  return interfaceStyleLabels[locale][style] ?? interfaceStyleLabels[defaultLocale][style];
}

export function readStoredLocale(storage: Storage | undefined): string | null {
  try {
    return storage?.getItem(localeStorageKey) ?? null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(storage: Storage | undefined, locale: Locale) {
  try {
    storage?.setItem(localeStorageKey, locale);
  } catch {
    // Preference persistence is optional; the app should continue if storage is unavailable.
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const browserLocales = typeof navigator === "undefined" ? [] : navigator.languages;
    return resolveLocale(readStoredLocale(getLocalStorage()), browserLocales);
  });

  const value = useMemo<I18nContextValue>(() => {
    const formatter = new Intl.NumberFormat(locale);

    return {
      locale,
      setLocale: (nextLocale) => {
        const normalizedLocale = normalizeLocale(nextLocale);
        if (!normalizedLocale) {
          return;
        }
        setLocaleState(normalizedLocale);
        writeStoredLocale(getLocalStorage(), normalizedLocale);
      },
      t: (key, params) => translate(locale, key, params),
      formatNumber: (number) => formatter.format(number),
      paletteLabel: (color) => getPaletteLabel(locale, color),
      themeLabel: (nextTheme) => getThemeLabel(locale, nextTheme),
      interfaceStyleLabel: (style) => getInterfaceStyleLabel(locale, style),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}
