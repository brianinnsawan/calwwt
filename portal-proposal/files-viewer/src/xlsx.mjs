// Excel (.xlsx) in the browser (ExcelJS, MIT): reading for the viewer, and writing new workbooks for the
// tracker downloads (Milestones, Drawing changes). Edits to uploaded files use xlsxedit.mjs instead.
import ExcelJS from 'exceljs';
export { ExcelJS };
export async function readWorkbook(buffer) { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer); return wb; }
