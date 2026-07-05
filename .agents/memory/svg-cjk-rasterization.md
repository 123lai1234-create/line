---
name: SVG/CJK rasterization for LINE images
description: Why resvg-js renders CJK as tofu and what to use instead when generating images (e.g. LINE rich menu) with Chinese text.
---

# Rasterizing images with CJK (Chinese) text in Node

**Rule:** Do NOT use `@resvg/resvg-js` to rasterize SVG that contains CJK text. Use `@napi-rs/canvas` (draw with the 2D API + `GlobalFonts.register(buffer, family)`) instead.

**Why:** `@resvg/resvg-js` (observed on 2.6.2) only consults the BMP **format-4** cmap subtable of a loaded font. Many CJK fonts (e.g. jf-openhuninn) put Latin glyphs in format-4 but their Chinese glyphs only in the **format-12** subtable. Result: the font loads and Latin renders fine, but every Chinese character renders as a `.notdef` tofu box (□). The font is not the problem — verify with the `maxp` glyph count + `cmap` format-12 lookup and you'll see the glyphs exist.

**How to apply:**
- CJK image generation → `@napi-rs/canvas`. Register the font buffer, set `ctx.font = "bold 132px <family>"`, draw text with `fillText`. Icons/shapes translate cleanly from SVG paths to canvas path calls.
- The font's real family name comes from its `name` table (nameID 1). jf-openhuninn's is `jf-openhuninn-2.0`, but with `@napi-rs/canvas` you pick your own alias in `GlobalFonts.register`.
- A tofu render that still produces a valid PNG (Latin correct, CJK boxes) is the tell-tale sign of this cmap-subtable issue, not a missing/corrupt font.
