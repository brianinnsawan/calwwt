Fonts for the DWG viewer.
- *.shx, arial.woff, tahoma.woff, verdana.woff, AIGDT.ttf: from https://github.com/mlightcad/cad-data (fonts folder).
- NTIThaiCAD-Regular.ttf: Sarabun Regular (Google Fonts, SIL Open Font License 1.1), modified: glyphs with zero
  advance width (Thai vowel and tone marks) were given an advance of 1 unit, because the viewer treats zero-width
  glyphs as missing; the family was renamed. It is registered in fonts.json under the names of the Thai AutoCAD
  fonts the drawings use (thaisimp, cordia, THSarabun, ...), which are not available for the web.
