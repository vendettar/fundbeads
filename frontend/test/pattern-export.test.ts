import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BeadColor } from "../src/palette";
import type { Pattern } from "../src/pattern";
import { exportPatternPdf, exportPatternPng, renderPatternExportCanvas } from "../src/pattern-export";

type CanvasOperation =
  | { type: "fillRect"; fillStyle: unknown; x: number; y: number; width: number; height: number }
  | { type: "fillText"; fillStyle: unknown; font: string; text: string; x: number; y: number; maxWidth?: number }
  | { type: "line"; strokeStyle: unknown; lineWidth: number; dashed: boolean; from: [number, number]; to: [number, number] };

type FakeCanvas = {
  width: number;
  height: number;
  getContext: ReturnType<typeof vi.fn>;
  toBlob: ReturnType<typeof vi.fn>;
  toDataURL: ReturnType<typeof vi.fn>;
  operations: CanvasOperation[];
};

type FakeLink = {
  href: string;
  download: string;
  click: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

type FakePdfInstance = {
  options: unknown;
  setProperties: ReturnType<typeof vi.fn>;
  setFont: ReturnType<typeof vi.fn>;
  setFontSize: ReturnType<typeof vi.fn>;
  text: ReturnType<typeof vi.fn>;
  addImage: ReturnType<typeof vi.fn>;
  output: ReturnType<typeof vi.fn>;
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
};

const pdfMock = vi.hoisted(() => ({
  instances: [] as FakePdfInstance[],
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    constructor(options: unknown) {
      const instance: FakePdfInstance = {
        options,
        setProperties: vi.fn(),
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        text: vi.fn(),
        addImage: vi.fn(),
        output: vi.fn(() => new Blob(["pdf"], { type: "application/pdf" })),
        internal: {
          pageSize: {
            getWidth: () => 842,
            getHeight: () => 595,
          },
        },
      };
      pdfMock.instances.push(instance);
      return instance;
    }
  },
}));

const black: BeadColor = { code: "B1", label: "Black", r: 0, g: 0, b: 0 };
const white: BeadColor = { code: "A1", label: "White", r: 255, g: 255, b: 255 };

function createPattern(width = 2, height = 2): Pattern {
  const colors = [black, white, null, black];
  const cells = Array.from({ length: width * height }, (_, index) => ({
    x: (index % width) + 1,
    y: Math.floor(index / width) + 1,
    color: colors[index % colors.length],
  }));
  const totalBeads = cells.filter((cell) => cell.color).length;

  return {
    width,
    height,
    cells,
    usage: [
      { color: black, count: cells.filter((cell) => cell.color?.code === black.code).length },
      { color: white, count: cells.filter((cell) => cell.color?.code === white.code).length },
    ].filter((item) => item.count > 0),
    totalBeads,
  };
}

function createCanvas(blobResult: Blob | null = new Blob(["png"], { type: "image/png" }), hasContext = true): FakeCanvas {
  const operations: CanvasOperation[] = [];
  const state = {
    fillStyle: "#000000" as unknown,
    strokeStyle: "#000000" as unknown,
    lineWidth: 1,
    dashed: false,
    from: [0, 0] as [number, number],
    font: "",
  };
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    stroke: vi.fn(() => {
      operations.push({
        type: "line",
        strokeStyle: state.strokeStyle,
        lineWidth: state.lineWidth,
        dashed: state.dashed,
        from: state.from,
        to: context.lastLineTo,
      });
    }),
    moveTo: vi.fn((x: number, y: number) => {
      state.from = [x, y];
    }),
    lineTo: vi.fn((x: number, y: number) => {
      context.lastLineTo = [x, y];
    }),
    setLineDash: vi.fn((value: number[]) => {
      state.dashed = value.length > 0;
    }),
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      operations.push({ type: "fillRect", fillStyle: state.fillStyle, x, y, width, height });
    }),
    fillText: vi.fn((text: string, x: number, y: number, maxWidth?: number) => {
      operations.push({ type: "fillText", fillStyle: state.fillStyle, font: state.font, text, x, y, maxWidth });
    }),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    lastLineTo: [0, 0] as [number, number],
    set fillStyle(value: unknown) {
      state.fillStyle = value;
    },
    get fillStyle() {
      return state.fillStyle;
    },
    set strokeStyle(value: unknown) {
      state.strokeStyle = value;
    },
    get strokeStyle() {
      return state.strokeStyle;
    },
    set lineWidth(value: number) {
      state.lineWidth = value;
    },
    get lineWidth() {
      return state.lineWidth;
    },
    set font(value: string) {
      state.font = value;
    },
    get font() {
      return state.font;
    },
    textAlign: "start" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
  };

  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (hasContext ? (context as unknown as CanvasRenderingContext2D) : null)),
    toBlob: vi.fn((callback: BlobCallback) => callback(blobResult)),
    toDataURL: vi.fn(() => "data:image/png;base64,export"),
    operations,
  };
}

