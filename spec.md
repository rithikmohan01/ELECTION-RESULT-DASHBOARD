Project Specification: Tamil Nadu Assembly Election Result Interactive Dashboard
Updated for 2026 Election
 Python + HTML + CSS + JavaScript


Your project will be an interactive Tamil Nadu Legislative Assembly Election Results Dashboard, using the actual 2026 Tamil Nadu Assembly Election results instead of sample or manually created election data.

Important: The latest Tamil Nadu Assembly general election as of November 1, 2026, is the 2026 election, not the 2021 election.

The Election Commission of India (ECI) reports results for all 234 constituencies. The leading party was Tamilaga Vettri Kazhagam (TVK), with 108 seats. 
results.eci.gov.in+1

1. Project objective
Develop a responsive, interactive web dashboard that allows users to explore the 2026 Tamil Nadu Assembly Election results.

The dashboard should provide:
- Constituency-wise candidate results.
- Party-wise vote totals.
- Party-wise seats won.
- Candidate vote shares.
- Winning candidates and runner-up details.
- Winning margins.
- Interactive charts and comparisons.
- Party and constituency filters.
- Search and sorting options.
- Light and dark themes.
The dashboard must use authentic election data and calculate its statistics automatically.
2. Election dataset and correct results
Election information
2026
Election year
234
Assembly constituencies
108
TVK seats
118
Majority mark


Official party-wise seat results
Party	Seats won
TVK	108
DMK	59
AIADMK	47
INC	5
PMK	4
IUML	2
CPI	2
VCK	2
CPI(M)	2
BJP	1
DMDK	1
AMMK	1
Total	234

Source: Election Commission of India, May 2026 results. 
results.eci.gov.in


Use these figures as validation totals, not as manually inserted candidate records.
3. Authentic data sources
The project must use these sources in order of priority:

1. Official ECI detailed results (primary source):
Download Tamil Nadu 2026 Detailed Results PDF. This contains candidate names, parties, symbols, general votes, postal votes, total votes and percentages.

2. ECI constituency-wise results:
View all 234 constituency results.

3. ECI party-wise results:
View party-wise seat results.

4. Downloadable CSV dataset:
Tamil Nadu Assembly Election 2026 CSV dataset.

5. Additional verified election data:
Tamil Nadu Data – 2026 Election.

The detailed ECI report contains the actual candidate-level vote counts, including postal votes. Use the TOTAL column for the candidate's final votes. 
eci.gov.in

4. Dataset structure
Create the following project files:
TamilNadu-Election-Dashboard/
│
├── election_results.csv
├── data.json
├── prepare_data.py
│
├── index.html
├── styles.css
├── app.js
│
├── assets/
│   └── images/
│
└── README.md


CSV columns
The election_results.csv file must contain these fields:
Column	Description
Constituency	Assembly constituency
Constituency_No	Official constituency number
Candidate	Candidate name
Party	Political party
Symbol	Election symbol
Gender	Candidate gender
Age	Candidate age
Category	General / SC / ST
General_Votes	Votes from EVM
Postal_Votes	Postal votes
Votes	Total candidate votes
Vote_Share	Percentage of valid votes including NOTA
Electors	Total registered electors
Status	Winner / Runner-up / Candidate / NOTA

Important data rules:
- Include all candidates, not just winners.
- Include NOTA as a separate record.
- Calculate Votes = General_Votes + Postal_Votes.
- Do not count NOTA as a political party.
- Do not assume a candidate is a winner just because their name appears first in an unverified CSV.
- Identify the winner by the highest final vote total in each constituency.
- Use official party names and normalize inconsistent abbreviations such as ADMK and TVK where appropriate.
- Preserve the original party name in a separate field if normalization is applied.
JSON output
The Python program should convert the CSV dataset into structured JSON.

Example structure:
{
  "election": {
    "state": "Tamil Nadu",
    "year": 2026,
    "total_constituencies": 234
  },
  "records": [
    {
      "Constituency": "GUMMIDIPOONDI",
      "Constituency_No": 1,
      "Candidate": "S.vijayakumar",
      "Party": "TVK",
      "Votes": 94320,
      "General_Votes": 93820,
      "Postal_Votes": 500,
      "Status": "Winner"
    }
  ]
}


This is an illustrative record from the ECI detailed report, not a replacement for the complete dataset. 
eci.gov.in

5. Python data preparation module
The prepare_data.py file should:
1. Read election_results.csv using Pandas.
2. Verify the required columns.
3. Convert vote columns into numeric values.
4. Remove invalid or incomplete records.
5. Reject negative vote counts.
6. Calculate total votes using general and postal votes.
7. Identify winners and runners-up constituency-wise.
8. Calculate candidate vote shares.
9. Generate data.json.
10. Validate that there are 234 constituencies.
11. Validate the 2026 party seat totals against the official ECI results.
12. Save the JSON file with UTF-8 encoding.
The program must display meaningful errors if the CSV is missing, has incorrect columns or contains invalid data.

Do not silently modify or fabricate election results to make validation pass.
6. Dashboard homepage design












8









