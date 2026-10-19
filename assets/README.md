# Local demo assets

- `favicon.png` is a proportion-preserving 64px derivative of the supplied `logo.png`; the original is unchanged.
- Six Services/Specialties SVGs come from [Lucide](https://lucide.dev), with only the stroke color changed to brand navy. They are bundled locally; no icon JavaScript/CDN is required. The complete upstream ISC and applicable Feather MIT notices are retained in `icons/lucide/LICENSE.txt`.
- DM Sans and Plus Jakarta Sans Latin variable WOFF2 subsets are bundled locally with `font-display: swap`. Their original SIL Open Font License notices are in `fonts/`. No font request is made to Google during the demo. System fonts cover characters outside those subsets.
- `_codex/release-assets.json` records pinned upstream sources, hashes and the Lucide commit. Full originals/project provenance remain separate from licensed third-party icons/fonts.

Actual company projects continue through publication-aware `api/portfolio-image.php`; copy the private image folder along with SQL when moving laptops. Do not replace it with direct public file paths or reference-post screenshots.
