import { ImageUp, Loader2, Palette, TableCellsSplit, ZoomIn, ZoomOut } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { gridSizes, imageFileToPattern, readableTextColor, type GridSize, type Pattern } from "./pattern";

const acceptedTypes = ["image/jpeg", "image/png"];
const baseCellSize = 22;
const baseAxisWidth = 38;
const gridViewportPadding = 24;
const minZoom = 0.5;
const maxZoom = 3;
const zoomStep = 0.1;

function axisLabels(size: GridSize) {
  return Array.from({ length: size }, (_, index) => index + 1);
}

function clampZoom(zoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, Number(zoom.toFixed(2))));
}

export function App() {
  const [gridSize, setGridSize] = useState<GridSize>(52);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const labels = useMemo(() => axisLabels(pattern?.size ?? gridSize), [gridSize, pattern?.size]);

  async function processFile(file: File, size: GridSize) {
    if (!acceptedTypes.includes(file.type)) {
      setError("Upload a JPG or PNG image.");
      setPattern(null);
      return;
    }

    setIsProcessing(true);
    setError("");
    setFileName(file.name);

    try {
      setPattern(await imageFileToPattern(file, size));
    } catch (nextError) {
      setPattern(null);
      setError(nextError instanceof Error ? nextError.message : "Could not process this image.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file, gridSize);
    }
  }

  async function onGridSizeChange(nextSize: GridSize) {
    setGridSize(nextSize);
    const input = document.getElementById("image-upload") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) {
      await processFile(file, nextSize);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Fundbeads</p>
              <h1 className="mt-1 text-3xl font-semibold">Image to Perler Bead Pattern</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Convert a local JPG or PNG into a labeled MARD bead grid. Processing stays in your browser.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-panel">
                <ImageUp size={18} />
                Upload image
                <input id="image-upload" className="sr-only" type="file" accept="image/png,image/jpeg" onChange={onFileChange} />
              </label>
              <div className="inline-flex rounded-md border border-border bg-background p-1">
                {gridSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => void onGridSizeChange(size)}
                    className={`rounded px-3 py-1.5 text-sm font-semibold ${
                      gridSize === size ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <TableCellsSplit size={16} />
              {pattern ? `${pattern.size}x${pattern.size}` : `${gridSize}x${gridSize}`}
            </span>
            <span className="inline-flex items-center gap-2">
              <Palette size={16} />
              {pattern ? `${pattern.usage.length} Colors / Total ${pattern.totalBeads} Beads` : "Waiting for image"}
            </span>
            {fileName ? <span className="truncate">{fileName}</span> : null}
            {isProcessing ? (
              <span className="inline-flex items-center gap-2 text-primary">
                <Loader2 className="animate-spin" size={16} />
                Processing
              </span>
            ) : null}
          </div>
          {error ? <p className="rounded-md border border-destructive bg-card px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      <section className="px-3 py-4 sm:px-4 lg:px-6">
        {pattern ? <PatternGrid pattern={pattern} labels={labels} /> : <EmptyState />}
        {pattern ? <ColorSummary pattern={pattern} /> : null}
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[420px] place-items-center border border-dashed border-border bg-card px-6 text-center shadow-panel">
      <div>
        <ImageUp className="mx-auto text-primary" size={42} />
        <h2 className="mt-4 text-xl font-semibold">Upload an image to generate a bead chart</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The generated grid will include top, bottom, left, and right axes, per-cell MARD codes, and color counts.
        </p>
      </div>
    </div>
  );
}

function PatternGrid({ pattern, labels }: { pattern: Pattern; labels: number[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  const columns = `${baseAxisWidth}px repeat(${pattern.size}, ${baseCellSize}px) ${baseAxisWidth}px`;
  const baseWidth = baseAxisWidth * 2 + pattern.size * baseCellSize;
  const baseHeight = (pattern.size + 2) * baseCellSize;
  const availableWidth = Math.max(1, viewportSize.width - gridViewportPadding);
  const availableHeight = Math.max(1, viewportSize.height - gridViewportPadding);
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);
  const effectiveScale = fitScale * zoom;
  const scaledWidth = baseWidth * effectiveScale;
  const scaledHeight = baseHeight * effectiveScale;
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  const changeZoom = useCallback((direction: "in" | "out") => {
    setZoom((currentZoom) => clampZoom(currentZoom + (direction === "in" ? zoomStep : -zoomStep)));
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [pattern.size]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    function updateViewportSize() {
      if (!viewport) {
        return;
      }
      setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    }

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      setZoom((currentZoom) => clampZoom(currentZoom + (event.deltaY < 0 ? zoomStep : -zoomStep)));
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });

    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <section className="border border-border bg-card shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="font-mono text-sm font-bold text-muted-foreground">
          {pattern.size}x{pattern.size} / {zoomLabel}
        </div>
        <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => changeZoom("out")}
            disabled={zoom <= minZoom}
            className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="min-w-14 px-2 text-center font-mono text-xs font-bold text-muted-foreground">{zoomLabel}</span>
          <button
            type="button"
            onClick={() => changeZoom("in")}
            disabled={zoom >= maxZoom}
            className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      <div ref={viewportRef} className="h-[70vh] min-h-[320px] overflow-auto bg-card lg:h-[calc(100vh-240px)]">
        <div className="flex min-h-full min-w-full p-3">
          <div className="m-auto shrink-0" style={{ width: scaledWidth, height: scaledHeight }}>
            <div
              className="grid origin-top-left"
              style={{
                gridTemplateColumns: columns,
                width: baseWidth,
                height: baseHeight,
                transform: `scale(${effectiveScale})`,
              }}
            >
              <AxisCorner />
              {labels.map((label) => (
                <AxisCell key={`top-${label}`} label={label} major={label % 10 === 0 || label % 5 === 0} />
              ))}
              <AxisCorner />

              {labels.map((row) => (
                <Row key={row} row={row} pattern={pattern} />
              ))}

              <AxisCorner />
              {labels.map((label) => (
                <AxisCell key={`bottom-${label}`} label={label} major={label % 10 === 0 || label % 5 === 0} />
              ))}
              <AxisCorner />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ row, pattern }: { row: number; pattern: Pattern }) {
  const start = (row - 1) * pattern.size;
  const rowCells = pattern.cells.slice(start, start + pattern.size);

  return (
    <>
      <AxisCell label={row} major={row % 10 === 0 || row % 5 === 0} />
      {rowCells.map((cell) => {
        const majorX = cell.x % 10 === 0;
        const minorX = cell.x % 5 === 0;
        const majorY = cell.y % 10 === 0;
        const minorY = cell.y % 5 === 0;

        return (
          <div
            key={`${cell.x}-${cell.y}`}
            className={[
              "grid h-[22px] w-[22px] place-items-center border-b border-r border-black/40 font-mono text-[9px] font-bold leading-none",
              majorX ? "border-r-[3px] border-r-black" : "",
              minorX && !majorX ? "border-r-2 border-r-black/70 border-r-dashed" : "",
              majorY ? "border-b-[3px] border-b-black" : "",
              minorY && !majorY ? "border-b-2 border-b-black/70 border-b-dashed" : "",
            ].join(" ")}
            style={{
              backgroundColor: `rgb(${cell.color.r} ${cell.color.g} ${cell.color.b})`,
              color: readableTextColor(cell.color),
            }}
            title={`${cell.x},${cell.y}: ${cell.color.code} ${cell.color.label}`}
          >
            {cell.color.code}
          </div>
        );
      })}
      <AxisCell label={row} major={row % 10 === 0 || row % 5 === 0} />
    </>
  );
}

function AxisCell({ label, major }: { label: number; major: boolean }) {
  return (
    <div
      className={`grid h-[22px] w-full place-items-center border-b border-r border-border bg-muted px-1 font-mono text-[10px] font-bold ${
        major ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

function AxisCorner() {
  return <div className="h-[22px] w-full border-b border-r border-border bg-foreground" />;
}

function ColorSummary({ pattern }: { pattern: Pattern }) {
  return (
    <section className="mt-6 border border-border bg-card p-4 shadow-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Summary</h2>
        <p className="text-sm text-muted-foreground">
          Pattern [{pattern.size}x{pattern.size} / {pattern.usage.length} Colors / Total {pattern.totalBeads} Beads]
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pattern.usage.map(({ color, count }) => (
          <div key={color.code} className="flex items-center gap-3 border border-border bg-background p-2">
            <span
              className="h-8 w-8 shrink-0 border border-black/30"
              style={{ backgroundColor: `rgb(${color.r} ${color.g} ${color.b})` }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold">{color.code}</p>
              <p className="truncate text-xs text-muted-foreground">{color.label}</p>
            </div>
            <p className="font-mono text-sm font-bold">{count}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
