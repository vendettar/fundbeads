import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { getLocalStorage } from "./browser-storage";
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
  language: string;
  theme: string;
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
};

export const messages: Record<Locale, Messages> = {
  en: {
    appName: "Fundbeads",
    title: "Image to Perler Bead Pattern",
    subtitle: "Convert a local JPG or PNG into a labeled MARD bead grid. Processing stays in your browser.",
    uploadImage: "Upload image",
    language: "Language",
    theme: "Theme",
    waitingForImage: "Waiting for image",
    processing: "Processing",
    unsupportedImage: "Upload a JPG or PNG image.",
    processFailed: "Could not process this image.",
    emptyTitle: "Upload an image to generate a bead chart",
    emptyBody: "The generated grid will include top, bottom, left, and right axes, per-cell MARD codes, and color counts.",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    summaryTitle: "Summary",
    patternSummary: "Pattern [{size}x{size} / {colors} Colors / Total {total} Beads]",
    headerStats: "{colors} Colors / Total {total} Beads",
    gridZoomStatus: "{size}x{size} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
  },
  "zh-Hans": {
    appName: "Fundbeads",
    title: "图片转拼豆图纸",
    subtitle: "把本地 JPG 或 PNG 转成带 MARD 编号的拼豆网格。所有处理都在浏览器本地完成。",
    uploadImage: "上传图片",
    language: "语言",
    theme: "主题",
    waitingForImage: "等待图片",
    processing: "处理中",
    unsupportedImage: "请上传 JPG 或 PNG 图片。",
    processFailed: "无法处理这张图片。",
    emptyTitle: "上传图片以生成拼豆图纸",
    emptyBody: "生成的网格会包含上下左右坐标轴、每格 MARD 编号和颜色用量统计。",
    zoomOut: "缩小",
    zoomIn: "放大",
    summaryTitle: "统计",
    patternSummary: "图纸 [{size}x{size} / {colors} 色 / 共 {total} 颗]",
    headerStats: "{colors} 色 / 共 {total} 颗",
    gridZoomStatus: "{size}x{size} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
  },
  "zh-Hant": {
    appName: "Fundbeads",
    title: "圖片轉拼豆圖紙",
    subtitle: "把本機 JPG 或 PNG 轉成帶 MARD 編號的拼豆網格。所有處理都在瀏覽器本機完成。",
    uploadImage: "上傳圖片",
    language: "語言",
    theme: "主題",
    waitingForImage: "等待圖片",
    processing: "處理中",
    unsupportedImage: "請上傳 JPG 或 PNG 圖片。",
    processFailed: "無法處理這張圖片。",
    emptyTitle: "上傳圖片以產生拼豆圖紙",
    emptyBody: "產生的網格會包含上下左右座標軸、每格 MARD 編號和顏色用量統計。",
    zoomOut: "縮小",
    zoomIn: "放大",
    summaryTitle: "統計",
    patternSummary: "圖紙 [{size}x{size} / {colors} 色 / 共 {total} 顆]",
    headerStats: "{colors} 色 / 共 {total} 顆",
    gridZoomStatus: "{size}x{size} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
  },
  ja: {
    appName: "Fundbeads",
    title: "画像からアイロンビーズ図案へ",
    subtitle: "ローカルの JPG または PNG を、MARD コード付きのビーズグリッドに変換します。処理はブラウザー内で完結します。",
    uploadImage: "画像をアップロード",
    language: "言語",
    theme: "テーマ",
    waitingForImage: "画像待ち",
    processing: "処理中",
    unsupportedImage: "JPG または PNG 画像をアップロードしてください。",
    processFailed: "この画像を処理できませんでした。",
    emptyTitle: "画像をアップロードしてビーズ図案を作成",
    emptyBody: "生成されるグリッドには上下左右の座標、各セルの MARD コード、色別の個数が含まれます。",
    zoomOut: "縮小",
    zoomIn: "拡大",
    summaryTitle: "集計",
    patternSummary: "図案 [{size}x{size} / {colors} 色 / 合計 {total} 個]",
    headerStats: "{colors} 色 / 合計 {total} 個",
    gridZoomStatus: "{size}x{size} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
  },
  ko: {
    appName: "Fundbeads",
    title: "이미지를 펄러비즈 패턴으로 변환",
    subtitle: "로컬 JPG 또는 PNG를 MARD 코드가 표시된 비즈 그리드로 변환합니다. 모든 처리는 브라우저에서만 이루어집니다.",
    uploadImage: "이미지 업로드",
    language: "언어",
    theme: "테마",
    waitingForImage: "이미지 대기 중",
    processing: "처리 중",
    unsupportedImage: "JPG 또는 PNG 이미지를 업로드하세요.",
    processFailed: "이 이미지를 처리할 수 없습니다.",
    emptyTitle: "이미지를 업로드해 비즈 도안을 생성하세요",
    emptyBody: "생성된 그리드에는 상하좌우 좌표, 셀별 MARD 코드, 색상별 개수가 포함됩니다.",
    zoomOut: "축소",
    zoomIn: "확대",
    summaryTitle: "요약",
    patternSummary: "패턴 [{size}x{size} / {colors}색 / 총 {total}개]",
    headerStats: "{colors}색 / 총 {total}개",
    gridZoomStatus: "{size}x{size} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
  },
  es: {
    appName: "Fundbeads",
    title: "Imagen a patrón de Perler Beads",
    subtitle: "Convierte un JPG o PNG local en una cuadrícula de cuentas con códigos MARD. Todo se procesa en tu navegador.",
    uploadImage: "Subir imagen",
    language: "Idioma",
    theme: "Tema",
    waitingForImage: "Esperando imagen",
    processing: "Procesando",
    unsupportedImage: "Sube una imagen JPG o PNG.",
    processFailed: "No se pudo procesar esta imagen.",
    emptyTitle: "Sube una imagen para generar un patrón",
    emptyBody: "La cuadrícula generada incluirá ejes en los cuatro lados, códigos MARD por celda y conteos por color.",
    zoomOut: "Alejar",
    zoomIn: "Acercar",
    summaryTitle: "Resumen",
    patternSummary: "Patrón [{size}x{size} / {colors} colores / Total {total} cuentas]",
    headerStats: "{colors} colores / Total {total} cuentas",
    gridZoomStatus: "{size}x{size} / {zoom}",
    cellTitle: "{x},{y}: {code} {label}",
  },
};

