const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('en-IN');
const palette = ['#df7048','#426a91','#238c75','#b58a3a','#8d6db2','#398d9f','#bd6676','#6e8196','#7c9e54','#b47846','#6874aa','#aa6b9c'];
let records = [], filtered = [], page = 1, sortKey = 'Votes', sortDir = -1, charts = {}, electionMap, mapLayer, mapFeatures = [];
const pageSize = 15;
const partyName = p => ({'ADMK':'AIADMK','TVK':'TVK','DMK':'DMK','INC':'INC','NOTA':'NOTA','IND':'Independent'}[p] || p);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isNota = r => String(r.Party).toUpperCase() === 'NOTA' || String(r.Candidate).toUpperCase() === 'NOTA';
function showStatus(message, error = false) { const el=$('status'); el.textContent=message; el.classList.add('visible'); if(error) el.style.borderColor='var(--accent)'; }
function hideStatus(){ $('status').classList.remove('visible'); }
async function init(){
  try {
    const response = await fetch('./data.json', {cache:'no-store'});
    if(!response.ok) throw new Error('data.json was not found.');
    const payload = await response.json();
    if(payload.election?.year !== 2026 || !Array.isArray(payload.records) || !payload.records.length) throw new Error('The data file is empty or is not the 2026 election dataset.');
    records = payload.records; boot(payload.election || {});
  } catch(e) {
    showStatus('Election data is not ready yet. The project does not include sample or invented results. Download the official ECI detailed results as election_results.csv, then run “python prepare_data.py”. The dashboard will load data.json after that.');
    $('resultCount').textContent='Dataset not loaded';
  }
}
function boot(election){
  if(!election.nota_records_present || !election.postal_split_present || !election.electors_present){
    const limits=[];
    if(!election.nota_records_present)limits.push('the supplied CSV has no NOTA records');
    if(!election.postal_split_present)limits.push('postal and EVM vote splits are unavailable');
    if(!election.electors_present)limits.push('registered elector totals are unavailable, so turnout cannot be calculated');
    showStatus(`Loaded ${fmt.format(records.length)} verified candidate rows for all 234 constituencies. Data limitation: ${limits.join('; ')}. Values are shown as provided; missing figures are not estimated.`);
    $('statVotesCaption').textContent='listed candidate votes; NOTA unavailable';
  } else hideStatus();
  records.forEach(r=>{r.Votes=Number(r.Votes)||0;r.Vote_Share=Number(r.Vote_Share)||0;r.Constituency_No=Number(r.Constituency_No)||0;});
  fillFilters(); renderStats(records); renderAll();
  ['search','partyFilter','seatFilter','districtFilter','resultFilter'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{page=1;applyFilters();}));
  $('compareFilter').addEventListener('change',renderCompare);
  $('resetFilters').addEventListener('click',()=>{['search','partyFilter','seatFilter','districtFilter','resultFilter'].forEach(id=>$(id).value='');page=1;applyFilters();});
  document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.sort;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=1;} renderTable();}));
  $('prevPage').addEventListener('click',()=>{page=Math.max(1,page-1);renderTable();}); $('nextPage').addEventListener('click',()=>{page++;renderTable();});
  $('downloadCsv').addEventListener('click',downloadCsv); $('printReport').addEventListener('click',()=>window.print());
  $('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('tn-theme',document.body.classList.contains('dark')?'dark':'light');renderCharts();updateMap();});
  if(localStorage.getItem('tn-theme')==='dark')document.body.classList.add('dark'); applyFilters(); initMap();
}
function mapAcNo(feature){const p=feature.properties||{};for(const key of ['AC_NO','AC_NO_','AC_NUM','ac_no','ACNUMBER','AC_NO_ECI']){const n=Number(p[key]);if(n>0)return n;}return null;}
function partyColor(p){const parties=[...new Set(records.filter(r=>r.Status==='Winner').map(r=>r.Party))].sort();const i=parties.indexOf(p);return i<0?'#9ca3af':palette[i%palette.length];}
async function initMap(){if(!window.L){$('mapStatus').textContent='Map library unavailable';return;}electionMap=L.map('tnMap',{scrollWheelZoom:false,zoomControl:true}).setView([11.1,78.6],6);try{const res=await fetch('https://raw.githubusercontent.com/saisantoshv3/assemnbly_gis_files/730263a08afa3cf7a0cd12db68bcddc90aefcc03/2026_assembly_election/tamil_nadu_S22/tamil_nadu.geojson');if(!res.ok)throw Error('Boundary download failed');const geo=await res.json();mapFeatures=geo.features||[];mapLayer=L.geoJSON(geo,{style:mapStyle,onEachFeature:(feature,layer)=>{const no=mapAcNo(feature),row=records.find(r=>r.Constituency_No===no&&r.Status==='Winner');layer.bindTooltip(no?`${no}. ${row?.Constituency||feature.properties?.AC_NAME||feature.properties?.NAME||'Constituency'}${row?` · ${partyName(row.Party)}`:''}`:'Constituency');layer.on('click',()=>{if(no){$('seatFilter').value=String(no);page=1;applyFilters();$('constituencies').scrollIntoView({behavior:'smooth',block:'start'});}});}}).addTo(electionMap);const b=mapLayer.getBounds();if(b.isValid())electionMap.fitBounds(b,{padding:[8,8]});$('mapStatus').textContent=`${mapFeatures.length} assembly constituencies`;renderMapLegend();updateMap();}catch(e){$('mapStatus').textContent='Could not load constituency boundaries';}}
function mapStyle(feature){const no=mapAcNo(feature),winner=records.find(r=>r.Constituency_No===no&&r.Status==='Winner'),matches=filtered.some(r=>r.Constituency_No===no);return {color:document.body.classList.contains('dark')?'#f1f5f9':'#fff',weight:matches?1.15:.55,opacity:1,fillColor:winner?partyColor(winner.Party):'#9ca3af',fillOpacity:matches ? .88 : .16};}
function updateMap(){if(!mapLayer)return;mapLayer.setStyle(mapStyle);}
function renderMapLegend(){const counts=new Map();getSeatWinners(filtered).forEach(r=>counts.set(r.Party,(counts.get(r.Party)||0)+1));$('mapLegend').innerHTML=[...counts].sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<span class="legend-item"><i style="--legend-color:${partyColor(p)}"></i>${esc(partyName(p))}<b>${n}</b></span>`).join('')||'<span class="legend-item">No winning parties in this selection</span>';}
function fillFilters(){
  const parties=[...new Set(records.filter(r=>!isNota(r)&&!['IND','INDEPENDENT'].includes(String(r.Party).toUpperCase())).map(r=>r.Party))].sort((a,b)=>partyName(a).localeCompare(partyName(b)));
  parties.forEach(p=>$('partyFilter').insertAdjacentHTML('beforeend',`<option value="${esc(p)}">${esc(partyName(p))}</option>`));
  const seats=[...new Map(records.map(r=>[r.Constituency_No,r.Constituency])).entries()].sort((a,b)=>a[0]-b[0]);
  seats.forEach(([n,name])=>{const option=`<option value="${n}">${n}. ${esc(name)}</option>`;$('seatFilter').insertAdjacentHTML('beforeend',option);$('compareFilter').insertAdjacentHTML('beforeend',option);});
  [...new Set(records.map(r=>r.District).filter(Boolean))].sort().forEach(d=>$('districtFilter').insertAdjacentHTML('beforeend',`<option value="${esc(d)}">${esc(d)}</option>`));
}
function getSeatWinners(source=records){const by=new Map();source.filter(r=>!isNota(r)).forEach(r=>{const prev=by.get(r.Constituency_No);if(!prev||r.Votes>prev.Votes)by.set(r.Constituency_No,r);});return [...by.values()];}
function renderStats(source=filtered){
  const winners=getSeatWinners(source), seats=new Map(); winners.forEach(r=>seats.set(r.Party,(seats.get(r.Party)||0)+1));
  const polled=source.reduce((s,r)=>s+r.Votes,0),parties=new Set(source.filter(r=>!isNota(r)&&!['IND','INDEPENDENT'].includes(String(r.Party).toUpperCase())).map(r=>r.Party));
  const lead=[...seats].sort((a,b)=>b[1]-a[1])[0]||['—',0];
  $('statSeats').textContent=fmt.format(new Set(source.map(r=>r.Constituency_No)).size);$('statCandidates').textContent=fmt.format(source.length);$('statVotes').textContent=fmt.format(polled);$('statParties').textContent=fmt.format(parties.size);$('statLeader').textContent=partyName(lead[0]);$('statLeaderSeats').textContent=`${lead[1]} seats won in current selection`;
}
function applyFilters(){const q=$('search').value.trim().toLowerCase(), p=$('partyFilter').value,s=$('seatFilter').value,d=$('districtFilter').value,result=$('resultFilter').value;filtered=records.filter(r=>(!q||Object.values(r).filter(v=>v!==null&&v!==undefined).join(' ').toLowerCase().includes(q))&&(!p||r.Party===p)&&(!s||String(r.Constituency_No)===s)&&(!d||r.District===d)&&(!result||r.Status===result));renderAll();}
function renderAll(){renderStats();renderTable();renderSummaryTables();renderCharts();renderMapLegend();updateMap();}
function renderSummaryTables(){
  const groups=new Map();filtered.filter(r=>!isNota(r)).forEach(r=>{if(!groups.has(r.Constituency_No))groups.set(r.Constituency_No,[]);groups.get(r.Constituency_No).push(r);});
  const seats=[...groups.values()].map(rs=>{rs.sort((a,b)=>b.Votes-a.Votes);return {winner:rs[0],runner:rs[1]};}).sort((a,b)=>a.winner.Constituency_No-b.winner.Constituency_No);
  const matchingSeats=new Set(filtered.map(r=>r.Constituency_No));
  const shownSeats=seats.filter(({winner})=>matchingSeats.has(winner.Constituency_No));
  $('constituencyRows').innerHTML=shownSeats.map(({winner,runner})=>`<tr><td><span class="const-name">${esc(winner.Constituency)}</span></td><td>${esc(winner.Candidate)}</td><td><span class="party-tag">${esc(partyName(winner.Party))}</span></td><td class="numeric">${fmt.format(winner.Votes)}</td><td class="numeric">${fmt.format(winner.Votes-(runner?.Votes||0))}</td></tr>`).join('')||'<tr><td colspan="5" class="empty-state">No constituency matches the current search or filters.</td></tr>';
  const byParty=new Map();filtered.filter(r=>!isNota(r)).forEach(r=>{if(!byParty.has(r.Party))byParty.set(r.Party,{votes:0,seats:0});byParty.get(r.Party).votes+=r.Votes;});
  seats.forEach(({winner})=>byParty.get(winner.Party).seats++);
  const total=[...byParty.values()].reduce((n,x)=>n+x.votes,0);
  const matchingParties=new Set(filtered.filter(r=>!isNota(r)).map(r=>r.Party));
  $('partyRows').innerHTML=[...byParty.entries()].filter(([party])=>matchingParties.has(party)).sort((a,b)=>b[1].seats-a[1].seats||b[1].votes-a[1].votes).map(([party,x])=>`<tr><td><span class="party-tag">${esc(partyName(party))}</span></td><td class="numeric">${x.seats}</td><td class="numeric">${fmt.format(x.votes)}</td><td class="numeric">${total?(x.votes/total*100).toFixed(2):'0.00'}%</td></tr>`).join('')||'<tr><td colspan="4" class="empty-state">No party matches the current search or filters.</td></tr>';
}
function renderTable(){
  const rows=[...filtered].sort((a,b)=>{const x=a[sortKey],y=b[sortKey];const cmp=typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??''));return cmp*sortDir;});
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(page,pages);const slice=rows.slice((page-1)*pageSize,page*pageSize);
  $('resultCount').textContent=`${fmt.format(rows.length)} candidate records`; $('pageInfo').textContent=rows.length?`Page ${page} of ${pages}`:'No matching candidates';$('prevPage').disabled=page<=1;$('nextPage').disabled=page>=pages;
  $('candidateRows').innerHTML=slice.length?slice.map(r=>`<tr><td><span class="const-name">${esc(r.Constituency)}</span><span style="color:var(--muted)"> · ${r.Constituency_No}</span></td><td class="candidate-name">${esc(r.Candidate)}</td><td><span class="party-tag">${esc(partyName(r.Party))}</span></td><td class="numeric">${fmt.format(r.Votes)}</td><td class="numeric">${isNota(r)?'—':`${Number(r.Vote_Share).toFixed(2)}%`}</td><td><span class="result-badge ${r.Status==='Runner-up'?'runner':''}">${esc(r.Status)}</span></td></tr>`).join(''):`<tr><td colspan="6" class="empty-state">No records match these filters.</td></tr>`;
}
function chartTheme(){const dark=document.body.classList.contains('dark');return {ink:dark?'#aab5c3':'#788392',grid:dark?'#2a3644':'#edf0f3'};}
function destroyCharts(){Object.values(charts).forEach(c=>c?.destroy());charts={};}
function renderCharts(){if(!window.Chart||!records.length)return;destroyCharts();const view=filtered,matchingSeats=new Set(view.map(r=>r.Constituency_No)),theme=chartTheme(), winners=getSeatWinners(view), seatCounts={};winners.forEach(r=>seatCounts[r.Party]=(seatCounts[r.Party]||0)+1);
  const parties=Object.keys(seatCounts).sort((a,b)=>seatCounts[b]-seatCounts[a]).slice(0,12);
  const common={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:theme.ink,font:{family:'DM Sans',size:10},boxWidth:8,usePointStyle:true}}}};
  charts.seats=new Chart($('seatsChart'),{type:'bar',data:{labels:parties.map(partyName),datasets:[{data:parties.map(p=>seatCounts[p]),backgroundColor:parties.map((_,i)=>palette[i%palette.length]),borderRadius:3,barThickness:13}]},options:{...common,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:theme.grid},ticks:{color:theme.ink,font:{size:9}}},y:{grid:{display:false},ticks:{color:theme.ink,font:{size:9}}}}}});
  const partyVotes={};view.filter(r=>!isNota(r)).forEach(r=>partyVotes[r.Party]=(partyVotes[r.Party]||0)+r.Votes);const voteParties=Object.keys(partyVotes).sort((a,b)=>partyVotes[b]-partyVotes[a]).slice(0,9);const other=Object.keys(partyVotes).filter(p=>!voteParties.includes(p)).reduce((sum,p)=>sum+partyVotes[p],0);if(other){voteParties.push('Other');partyVotes.Other=other;}
  charts.share=new Chart($('shareChart'),{type:'doughnut',data:{labels:voteParties.map(p=>p==='Other'?p:partyName(p)),datasets:[{data:voteParties.map(p=>partyVotes[p]),backgroundColor:voteParties.map((_,i)=>palette[i%palette.length]),borderWidth:2,borderColor:getComputedStyle(document.body).getPropertyValue('--surface'),hoverOffset:4}]},options:{...common,cutout:'68%',plugins:{...common.plugins,legend:{position:'right',labels:common.plugins.legend.labels}}}});
  const selected=$('seatFilter').value||$('compareFilter').value;
  const districtSelection=$('districtFilter').value;
  let selectedRecords=selected?view.filter(r=>String(r.Constituency_No)===selected&&!isNota(r)):districtSelection?getSeatWinners(view):[];
  selectedRecords=selectedRecords.sort((a,b)=>b.Votes-a.Votes);
  if(districtSelection&&!selected){$('compareEmpty').textContent='No constituency results match this district selection.';}else{$('compareEmpty').textContent='Choose a constituency to compare candidate votes.';}
  $('compareEmpty').style.display=selectedRecords.length?'none':'grid';charts.compare=new Chart($('compareChart'),{type:'bar',data:{labels:selectedRecords.map(r=>districtSelection&&!selected?`${r.Candidate} · ${r.Constituency}`:r.Candidate),datasets:[{data:selectedRecords.map(r=>r.Votes),backgroundColor:selectedRecords.map((_,i)=>palette[i%palette.length]),borderRadius:3}]},options:{...common,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:theme.grid},ticks:{color:theme.ink,font:{size:9}}},y:{grid:{display:false},ticks:{color:theme.ink,font:{size:9}}}}}});
  const grouped=new Map();view.filter(r=>!isNota(r)).forEach(r=>{if(!grouped.has(r.Constituency_No))grouped.set(r.Constituency_No,[]);grouped.get(r.Constituency_No).push(r);});const margins=[...grouped.entries()].map(([n,rs])=>{rs.sort((a,b)=>b.Votes-a.Votes);return {n,name:rs[0].Constituency,margin:rs[0].Votes-(rs[1]?.Votes||0)};}).sort((a,b)=>a.margin-b.margin).slice(0,12);
  charts.margin=new Chart($('marginChart'),{type:'bar',data:{labels:margins.map(x=>x.name),datasets:[{data:margins.map(x=>x.margin),backgroundColor:'#dd7957',borderRadius:3,barThickness:12}]},options:{...common,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:theme.grid},ticks:{color:theme.ink,font:{size:9},callback:v=>fmt.format(v)}},y:{grid:{display:false},ticks:{color:theme.ink,font:{size:8}}}}}});
  const districtPartyCounts=new Map();winners.forEach(r=>{if(!r.District)return;if(!districtPartyCounts.has(r.District))districtPartyCounts.set(r.District,{});const counts=districtPartyCounts.get(r.District);counts[r.Party]=(counts[r.Party]||0)+1;});
  const districts=[...districtPartyCounts].sort((a,b)=>Object.values(b[1]).reduce((x,y)=>x+y,0)-Object.values(a[1]).reduce((x,y)=>x+y,0)).slice(0,12);
  const districtParties=[...new Set(districts.flatMap(([,counts])=>Object.keys(counts)))].sort((a,b)=>districts.reduce((n,[,c])=>n+(c[b]||0),0)-districts.reduce((n,[,c])=>n+(c[a]||0),0));
  const topDistrictParties=districtParties.slice(0,5), otherDistrictParties=districtParties.slice(5);
  const districtDatasets=topDistrictParties.map((party,i)=>({label:partyName(party),data:districts.map(([,counts])=>counts[party]||0),backgroundColor:palette[i%palette.length],borderRadius:2,barThickness:12}));
  if(otherDistrictParties.length)districtDatasets.push({label:'Other',data:districts.map(([,counts])=>otherDistrictParties.reduce((n,p)=>n+(counts[p]||0),0)),backgroundColor:'#9aa6b5',borderRadius:2,barThickness:12});
  charts.districtWinners=new Chart($('districtWinnersChart'),{type:'bar',data:{labels:districts.map(([d])=>d),datasets:districtDatasets},options:{...common,indexAxis:'y',scales:{x:{stacked:true,grid:{color:theme.grid},ticks:{color:theme.ink,font:{size:8},stepSize:1}},y:{stacked:true,grid:{display:false},ticks:{color:theme.ink,font:{size:8}}}}}});
  const topCandidates=view.filter(r=>!isNota(r)).sort((a,b)=>b.Vote_Share-a.Vote_Share).slice(0,12);
  charts.candidateShare=new Chart($('candidateShareChart'),{type:'bar',data:{labels:topCandidates.map(r=>`${r.Candidate} · ${r.Constituency}`),datasets:[{data:topCandidates.map(r=>r.Vote_Share),backgroundColor:'#b2864d',borderRadius:3,barThickness:12}]},options:{...common,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${Number(c.raw).toFixed(2)}%`}}},scales:{x:{grid:{color:theme.grid},ticks:{color:theme.ink,font:{size:8},callback:v=>`${v}%`}},y:{grid:{display:false},ticks:{color:theme.ink,font:{size:8}}}}}});
  const voteTotal=Object.values(partyVotes).reduce((sum,value)=>sum+value,0), seatTotal=winners.length;
  const represented=Object.keys(partyVotes).sort((a,b)=>partyVotes[b]-partyVotes[a]).slice(0,10);
  charts.representation=new Chart($('representationChart'),{type:'bar',data:{labels:represented.map(partyName),datasets:[{label:'Vote share',data:represented.map(p=>voteTotal?partyVotes[p]/voteTotal*100:0),backgroundColor:'#df7048',borderRadius:3,yAxisID:'y'},{type:'line',label:'Seat share',data:represented.map(p=>seatTotal?(seatCounts[p]||0)/seatTotal*100:0),borderColor:'#426a91',backgroundColor:'#426a91',pointRadius:3,tension:.25,yAxisID:'y'}]},options:{...common,plugins:{...common.plugins,legend:{position:'bottom',labels:common.plugins.legend.labels}},scales:{x:{grid:{display:false},ticks:{color:theme.ink,font:{size:8}}},y:{beginAtZero:true,grid:{color:theme.grid},ticks:{color:theme.ink,font:{size:8},callback:v=>`${v}%`},title:{display:true,text:'Share',color:theme.ink,font:{size:9}}}}}});
  const marginBands=[0,0,0,0];grouped.forEach(rs=>{rs.sort((a,b)=>b.Votes-a.Votes);const total=rs.reduce((sum,r)=>sum+r.Votes,0);if(total){const share=(rs[0].Votes-(rs[1]?.Votes||0))/total*100;marginBands[share<5?0:share<10?1:share<20?2:3]++;}});
  charts.marginBands=new Chart($('marginBandsChart'),{type:'doughnut',data:{labels:['Under 5%','5–10%','10–20%','20%+'],datasets:[{data:marginBands,backgroundColor:['#df7048','#b58a3a','#426a91','#238c75'],borderColor:getComputedStyle(document.body).getPropertyValue('--surface'),borderWidth:2,hoverOffset:4}]},options:{...common,cutout:'62%',plugins:{...common.plugins,legend:{position:'bottom',labels:common.plugins.legend.labels}}}});
}
function renderCompare(){renderCharts();}
function downloadCsv(){if(!filtered.length)return;const cols=['Constituency','Constituency_No','Candidate','Party','Votes','Vote_Share','Status'];const lines=[cols.join(','),...filtered.map(r=>cols.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))];const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tamil-nadu-election-results-2026.csv';a.click();URL.revokeObjectURL(a.href);}
init();