function installDomFakes(options: { blobResult?: Blob | null; hasContext?: boolean } = {}) {
  const canvases: FakeCanvas[] = [];
  const links: FakeLink[] = [];
  const append = vi.fn();

  vi.stubGlobal("document", {
    createElement: vi.fn((tagName: string) => {
      if (tagName === "canvas") {
        const canvas = createCanvas(options.blobResult, options.hasContext);
        canvases.push(canvas);
        return canvas;
      }
      if (tagName === "a") {
        const link: FakeLink = {
          href: "",
          download: "",
          click: vi.fn(),
          remove: vi.fn(),
        };
        links.push(link);
        return link;
      }
      throw new Error(`Unexpected test element: ${tagName}`);
    }),
    body: {
      append,
    },
  });
  vi.stubGlobal("window", {
    setTimeout: globalThis.setTimeout,
  });
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:fundbeads-test"),
    revokeObjectURL: vi.fn(),
  });

  return { canvases, links, append };
}

describe("pattern export rendering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pdfMock.instances.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders cells, axes, codes, and helper grid lines into a bounded canvas", () => {
    const { canvases } = installDomFakes();

    const canvas = renderPatternExportCanvas(createPattern(10, 5), {
      showAxes: true,
      showCodes: true,
      showGrid: true,
      cellSize: 18,
    }) as unknown as FakeCanvas;

    expect(canvas).toBe(canvases[0]);
    expect(canvas.width).toBe(288);
    expect(canvas.height).toBe(140);
    expect(canvas.operations).toContainEqual(expect.objectContaining({ type: "fillText", text: "B1" }));
    expect(canvas.operations).toContainEqual(expect.objectContaining({ type: "fillText", text: "A1" }));
    expect(canvas.operations).toContainEqual(expect.objectContaining({ type: "fillText", text: "10" }));
    expect(canvas.operations).toContainEqual(expect.objectContaining({ type: "line", lineWidth: 2, dashed: true }));
    expect(canvas.operations).toContainEqual(expect.objectContaining({ type: "line", lineWidth: 3, dashed: false }));
  });

  it("omits axes, codes, and grid strokes when preview toggles are off", () => {
    const { canvases } = installDomFakes();

    const canvas = renderPatternExportCanvas(createPattern(2, 2), {
      showAxes: false,
      showCodes: false,
      showGrid: false,
      cellSize: 24,
    }) as unknown as FakeCanvas;

    expect(canvas).toBe(canvases[0]);
    expect(canvas.width).toBe(48);
    expect(canvas.height).toBe(48);
    expect(canvas.operations.some((operation) => operation.type === "fillText")).toBe(false);
    expect(canvas.operations.some((operation) => operation.type === "line")).toBe(false);
  });

  it("throws a clear error when canvas context is unavailable", () => {
    installDomFakes({ hasContext: false });

    expect(() =>
      renderPatternExportCanvas(createPattern(), {
        showAxes: true,
        showCodes: true,
        showGrid: true,
      }),
    ).toThrow("Canvas export is not available in this browser.");
  });

  it("downloads PNG exports and revokes object URLs after the click", async () => {
    const { links, append } = installDomFakes();

    await exportPatternPng(createPattern(), { showAxes: true, showCodes: true, showGrid: true });

    expect(append).toHaveBeenCalledWith(links[0]);
    expect(links[0].download).toBe("fundbeads-2x2.png");
    expect(links[0].href).toBe("blob:fundbeads-test");
    expect(links[0].click).toHaveBeenCalledTimes(1);
    expect(links[0].remove).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

    vi.advanceTimersByTime(1000);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fundbeads-test");
  });

  it("rejects PNG export when canvas blob creation fails", async () => {
    const { canvases, links } = installDomFakes({ blobResult: null });

    await expect(exportPatternPng(createPattern(), { showAxes: true, showCodes: true, showGrid: true })).rejects.toThrow("PNG export failed.");
    expect(canvases[0].toBlob).toHaveBeenCalledTimes(1);
    expect(links).toHaveLength(0);
  });

  it("exports a single-page PDF image with title metadata and a deterministic filename", async () => {
    const { links } = installDomFakes();

    await exportPatternPdf(createPattern(3, 2), { showAxes: true, showCodes: true, showGrid: true });

    expect(pdfMock.instances).toHaveLength(1);
    expect(pdfMock.instances[0].options).toMatchObject({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
    expect(pdfMock.instances[0].setProperties).toHaveBeenCalledWith({ title: "Fundbeads 3x2", creator: "Fundbeads" });
    expect(pdfMock.instances[0].text).toHaveBeenCalledWith("Fundbeads 3x2", 24, 28);
    expect(pdfMock.instances[0].addImage).toHaveBeenCalledWith("data:image/png;base64,export", "PNG", expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), undefined, "FAST");
    expect(links[0].download).toBe("fundbeads-3x2.pdf");
  });
});
