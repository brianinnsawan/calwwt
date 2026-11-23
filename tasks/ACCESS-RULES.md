<!-- calwwt.sppwork.com (23 Nov 2026): copied from calnkt. Page ids are the same; on calwwt "drawings" is the Sites tab, "timeline" covers the site timelines and Milestones, and "safety" / "scurve_*" have no pages. People groups used: SPP staff and Caltex. -->
# NTI City Park task app: access rules

The source of truth for who can see and do what. The tests in `tests/` check every rule here for every person.
Confirmed with Brian on 1 Nov 2026. Change this file first, then the roster in `src/roster.mjs`, then the tests.

## People

| Person | Company | Level | Title (shown to SPP) |
|---|---|---|---|
| Brian | SPP | Admin | Overall Project Manager |
| Ming | SPP | Admin | (not given) |
| Keng | SPP | Manager | Head Architect |
| Noom | SPP | Staff | (not given) |
| Bo | SPP | Staff | Billing administration |
| Boss | SPP | Observer | (not given) |
| Praew | SPP | Observer | (not given) |
| A | SPP | Team | (not given) |
| Tle | SPP | Team | (not given) |
| Gift | SPP | Team | (not given) |
| Por | SPP | Team | (not given) |
| Bas | Caltex | Partner | Overall Engineering Manager |
| Net | Caltex | Partner | Project Manager |
| Boy | Caltex | Partner | Head Architect |
| Oat | Caltex | Partner | Head of Safety |
| Tom, Men, Wut | KS Consulting | Partner | (not given) |
| Chai | Land owner | Partner | Land owner |

The site engineer is not named yet. Do not invent names or titles.

Screen language: Thai for everyone except Brian (English). Each person can switch on their own device.

Levels:
- **Admin**: sees everything, changes anything, manages people and accounts (Brian, Ming).
- **Manager**: sees everything, changes and closes any task.
- **Staff**: sees everything, works on any task.
- **Observer**: sees everything, including admin screens, but cannot change anything. Hidden from everyone except Admin, Manager and Staff.
- **Team**: the site team. Sees their own work and every task that has a site team member on it (10 Nov 2026).
- **Partner**: Caltex, KS Consulting and the land owner. Sees only work that involves their own company.

The app never shows the word "subcontractor". Partners see every SPP person as "SPP project staff".

## Who can see whom (directory, @ suggestions, names)

| Viewer | Sees |
|---|---|
| Admin, Manager, Staff, Observer | Everyone |
| Team | All SPP people except Observers, plus their request contacts (Gift sees Oat) |
| Caltex | All SPP people except A and Observers, plus Caltex |
| KS, Land owner | KS, Land owner, Brian, Bo, Noom (no other SPP staff, no Caltex) |

On a task you can see, the other people on it are shown by name, unless they are hidden from you:
- A is always hidden from partners. Partners see A's place as "SPP project staff".
- Gift is hidden from KS Consulting and the land owner (Caltex can see her).
- Observers are always hidden from everyone except Admin, Manager and Staff.

Example: Gift sees the real sender "Bas (Caltex)" on a task Bas gave her, without seeing the rest of Caltex.

## Who can see which tasks

1. Admin, Manager, Staff, Observer: every task.
2. Everyone: tasks they created, lead, are assigned to, or were shared with.
3. Team (site team): also every task that has any site team member on it as creator, lead, assignee or shared-with
   (Brian, 10 Nov 2026: "we should be able to see one another's tasks"). Leading and following still count as before.
   - So a task Dear sends to Brian and shares with Por is seen by the whole site team.
   - A task Brian sends to A or Tle is now seen by the rest of the site team too.
   - A task with no site team member on it (for example Keng to Ming) is still not visible to the site team.
   - Seeing is not changing: a site team member can read and comment on a teammate's task, but only the people on it and
     their leads can edit it, and only the creator, a lead, a Manager or an Admin can close it.
4. Partners: also every task that involves anyone from their own company (Bas sees what Net sent to SPP).
   - Internal follow-ups and private notes on requests are never shown to partners.

## Who can do what

