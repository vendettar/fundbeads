import type { KeyboardEventHandler, PointerEventHandler, RefObject } from "react";
import { memo, useEffect, useMemo, useRef } from "react";

import { useI18n } from "./i18n";
import { isPatternAxisLabelEmphasized, type PatternGridGeometry, type PatternPreviewOptions } from "./pattern-grid-geometry";
import { buildPatternRenderModel, patternRenderRowCellsEqual, type PatternCellRenderModel, type PatternRenderRowModel } from "./pattern-render-model";
import { readableTextColor, type Pattern } from "./pattern";

type PatternGridBoardProps = {
  pattern: Pattern;
  previewOptions: PatternPreviewOptions;
  xLabels: number[];
  gridRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  cellIdPrefix: string;
  activeCellId: string;
  geometry: PatternGridGeometry;
  scaledWidth: number;
  scaledHeight: number;
  effectiveScale: number;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerLeave: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  onFocus: () => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

type PatternRowProps = {
  row: number;
  startCellIndex: number;
  cells: readonly PatternCellRenderModel[];
  showGrid: boolean;
  showCodes: boolean;
  showAxes: boolean;
  cellIdPrefix: string;
};

export function PatternGridBoard({
  pattern,
  previewOptions,
  xLabels,
  gridRef,
  viewportRef,
  cellIdPrefix,
  activeCellId,
  geometry,
  scaledWidth,
  scaledHeight,
  effectiveScale,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onFocus,
  onKeyDown,
}: PatternGridBoardProps) {
  const { t } = useI18n();
  const keyboardHintId = `${cellIdPrefix}-keyboard-hint`;
  const rowModels = usePatternGridRowModels(pattern, geometry);

  return (
    <div ref={viewportRef} className="pattern-grid-viewport overflow-auto bg-card">
      <p id={keyboardHintId} className="sr-only">{t("patternGridKeyboardHint")}</p>
      <div className="flex min-h-full min-w-full p-3">
        <div className="m-auto shrink-0" style={{ width: scaledWidth, height: scaledHeight }}>
          <div
            ref={gridRef}
            role="grid"
            aria-label={t("patternGridLabel")}
            aria-describedby={keyboardHintId}
            aria-rowcount={pattern.height}
            aria-colcount={pattern.width}
            aria-activedescendant={activeCellId}
            tabIndex={0}
            className="pattern-grid-board grid origin-top-left"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onPointerCancel={onPointerCancel}
            onLostPointerCapture={onPointerCancel}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            style={{
              gridTemplateColumns: geometry.columns,
              width: geometry.totalWidth,
              height: geometry.totalHeight,
              transform: `scale(${effectiveScale})`,
            }}
          >
            {previewOptions.showAxes ? (
              <>
                <AxisCorner showGrid={previewOptions.showGrid} />
                {xLabels.map((label) => (
                  <AxisCell key={`top-${label}`} label={label} major={isPatternAxisLabelEmphasized(label)} showGrid={previewOptions.showGrid} />
                ))}
                <AxisCorner showGrid={previewOptions.showGrid} />
              </>
            ) : null}

            {rowModels.map((rowModel) => (
              <PatternRow
                key={rowModel.row}
                row={rowModel.row}
                startCellIndex={rowModel.startCellIndex}
                cells={rowModel.cells}
                showGrid={previewOptions.showGrid}
                showCodes={previewOptions.showCodes}
                showAxes={previewOptions.showAxes}
                cellIdPrefix={cellIdPrefix}
              />
            ))}

            {previewOptions.showAxes ? (
              <>
                <AxisCorner showGrid={previewOptions.showGrid} />
                {xLabels.map((label) => (
                  <AxisCell key={`bottom-${label}`} label={label} major={isPatternAxisLabelEmphasized(label)} showGrid={previewOptions.showGrid} />
                ))}
                <AxisCorner showGrid={previewOptions.showGrid} />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const PatternRow = memo(function PatternRow({
  row,
  startCellIndex,
  cells,
  showGrid,
  showCodes,
  showAxes,
  cellIdPrefix,
}: PatternRowProps) {
  const { paletteLabel, t } = useI18n();

  return (
    <>
      {showAxes ? <AxisCell label={row} major={isPatternAxisLabelEmphasized(row)} showGrid={showGrid} /> : null}
      {cells.map((cellModel, cellOffset) => {
        const cell = cellModel.cell;
        const cellIndex = cellModel.cellIndex;
        const xGuide = cellModel.xGuide;
        const yGuide = cellModel.yGuide;
        const cellColor = cell.color;
        const cellLabel = cellColor ? t("cellTitle", { x: cell.x, y: cell.y, code: cellColor.code, label: paletteLabel(cellColor) }) : t("cellNoBeadTitle", { x: cell.x, y: cell.y });

        return (
          <div
            key={`${cell.x}-${cell.y}`}
            id={`${cellIdPrefix}-cell-${cellIndex}`}
            role="gridcell"
            aria-label={cellLabel}
            aria-rowindex={cell.y}
            aria-colindex={cell.x}
            data-cell-index={cellIndex}
            data-color-code={cellColor?.code}
            data-x={cell.x}
            data-y={cell.y}
            className={[
              "pattern-cell pattern-cell-code grid place-items-center font-mono font-bold leading-none",
              showGrid ? "border-b border-r border-black/40" : "",
              showGrid && xGuide === "major" ? "pattern-guide-x-major" : "",
              showGrid && xGuide === "minor" ? "border-r-2 border-r-black/70 border-r-dashed" : "",
              showGrid && yGuide === "major" ? "pattern-guide-y-major" : "",
              showGrid && yGuide === "minor" ? "border-b-2 border-b-black/70 border-b-dashed" : "",
            ].join(" ")}
            style={{
              backgroundColor: cellColor ? `rgb(${cellColor.r} ${cellColor.g} ${cellColor.b})` : "var(--beads-background)",
              color: showCodes && cellColor ? readableTextColor(cellColor) : "transparent",
            }}
            title={cellLabel}
          >
            {showCodes && cellColor ? cellColor.code : null}
          </div>
        );
      })}
      {showAxes ? <AxisCell label={row} major={isPatternAxisLabelEmphasized(row)} showGrid={showGrid} /> : null}
    </>
  );
}, arePatternRowPropsEqual);

export type PatternGridRowModel = {
  row: number;
  startCellIndex: number;
  cells: readonly PatternCellRenderModel[];
};

export { buildPatternRenderRows as buildPatternGridRowModels, patternRenderRowCellsEqual as patternGridRowCellsRenderEqual } from "./pattern-render-model";

function arePatternRowPropsEqual(previousProps: PatternRowProps, nextProps: PatternRowProps): boolean {
  return (
    previousProps.row === nextProps.row &&
    previousProps.startCellIndex === nextProps.startCellIndex &&
    previousProps.showGrid === nextProps.showGrid &&
    previousProps.showCodes === nextProps.showCodes &&
    previousProps.showAxes === nextProps.showAxes &&
    previousProps.cellIdPrefix === nextProps.cellIdPrefix &&
    (previousProps.cells === nextProps.cells || patternRenderRowCellsEqual(previousProps.cells, nextProps.cells))
  );
}

function usePatternGridRowModels(pattern: Pattern, geometry: PatternGridGeometry): readonly PatternRenderRowModel[] {
  const previousRowsRef = useRef<readonly PatternRenderRowModel[]>([]);
  const renderModel = useMemo(() => buildPatternRenderModel(pattern, geometry, previousRowsRef.current), [geometry, pattern]);
  const rowModels = renderModel.rows;

  useEffect(() => {
    previousRowsRef.current = rowModels;
  }, [rowModels]);

  return rowModels;
}

function AxisCell({ label, major, showGrid }: { label: number; major: boolean; showGrid: boolean }) {
  return (
    <div
      className={`pattern-axis-label grid w-full place-items-center bg-muted px-1 font-mono font-bold ${showGrid ? "border-b border-r border-border" : ""} ${
        major ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

function AxisCorner({ showGrid }: { showGrid: boolean }) {
  return <div className={`pattern-axis-corner w-full bg-foreground ${showGrid ? "border-b border-r border-border" : ""}`} />;
}
