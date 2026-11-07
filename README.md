# Tamil Nadu Election Results 2026

A responsive election results dashboard with global search across candidate, party, constituency, district, and result fields; party, district, and result filters; sortable candidate results; eight interactive charts; candidate comparisons; CSV download; print-to-PDF; and a light/dark theme. Charts include seats, party vote share, district seat distribution by party, top candidate vote shares, votes vs seats, candidate comparisons, winning margins, and winning margin ranges. Turnout is omitted because the supplied data has no elector totals.

## Data source and setup

The supplied `election_results.csv` is now in this directory, and `data.json` has been generated from it. The dataset contains 4,023 verified candidate rows across all 234 constituencies, and its winners match the official seat totals. The source is a compact candidate-results format; it does not contain NOTA rows, postal/EVM splits, elector totals, symbols, or candidate demographics. Those missing values remain blank and the dashboard displays a notice. Turnout is not calculated without registered elector totals. For the official detailed report, see [ECI's 2026 results PDF](https://www.eci.gov.in/eci-backend/public/all_files/election_report/General_Election_to_the_Legislative_Assembly_of_Tamil_Nadu_2026_2026/10-Detailed_Results_1778165153.pdf).

The supplied compact CSV has these columns (the preparation script also accepts the detailed schema below):

```text
ac_no,constituency,district,ballot_no,candidate,party,votes,vote_share_pct,rank,outcome,figures_status
```

The detailed ECI CSV schema is:

```text
Constituency,Constituency_No,Candidate,Party,Symbol,Gender,Age,Category,General_Votes,Postal_Votes,Votes,Vote_Share,Electors
```

Use the ECI detailed report's **TOTAL** for `Votes`; it must equal `General_Votes + Postal_Votes`. Age may be blank for NOTA. Set `Electors` to the official constituency total on every row. Original party labels are preserved in `Party_Original` when normalizing known aliases. The script verifies the 234 constituency count and ECI seat validation totals and stops if they do not match. For the compact source format, the supplied ECI vote percentages are retained and unavailable fields are left blank.

Install and generate the dashboard data:

```powershell
python -m pip install -r requirements.txt
python prepare_data.py
```

Run the site from this directory (the browser blocks JSON loading from `file://`). The included Node server needs no package install:

```powershell
node serve.js
```

Open <http://localhost:8080>. To regenerate `data.json` after changing the CSV, install Python and run the preparation steps above.

## Files

- `election_results.csv` — source candidate records (download/prepare from ECI)
- `prepare_data.py` — validation, ranking, share calculation, and JSON generation
- `data.json` — generated dashboard data, included so the dashboard works immediately
- `index.html`, `styles.css`, `app.js` — frontend

The supplied dataset includes district names, so a district filter is available. It does not include NOTA or elector totals, so the dashboard labels the limitations and does not calculate turnout from incomplete data. ECI notes that its published results are entered by Returning Officers and final constituency data is shared in Form 20; consult the linked source for the official record and latest corrections.