- **Create tasks**: everyone except Observers.
- **Assign**: only people you can see. SPP cannot assign tasks to partners; they send requests instead.
- **Edit, progress, checklist, comments, hand off**: people on the task, their leads and followers (so Tle can help clear A's work), Staff, Manager, Admin; the creator's own company for partner tasks.
- **Mark complete (close)**: the task's creator, Manager, Admin, or a lead of someone assigned. Others "Send for sign-off".
- **Reopen**: same as close, and a reason is required.
- **Observers**: read only, everywhere.
- Progress (0–100%) is separate from completion: 100% does not close a task.

## Requests to partners

A request asks a partner for an approval, review or sign-off. It creates a public request the partner sees and a private follow-up task for SPP. Private notes stay on the follow-up and are never shown to partners.

| Sender | May send requests to |
|---|---|
| Brian, Noom | Anyone at Caltex, KS Consulting or the land owner |
| Ming | Oat |
| Keng | Boy, Net |
| Bo | Net |
| Gift | Oat |
| Everyone else | Nobody |

So Bas only receives requests from Brian and Noom.

Partners answer with "Mark as answered"; the sender (or Admin/Manager) closes the request.

## Reporting lines and notifications

| Person | Reports to |
|---|---|
| A | Brian, Noom |
| Tle | A, Ming, Brian |
| Gift | Tle, Ming, Brian |
| Por | Tle, Ming, Brian |

- When someone with a reporting line creates, sends for sign-off, closes or hands off a task, the people they report to get an in-app notification.
- Safety items from the team also go to everyone marked "Gets safety reports" (Ming).
- Noom is marked "No reporting updates": Noom sees everything but gets no reporting notices, and is still told when assigned or @mentioned.
- In-app notifications only. No email, LINE or push is sent.

## Page access (Admin page, 1 Nov 2026)

calnkt.sppwork.com is the single project site: one login opens every page the person is allowed. There are no links out to other sites.
Admins (Brian, Ming) set a level per page on the **Admin page** (`/admin` → Pages & access): **none** (hidden and blocked), **view**, or **edit**,
per group with per-person exceptions. Only admins can open the Admin page (Brian, 1 Nov 2026); there is no Team page for anyone else.

Defaults confirmed by Brian (1 Nov 2026). Money = shows costs or progress value.

| Page | SPP staff | Site team (A, Tle, Gift, Por) | Caltex | KS | Land owner |
|---|---|---|---|---|---|
| Drawings & models (and drawing changes) | view | view | view | none | none |
| Safety library (TCC / JLA) | view | view | view | none | none |
| Project timeline | view | view | view | view | view |
| S-curve: station portion (money) | view | none | view | view | view |
| S-curve: Caltex fuel portion (money) | view | none | view | none | none |
| Tasks | edit | edit | edit | edit | edit |
| Project files (safety & engineering) | edit | view | view (shared files only) | none | none |
| Meetings (SPP–Caltex) | edit | none (Tle, Jaran, Gift: edit) | edit | none | none |

- Nobody gets schedule **edit** automatically, including admins. Brian's owner login has it; admins grant it per person.
- Admins always keep at least view on every page (no lock-out). Observers never get edit.
- Tasks at **view** = read-only task app (the API refuses changes). Tasks at **none** = no task app.
- Drawings and Safety are view-only on this site for now. Schedule pages arrive with the S-curve move (Step B).
- The server checks the level on every request. Every change is logged (append-only) and shown under Admin → Change log.
- Project logins never get the old site's own drawing store (/api/drawings, /app/). Their CAD tool is Drawings -> CAD workspace
  (below), which follows the Drawings level. File uploads only in Project files (below).

## Roster changes on the live site (1 Nov 2026, Brian)

- **Butsaba**: site team, "Site administration" (general admin for the site only, not a system admin). Reports to Tle and A. Hidden from Caltex, KS and the land owner.
- **Jaray**: site team, "Site engineer". Reports to Brian and Tle. Caltex can see him. He cannot send requests to Caltex.
- **Noom**: title "SPP owner".
- **Praew**: "Safety auditor", same access as Ming: admin, notified of every safety item, can send requests to Oat.
- **Hidden from KS and the land owner**: every site team member (A, Tle, Gift, Por, Butsaba, Jaray), plus Praew and Boss. They still see only Brian, Bo and Noom from SPP.
- New people are added on Admin → People & logins → Add a person. Site team members added there are hidden from KS and the land owner by default.

- **Removing a person** (Brian, 15 Nov 2026): Admin → People & logins → Edit → **Remove from the project**. Admins only; nobody can
  remove themselves, and only the owner can remove the owner's own record. One step, after a confirmation:
  - the person is switched off (no pages, no task app, their assistant keys stop working) and their login is switched off and
    signed out everywhere;
  - their reporting lines (both ways), follows, request contacts, safety-report flag and personal page settings are cleared;
  - every task still to do that was assigned to them goes to the admin who pressed the button, who also becomes the lead where
    the person was the lead; tasks only shared with them lose the share. "Still to do" = not closed, plus the newest copy of a
    repeating task (the next copy takes its people from there);
  - closed tasks, comments and the history keep the person's name, and tasks they created stay created by them. Nothing is deleted.
  It is recorded in each task's history and in Admin → Change log. Switching the account back on later does not bring the tasks
  or reporting lines back.

(The roster in `tasks/src/roster.mjs` is only the starting data for new databases and tests. The live list is in the database and is changed on the Admin page.)

## View the site as someone (admins, 1 Nov 2026)

Admin → Check a person → **View the site as …** opens the real pages as that person sees them.
Rules:
- Only admins can start it. The cookie that carries it is honoured only while the real signed-in person is an admin, so a copied or hand-made cookie does nothing.
- View only: the server refuses every change while it is on, including tasks, requests, logins and access settings.
- A yellow banner shows who is being viewed, with **Stop viewing**. It ends by itself after one hour.
- Every start is recorded in Admin → Change log.

## Schedule (S-curve) on calnkt (1 Nov 2026)

- S-curve station portion = the project's **Landlord** side; S-curve Caltex fuel portion = the **Caltex** side.
- Both portions: the whole project, with values. One portion: that side only, with its values (other side not sent at all).
- Project timeline only (e.g. the site team): the plan (Gantt) without BOQ values or money.
- Editing on calnkt: Brian's owner login only, saved as his S-curve owner account. Everyone else is view only. Who sees the project is managed on the Admin page, not in the S-curve's Manage tab.

## Project files (`/files`, 2 Nov 2026)

A shared file area for safety and engineering files, kept in private storage behind the login.
- **SPP staff** (level edit): see every file; upload (drag and drop), make folders, delete. Uploading a file with the same name in the same folder makes a new version; the old one is hidden but kept.
- **Site team** (level view): see and download every file. An admin can raise a person to edit.
- **Caltex**: sees only files shared with Caltex, from the file's sharing date (Thailand time). Partners never see who uploaded a file or when it is planned to be shared.
  - **Weekly safety meetings** folder: each deck is shared with Caltex automatically from the **Monday of its meeting week**, read from the date in the file name (for example `... 2026-11-04.pptx` → visible from Monday 2 Nov). A file without a date stays SPP-only until an admin shares it.
  - Other folders: SPP-only until an admin presses **Share with Caltex** and picks a date.
- **KS and the land owner**: no Files tab; the server returns 404.
- Files open in the browser, inside the site (no outside services): PDF and pictures (browser), Word .docx, Excel .xlsx
  (sheet tabs, merged cells, first 3,000 rows), PowerPoint .pptx (slides, plus **Present**: full-screen slide show,
  arrow keys / click to move), CSV and text, and DWG / DXF in the CAD viewer (/files/cad/; measure, layouts).
  Older .doc / .ppt / .xls and other types download only. Office previews can differ slightly from Office;
  the downloaded file is the original. Readers: docx-preview, ExcelJS, pptx-preview (portal-proposal/files-viewer),
  LibreDWG / mlightcad CAD viewer (scripts/import-files-cad.mjs). The DWG reader's worker alone is allowed 'unsafe-eval'.
- Delete only hides a file (it stays in storage). Every upload, new version, share and delete is in the append-only file log.
- Files are at most 95 MB each.

## Sub-tabs (1 Nov 2026)

Some tabs have a second row of links, shown only for the parts a person may open:
- **Drawings**: Site model · **Drawing changes** (on-site design change log, from the "Design Change" sheet of
  Construction Change Tracking rev02). Follows the Drawings level: view = read, **edit = add / change / remove entries**.
  Only Brian's owner login has Drawings edit by default; admins grant it per person or group on the Admin page.
  · **CAD workspace** (see "CAD workspace" below).
- **Safety**: Safety library · **Camp & excavation stages** (the 3D temporary camp, power and works-phase page that was
  at nti-nkt-camp.brianin-nsawan.workers.dev, now served here with its models; built by portal-proposal/camp-src) · **HES plan**: the newest "HES Stewardship Plan ... .xlsx" uploaded anywhere in Files,
  shown read-only (Excel viewer) to everyone with the Safety page, whatever the file's Caltex sharing. Update it by
  uploading a new copy in Files. Hidden sheets in the workbook are not shown, but the Download button gives the whole file.
  · **Scaffold 3D model** (/scaffold-3d/): SPP's frame scaffold tower in 3D with the erection sequence (two workers, harness
  and SRL). A training page with no project data; view only, for everyone with the Safety page (19 Nov 2026).
