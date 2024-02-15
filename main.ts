import { bundle } from "https://deno.land/x/emit@0.36.0/mod.ts";

if (import.meta.main) {
  const path = new URL(import.meta.resolve("./get.ts"));
  const { code } = await bundle(path, { minify: true });
  await Deno.writeTextFile("./bundle.min.js", code);
}
