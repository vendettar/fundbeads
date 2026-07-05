export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export type BeadColor = Rgb & {
  code: string;
  label: string;
};

export const mardPalette: BeadColor[] = [
  { code: "A1", label: "White", r: 248, g: 247, b: 238 },
  { code: "A2", label: "Cream", r: 238, g: 224, b: 188 },
  { code: "A5", label: "Tan", r: 194, g: 151, b: 91 },
  { code: "B1", label: "Black", r: 28, g: 27, b: 25 },
  { code: "B4", label: "Charcoal", r: 74, g: 73, b: 72 },
  { code: "C2", label: "Cherry Red", r: 196, g: 37, b: 49 },
  { code: "C5", label: "Coral", r: 236, g: 91, b: 80 },
  { code: "D1", label: "Pumpkin", r: 229, g: 116, b: 34 },
  { code: "D4", label: "Goldenrod", r: 235, g: 170, b: 45 },
  { code: "E2", label: "Lemon", r: 246, g: 217, b: 66 },
  { code: "F1", label: "Mint", r: 150, g: 209, b: 159 },
  { code: "F4", label: "Kelly Green", r: 48, g: 149, b: 79 },
  { code: "G2", label: "Teal", r: 27, g: 138, b: 139 },
  { code: "G6", label: "Aqua", r: 78, g: 185, b: 196 },
  { code: "H1", label: "Sky Blue", r: 111, g: 173, b: 220 },
  { code: "H7", label: "Royal Blue", r: 42, g: 93, b: 180 },
  { code: "H14", label: "Navy", r: 28, g: 48, b: 104 },
  { code: "J2", label: "Lavender", r: 171, g: 140, b: 205 },
  { code: "J6", label: "Purple", r: 107, g: 70, b: 151 },
  { code: "K1", label: "Bubblegum", r: 238, g: 143, b: 174 },
  { code: "K4", label: "Magenta", r: 190, g: 56, b: 125 },
  { code: "L2", label: "Chocolate", r: 102, g: 67, b: 45 },
  { code: "L7", label: "Rust", r: 144, g: 72, b: 38 },
  { code: "M1", label: "Light Gray", r: 194, g: 194, b: 185 },
  { code: "M4", label: "Slate", r: 104, g: 116, b: 121 },
  { code: "N2", label: "Peach", r: 242, g: 174, b: 133 },
  { code: "N6", label: "Sand", r: 213, g: 190, b: 140 },
  { code: "P3", label: "Olive", r: 117, g: 132, b: 67 },
];