- **Schedule**: Plan & S-curve · **Milestones** (Design D1-6, Permission P1-12, Registration R1-6, Construction C1-12,
  from the "Timeline" sheet). Follows the Project timeline level, so KS and the land owner see it too:
  view = read, edit = change plan / actual / remarks (Brian's owner login by default).
- Every tracker change is kept in an append-only log (milestone_log, drawing_change_log). Tables: schema 0006.

## CAD workspace (`/cad-workspace/`, 2 Nov 2026)

Brian: bring over the CAD tool of the old site (brian-cad-version2) so people can draw and take measurements.
- Drawings -> **CAD workspace**. Opens the 31 project DWG drawings (the verified copies already in private storage), the DWG / DXF
  files in Project files that the person may see (Files rules, including Caltex sharing), and, for Brian's owner login only, his
  drawings saved on the old site. Tools: fit, pan, layouts, measure (distance, chain, area, angle), draw markups (line, arrow,
  rectangle, circle, cloud, text), undo / redo, background, download the original file. Same open-source engine as the Files
  CAD viewer (mlightcad + LibreDWG, everything served from this site).
- Follows the **Drawings** level: **none** = 404 (KS and the land owner by default; old /workspace/ and /cad/ links too);
  **view** = open, measure and draw on the screen, nothing is saved (the server refuses); **edit** = also **Save**.
  "View the site as" is always view only. Only Brian's owner login has Drawings edit by default.
- What is saved is the drawing's **notes** (its measurements and markups), never the drawing file. Notes belong to a company:
  each company has one shared set per drawing; every save is a new numbered version (who, when, optional note), older versions
  can be opened again, nothing is replaced or deleted. **SPP sees every company's notes; a partner company sees only its own.**
  Saving from an older copy is refused ("someone saved newer notes").
- **Share with Caltex** (Brian, 2 Nov 2026): an SPP person with Drawings edit can share SPP's notes on one drawing with Caltex
  (Saved notes panel), and stop sharing again. While shared, Caltex sees SPP's **newest** version (it follows new saves), read
  only and labelled as SPP's, next to Caltex's own notes; older SPP versions stay SPP-only. Only drawings Caltex may open
  count: project DWGs, and Files DWG / DXF shared with Caltex (if the Files sharing is removed, Caltex loses the notes too).
  Every share and stop is kept with who and when (shown in the panel). Never through "View the site as". Names hidden from
  Caltex (A, observers) show as "SPP project staff".
- Looks and works like AutoCAD (Brian, 3 Nov 2026): ribbon (Home, Annotate, Measure, View, Output), file tabs with Start,
  dark model space, command line with AutoCAD names (L, LE, REC, C, REVCLOUD, T, DI, AA, ANG, CHAIN, Z E / ZE, P, U, REDO,
  ERASE, SAVE; F1 help, F8 Ortho for measurements), status bar (Model / layouts, cursor X, Y), palette (Drawings, Saved
  notes). Typed drawing commands draw markups, which are what is saved; the drawing file never changes. Same rules as above.
- **Full CAD program** (button in the CAD workspace, `/cad-workspace/full/`; the old site's `/app/` leads here; Brian,
  2 Nov 2026): Open CAD Studio 2026.41, the open-source CAD program the old site had, official web build from Brian's
  private archive (brianinnsawan/open-source-cad-project; GPL-3.0). Opens the chosen drawing; menus are in English.
  Same Drawings levels: none = 404; **view** = open, look and measure; the program's Save / download is blocked;
  **edit** = Save offers **Save to the site** (a separate numbered *copy* of that drawing, DWG / DXF only, never over the
  original; who, when, note) or Download to this device. View-as is view only. Copies follow the notes rule: SPP sees
  all; a partner company its own; Caltex also sees SPP's **newest** copy of a drawing while SPP shares that drawing's notes
  with Caltex (read only; stopping the share hides it). Hatches are not drawn in the browser version.
  The program's files sit in a folder named after its version (`/cad-workspace/full/v2026.41/`) and may stay in the
  browser's private cache for a year (Brian, 2 Nov 2026); the Drawings check still runs on every request, and pages,
  APIs and drawings are never cached.

## Excel editing and downloads (1 Nov 2026)

- **Edit cells** (Excel files in Files, and Safety -> HES plan): people who may upload to Files (SPP, Files at edit) can type into
  cells in the browser. Saving writes only the changed cells into a copy of the file (portal-proposal/files-viewer/src/xlsxedit.mjs);
  every other part of the workbook (tables, pictures, formulas, print settings, SharePoint data) stays byte for byte the same.
  The copy is saved as a new version; the previous version is kept. Formula cells cannot be edited.
- **Saving by itself and editing together** (10 Nov 2026, Brian): there is no Save button. Changes save a moment after the
  person leaves a cell (or after 3 seconds without typing). One person's run of edits goes into one version: an autosave folds
  into the version it starts from only if that version was an autosave by the same person that began less than 15 minutes ago
  and is not a shared HES version (a shared HES version is never changed, audit F03); otherwise a new version starts.
  Versions uploaded by hand are never changed. A save always says which version (and saved time) it started from, and the
  check and the write happen in one database transaction, so two saves can never both replace the same version; the refused
  one is laid on top of the newer version by the browser and saved again (same cell: the later entry wins, with a notice).
- **Totals follow your changes** (10 Nov 2026, Brian): while editing, formulas that depend on a changed cell are worked out
  in the browser by the site's own calculator (portal-proposal/public/files/formula.mjs, no outside library) and shown at
  once; on save their new results are written next to the formulas in the file, so everyone sees the right totals. Formulas
  not affected by a change keep the value Excel saved. A formula the site cannot work out (an unusual function, a link to
  another workbook, SUBTOTAL over hidden rows) is shown as its formula, never as a number that may be wrong, and its saved
  result is removed. Every save also marks the workbook "recalculate when opened", so Excel checks every formula itself.
  The formulas themselves are never changed. Workbooks with more than 20,000 formulas are not worked out on the site.
  Also fixed: a formula whose answer is 0 was shown as its formula text, and error values as "[object Object]".
- **Typing into PowerPoint slides** (10 Nov 2026, Brian): people who may upload to Files get an **Edit** button on a .pptx.
  Any text on a slide (titles, bullets, text boxes, table cells, grouped shapes) can be clicked and typed in; Enter starts a
  new line / bullet formatted like the one before, Backspace at the start of a line joins it to the previous one. Only the
  edited text is rewritten in the file (portal-proposal/files-viewer/src/pptxedit.mjs + ooxml-text.mjs): inside a paragraph
  only the changed part, so bold / colour / links around it stay; pictures, layouts, animations and notes are untouched
  and keep their bytes. Text from the slide master / layout, slide numbers and dates cannot be typed in. Saving works as
  for Excel (by itself, one version per run of edits, earlier versions kept); files over 3 MB save a few seconds after the
  last change instead of at once. Several people: other people's saves appear by themselves (for files over 3 MB a bar
  offers "Show the newest version"). Changes to different text boxes at the same moment are both kept; if two people change
  the same text box at the same moment the first save stays and the other person is told and shown what they typed.