Create a professional election analytics dashboard.
Header section
- Title: Tamil Nadu Election Results 2026
- Subtitle: Explore Constituency, Candidate and Party Performance
- Election year indicator.
- Light/dark theme toggle.
- Navigation menu.
Summary cards
Display these cards:
Card	Information
Total Constituencies	234
Total Candidates	Count from actual dataset
Total Votes	Sum of candidate votes, excluding NOTA where appropriate
Political Parties	Unique political parties
Leading Party	TVK
Seats Won	108

Use real dataset calculations instead of hardcoding changing values.
Filter section
Provide the following filters:
- Political party.
- Assembly constituency.
- Candidate name.
- District.
- Winner / Runner-up.
- Search by constituency or candidate.
- Reset all filters.
District filtering requires a verified constituency-to-district mapping dataset.
7. Charts and data visualizations
Use Chart.js 4.4.0 for all visualizations.

Create the following charts:





1. Party-wise Seats Won

Horizontal bar chart showing the number of constituencies won by each party.








2. Party-wise Vote Share

Doughnut chart comparing the percentage of votes received by each party.








3. Constituency-wise Candidate Votes

Compare votes received by candidates in a selected constituency.








4. Winning Margin Analysis

Show the difference between winners and runners-up.








5. Voter Turnout Analysis

Show constituency-wise turnout percentages using total votes polled and registered electors.



All charts must update automatically when filters change.
8. Election analysis calculations
Implement the following analytical functions in app.js.

A. Total votes polled
\[
TotalVotes=\sum CandidateVotes
\]

Include NOTA in total votes polled.

B. Party-wise votes
\[
PartyVotes=\sum Votes\text{ grouped by Party}
\]

Exclude NOTA.

C. Party vote share
\[
VoteShare=\frac{PartyVotes}{TotalValidVotes}\times100
\]

Use a consistent denominator that includes all valid candidate votes but excludes NOTA.

D. Winning margin
\[
Margin=WinnerVotes-RunnerUpVotes
\]

E. Seats won

Count the number of constituencies in which each party's candidate received the highest final vote total.

F. Voter turnout
\[
Turnout=\frac{TotalVotesPolled}{TotalElectors}\times100
\]

Use the appropriate official turnout definition and source figures.
9. Result tables
Create three interactive tables.

Table 1: Constituency Results
Constituency	Winner	Party	Votes	Margin
Gummidipoondi	S. Vijayakumar	TVK	94,320	27,945

This is an example based on the ECI detailed report.

Table 2: Candidate Results
Candidate	Party	Votes	Vote Share
Candidate name	Party	Actual votes	Actual %

Table 3: Party Performance
Party	Seats Won	Total Votes	Vote Share
TVK	108	Calculated	Calculated
DMK	59	Calculated	Calculated
AIADMK	47	Calculated	Calculated

All tables must support sorting, searching and filtering.
10. Additional features
Implement these features:
- Responsive mobile and desktop interface.
- Dark and light themes.
- Party-wise colour identification.
- Candidate search.
- Constituency comparison.
- Download filtered results as CSV.
- Export dashboard report as PDF.
- Interactive chart tooltips.
- Display data source and last updated date.
- Reset filters button.
- Loading indicator while fetching JSON.
- Error message if the dataset cannot be loaded.
- Display a notice explaining that figures are sourced from official election records.
11. Technology requirements
Technology	Purpose
Python	Data processing
Pandas	CSV processing
JSON	Store structured election records
HTML5	Dashboard structure
CSS3	Responsive styling
Bootstrap 5.3.3	Layout and components
JavaScript	Filtering and calculations
Chart.js 4.4.0	Data visualization

No backend or database is required for the initial version. This is a frontend dashboard with a Python-based data preparation process.
12. Execution workflow
The application must follow this sequence:
Official ECI Election Data
2026 Tamil Nadu Assembly Election
election_results.csv
Candidate-level election records
prepare_data.py
Clean, validate and calculate
data.json
Structured election data
index.html + styles.css + app.js
Interactive election dashboard
Final Election Analytics Dashboard
Charts, filters, tables and statistics

13. How to run the project
First install the required Python packages:
pip install pandas


Generate the JSON file:
python prepare_data.py


Start the local web server:
python -m http.server 8080


Open:

http://localhost:8080
14. Final project acceptance criteria
The completed project must satisfy these requirements:
- [ ] Use actual Tamil Nadu 2026 election data.
- [ ] Include all 234 constituencies.
- [ ] Include all candidates and NOTA records.
- [ ] Include accurate candidate vote counts.
- [ ] Include postal votes in final candidate totals.
- [ ] Display correct party-wise seat counts.
- [ ] Calculate vote share and winning margins correctly.
- [ ] Provide interactive filters.
- [ ] Display all five visualizations.
- [ ] Support mobile and desktop screens.
- [ ] Include CSV and PDF export.
- [ ] Validate the results against ECI records.
- [ ] Never generate fictional candidates or vote counts.

15. Expected final outcome




















9










The final website should look like a professional election analytics platform rather than a simple HTML table.

Project title: Tamil Nadu Legislative Assembly Election 2026 – Interactive Result Analysis Dashboard.