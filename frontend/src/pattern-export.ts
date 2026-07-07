import { patternGridGeometry, type PatternPreviewOptions } from "./pattern-grid-geometry";
import { buildPatternRenderModel, type PatternGridRenderLine } from "./pattern-render-model";
import { readableTextColor, type Pattern } from "./pattern";

export type PatternExportPreviewOptions = PatternPreviewOptions;

type PatternExportRenderOptions = PatternExportPreviewOptions & {
  cellSize?: number;
};

const defaultExportCellSize = 32;
const exportBackground = "#ffffff";
const axisBackground = "#eef2f7";
const axisMajorText = "#111111";
const axisText = "#475569";
const gridLine = "rgba(0, 0, 0, 0.42)";
const helperLine = "rgba(0, 0, 0, 0.72)";
const majorLine = "#111111";
const axisBorder = "#cbd5e1";

function rgb(color: { r: number; g: number; b: number }) {
  return `rgb(${color.r} ${color.g} ${color.b})`;
}

function patternExportBaseName(pattern: Pattern) {
  return `fundbeads-${pattern.width}x${pattern.height}`;
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string, dashed = false) {
  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.setLineDash(dashed ? [6, 5] : []);
  const offset = width % 2 === 1 ? 0.5 : 0;
  ctx.moveTo(x1 + offset, y1 + offset);
  ctx.lineTo(x2 + offset, y2 + offset);
  ctx.stroke();
  ctx.restore();
}

function drawCenteredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, initialSize: number, minSize: number) {
  let fontSize = initialSize;
  do {
    ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    if (ctx.measureText(text).width <= maxWidth || fontSize <= minSize) {
      break;
    }
    fontSize -= 1;
  } while (fontSize >= minSize);

  ctx.fillText(text, x, y, maxWidth);
}

function drawAxisCell(ctx: CanvasRenderingContext2D, label: number, x: number, y: number, width: number, height: number, major: boolean, showGrid: boolean) {
  ctx.fillStyle = axisBackground;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = major ? axisMajorText : axisText;
  drawCenteredText(ctx, String(label), x + width / 2, y + height / 2, width - 4, 10, 8);

  if (showGrid) {
    line(ctx, x, y + height, x + width, y + height, 1, axisBorder);
    line(ctx, x + width, y, x + width, y + height, 1, axisBorder);
  }
}

function drawGridLine(ctx: CanvasRenderingContext2D, gridLineModel: PatternGridRenderLine) {
  const { guideLevel } = gridLineModel;
  line(ctx, gridLineModel.x1, gridLineModel.y1, gridLineModel.x2, gridLineModel.y2, guideLevel === "major" ? 3 : guideLevel === "minor" ? 2 : 1, guideLevel === "major" ? majorLine : guideLevel === "minor" ? helperLine : gridLine, guideLevel === "minor");
}

export function renderPatternExportCanvas(pattern: Pattern, options: PatternExportRenderOptions): HTMLCanvasElement {
  const cellSize = Math.max(20, Math.round(options.cellSize ?? defaultExportCellSize));
  const geometry = patternGridGeometry(pattern, {
    showAxes: options.showAxes,
    cellSize,
    axisWidth: Math.max(44, Math.round(cellSize * 1.5)),
    axisHeight: cellSize,
  });
  const renderModel = buildPatternRenderModel(pattern, geometry);
  const canvas = document.createElement("canvas");

  canvas.width = geometry.totalWidth;
  canvas.height = geometry.totalHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas export is not available in this browser.");
  }

  ctx.fillStyle = exportBackground;
  ctx.fillRect(0, 0, geometry.totalWidth, geometry.totalHeight);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (options.showAxes) {
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, geometry.axisWidth, geometry.axisHeight);
    ctx.fillRect(geometry.originX + geometry.gridWidth, 0, geometry.axisWidth, geometry.axisHeight);
    ctx.fillRect(0, geometry.originY + geometry.gridHeight, geometry.axisWidth, geometry.axisHeight);
    ctx.fillRect(geometry.originX + geometry.gridWidth, geometry.originY + geometry.gridHeight, geometry.axisWidth, geometry.axisHeight);

    for (const axisCell of renderModel.axisCells) {
      drawAxisCell(ctx, axisCell.label, axisCell.x, axisCell.y, axisCell.width, axisCell.height, axisCell.major, options.showGrid);
    }
  }

  for (const cellModel of renderModel.cells) {
    const cellColor = cellModel.cell.color;

    ctx.fillStyle = cellColor ? rgb(cellColor) : exportBackground;
    ctx.fillRect(cellModel.x, cellModel.y, cellModel.width, cellModel.height);

    if (cellColor && options.showCodes) {
      ctx.fillStyle = readableTextColor(cellColor);
      drawCenteredText(ctx, cellColor.code, cellModel.x + cellModel.width / 2, cellModel.y + cellModel.height / 2, cellModel.width - 5, 12, 8);
    }
  }

  if (options.showGrid) {
    renderModel.gridLines.forEach((gridLineModel) => drawGridLine(ctx, gridLineModel));
  }

  return canvas;
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("PNG export failed."));
      }
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function exportPatternPng(pattern: Pattern, options: PatternExportPreviewOptions) {
  const canvas = renderPatternExportCanvas(pattern, options);
  const blob = await canvasToPngBlob(canvas);
  downloadBlob(blob, `${patternExportBaseName(pattern)}.png`);
}

export async function exportPatternPdf(pattern: Pattern, options: PatternExportPreviewOptions) {
  const canvas = renderPatternExportCanvas(pattern, options);
  const { jsPDF } = await import("jspdf");
  const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const titleHeight = 18;
  const imageMaxWidth = pageWidth - margin * 2;
  const imageMaxHeight = pageHeight - margin * 2 - titleHeight;
  const imageScale = Math.min(imageMaxWidth / canvas.width, imageMaxHeight / canvas.height);
  const imageWidth = canvas.width * imageScale;
  const imageHeight = canvas.height * imageScale;
  const imageX = (pageWidth - imageWidth) / 2;
  const imageY = margin + titleHeight;
  const title = `Fundbeads ${pattern.width}x${pattern.height}`;

  pdf.setProperties({ title, creator: "Fundbeads" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(title, margin, margin + 4);
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", imageX, imageY, imageWidth, imageHeight, undefined, "FAST");
  downloadBlob(pdf.output("blob"), `${patternExportBaseName(pattern)}.pdf`);
}