- **Typing into Word documents** (10 Nov 2026, Brian): the same for a .docx. Any paragraph of the main text (headings,
  numbered and bulleted lists, table cells) can be clicked and typed in; Enter starts a new paragraph with the same style
  (numbering carries on), Backspace at the start joins it to the one before. Only the edited text is rewritten
  (portal-proposal/files-viewer/src/docxedit.mjs): tabs, line breaks, bold / colour / links around the change, styles,
  pictures, headers and footers stay. Not typed in here: headers and footers, and paragraphs holding a picture, a field
  (page number, table of contents), tracked changes or a footnote mark. Several people: changes to different paragraphs at
  the same moment are both kept; if two people change the same paragraph the first save stays and the other person is told
  and shown what they typed.
- **Uploads are all or nothing** (10 Nov 2026, site audit): a file is stored first and then listed. If listing it fails or
  is refused, the stored copy is removed again, so storage never holds a copy the list does not know. A plain upload of a
  name replaces whatever is newest under that name, checked and written in one database transaction: two uploads of the
  same name at the same moment end as one current file with the other as its earlier version (never two current files).
- **Version history** (10 Nov 2026, Brian): the file page and the Files list have a **History** button for SPP people
  (anyone who can see Files). It lists every saved version of the file, newest first (when, who, uploaded / edited on the
  site / restored), and each can be opened (look only) or downloaded. People who may upload to Files can **restore** an
  earlier version: its content becomes a new, newest version; nothing is removed, and sharing follows the same rule as any
  new version (a restored HES version starts unshared). Partners (Caltex) never get the list or an earlier version: an
  earlier version may never have been shared with them. A file in the recycle bin has no history until it is restored.
  Server: `GET /api/files/<id>/versions`, `GET /api/files/<earlier id>/download`, `POST /api/files/<earlier id>/restore`.
  A link to an earlier version's id (an old bookmark) opens the newest version.
