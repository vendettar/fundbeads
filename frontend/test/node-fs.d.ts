declare module "node:fs" {
  export function readFileSync(path: URL | string, options: "utf8"): string;
}
