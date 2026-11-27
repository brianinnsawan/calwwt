# Open CAD Studio 2026.47: review before use on calwwt (27 Nov 2026)

**Outcome (27 Nov 2026, 08:00):** 2026.47 went live and was taken back within the hour. Brian got the renderer error on the
live site: the web build of Open CAD Studio only has the WebGL2 path (iced `webgl` feature), so bug 1 below hits every
browser, not only those without WebGPU as first written. calwwt now runs 2026.41, the same files as calnkt. The page
hardening (address, Save-as picker, save hook) stays; it does nothing harmful with 2026.41. Before the next upgrade, open a
drawing in a real browser with the new version first.

Brian asked for calnkt's CAD workspace on calwwt, with the newest Open CAD Studio from GitHub, checked for bugs, viruses
and backdoors first. calnkt runs 2026.41 (11 Oct 2026); upstream had six newer releases (2026.42 to 2026.47).

## What was checked

| Check | Result |
|---|---|
| Web build is the official one | `OpenCADStudio-v2026.47-web.zip` from the v2026.47 release page, SHA-256 `e0ab57e8…7de4e`. Its `release.json` names commit `8e5f39f6…`, the commit the `v2026.47` tag points to. |
| Build matches the tagged source | The program's JavaScript files (`ocs-parse-worker.js`, `ocs-control.js`, the clipboard snippet) are byte for byte the files in the tag; `sw.js` differs only by the cache name the build stamps in. The WebAssembly file matches the integrity value (SHA-384) in the program's own page. |
| What the program can do in the browser | Compared the browser functions the WebAssembly may call (wasm-bindgen imports) with 2026.41. New: `fetch` with a request object (open a drawing from a `?file=` address, images linked in a drawing, a fonts address typed in the Missing fonts dialog), messages to a parent page (only in `?embed=1` mode, only same-origin), the browser's "Save as" picker, storage persistence. **No** WebSocket, beacon, XMLHttpRequest, `eval`, service-worker registration, camera, microphone or location. The only runtime-built function is the standard `return this`. |
| Addresses inside the program | Every web address compiled into the WebAssembly was listed: standards (w3.org, json-schema.org, openxmlformats), help and project links (github.com, opencadstudio.com, youtube, reddit, patreon, wikipedia, open-aec.com, 3dconnexion.com). No tracking, analytics or unknown servers. |
| Source changes 2026.41 → 2026.47 | About 680,000 lines changed, too many to read line by line; reviewed by what they can reach: the build script (`build.rs`: icons and command help only, no downloads), the new web files, every network / process / eval call. The MCP server, plugin marketplace and network code are desktop-only (not compiled into the web build). |
| New third-party code | 57 new packages. 43 from crates.io, well-known (jsonschema, rmp-serde, rustybuzz, proj4rs, mimalloc, strum, uuid-simd …). Git sources: `acadrust` (hakanaktt), `ifccad` (OpenAEC Foundation), `solidcore` (tangency-labs), `opencaddocument` (the author). Fetched at the pinned commits and searched: no network, process or eval code; their build scripts only generate code. |
| Viruses / malware | None found. The web build cannot reach anything outside the site anyway: calwwt's security policy allows connections to calwwt only (`connect-src 'self'`), no outside scripts. |

Not possible here: rebuilding the WebAssembly from source to compare byte for byte (the Rust WebAssembly target cannot be
downloaded in this workspace). The build is trusted to the project's own GitHub Actions run from the tagged commit.

## Bugs found (and what the site does about them)

1. **2026.47 does not draw on the older graphics path (WebGL2).** Its circle and ellipse shaders use `@interpolate(linear)`,
   which WebGL2 cannot translate; in a browser without WebGPU the program opens the drawing but shows nothing (tested:
   2026.41 draws the same file in the same browser). 2026.46 and upstream `main` after the release do not have it, so the
   next release should fix it. Most current Chrome / Edge (Windows, Mac, Android) and Safari use WebGPU and are not affected.
   The page now tells people whose browser has no WebGPU. Update to 2026.48 when it is out.
2. **Save went around the site's rules.** Since 2026.42 the program saves with the browser's "Save as" picker (Chrome / Edge),
   writing straight to the person's computer: view-only people could have saved, and "Save to the site" was skipped. The
   site page removes the picker before the program starts, so the program falls back to its download, which the page catches.
3. **A link could make the program fetch another drawing.** Since 2026.42 `?file=<address>` opens a drawing from any address.
   The page keeps only its own `?dwg=` / `?copy=` (and the CSP blocks outside addresses anyway).
4. Size: the WebAssembly file grew from 57 MB to 153 MB (50 MB compressed, stored in three parts). First opening takes longer;
   the browser keeps it afterwards.

2026.46 was also considered (it draws on WebGL2), but one of its components (`opencadkernel`) is no longer public on
GitHub, so it could not be reviewed; 2026.47 replaced it with public code.