- **Newest version** (`GET /api/files/<id>/latest`): an open file page asks every 10 seconds (every minute when idle, never
  while the tab is hidden) for the newest version of that file, and shows other people's changes without reloading. It
  answers only with a version the person may see (Files rules, including Caltex sharing); partners are not told who saved.
- **Download Excel**: Schedule -> Milestones (always in English) and Drawings -> Drawing changes build an .xlsx in the layout of
  the original "Timeline" / "Design Change" sheets, for anyone who can see the page.

## Staying signed in (1 Nov 2026, Brian)

A sign-in lasts up to **30 days** on a device and ends after **7 days without use**. Changing a password, "Sign out all
devices" and an admin issuing a reset code end every session at once. Issuing setup / reset codes still needs a
sign-in from the last 15 minutes.

## Meetings (`/meetings`, 2 Nov 2026)

- The standing **SPP–Caltex weekly meeting** is every **Wednesday**; this week's and the next three weeks' pages always exist,
  so anyone can add agenda items in advance. Weekly pages keep their Wednesday date and cannot be deleted. **New meeting**
  adds a one-off meeting. A weekly page can be started (first change) only near its date: from two weeks back to five
  weeks ahead (site audit, 10 Nov 2026; before, any Wednesday of any year could be started, for good).
- Live cursors show only the person's name (set by the site) and a plain colour; nothing else a browser sends is passed on.
- Each meeting: details (time, place / link, attendees), **agenda** items with shared notes under each, **action items**
  (owner, due date, done; **Make it a task** creates a Task through the normal task rules and links it), and
  **SPP-only notes** that are never sent to Caltex or anyone outside SPP.
- Access: page level "meetings" (Admin page). SPP staff and Caltex edit; from the site team Tle, Jaran and Gift edit
  (person settings); KS and the land owner have no Meetings tab (404). Every change is kept in meeting_log.

### Live meeting pages (Brian, 2 Nov 2026: "like Microsoft Loop")
- Each meeting has a live page that everyone with the Meetings page types in at the same time (no refresh, no Add
  buttons): bullets, numbers, checkboxes, indent (Tab / Shift+Tab), headings, bold / italic / underline, highlight,
  links, tables; pasting keeps basic formatting. SPP people also get a separate SPP-only live page.
- Rules, checked by the Worker before the connection reaches the meeting's room (`portal-proposal/src/meetings.mjs`):
  Meetings level `none` → 404; `view` and "View the site as" → look only (the room drops any change they send);
  the SPP-only page connects for SPP people only (others: 404, its text never reaches them); a connection from another
  website is refused (Origin check). Connections renew hourly, so a changed level or sign-out takes effect.
- A checkbox line (☐) can become a Task with **Make task**: `@name` assigns it, `10/11` or `2026-11-10` sets the due
  date; the line then shows the task number. The task API's own rules apply.
