"""Validate election_results.csv and write data.json for the dashboard."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "election_results.csv"
JSON_PATH = ROOT / "data.json"
FULL = {"Constituency", "Constituency_No", "Candidate", "Party", "Symbol", "Gender", "Age", "Category", "General_Votes", "Postal_Votes", "Votes", "Vote_Share", "Electors"}
COMPACT = {"ac_no", "constituency", "district", "ballot_no", "candidate", "party", "votes", "vote_share_pct", "rank", "outcome", "figures_status"}
EXPECTED = {"TVK":108,"DMK":59,"ADMK":47,"INC":5,"PMK":4,"IUML":2,"CPI":2,"VCK":2,"CPI(M)":2,"BJP":1,"DMDK":1,"AMMK":1}
ALIASES = {
    "TAMILAGA VETTRI KAZHAGAM":"TVK", "TVK":"TVK", "TAVK":"TVK",
    "DRAVIDA MUNNETRA KAZHAGAM":"DMK", "DMK":"DMK",
    "ALL INDIA ANNA DRAVIDA MUNNETRA KAZHAGAM":"ADMK", "AIADMK":"ADMK", "ADMK":"ADMK",
    "INDIAN NATIONAL CONGRESS":"INC", "INC":"INC",
    "PATTALI MAKKAL KATCHI":"PMK", "PMK":"PMK",
    "INDIAN UNION MUSLIM LEAGUE":"IUML", "IUML":"IUML",
    "COMMUNIST PARTY OF INDIA":"CPI", "CPI":"CPI",
    "COMMUNIST PARTY OF INDIA (MARXIST)":"CPI(M)", "CPI(M)":"CPI(M)",
    "VIDUTHALAI CHIRUTHAIGAL KATCHI":"VCK", "VCK":"VCK",
    "BHARATIYA JANATA PARTY":"BJP", "BJP":"BJP",
    "DESIYA MURPOKKU DRAVIDA KAZHAGAM":"DMDK", "DMDK":"DMDK",
    "AMMA MAKKAL MUNNETTRA KAZAGAM":"AMMK", "AMMK":"AMMK",
    "NOTA":"NOTA", "NONE OF THE ABOVE":"NOTA", "IND":"IND", "INDEPENDENT":"IND",
}

def prepare() -> dict:
    if not CSV_PATH.exists():
        raise ValueError("election_results.csv is missing from the project directory.")
    source = pd.read_csv(CSV_PATH)
    columns = set(source.columns)
    is_compact = COMPACT.issubset(columns)
    if is_compact:
        if not source["figures_status"].astype(str).str.lower().eq("verified").all():
            raise ValueError("The compact dataset contains rows not marked verified.")
        df = pd.DataFrame({
            "Constituency": source["constituency"], "Constituency_No": source["ac_no"],
            "District": source["district"], "Candidate": source["candidate"], "Party_Original": source["party"],
            "Symbol": None, "Gender": None, "Age": None, "Category": None,
            "General_Votes": None, "Postal_Votes": None, "Votes": source["votes"],
            "Vote_Share": source["vote_share_pct"], "Electors": None,
        })
        has_nota = df["Candidate"].astype(str).str.upper().eq("NOTA").any()
    elif FULL.issubset(columns):
        df = source.copy()
        df["Party_Original"] = df["Party"]
        df["District"] = df["District"] if "District" in df else None
        has_nota = df["Party"].astype(str).str.upper().eq("NOTA").any()
    else:
        missing = sorted((COMPACT | FULL) - columns)
        raise ValueError("CSV schema is not recognized. Missing expected fields include: " + ", ".join(missing[:12]))

    required = ["Constituency", "Constituency_No", "Candidate", "Party_Original", "Votes"]
    if df[required].isna().any().any():
        raise ValueError("Constituency, number, candidate, party, and votes must be present on every row.")
    df["Constituency_No"] = pd.to_numeric(df["Constituency_No"], errors="coerce")
    df["Votes"] = pd.to_numeric(df["Votes"], errors="coerce")
    if df[["Constituency_No", "Votes"]].isna().any().any():
        raise ValueError("Constituency numbers and votes must be numeric.")
    if (df["Votes"] < 0).any():
        raise ValueError("Vote counts cannot be negative.")
    df["Constituency_No"] = df["Constituency_No"].astype(int)
    df["Votes"] = df["Votes"].astype(int)
    df["Party"] = df["Party_Original"].astype(str).str.strip().map(lambda p: ALIASES.get(p.upper(), p.strip()))
    nota = df["Party"].str.upper().eq("NOTA") | df["Candidate"].astype(str).str.upper().eq("NOTA")
    df.loc[nota, "Party"] = "NOTA"
    if df.duplicated(["Constituency_No", "Candidate"]).any():
        raise ValueError("Duplicate candidate records found within a constituency.")
    counts = df.groupby("Constituency_No")["Constituency"].nunique()
    if len(counts) != 234 or counts.ne(1).any():
        raise ValueError(f"Expected 234 uniquely identified constituencies; found {len(counts)}.")

    df["Status"] = "Candidate"
    for _, group in df.loc[~nota].groupby("Constituency_No"):
        ranked = group.sort_values(["Votes", "Candidate"], ascending=[False, True], kind="stable")
        df.loc[ranked.index[0], "Status"] = "Winner"
        if len(ranked) > 1:
            df.loc[ranked.index[1], "Status"] = "Runner-up"
    df.loc[nota, "Status"] = "NOTA"
    if is_compact and "outcome" in source:
        source_winners = source["outcome"].astype(str).str.lower().eq("won")
        calculated = df["Status"].eq("Winner")
        if not source_winners.equals(calculated):
            raise ValueError("Winner ranks in the source CSV do not agree with the highest vote totals.")

    if is_compact:
        df["Vote_Share"] = pd.to_numeric(df["Vote_Share"], errors="coerce")
        if df["Vote_Share"].isna().any() or (df["Vote_Share"] < 0).any():
            raise ValueError("The supplied vote_share_pct values must be valid non-negative numbers.")
    else:
        df["General_Votes"] = pd.to_numeric(df["General_Votes"], errors="coerce")
        df["Postal_Votes"] = pd.to_numeric(df["Postal_Votes"], errors="coerce")
        if (df["General_Votes"].isna() | df["Postal_Votes"].isna()).any():
            raise ValueError("General and postal votes are required for the detailed ECI CSV.")
        if (df["General_Votes"] + df["Postal_Votes"] != df["Votes"]).any():
            raise ValueError("Votes must equal General_Votes + Postal_Votes for every record.")
        denominator = df.loc[~nota].groupby("Constituency_No")["Votes"].transform("sum")
        df["Vote_Share"] = 0.0
        df.loc[~nota, "Vote_Share"] = (df.loc[~nota, "Votes"] / denominator * 100).round(2)

    seat_counts = df.loc[df["Status"].eq("Winner"), "Party"].value_counts().to_dict()
    actual = {party: int(seat_counts.get(party, 0)) for party in EXPECTED}
    if actual != EXPECTED:
        raise ValueError(f"Party seat totals do not match ECI validation figures. Found: {actual}")
    df["Party_Original"] = df["Party_Original"].astype(str)
    records = df.astype(object).where(pd.notna(df), None).to_dict(orient="records")
    return {
        "election": {
            "state": "Tamil Nadu", "year": 2026, "total_constituencies": 234,
            "source": "Election Commission of India — 2026 Tamil Nadu Assembly results",
            "source_url": "https://www.eci.gov.in/eci-backend/public/all_files/election_report/General_Election_to_the_Legislative_Assembly_of_Tamil_Nadu_2026_2026/10-Detailed_Results_1778165153.pdf",
            "nota_records_present": bool(has_nota), "postal_split_present": not is_compact,
            "electors_present": bool(df["Electors"].notna().all()),
        },
        "records": records,
    }

if __name__ == "__main__":
    try:
        payload = prepare()
        JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
        print(f"Wrote {len(payload['records']):,} records to data.json")
        if not payload["election"]["nota_records_present"]:
            print("Note: source CSV has no NOTA rows; turnout totals will not include NOTA.")
    except (ValueError, OSError, pd.errors.ParserError) as exc:
        print(f"Data preparation failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
