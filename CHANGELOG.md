# Changelog

All notable changes to PhilFIDA 7 Asset Management are documented in this file.

## Asset Inventory System 2.0

### Added

- **Excel Import** – Import assets from Excel files via new Import modal (Dashboard). Uses ExcelJS for parsing; supports ARTICLE, DESCRIPTION, OLD/NEW PROPERTY NUMBER, and other columns.
- **Export Modal** – Choose what to export: All Assets, Serviceable Assets, or Unserviceable/Obsolete. Replaces direct export button.
- **Bulk Delete** – Select multiple assets via checkboxes and delete them in one action. Available on Dashboard, Serviceable Assets, and Unserviceable Assets pages.
- **Description field** – New optional field on asset form for specs (e.g. RAM, storage). Stored in Firestore and included in API.
- **Asset service life** – 5-year life tracking with `getAssetLifeInfo()`: age in service, years left, and "For Replacement" flag. Shown in asset table, detail modal, and Scan QR.
- **IconUpload** – New icon component for upload actions.

### Changed

- **Asset Form – Property Numbers**
  - Old Property Number is now **optional** (was required)
  - New Property Number is now **required** (was optional)

- **Asset Form – Description field**
  - Added placeholder: "e.g. RAM size, storage size, and other specs..."

- **Asset Form – Remarks section**
  - Updated placeholder to: "e.g. POOR condition, good condition, bad condition"

- **Excel export** – Switched from `xlsx` to `exceljs`. New column layout: ARTICLE, DESCRIPTION, OLD/NEW PROPERTY NUMBER, YEAR OF ACQ., UNIT OF MEASURE, TOTAL VALUE, ISSUED TO, LOCATION, quantities, SHORTAGE/OVERAGE, REMARKS. PHP-style value formatting.

- **Asset table** – Row checkboxes for bulk selection; bulk action bar; improved life indicator (age, years left, For Replacement). Detail modal shows "Year of Acquisition & Service Life" with 5-year life info.

- **Scan QR** – Year of acquisition display now includes service life hint (age in service, years left / For Replacement).

- **Dashboard** – Import and Export buttons; Bulk Delete; Export modal. Export moved from direct download to modal.

- **Serviceable / Unserviceable pages** – Bulk Delete, Export modal (replaces direct export).

### Dependencies

- **Added:** `exceljs` ^4.4.0
- **Removed:** `xlsx` ^0.18.5

### New Files

- `src/components/ImportModal.jsx` – Excel import UI
- `src/components/ExportModal.jsx` – Export options modal
- `src/components/BulkDeleteConfirm.jsx` – Bulk delete confirmation
- `src/lib/importExcel.js` – Excel parsing for import