- Storage: the page lives in a Durable Object (`portal-proposal/src/meeting-room.mjs`); a copy (readable text + the
  editable document) goes to `meeting_docs` every few seconds, and a version to the append-only `meeting_doc_versions`
  every 10 minutes of editing — both in the weekly backup. Schema: `tasks/schema/0008_meeting_docs.sql`.
- Items written before the live page stay readable under "Earlier items".

## Independent audit, 2 Nov 2026 (ChatGPT / GPT-6.1 Sol) — decisions and fixes

Report: 13 findings + 4 ideas. Reviewed with Brian; advice, not orders.

Fixed (PR "Audit fixes"):
- F01 every request path is made canonical before any check (`portal-proposal/src/paths.mjs`): encoded slashes, `//`, `.`/`..`
  are refused; other encodings are redirected to the plain path, so page checks and the asset store always agree.
- F02 a password set by an admin (temporary) only allows changing it: other pages redirect to the Account page until the person
  chooses their own (detected from the audit log: temporary-password events vs. own change / setup code).
- F03 HES plan: SPP sees the newest upload; Caltex sees the newest version shared with Caltex. A new HES version never
  inherits sharing (ordinary files still do). The HES page tells SPP whether Caltex sees the current version.
- F04 names hidden from a viewer are masked in task history, titles, request messages and notices too.
- F05 if access settings cannot be read, the site refuses (503) instead of using the defaults.
- F06 "View the site as" also refuses login administration and password changes; opening Meetings never writes (weekly
  meetings are shown as placeholders and stored on the first change).
- F07 request bodies are size-limited while being read (tasks, meetings, trackers, files, accounts).
- F08 sign-in limits: device and account limits first; the site-wide cap (1,000 per 15 min) is only an emergency brake.
- F09 saving an Excel file from an older copy is refused ("someone saved a newer version").
- F10 new meeting items and drawing changes are saved together with their history line.
- N03 the Excel editor says formulas are recalculated only when the file is opened in Excel. Comment/checklist ids no longer clash.

Kept as decided: F13 (admins may deliberately share a weekly deck early; it is logged).
Brian's answers on the rest (2 Nov 2026):
- **F11 backups: "Yes, both".** Every Sunday 02:00 (Bangkok) a cron job copies every database table and every new or
  changed stored file to the private R2 bucket `calnkt-backups` (90-day bucket lock). Admin → Backups shows the runs,
  has **Back up now**, and **Download backup**: a zip of all data plus the current version of every file, for SharePoint
  each month. The zip never holds password hashes or 2-step secrets. Run and download need an admin, a sign-in from the
  last 15 minutes, never view-as, and both are written to the Change log. Restore guide: `docs/RESTORE.md`;
  tool: `tools/backup/restore-d1.mjs`. Code: `portal-proposal/src/backup.mjs`, `zip.mjs`.
- **Sign-in history kept 90 days.** The same weekly job removes sign-in and wrong-password records older than 90 days,
  and expired sessions. Account events (login created, codes, password changes, on/off) are kept for the whole project.