export const paletteLabels: Record<Locale, Record<string, string>> = {
  en: {},
  "zh-Hans": {
    A1: "白色",
    A2: "奶油色",
    A5: "棕褐色",
    B1: "黑色",
    B4: "炭灰色",
    C2: "樱桃红",
    C5: "珊瑚色",
    D1: "南瓜橙",
    D4: "金菊黄",
    E2: "柠檬黄",
    F1: "薄荷绿",
    F4: "凯利绿",
    G2: "青绿色",
    G6: "水蓝色",
    H1: "天蓝色",
    H7: "宝蓝色",
    H14: "海军蓝",
    J2: "薰衣草紫",
    J6: "紫色",
    K1: "泡泡糖粉",
    K4: "洋红色",
    L2: "巧克力色",
    L7: "铁锈色",
    M1: "浅灰色",
    M4: "石板灰",
    N2: "桃色",
    N6: "沙色",
    P3: "橄榄绿",
  },
  "zh-Hant": {
    A1: "白色",
    A2: "奶油色",
    A5: "棕褐色",
    B1: "黑色",
    B4: "炭灰色",
    C2: "櫻桃紅",
    C5: "珊瑚色",
    D1: "南瓜橙",
    D4: "金菊黃",
    E2: "檸檬黃",
    F1: "薄荷綠",
    F4: "凱利綠",
    G2: "青綠色",
    G6: "水藍色",
    H1: "天藍色",
    H7: "寶藍色",
    H14: "海軍藍",
    J2: "薰衣草紫",
    J6: "紫色",
    K1: "泡泡糖粉",
    K4: "洋紅色",
    L2: "巧克力色",
    L7: "鐵鏽色",
    M1: "淺灰色",
    M4: "石板灰",
    N2: "桃色",
    N6: "沙色",
    P3: "橄欖綠",
  },
  ja: {
    A1: "ホワイト",
    A2: "クリーム",
    A5: "タン",
    B1: "ブラック",
    B4: "チャコール",
    C2: "チェリーレッド",
    C5: "コーラル",
    D1: "パンプキン",
    D4: "ゴールデンロッド",
    E2: "レモン",
    F1: "ミント",
    F4: "ケリーグリーン",
    G2: "ティール",
    G6: "アクア",
    H1: "スカイブルー",
    H7: "ロイヤルブルー",
    H14: "ネイビー",
    J2: "ラベンダー",
    J6: "パープル",
    K1: "バブルガム",
    K4: "マゼンタ",
    L2: "チョコレート",
    L7: "ラスト",
    M1: "ライトグレー",
    M4: "スレート",
    N2: "ピーチ",
    N6: "サンド",
    P3: "オリーブ",
  },
  ko: {
    A1: "화이트",
    A2: "크림",
    A5: "탄",
    B1: "블랙",
    B4: "차콜",
    C2: "체리 레드",
    C5: "코랄",
    D1: "펌킨",
    D4: "골든로드",
    E2: "레몬",
    F1: "민트",
    F4: "켈리 그린",
    G2: "틸",
    G6: "아쿠아",
    H1: "스카이 블루",
    H7: "로열 블루",
    H14: "네이비",
    J2: "라벤더",
    J6: "퍼플",
    K1: "버블검",
    K4: "마젠타",
    L2: "초콜릿",
    L7: "러스트",
    M1: "라이트 그레이",
    M4: "슬레이트",
    N2: "피치",
    N6: "샌드",
    P3: "올리브",
  },
  es: {
    A1: "Blanco",
    A2: "Crema",
    A5: "Canela",
    B1: "Negro",
    B4: "Carbón",
    C2: "Rojo cereza",
    C5: "Coral",
    D1: "Calabaza",
    D4: "Dorado",
    E2: "Limón",
    F1: "Menta",
    F4: "Verde intenso",
    G2: "Verde azulado",
    G6: "Aguamarina",
    H1: "Azul cielo",
    H7: "Azul real",
    H14: "Azul marino",
    J2: "Lavanda",
    J6: "Morado",
    K1: "Rosa chicle",
    K4: "Magenta",
    L2: "Chocolate",
    L7: "Óxido",
    M1: "Gris claro",
    M4: "Pizarra",
    N2: "Melocotón",
    N6: "Arena",
    P3: "Oliva",
  },
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

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: string) => void;
  t: (key: keyof Messages, params?: MessageParams) => string;
  formatNumber: (value: number) => string;
  paletteLabel: (color: BeadColor) => string;
  themeLabel: (theme: ThemeId) => string;
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
