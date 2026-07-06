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
  subtitle: string;
  uploadImage: string;
  gridSize: string;
  patternLongestEdge: string;
  decreasePatternLongestEdge: string;
  increasePatternLongestEdge: string;
  colorMapping: string;
  colorDistanceMode: string;
  colorDistanceModeOklab: string;
  colorDistanceModeRgbFast: string;
  colorDistanceModeWeightedRgb: string;
  colorDistanceModeLabDeltaE: string;
  colorDistanceModeHint: string;
  colorDistanceModeOklabDescription: string;
  colorDistanceModeRgbFastDescription: string;
  colorDistanceModeWeightedRgbDescription: string;
  colorDistanceModeLabDeltaEDescription: string;
  ditherMode: string;
  ditherModeOff: string;
  ditherModeFloydSteinberg: string;
  ditherModeOrdered: string;
  ditherModeHint: string;
  ditherModeOffDescription: string;
  ditherModeFloydSteinbergDescription: string;
  ditherModeOrderedDescription: string;
  smoothingLevel: string;
  decreaseSmoothing: string;
  increaseSmoothing: string;
  maxColorCount: string;
  decreaseMaxColorCount: string;
  increaseMaxColorCount: string;
  maxColorCountValue: string;
  language: string;
  theme: string;
  interfaceStyle: string;
  unsupportedImage: string;
  processFailed: string;
  emptyTitle: string;
  emptyBody: string;
  zoomOut: string;
  zoomIn: string;
  summaryTitle: string;
  patternSummary: string;
  headerStats: string;
  colorDetailTitle: string;
  colorDetailHint: string;
  colorColumn: string;
  countColumn: string;
  percentColumn: string;
  copyList: string;
  copyColorLine: string;
  copySucceeded: string;
  copyFailed: string;
  gridZoomStatus: string;
  patternEditToolbar: string;
  patternEditView: string;
  patternEditPaint: string;
  patternEditPick: string;
  patternEditErase: string;
  patternEditReplace: string;
  patternEditActiveColor: string;
  patternEditUndo: string;
  patternEditRedo: string;
  patternEditReset: string;
  patternEditReplaceSource: string;
  patternEditReplaceTarget: string;
  patternEditApplyReplace: string;
  patternEditReplaceNoSource: string;
  patternPreviewToolbar: string;
  patternPreviewShowGrid: string;
  patternPreviewShowCodes: string;
  patternPreviewShowAxes: string;
  cellTitle: string;
  dropzoneTitle: string;
  dropzoneBody: string;
  dropzoneHint: string;
  originalPreviewTitle: string;
  originalPreviewAlt: string;
  mardPaletteTitle: string;
  mardPaletteSummary: string;
  paletteFamilyTitle: string;
  closeDialog: string;
  presetSmall: string;
  presetMedium: string;
  presetLarge: string;
};