- **N02 done:** `identity-proposal/migrations/0002_audit_lock.sql`. The sign-in and account history cannot be changed,
  and nothing can be deleted except sign-in records older than 90 days. (Someone with direct database access in the
  Cloudflare dashboard could still remove the lock; it guards against the site's own code.)
- **N04 done: 2-step sign-in for admins.** Account page → 2-step sign-in: scan a QR code with an authenticator app
  (Google / Microsoft Authenticator), enter the first code, save 8 one-time recovery codes. Then every sign-in asks for
  the 6-digit code after the password. With `TWO_STEP_FOR_ADMINS="true"` (production), admin changes (page access,
  people, logins and codes, backups, starting "View the site as", owner controls) need a sign-in that used the code,
  and the password re-entered within the last 15 minutes (a "Confirm it's you" box on the Admin page). Optional for
  everyone else. Codes cannot be reused; the app secret is stored encrypted. An admin can remove another person's
  2-step (lost phone and codes), never the owner's. All of this is in the sign-in history.
  Code: `identity/totp.mjs`, `identity/identity.mjs`, `admin-gate.mjs`; schema `identity-proposal/migrations/0003_two_step.sql`.
- **N01** (separate preview address for file viewers): approved, in progress.
- F12 privacy notice: not now.

## Night review, 2 Nov 2026: three independent reviewers plus a browser test of every function
Brian asked for a full audit while he slept, with permission to decide. Findings and what was done:

| # | Severity | Finding | Decision / fix |
|---|---|---|---|
| B1 | High | A look-only person (view level, view-as, observer) could change a live meeting page with a padded message | Fixed: the room reads the message kind from the same position Yjs does; look-only connections only ever get the page sent (`meeting-room.mjs`; tests in `meeting-room.test.mjs`) |
| B2 | Medium | A listen-only meeting connection kept receiving after sign-out or a lowered level | Fixed: connections older than an hour are closed when the next change is sent; the browser reconnects through the Worker, which checks access again |
| B3 | Medium | No size limits on live pages | Fixed: one message ≤ 512 KB, presence ≤ 16 KB, a page ≤ 8 MB (the writer is told "page full"); the copy in TASKS_DB stays under D1's row limit |
| A1 | Medium | Wrong guesses from anywhere could lock a person out of sign-in | Fixed: only wrong tries count, per account per device (8 / 15 min) plus a wide per-account cap (60); the real person on their own device is not locked out |
| A7 | Low | 2-step codes could be guessed slowly without a cap | Fixed: 10 wrong codes per 15 minutes, then a pause |
| A6 | Low | Wrong-code records were kept forever | Fixed: recorded as `login_failed:code-<device>`, so the 90-day clean-up and the history lock apply |
| A2 | Medium | Another admin could demote, switch off or re-link the owner | Fixed: only the owner changes the owner's own record; `link` never replaces an existing login |
| A3 | Medium | The download zip contained the whole S-curve database (shared with S-Curve Studio's other projects and users) | Fixed: the S-curve database is not in the zip (it stays in the weekly locked copy, without its sessions, sign-in states and invitations) |
| A4 | Medium | A zip restore failed when 2-step was in use | Fixed: 2-step set-ups are left out of the zip; a test restores a zip |
| A5, C6 | Low | The view-as cookie could be made by hand; 2-step settings changed while viewing | Fixed: the cookie is signed (admin, person, end time); every `/api/local-auth/*` change except signing out is refused while viewing |
| A8 | Low | No HSTS header | Fixed: `Strict-Transport-Security: max-age=31536000` |
| B4 | Medium | Caltex could not be cut off from an older shared HES plan version | Fixed: stopping the sharing of the current HES plan stops every older version too |
| B5, C2 | Low / Med | Meetings and the HES plan page showed partners names that are hidden from them | Fixed: the task app's masking applies ("SPP project staff"); partners cannot pick hidden people as owners; the HES page never shows partners the uploader |
| C1 | Medium | A bucket name could carry page markup into everyone's task app | Fixed: values are escaped and bucket ids are plain letters and numbers (no bad buckets existed on the live site) |
| C3 | Med / Low | Someone a task was only shared with could widen it by @mention | Fixed: only the owner, a manager, an admin, the lead or an assignee brings a colleague in by @mention (assignees keep the old, intended behaviour) |
| C4 | Low | "subcontractor" appeared in the site model's drawing-text search and in unused schedule strings | Fixed: shown as "specialist contractor" / ผู้รับเหมาเฉพาะทาง; schedule strings changed |
| C5 | Low | The Camp page called a sketch the "Final layout" and said the services "are safe" | Fixed: "Proposed layout (not approved)", depth and protection "to be confirmed by the engineer", footer "not approved for construction" |
| B6 | Low | CAD notes, copies and share events could grow without limit | Fixed: 2,000 versions, 300 copies and 400 share changes per drawing and company |
| — | — | Account page asked for the owner-only list for everyone (refused, harmless) | Fixed: only asked for the owner |

Not changed (pushed back): the temporary-password check reviewers called dead code stays. Live accounts with admin-set
passwords carry those audit events, so it still protects them.

Browser test on a local copy (real Durable Objects, 2-step on for admins; Brian, Ming, Keng, Boss, Gift, Bas, Tom, Chai):
48 of 49 checks pass. The Schedule page cannot run locally (Thailand-only gate, no S-curve database there).

### Round 2 (a fresh reviewer re-checked the fixes the same night)
Confirmed holding: B1 (look-only cannot write), B2, the signed view-as cookie, backups (zip and weekly copy), C1, C3,
B5 for the REST data, HSTS. Gaps found and fixed:
- Owner protection skipped by a trailing "/" → the task API now refuses empty path parts, and the owner check matches any
  person path.
- Sign-in limits: a crafted username could share a device's counter, and parallel tries slipped past the caps → limit keys
  are JSON-encoded parts with invalid usernames grouped, and each try takes its place atomically before the password or
  code is checked (a right one gives it back). Wide per-account cap raised to 200 / 15 min (needs 25+ addresses; a lock
  lasts at most 15 minutes) — accepted residual risk.
- Live pages: a change over the limit was dropped silently → up to 2 MB is accepted, a larger one closes with a clear
  message ("paste smaller parts"); changes held back for missing earlier changes now count towards the 8 MB page cap.
- Cursor names were whatever the browser said → the server sets them from the signed-in person, and a person hidden from a
  company (e.g. the site team from KS, observers from Caltex) shows as "SPP project staff" to that company.
- Signing out while viewing-as left the next sign-in blocked → sign-out also ends viewing-as; sign-in is always allowed.
- HES plan: an older shared version could not be unshared once the newest was deleted → admins can unshare a replaced
  version; stopping sharing only cascades to older versions, never newer ones.
Known, accepted: wrong-code records made before this fix (`login_failed_code:*`) stay in the history (the lock keeps them);
a live page over about 750 KB is kept in its room and its text is backed up, but not its full editable copy.

### Round 3 (a third reviewer checked round 2)
Confirmed holding: the atomic sign-in limits (parallel tries, wide cap, code cap, no refund of others' counters, crafted
usernames), server-set cursor names, the owner check, sign-out ending view-as, HES unsharing. Fixed:
- Cursor names were masked per company; the site's rule is per person → each connection carries the people its person may
  not see and how they show ("SPP project staff", "Caltex contact"), so e.g. the site team sees observers masked, as in Tasks.
- Delete-only changes about unknown writers could pile up in memory → any held-back change is dropped and the sender
  reconnects, which resends everything in order.

## Changes from the ideas review (3 Nov 2026)
- **Removed access takes effect at once on live meeting pages.** After any change that can affect who sees what (admin
  people / page levels / accounts, a password change, 2-step, sign-out), every live meeting room drops its connections;
  browsers reconnect within a second and the Worker checks access again. Before, a removed person could keep receiving a
  page they had open for up to an hour (the hourly renewal still applies as a second line).
- **Meeting lines naming someone outside SPP become requests**, under the existing request rules (only people you may send
  requests to). They are never assigned as tasks.
- **Weekly pages carry last week's open lines** from the same part only (shared → shared, SPP-only → SPP-only), so nothing
  SPP-only reaches the shared page.
- **Browser caching** covers files only: fingerprinted program files are kept; other files are revalidated with the site,
  which checks access on every request. Pages and data (`/api/…`), downloads and errors are never stored. Signing out
  clears what the browser kept (`Clear-Site-Data: "cache"`).
- Outside links in meeting pages stay allowed (Brian: needed for purchasing information).

## Files: admins and versions (4 Nov 2026)
- Admins can always upload, make folders and delete files (as SPP editors can), whatever their Files level.
- Deleting a folder deletes everything in it: admins only. The built-in folders (Safety, Weekly safety meetings,
  Engineering) cannot be deleted; their files can. Deleted folders and files are hidden, not erased (storage + log).
- "Upload new version": the chosen file replaces that file under the same name (history, Caltex sharing and links stay);
  the chosen file's own name is kept in the log. Same file type only; refused if someone saved a newer version meanwhile.

## Files: recycle bin and drag-to-update (5 Nov 2026)
- **Recycle bin** (Files → Recycle bin): admins only (the list and every restore are refused for anyone else, and while
  viewing the site as someone). Shows deleted folders (with how many files / sub-folders went with them) and files
  deleted on their own, with who deleted them and when. Restore puts a folder back with its sub-folders and files, or a
  file back into its folder; if a live item has the same name, the restored one is named "… (restored)". Something that
  was inside a deleted folder needs that folder restored first. Old versions replaced by a newer upload are not in the bin.
  Restores are logged (folder_restore / restore). Nothing is ever erased, so the bin has no "empty" button.
- **Drag a file onto a file row** to upload it as that file's new version (same rules as "Upload new version").

## Repeating tasks (5 Nov 2026)
- A task can repeat on chosen weekdays (Mon–Sun buttons on New task and in the task panel); one day = weekly, several =
  daily on those days. Stored as `repeat_days` with a `series_id` (schema 0009, applied to production with Brian's OK).
- Every morning at 06:00 Bangkok (cron `0 23 * * *`) each series whose newest copy repeats today gets today's copy (even
  if the last copy is still open), with the same people, details and checklist (unticked), and its people (and lead) get
  a "due today" bell reminder, once. Copies are visible exactly like the original (same people). No email or LINE.
- Closing a copy no longer makes the next one. A series stops when its newest copy is set to no days, or deleted.

## Chief, Brian's AI assistant (5 Nov 2026)
- Not a person on the site: a key (made by the person named in `CHIEF_OWNER`, "brian", while an admin; 2-step and a recent
  password check; shown once, SHA-256 stored, 90 days, revocable) that acts AS Brian on `/api/agent/*` only.
- Allowed: read Brian's tasks / requests / bell (without marking read) and recent meeting pages; create tasks (for Brian
  or SPP colleagues); comment; progress; update title / details / dates / priority / status todo|doing|hold; add and tick
  checklist steps; add people. Refused: close, sign off, approve, return, reopen, hand off, share, unassign, delete steps,
  delete; any request (to Caltex, KS, the land owner); every other page and API (the key is not a session).
- Everyone else sees Brian. Events carry `via: "chief"`, which the server sends only to Brian; Admin → Chief lists what
  Chief did. 300 requests per 15 minutes per key. Schema 0010 (`agent_keys`, `agent_hits`). Guide: `docs/CHIEF.md`.
- (5 Nov 2026) Chief may also **add** lines (heading, paragraph, bullet, ☐ action) at the end of a meeting page, shared or
  SPP-only, as Brian and only while Brian has Meetings at "edit"; it cannot change or remove existing text. Recorded for
  Brian under Admin → Chief (`meeting_notes`); the page's "last saved by" shows Brian.

## Site team sees one another's tasks (10 Nov 2026)

Rule 3 of "Who can see which tasks" changed: every site team member (level Team) sees every task with a site team member
on it. Nothing changed for Caltex, KS Consulting or the land owner, or for requests. Code: `isTeam` and `canSeeTask` in
`tasks/src/policy.mjs`.