export const messages: Record<Locale, Messages> = {
  en: {
    appName: "Fundbeads",
    subtitle: "Convert images to bead grids. Processing stays in your browser.",
    uploadImage: "Upload image",
    gridSize: "Pattern size",
    patternLongestEdge: "Longest edge",
    decreasePatternLongestEdge: "Decrease longest edge",
    increasePatternLongestEdge: "Increase longest edge",
    colorMapping: "Color mapping",
    colorDistanceMode: "Matching algorithm",
    colorDistanceModeOklab: "Perceptual",
    colorDistanceModeRgbFast: "Fast RGB",
    colorDistanceModeWeightedRgb: "Weighted RGB",
    colorDistanceModeLabDeltaE: "Lab Delta-E",
    colorDistanceModeHint: "Chooses how each sampled pixel finds the nearest MARD color.",
    colorDistanceModeOklabDescription: "Default. Balanced perceptual match for most photos and artwork.",
    colorDistanceModeRgbFastDescription: "Fast and predictable for icons, pixel art, and comparisons.",
    colorDistanceModeWeightedRgbDescription: "Weights green more, often better for natural images.",
    colorDistanceModeLabDeltaEDescription: "Traditional color-difference model for photos and subtle color shifts.",
    ditherMode: "Dither mode",
    ditherModeOff: "Off",
    ditherModeFloydSteinberg: "Floyd-Steinberg",
    ditherModeOrdered: "Ordered",
    ditherModeHint: "Uses neighboring beads to simulate intermediate tones.",
    ditherModeOffDescription: "Clean solid areas; best for icons and low-color patterns.",
    ditherModeFloydSteinbergDescription: "Gradients, photos, and skin tones look more natural, but charts get speckled.",
    ditherModeOrderedDescription: "Regular patterned texture; smoother gradients with more control than error diffusion.",
    smoothingLevel: "Smoothing",
    decreaseSmoothing: "Decrease smoothing",
    increaseSmoothing: "Increase smoothing",
    maxColorCount: "Max colors",
    decreaseMaxColorCount: "Decrease max colors",
    increaseMaxColorCount: "Increase max colors",
    maxColorCountValue: "{count} colors",
    language: "Language",
    theme: "Theme",
    interfaceStyle: "Interface",
    unsupportedImage: "Upload a JPG, PNG, or WebP image.",
    processFailed: "Could not process this image.",
    emptyTitle: "Upload an image to generate a bead chart",
    emptyBody: "The generated grid will include top, bottom, left, and right axes, per-cell MARD codes, and color counts.",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    summaryTitle: "Summary",
    patternSummary: "Pattern [{width}x{height} / {colors} Colors / Total {total} Beads]",
    headerStats: "{colors} Colors / Total {total} Beads",
    colorDetailTitle: "Color details",
    colorDetailHint: "Hover to preview a color; click to pin or unpin it on the pattern grid.",
    colorColumn: "Color",
    countColumn: "Count",
    percentColumn: "Percent",
    copyList: "Copy",
    copyColorLine: "Copy {code}",
    copySucceeded: "Copied.",
    copyFailed: "Copy failed.",
    gridZoomStatus: "{width}x{height} / {zoom}",
    patternEditToolbar: "Pattern editing tools",
    patternEditView: "View",
    patternEditPaint: "Paint",
    patternEditPick: "Pick",
    patternEditErase: "Erase",
    patternEditReplace: "Replace",
    patternEditActiveColor: "Active color",
    patternEditUndo: "Undo edit",
    patternEditRedo: "Redo edit",
    patternEditReset: "Reset edits",
    patternEditReplaceSource: "Source color",
    patternEditReplaceTarget: "Target color",
    patternEditApplyReplace: "Apply",
    patternEditReplaceNoSource: "Choose different source and target colors that exist in the pattern.",
    patternPreviewToolbar: "Pattern preview controls",
    patternPreviewShowGrid: "Show grid",
    patternPreviewShowCodes: "Show color codes",
    patternPreviewShowAxes: "Show row/column labels",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "Drop an image here",
    dropzoneBody: "Click or drag a local JPG, PNG, or WebP into this workspace to generate a bead pattern. The image stays in your browser.",
    dropzoneHint: "JPG / PNG / WebP",
    originalPreviewTitle: "Original",
    originalPreviewAlt: "Original image preview for {fileName}",
    mardPaletteTitle: "MARD 221",
    mardPaletteSummary: "{colors} colors across {families} families",
    paletteFamilyTitle: "{family} family / {count} colors",
    closeDialog: "Close",
    presetSmall: "Small",
    presetMedium: "Medium",
    presetLarge: "Large",
  },
  "zh-Hans": {
    appName: "Fundbeads",
    subtitle: "把图片转换为拼豆网格。所有处理都在浏览器本地完成。",
    uploadImage: "上传图片",
    gridSize: "图纸尺寸",
    patternLongestEdge: "图纸最长边",
    decreasePatternLongestEdge: "减少图纸最长边",
    increasePatternLongestEdge: "增加图纸最长边",
    colorMapping: "颜色映射",
    colorDistanceMode: "匹配算法",
    colorDistanceModeOklab: "感知",
    colorDistanceModeRgbFast: "快速 RGB",
    colorDistanceModeWeightedRgb: "加权 RGB",
    colorDistanceModeLabDeltaE: "Lab 色差",
    colorDistanceModeHint: "决定每个采样像素如何寻找最近的 MARD 颜色。",
    colorDistanceModeOklabDescription: "默认推荐。更接近人眼观感，适合大多数照片和插画。",
    colorDistanceModeRgbFastDescription: "最快且稳定，适合图标、像素图和测试对照。",
    colorDistanceModeWeightedRgbDescription: "更重视绿色变化，常适合自然图片。",
    colorDistanceModeLabDeltaEDescription: "传统色差模型，适合照片和细微色差。",
    ditherMode: "抖动模式",
    ditherModeOff: "关闭",
    ditherModeFloydSteinberg: "Floyd-Steinberg",
    ditherModeOrdered: "有序抖动",
    ditherModeHint: "通过相邻珠子模拟中间色调。",
    ditherModeOffDescription: "色块最干净，适合图标和低色数图。",
    ditherModeFloydSteinbergDescription: "渐变、照片、肤色会更自然，但图纸更碎。",
    ditherModeOrderedDescription: "规律纹理，让渐变更平滑，比误差扩散更可控。",
    smoothingLevel: "平滑",
    decreaseSmoothing: "降低平滑",
    increaseSmoothing: "提高平滑",
    maxColorCount: "最大用色",
    decreaseMaxColorCount: "减少最大用色",
    increaseMaxColorCount: "增加最大用色",
    maxColorCountValue: "{count} 色",
    language: "语言",
    theme: "主题",
    interfaceStyle: "界面",
    unsupportedImage: "请上传 JPG、PNG 或 WebP 图片。",
    processFailed: "无法处理这张图片。",
    emptyTitle: "上传图片以生成拼豆图纸",
    emptyBody: "生成的网格会包含上下左右坐标轴、每格 MARD 编号和颜色用量统计。",
    zoomOut: "缩小",
    zoomIn: "放大",
    summaryTitle: "统计",
    patternSummary: "图纸 [{width}x{height} / {colors} 色 / 共 {total} 颗]",
    headerStats: "{colors} 色 / 共 {total} 颗",
    colorDetailTitle: "颜色明细",
    colorDetailHint: "悬停可快速预览颜色；单击可在图纸中固定或取消固定这一色。",
    colorColumn: "颜色",
    countColumn: "数量",
    percentColumn: "占比",
    copyList: "复制",
    copyColorLine: "复制 {code}",
    copySucceeded: "已复制。",
    copyFailed: "复制失败。",
    gridZoomStatus: "{width}x{height} / {zoom}",
    patternEditToolbar: "图纸编辑工具",
    patternEditView: "查看",
    patternEditPaint: "涂色",
    patternEditPick: "取色",
    patternEditErase: "擦除",
    patternEditReplace: "换色",
    patternEditActiveColor: "当前颜色",
    patternEditUndo: "撤销编辑",
    patternEditRedo: "重做编辑",
    patternEditReset: "重置编辑",
    patternEditReplaceSource: "来源颜色",
    patternEditReplaceTarget: "目标颜色",
    patternEditApplyReplace: "应用",
    patternEditReplaceNoSource: "请选择图纸中存在且彼此不同的来源和目标颜色。",
    patternPreviewToolbar: "图纸预览控制",
    patternPreviewShowGrid: "显示网格",
    patternPreviewShowCodes: "显示色号",
    patternPreviewShowAxes: "显示行列编号",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "把图片拖到这里",
    dropzoneBody: "点击或拖入本地 JPG、PNG 或 WebP 图片以生成拼豆图纸。图片只会在浏览器本地处理。",
    dropzoneHint: "JPG / PNG / WebP",
    originalPreviewTitle: "原图",
    originalPreviewAlt: "{fileName} 的原图预览",
    mardPaletteTitle: "MARD 221",
    mardPaletteSummary: "{families} 个色系，共 {colors} 色",
    paletteFamilyTitle: "{family} 色系 / {count} 色",
    closeDialog: "关闭",
    presetSmall: "小",
    presetMedium: "中",
    presetLarge: "大",
  },
  "zh-Hant": {
    appName: "Fundbeads",
    subtitle: "把圖片轉換為拼豆網格。所有處理都在瀏覽器本機完成。",
    uploadImage: "上傳圖片",
    gridSize: "圖紙尺寸",
    patternLongestEdge: "圖紙最長邊",
    decreasePatternLongestEdge: "減少圖紙最長邊",
    increasePatternLongestEdge: "增加圖紙最長邊",
    colorMapping: "顏色映射",
    colorDistanceMode: "匹配演算法",
    colorDistanceModeOklab: "感知",
    colorDistanceModeRgbFast: "快速 RGB",
    colorDistanceModeWeightedRgb: "加權 RGB",
    colorDistanceModeLabDeltaE: "Lab 色差",
    colorDistanceModeHint: "決定每個採樣像素如何尋找最近的 MARD 顏色。",
    colorDistanceModeOklabDescription: "預設推薦。更接近人眼觀感，適合大多數照片和插畫。",
    colorDistanceModeRgbFastDescription: "最快且穩定，適合圖示、像素圖和測試對照。",
    colorDistanceModeWeightedRgbDescription: "更重視綠色變化，常適合自然圖片。",
    colorDistanceModeLabDeltaEDescription: "傳統色差模型，適合照片和細微色差。",
    ditherMode: "抖動模式",
    ditherModeOff: "關閉",
    ditherModeFloydSteinberg: "Floyd-Steinberg",
    ditherModeOrdered: "有序抖動",
    ditherModeHint: "透過相鄰珠子模擬中間色調。",
    ditherModeOffDescription: "色塊最乾淨，適合圖示和低色數圖。",
    ditherModeFloydSteinbergDescription: "漸層、照片、膚色會更自然，但圖紙更碎。",
    ditherModeOrderedDescription: "規律紋理，讓漸層更平滑，比誤差擴散更可控。",
    smoothingLevel: "平滑",
    decreaseSmoothing: "降低平滑",
    increaseSmoothing: "提高平滑",
    maxColorCount: "最大用色",
    decreaseMaxColorCount: "減少最大用色",
    increaseMaxColorCount: "增加最大用色",
    maxColorCountValue: "{count} 色",
    language: "語言",
    theme: "主題",
    interfaceStyle: "介面",
    unsupportedImage: "請上傳 JPG、PNG 或 WebP 圖片。",
    processFailed: "無法處理這張圖片。",
    emptyTitle: "上傳圖片以產生拼豆圖紙",
    emptyBody: "產生的網格會包含上下左右座標軸、每格 MARD 編號和顏色用量統計。",
    zoomOut: "縮小",
    zoomIn: "放大",
    summaryTitle: "統計",
    patternSummary: "圖紙 [{width}x{height} / {colors} 色 / 共 {total} 顆]",
    headerStats: "{colors} 色 / 共 {total} 顆",
    colorDetailTitle: "顏色明細",
    colorDetailHint: "懸停可快速預覽顏色；單擊可在圖紙中固定或取消固定這一色。",
    colorColumn: "顏色",
    countColumn: "數量",
    percentColumn: "佔比",
    copyList: "複製",
    copyColorLine: "複製 {code}",
    copySucceeded: "已複製。",
    copyFailed: "複製失敗。",
    gridZoomStatus: "{width}x{height} / {zoom}",
    patternEditToolbar: "圖紙編輯工具",
    patternEditView: "查看",
    patternEditPaint: "塗色",
    patternEditPick: "取色",
    patternEditErase: "擦除",
    patternEditReplace: "換色",
    patternEditActiveColor: "目前顏色",
    patternEditUndo: "復原編輯",
    patternEditRedo: "重做編輯",
    patternEditReset: "重置編輯",
    patternEditReplaceSource: "來源顏色",
    patternEditReplaceTarget: "目標顏色",
    patternEditApplyReplace: "套用",
    patternEditReplaceNoSource: "請選擇圖紙中存在且彼此不同的來源和目標顏色。",
    patternPreviewToolbar: "圖紙預覽控制",
    patternPreviewShowGrid: "顯示網格",
    patternPreviewShowCodes: "顯示色號",
    patternPreviewShowAxes: "顯示行列編號",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "把圖片拖到這裡",
    dropzoneBody: "點擊或拖入本機 JPG、PNG 或 WebP 圖片以產生拼豆圖紙。圖片只會在瀏覽器本機處理。",
    dropzoneHint: "JPG / PNG / WebP",
    originalPreviewTitle: "原圖",
    originalPreviewAlt: "{fileName} 的原圖預覽",
    mardPaletteTitle: "MARD 221",
    mardPaletteSummary: "{families} 個色系，共 {colors} 色",
    paletteFamilyTitle: "{family} 色系 / {count} 色",
    closeDialog: "關閉",
    presetSmall: "小",
    presetMedium: "中",
    presetLarge: "大",
  },
  ja: {
    appName: "Fundbeads",
    subtitle: "画像をビーズグリッドに変換します。処理はブラウザー内で完結します。",
    uploadImage: "画像をアップロード",
    gridSize: "図案サイズ",
    patternLongestEdge: "図案の最長辺",
    decreasePatternLongestEdge: "図案の最長辺を減らす",
    increasePatternLongestEdge: "図案の最長辺を増やす",
    colorMapping: "色の割り当て",
    colorDistanceMode: "マッチ方式",
    colorDistanceModeOklab: "知覚",
    colorDistanceModeRgbFast: "高速 RGB",
    colorDistanceModeWeightedRgb: "加重 RGB",
    colorDistanceModeLabDeltaE: "Lab Delta-E",
    colorDistanceModeHint: "各サンプルが最も近い MARD 色を選ぶ方法を決めます。",
    colorDistanceModeOklabDescription: "既定。多くの写真やイラストで見た目の近さを取りやすい方式です。",
    colorDistanceModeRgbFastDescription: "高速で予測しやすく、アイコン、ピクセルアート、比較に向きます。",
    colorDistanceModeWeightedRgbDescription: "緑の差を重く見て、自然画像で合いやすい場合があります。",
    colorDistanceModeLabDeltaEDescription: "写真や微妙な色差に向く伝統的な色差モデルです。",
    ditherMode: "ディザー方式",
    ditherModeOff: "オフ",
    ditherModeFloydSteinberg: "Floyd-Steinberg",
    ditherModeOrdered: "順序ディザー",
    ditherModeHint: "近くのビーズで中間色の見え方を再現します。",
    ditherModeOffDescription: "色面が最もきれいで、アイコンや少ない色数の図案に向きます。",
    ditherModeFloydSteinbergDescription: "グラデーション、写真、肌色が自然になりますが、図案は細かくなります。",
    ditherModeOrderedDescription: "規則的な模様で、誤差拡散より制御しやすく滑らかな階調にします。",
    smoothingLevel: "平滑化",
    decreaseSmoothing: "平滑化を下げる",
    increaseSmoothing: "平滑化を上げる",
    maxColorCount: "最大色数",
    decreaseMaxColorCount: "最大色数を減らす",
    increaseMaxColorCount: "最大色数を増やす",
    maxColorCountValue: "{count} 色",
    language: "言語",
    theme: "テーマ",
    interfaceStyle: "表示",
    unsupportedImage: "JPG、PNG、または WebP 画像をアップロードしてください。",
    processFailed: "この画像を処理できませんでした。",
    emptyTitle: "画像をアップロードしてビーズ図案を作成",
    emptyBody: "生成されるグリッドには上下左右の座標、各セルの MARD コード、色別の個数が含まれます。",
    zoomOut: "縮小",
    zoomIn: "拡大",
    summaryTitle: "集計",
    patternSummary: "図案 [{width}x{height} / {colors} 色 / 合計 {total} 個]",
    headerStats: "{colors} 色 / 合計 {total} 個",
    colorDetailTitle: "色の明細",
    colorDetailHint: "ホバーで色をプレビューし、クリックで図案上に固定または解除します。",
    colorColumn: "色",
    countColumn: "数量",
    percentColumn: "比率",
    copyList: "コピー",
    copyColorLine: "{code} をコピー",
    copySucceeded: "コピーしました。",
    copyFailed: "コピーできませんでした。",
    gridZoomStatus: "{width}x{height} / {zoom}",
    patternEditToolbar: "図案編集ツール",
    patternEditView: "表示",
    patternEditPaint: "塗る",
    patternEditPick: "抽出",
    patternEditErase: "消去",
    patternEditReplace: "置換",
    patternEditActiveColor: "選択色",
    patternEditUndo: "編集を元に戻す",
    patternEditRedo: "編集をやり直す",
    patternEditReset: "編集をリセット",
    patternEditReplaceSource: "元の色",
    patternEditReplaceTarget: "置換先の色",
    patternEditApplyReplace: "適用",
    patternEditReplaceNoSource: "図案内にある、異なる元色と置換先を選んでください。",
    patternPreviewToolbar: "図案プレビュー設定",
    patternPreviewShowGrid: "グリッドを表示",
    patternPreviewShowCodes: "色コードを表示",
    patternPreviewShowAxes: "行列番号を表示",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "ここに画像をドロップ",
    dropzoneBody: "ローカルの JPG、PNG、または WebP をクリックまたはドラッグして、ビーズ図案を生成します。画像はブラウザー内で処理されます。",
    dropzoneHint: "JPG / PNG / WebP",
    originalPreviewTitle: "元画像",
    originalPreviewAlt: "{fileName} の元画像プレビュー",
    mardPaletteTitle: "MARD 221",
    mardPaletteSummary: "{families} 系統 / {colors} 色",
    paletteFamilyTitle: "{family} 系統 / {count} 色",
    closeDialog: "閉じる",
    presetSmall: "小",
    presetMedium: "中",
    presetLarge: "大",
  },
  ko: {
    appName: "Fundbeads",
    subtitle: "이미지를 비즈 그리드로 변환합니다. 모든 처리는 브라우저에서만 이루어집니다.",
    uploadImage: "이미지 업로드",
    gridSize: "패턴 크기",
    patternLongestEdge: "패턴 최장변",
    decreasePatternLongestEdge: "패턴 최장변 줄이기",
    increasePatternLongestEdge: "패턴 최장변 늘리기",
    colorMapping: "색상 매핑",
    colorDistanceMode: "매칭 알고리즘",
    colorDistanceModeOklab: "지각",
    colorDistanceModeRgbFast: "빠른 RGB",
    colorDistanceModeWeightedRgb: "가중 RGB",
    colorDistanceModeLabDeltaE: "Lab Delta-E",
    colorDistanceModeHint: "각 샘플 픽셀이 가장 가까운 MARD 색을 찾는 방식을 정합니다.",
    colorDistanceModeOklabDescription: "기본값. 대부분의 사진과 일러스트에서 균형 잡힌 지각 매칭입니다.",
    colorDistanceModeRgbFastDescription: "빠르고 예측 가능해 아이콘, 픽셀 아트, 비교에 적합합니다.",
    colorDistanceModeWeightedRgbDescription: "녹색 차이를 더 크게 반영해 자연 이미지에 잘 맞을 때가 있습니다.",
    colorDistanceModeLabDeltaEDescription: "사진과 미묘한 색 차이에 쓰기 좋은 전통적인 색차 모델입니다.",
    ditherMode: "디더링 방식",
    ditherModeOff: "끄기",
    ditherModeFloydSteinberg: "Floyd-Steinberg",
    ditherModeOrdered: "순서 디더링",
    ditherModeHint: "주변 비즈를 이용해 중간 톤처럼 보이게 합니다.",
    ditherModeOffDescription: "색면이 가장 깔끔해 아이콘과 적은 색상의 패턴에 적합합니다.",
    ditherModeFloydSteinbergDescription: "그라데이션, 사진, 피부 톤이 더 자연스럽지만 도안이 더 잘게 나뉩니다.",
    ditherModeOrderedDescription: "규칙적인 질감으로, 오차 확산보다 제어하기 쉬운 부드러운 그라데이션을 만듭니다.",
    smoothingLevel: "스무딩",
    decreaseSmoothing: "스무딩 줄이기",
    increaseSmoothing: "스무딩 늘리기",
    maxColorCount: "최대 색상",
    decreaseMaxColorCount: "최대 색상 줄이기",
    increaseMaxColorCount: "최대 색상 늘리기",
    maxColorCountValue: "{count}색",
    language: "언어",
    theme: "테마",
    interfaceStyle: "인터페이스",
    unsupportedImage: "JPG, PNG 또는 WebP 이미지를 업로드하세요.",
    processFailed: "이 이미지를 처리할 수 없습니다.",
    emptyTitle: "이미지를 업로드해 비즈 도안을 생성하세요",
    emptyBody: "생성된 그리드에는 상하좌우 좌표, 셀별 MARD 코드, 색상별 개수가 포함됩니다.",
    zoomOut: "축소",
    zoomIn: "확대",
    summaryTitle: "요약",
    patternSummary: "패턴 [{width}x{height} / {colors}색 / 총 {total}개]",
    headerStats: "{colors}색 / 총 {total}개",
    colorDetailTitle: "색상 상세",
    colorDetailHint: "마우스를 올리면 색상을 미리 보고, 클릭하면 패턴에 고정하거나 해제합니다.",
    colorColumn: "색상",
    countColumn: "수량",
    percentColumn: "비율",
    copyList: "복사",
    copyColorLine: "{code} 복사",
    copySucceeded: "복사했습니다.",
    copyFailed: "복사에 실패했습니다.",
    gridZoomStatus: "{width}x{height} / {zoom}",
    patternEditToolbar: "패턴 편집 도구",
    patternEditView: "보기",
    patternEditPaint: "칠하기",
    patternEditPick: "색 선택",
    patternEditErase: "지우기",
    patternEditReplace: "색 바꾸기",
    patternEditActiveColor: "활성 색상",
    patternEditUndo: "편집 실행 취소",
    patternEditRedo: "편집 다시 실행",
    patternEditReset: "편집 초기화",
    patternEditReplaceSource: "원본 색상",
    patternEditReplaceTarget: "대상 색상",
    patternEditApplyReplace: "적용",
    patternEditReplaceNoSource: "패턴에 있는 서로 다른 원본 및 대상 색상을 선택하세요.",
    patternPreviewToolbar: "패턴 미리보기 제어",
    patternPreviewShowGrid: "격자 표시",
    patternPreviewShowCodes: "색상 코드 표시",
    patternPreviewShowAxes: "행/열 번호 표시",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "이미지를 여기에 놓으세요",
    dropzoneBody: "로컬 JPG, PNG 또는 WebP를 클릭하거나 끌어와 비즈 도안을 생성합니다. 이미지는 브라우저에서만 처리됩니다.",
    dropzoneHint: "JPG / PNG / WebP",
    originalPreviewTitle: "원본",
    originalPreviewAlt: "{fileName} 원본 이미지 미리보기",
    mardPaletteTitle: "MARD 221",
    mardPaletteSummary: "{families}개 계열 / {colors}색",
    paletteFamilyTitle: "{family} 계열 / {count}색",
    closeDialog: "닫기",
    presetSmall: "소",
    presetMedium: "중",
    presetLarge: "대",
  },
  es: {
    appName: "Fundbeads",
    subtitle: "Convierte imágenes en cuadrículas de cuentas. Todo se procesa en tu navegador.",
    uploadImage: "Subir imagen",
    gridSize: "Tamaño del patrón",
    patternLongestEdge: "Lado más largo",
    decreasePatternLongestEdge: "Reducir lado más largo",
    increasePatternLongestEdge: "Aumentar lado más largo",
    colorMapping: "Mapeo de color",
    colorDistanceMode: "Algoritmo de ajuste",
    colorDistanceModeOklab: "Perceptual",
    colorDistanceModeRgbFast: "RGB rápido",
    colorDistanceModeWeightedRgb: "RGB ponderado",
    colorDistanceModeLabDeltaE: "Lab Delta-E",
    colorDistanceModeHint: "Define cómo cada muestra encuentra el color MARD más cercano.",
    colorDistanceModeOklabDescription: "Predeterminado. Ajuste perceptual equilibrado para la mayoría de fotos e ilustraciones.",
    colorDistanceModeRgbFastDescription: "Rápido y predecible para iconos, pixel art y comparaciones.",
    colorDistanceModeWeightedRgbDescription: "Da más peso al verde y suele funcionar mejor en imágenes naturales.",
    colorDistanceModeLabDeltaEDescription: "Modelo tradicional de diferencia de color para fotos y cambios sutiles.",
    ditherMode: "Modo de tramado",
    ditherModeOff: "Desactivado",
    ditherModeFloydSteinberg: "Floyd-Steinberg",
    ditherModeOrdered: "Ordenado",
    ditherModeHint: "Usa cuentas vecinas para simular tonos intermedios.",
    ditherModeOffDescription: "Áreas sólidas limpias; mejor para iconos y patrones con pocos colores.",
    ditherModeFloydSteinbergDescription: "Degradados, fotos y tonos de piel se ven más naturales, pero el patrón queda moteado.",
    ditherModeOrderedDescription: "Textura regular; suaviza degradados con más control que la difusión de error.",
    smoothingLevel: "Suavizado",
    decreaseSmoothing: "Reducir suavizado",
    increaseSmoothing: "Aumentar suavizado",
    maxColorCount: "Máx. colores",
    decreaseMaxColorCount: "Reducir máx. colores",
    increaseMaxColorCount: "Aumentar máx. colores",
    maxColorCountValue: "{count} colores",
    language: "Idioma",
    theme: "Tema",
    interfaceStyle: "Interfaz",
    unsupportedImage: "Sube una imagen JPG, PNG o WebP.",
    processFailed: "No se pudo procesar esta imagen.",
    emptyTitle: "Sube una imagen para generar un patrón",
    emptyBody: "La cuadrícula generada incluirá ejes en los cuatro lados, códigos MARD por celda y conteos por color.",
    zoomOut: "Alejar",
    zoomIn: "Acercar",
    summaryTitle: "Resumen",
    patternSummary: "Patrón [{width}x{height} / {colors} colores / Total {total} cuentas]",
    headerStats: "{colors} colores / Total {total} cuentas",
    colorDetailTitle: "Detalle de color",
    colorDetailHint: "Pasa el cursor para previsualizar un color; haz clic para fijarlo o quitarlo.",
    colorColumn: "Color",
    countColumn: "Cantidad",
    percentColumn: "Porcentaje",
    copyList: "Copiar",
    copyColorLine: "Copiar {code}",
    copySucceeded: "Copiado.",
    copyFailed: "No se pudo copiar.",
    gridZoomStatus: "{width}x{height} / {zoom}",
    patternEditToolbar: "Herramientas de edición",
    patternEditView: "Ver",
    patternEditPaint: "Pintar",
    patternEditPick: "Tomar",
    patternEditErase: "Borrar",
    patternEditReplace: "Reemplazar",
    patternEditActiveColor: "Color activo",
    patternEditUndo: "Deshacer edición",
    patternEditRedo: "Rehacer edición",
    patternEditReset: "Restablecer ediciones",
    patternEditReplaceSource: "Color origen",
    patternEditReplaceTarget: "Color destino",
    patternEditApplyReplace: "Aplicar",
    patternEditReplaceNoSource: "Elige colores de origen y destino diferentes que existan en el patrón.",
    patternPreviewToolbar: "Controles de vista previa",
    patternPreviewShowGrid: "Mostrar cuadrícula",
    patternPreviewShowCodes: "Mostrar códigos",
    patternPreviewShowAxes: "Mostrar filas/columnas",
    cellTitle: "{x},{y}: {code} {label}",
    dropzoneTitle: "Arrastra una imagen aquí",
    dropzoneBody: "Haz clic o arrastra un JPG, PNG o WebP local al espacio de trabajo para generar un patrón. La imagen se procesa en tu navegador.",
    dropzoneHint: "JPG / PNG / WebP",
    originalPreviewTitle: "Original",
    originalPreviewAlt: "Vista previa original de {fileName}",
    mardPaletteTitle: "MARD 221",
    mardPaletteSummary: "{colors} colores en {families} familias",
    paletteFamilyTitle: "Familia {family} / {count} colores",
    closeDialog: "Cerrar",
    presetSmall: "Pequeño",
    presetMedium: "Mediano",
    presetLarge: "Grande",
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
