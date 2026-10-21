const API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const $ = id => document.getElementById(id);
const state = { tab:"scores", filter:"all", conference:"East", games:[], standings:[], favorites:readFavorites(), date:localDate() };
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function readFavorites(){try{return JSON.parse(localStorage.getItem("nbaPulseFavorites")||"[]")}catch{return []}}
function saveFavorites(){localStorage.setItem("nbaPulseFavorites",JSON.stringify(state.favorites));$("favCount").textContent=state.favorites.length;}
function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function formatDate(s){if(!s)return "";return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(s));}
function setNotice(msg,error=false){$("status").textContent=msg;$("status").classList.toggle("error",error);}
async function getJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`Réponse HTTP ${r.status}`);return r.json();}
async function loadGames(){
  try{
    const data=await getJson(`${API}/scoreboard?dates=${state.date.replaceAll("-","")}`);
    state.games=(data.events||[]).map(e=>{
      const comp=e.competitions?.[0]||{}, competitors=comp.competitors||[];
      const home=competitors.find(t=>t.homeAway==="home")||competitors[0]||{};
      const away=competitors.find(t=>t.homeAway==="away")||competitors[1]||{};
      const status=e.status?.type||{};
      return {id:e.id,date:e.date,status:status.shortDetail||status.description||"Programmé",state:status.state||"pre",completed:!!status.completed,home:teamData(home),away:teamData(away),venue:comp.venue?.fullName||"",name:e.name||""};
    });
    renderGames();setNotice(state.games.length?`${state.games.length} match(s) trouvé(s) pour le ${new Intl.DateTimeFormat("fr-FR",{dateStyle:"full"}).format(new Date(state.date+"T12:00:00"))}.`:"Aucun match trouvé pour cette date.");
  }catch(e){state.games=[];renderGames();setNotice("Impossible de charger les scores pour le moment. Vérifie ta connexion puis réessaie. Si l’API publique change ou bloque les requêtes, une source de données avec clé API ou un petit proxy serveur sera nécessaire.",true);}
}
function teamData(t){return {id:t.id||t.team?.id||t.abbreviation||t.displayName,name:t.team?.displayName||t.displayName||t.name||"Équipe",short:t.team?.abbreviation||t.abbreviation||"NBA",score:t.score??"—",winner:!!t.winner,record:t.records?.[0]?.summary||""};}
async function loadStandings(){
  try{
    const data=await getJson(`${API}/standings?season=2026&seasontype=2`);
    const root=data.children||data.standings?.entries||data.entries||[];
    let entries=[];
    function walk(node,conf=""){for(const x of node||[]){if(x.standings?.entries){walk(x.standings.entries,x.name||conf)}else if(x.entries){walk(x.entries,x.name||conf)}else if(x.team||x.stats){entries.push({...x,_conf:conf})}}}
    walk(root);
    if(!entries.length && data.standings?.entries) entries=data.standings.entries;
    state.standings=entries.map(e=>{
      const stats={};for(const s of (e.stats||e.team?.stats||[]))stats[s.name]=s.value??s.displayValue;
      const team=e.team||e;
      const conf=String(e._conf||stats.conference||"");
      const wins=Number(stats.wins??stats.WINS??0), losses=Number(stats.losses??stats.LOSSES??0); const played=wins+losses; const draws=0; return {id:team.id||team.abbreviation,name:team.displayName||team.name||"Équipe",short:team.abbreviation||"",conf:/west/i.test(conf)?"West":/east/i.test(conf)?"East":(stats.conference==="West"?"West":"East"),wins,losses,played,draws,drawPct:played?draws/played*100:0,pct:Number(stats.winPercent??stats.winPct??stats.WINPCT??0),last10:stats.last10||stats["Last Ten"]||"—",raw:e};
    }).filter(x=>x.name!=="Équipe");
    renderStandings();
  }catch(e){state.standings=[];renderStandings();$("standingsBody").innerHTML='<tr><td colspan="9">Le classement n’est pas disponible via cette source pour le moment. Consulte les scores ou actualise.</td></tr>';}
}
function renderGames(){
 const games=state.games.filter(g=>state.filter==="all"||(state.filter==="live"&&g.state==="in")||(state.filter==="completed"&&g.completed)||(state.filter==="upcoming"&&!g.completed&&g.state!=="in"));
 const container=state.tab==="favorites"?$("favoritesList"):$("gamesList");
 const shown=state.tab==="favorites"?games.filter(g=>state.favorites.includes(String(g.home.id))||state.favorites.includes(String(g.away.id))):games;
 if(!shown.length){container.innerHTML='<div class="empty">Aucun match à afficher ici pour le moment.<br><span class="small">Essaie une autre date ou un autre filtre.</span></div>';return;}
 container.innerHTML=shown.map(g=>`<article class="game-card">
  <div class="game-top"><span class="game-status ${g.state==="in"?"live":""}">${g.state==="in"?"● EN DIRECT":safe(g.status)}</span><button class="fav-btn" data-fav="${safe(g.home.id)}" aria-label="Ajouter ${safe(g.home.name)} aux favoris">${state.favorites.includes(String(g.home.id))?"★":"☆"}</button></div>
  ${teamLine(g.away)}${teamLine(g.home)}
  <div class="game-bottom"><span>${safe(formatDate(g.date))}</span><span>${safe(g.venue||"NBA")}</span></div>
 </article>`).join("");
 container.querySelectorAll("[data-fav]").forEach(b=>b.addEventListener("click",()=>toggleFavorite(b.dataset.fav)));
 // Also offer favorite button for away team with a small action in team lines
 container.querySelectorAll(".team-code[data-team]").forEach(b=>b.addEventListener("click",()=>toggleFavorite(b.dataset.team)));
}
function teamLine(t){return `<div class="team-line"><div class="team-name"><button class="team-code" data-team="${safe(t.id)}" title="Ajouter ${safe(t.name)} aux favoris">${safe(t.short)}</button><span>${safe(t.name)}</span></div><span class="score ${t.winner?"winner":""}">${safe(t.score)}</span></div>`;}
function toggleFavorite(id){id=String(id);state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];saveFavorites();renderGames();renderStandings();}
function renderStandings(){
 const body=$("standingsBody");if(!state.standings.length){body.innerHTML='<tr><td colspan="9">Chargement ou données indisponibles.</td></tr>';return;}
 const list=state.standings.filter(t=>t.conf===state.conference).sort((a,b)=>b.wins-a.wins||a.losses-b.losses);
 body.innerHTML=list.map((t,i)=>`<tr><td class="rank">${i+1}</td><td><div class="standing-team"><button class="fav-btn" data-fav="${safe(t.id)}">${state.favorites.includes(String(t.id))?"★":"☆"}</button><span>${safe(t.name)}</span></div></td><td>${t.played}</td><td class="record">${t.wins}</td><td>${t.losses}</td><td>${t.draws}</td><td class="winpct">${t.pct.toFixed(3)}</td><td>${t.drawPct.toFixed(1)}%</td><td>${safe(t.last10)}</td></tr>`).join("");
 body.querySelectorAll("[data-fav]").forEach(b=>b.addEventListener("click",()=>toggleFavorite(b.dataset.fav)));
}
function switchTab(tab){state.tab=tab;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));$("scoresPanel").hidden=tab!=="scores";$("standingsPanel").hidden=tab!=="standings";$("favoritesPanel").hidden=tab!=="favorites";$("overtimePanel").hidden=tab!=="overtime";if(tab==="favorites")renderGames();if(tab==="overtime")renderOvertimeSummary();}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{state.filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderGames();}));
document.querySelectorAll("[data-conf]").forEach(b=>b.addEventListener("click",()=>{state.conference=b.dataset.conf;document.querySelectorAll("[data-conf]").forEach(x=>x.classList.toggle("active",x===b));renderStandings();}));
$("dateInput").value=state.date;$("dateInput").addEventListener("change",e=>{if(e.target.value){state.date=e.target.value;loadGames();}});
$("refreshBtn").addEventListener("click",refresh);
async function refresh(){setNotice("Actualisation des données…");await Promise.all([loadGames(),loadStandings()]);$("updatedAt").textContent="Mis à jour à "+new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date());saveFavorites();}
let installPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn").hidden=false;});
$("installBtn").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("installBtn").hidden=true;});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
refresh();
setInterval(()=>{if(state.date===localDate())loadGames();},60000);


// Overtime Lab — local-only historical analysis and fictional backtest.
const OT_STORAGE_KEY = "nbaPulseOvertimeHistoryV2";
const OT_PRIOR_RATE = 0.044; // weak starting prior; replace progressively with imported historical data
const OT_PRIOR_WEIGHT = 30;
let otGames = loadOtGames();
let otBacktest = null;

function loadOtGames(){
  try {
    const rows = JSON.parse(localStorage.getItem(OT_STORAGE_KEY) || localStorage.getItem("nbaPulseOvertimeHistoryV1") || "[]");
    return Array.isArray(rows) ? rows.filter(g => g && Number.isFinite(g.ot === true ? 1 : g.ot === false ? 0 : NaN)) : [];
  } catch { return []; }
}
function saveOtGames(){
  try { localStorage.setItem(OT_STORAGE_KEY, JSON.stringify(otGames)); return true; }
  catch { $("importStatus").textContent = "Stockage local saturé : exporte ou réduis le fichier."; return false; }
}
function parseCSV(text){
  const first = text.split(/\r?\n/,1)[0] || "";
  const delimiter = (first.match(/;/g)||[]).length > (first.match(/,/g)||[]).length ? ";" : ",";
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"' && quoted && text[i+1]==='"'){cell+='"';i++;}
    else if(c==='"'){quoted=!quoted;}
    else if(c===delimiter && !quoted){row.push(cell.trim());cell="";}
    else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell.trim());if(row.some(v=>v!==""))rows.push(row);row=[];cell="";}
    else cell+=c;
  }
  if(cell.length||row.length){row.push(cell.trim());if(row.some(v=>v!==""))rows.push(row);}
  if(!rows.length) return [];
  const headers=rows.shift().map(h=>h.trim().toLowerCase().replace(/^\uFEFF/,"").replace(/[ -]/g,"_"));
  return rows.map((cells,index)=>{const obj={};headers.forEach((h,i)=>obj[h]=cells[i]??"");obj._line=index+2;return obj;});
}
function numField(obj, ...names){
  for(const name of names){if(obj[name]!==undefined&&String(obj[name]).trim()!==""){const n=Number(String(obj[name]).replace(",","."));if(Number.isFinite(n))return n;}}
  return null;
}
function normalizeOtRow(row){
  const q=[];
  for(let i=1;i<=4;i++){
    const h=numField(row,`q${i}_home`,`q${i}_dom`,`q${i}_h`);
    const a=numField(row,`q${i}_away`,`q${i}_ext`,`q${i}_a`);
    if(h===null||a===null||h<0||a<0)throw new Error(`Ligne ${row._line}: scores du quart ${i} manquants ou invalides.`);
    q.push([h,a]);
  }
  const home=String(row.home||row.domicile||"").trim(), away=String(row.away||row.exterieur||"").trim();
  const date=String(row.date||row.game_date||"").trim();
  if(!home||!away||!date)throw new Error(`Ligne ${row._line}: date, home et away sont obligatoires.`);
  const homeReg=q.reduce((sum,x)=>sum+x[0],0), awayReg=q.reduce((sum,x)=>sum+x[1],0);
  const odds=numField(row,"odds_over","cote_prolongation","odds","odds_yes");
  if(odds!==null&&odds<=1)throw new Error(`Ligne ${row._line}: la cote doit être supérieure à 1.`);
  return {date,home,away,quarters:q,homeReg,awayReg,ot:homeReg===awayReg,odds:odds&&odds>1?odds:null};
}
function renderOvertimeSummary(){
  $("importStatus").textContent=otGames.length?`${otGames.length} match(s) synchronisé(s) et conservé(s) sur cet appareil.`:"Aucun historique synchronisé.";
  $("metricGames").textContent=otGames.length;
  const count=otGames.filter(g=>g.ot).length;
  $("metricOT").textContent=otGames.length?`${count} (${(100*count/otGames.length).toFixed(2)} %)`:"—";
  $("metricRate").textContent=otGames.length?`${(100*count/otGames.length).toFixed(2)} %`:"—";
  if(!otBacktest){$("metricBrier").textContent="—";$("metricBets").textContent="0";$("metricHitRate").textContent="—";$("metricProfit").textContent="—";$("metricROI").textContent="—";}
}
function money(n){return `${n<0?"−":""}${Math.abs(n).toFixed(2).replace(".",",")} €`;}
function runOtBacktest(){
  if(otGames.length<2){$("backtestStatus").textContent="Importe au moins 2 matchs valides pour lancer le test.";return;}
  const stake=Number($("stakeInput").value), edge=Math.max(0,Number($("edgeInput").value)||0)/100;
  if(!Number.isFinite(stake)||stake<=0){$("backtestStatus").textContent="La mise fictive doit être supérieure à 0 €.";return;}
  const games=[...otGames].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  let seen=0, otSeen=0, brier=0, scored=0, bets=0, wins=0, profit=0, staked=0;
  const rows=[];
  for(const g of games){
    // Probability is based only on games earlier in chronological order.
    const p=(otSeen+OT_PRIOR_RATE*OT_PRIOR_WEIGHT)/(seen+OT_PRIOR_WEIGHT);
    const eligible=seen>=10;
    const shouldBet=eligible&&g.odds&&p>1/g.odds+edge;
    let result="Pas de pari", gain=null;
    if(eligible){brier+=(p-(g.ot?1:0))**2;scored++;}
    if(shouldBet){
      bets++;staked+=stake;
      if(g.ot){wins++;gain=stake*(g.odds-1);}else gain=-stake;
      profit+=gain;result=g.ot?"Gagné":"Perdu";
    } else if(!g.odds) result="Sans cote";
    else if(!eligible) result="Initialisation";
    rows.push({g,p,decision:shouldBet?"PARI fictif":"—",result,gain});
    seen++;if(g.ot)otSeen++;
  }
  otBacktest={rows,brier:scored?brier/scored:null,bets,wins,profit,staked,hitRate:bets?wins/bets:null,roi:staked?profit/staked:null,scored};
  $("metricBrier").textContent=otBacktest.brier===null?"—":otBacktest.brier.toFixed(4);
  $("metricBets").textContent=bets;
  $("metricHitRate").textContent=bets?`${(100*wins/bets).toFixed(1)} %`:"—";
  $("metricProfit").textContent=money(profit);
  $("metricROI").textContent=staked?`${(100*profit/staked).toFixed(1)} %`:"—";
  $("backtestBody").innerHTML=rows.slice(-300).reverse().map(({g,p,decision,result,gain})=>`<tr><td>${safe(g.date)}<br><span class="small muted">${safe(g.away)} @ ${safe(g.home)}</span></td><td>${(100*p).toFixed(2)} %</td><td>${g.odds?g.odds.toFixed(2):"—"}</td><td class="${decision==="PARI fictif"?"record":""}">${decision}</td><td>${result==="Gagné"?'<span class="record">Gagné</span>':result==="Perdu"?'<span class="loss">Perdu</span>':safe(result)}</td><td>${gain===null?"—":`<span class="${gain>=0?"record":"loss"}">${money(gain)}</span>`}</td></tr>`).join("")||'<tr><td colspan="6">Aucun résultat.</td></tr>';
  $("backtestStatus").textContent=`Test chronologique terminé : ${scored} match(s) évalué(s), ${bets} pari(s) fictif(s). Affichage des 300 derniers matchs au maximum.`;
}
// Import des résultats d'une journée depuis le calendrier ESPN. Seuls les matchs
// terminés avec les scores individuels des quatre périodes sont ajoutés à l'historique.
const otDateInput = $("otDateInput");
if (otDateInput) otDateInput.value = state.date;
function extractCompetitors(data){
  const candidates = [data?.header?.competitions?.[0]?.competitors, data?.boxscore?.teams?.flatMap(t=>t.team?[]:[])];
  for (const list of candidates) if (Array.isArray(list) && list.length >= 2) return list;
  return [];
}
function getQuarterScores(summary, event){
  const lists = [
    summary?.header?.competitions?.[0]?.competitors,
    summary?.gamepackageJSON?.header?.competitions?.[0]?.competitors,
    event?.competitions?.[0]?.competitors
  ].filter(list=>Array.isArray(list)&&list.length>=2);
  const scoreVal = x => Number(typeof x === "object" ? (x.value ?? x.displayValue ?? x.score) : x);
  for(const competitors of lists){
    const home = competitors.find(t=>t.homeAway==="home") || competitors[0];
    const away = competitors.find(t=>t.homeAway==="away") || competitors[1];
    const homeLines = Array.isArray(home?.linescores) ? home.linescores : (home?.linescores?.items || []);
    const awayLines = Array.isArray(away?.linescores) ? away.linescores : (away?.linescores?.items || []);
    const h = homeLines.map(scoreVal).filter(Number.isFinite).slice(0,4);
    const a = awayLines.map(scoreVal).filter(Number.isFinite).slice(0,4);
    if(h.length>=4 && a.length>=4) return {home,away,quarters:h.map((v,i)=>[v,a[i]])};
  }
  return null;
}
async function syncOvertimeDay(){
  const date = otDateInput?.value;
  if(!date){$("syncStatus").textContent="Choisis une date valide.";return;}
  const btn=$("syncDayBtn");btn.disabled=true;btn.textContent="Synchronisation…";
  $("syncStatus").textContent="Chargement du calendrier et des scores quart par quart…";
  $("otDayGames").innerHTML="";
  try{
    const day=date.replaceAll("-","");
    const data=await getJson(`${API}/scoreboard?dates=${day}`);
    const events=data.events||[];
    if(!events.length){$("syncStatus").textContent="Aucun match trouvé pour cette journée.";return;}
    let added=0, skipped=0;
    const merged=new Map(otGames.map(g=>[g.gameId?`id:${g.gameId}`:`${g.date}|${g.home}|${g.away}`,g]));
    const dayRows=[];
    for(const event of events){
      const status=event.status?.type||{};
      const comp=event.competitions?.[0]||{};
      const teams=comp.competitors||[];
      const home=teams.find(t=>t.homeAway==="home")||teams[0]||{};
      const away=teams.find(t=>t.homeAway==="away")||teams[1]||{};
      const label=`${away.team?.displayName||away.displayName||"Extérieur"} @ ${home.team?.displayName||home.displayName||"Domicile"}`;
      if(!status.completed){dayRows.push({label,status:status.shortDetail||status.description||"À venir",added:false});continue;}
      try{
        const summary=await getJson(`${API}/summary?event=${encodeURIComponent(event.id)}`);
        const result=getQuarterScores(summary,event);
        if(!result){skipped++;dayRows.push({label,status:"Terminé · scores par quart indisponibles",added:false});continue;}
        const quarters=result.quarters;
        const homeReg=quarters.reduce((sum,q)=>sum+q[0],0),awayReg=quarters.reduce((sum,q)=>sum+q[1],0);
        const record={gameId:String(event.id),date:String(event.date||date).slice(0,10),home:result.home?.team?.displayName||result.home?.displayName||home.team?.displayName||home.displayName||"Domicile",away:result.away?.team?.displayName||result.away?.displayName||away.team?.displayName||away.displayName||"Extérieur",quarters,homeReg,awayReg,ot:homeReg===awayReg,odds:null,source:"ESPN",syncedAt:new Date().toISOString()};
        merged.set(`id:${record.gameId}`,record);added++;dayRows.push({label,status:record.ot?"Terminé · prolongation":"Terminé · pas de prolongation",added:true});
      }catch(err){skipped++;dayRows.push({label,status:"Résultat détaillé indisponible",added:false});}
    }
    otGames=[...merged.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    saveOtGames();otBacktest=null;renderOvertimeSummary();
    $("otDayGames").innerHTML=dayRows.map(g=>`<div class="ot-day-row"><span>${safe(g.label)}</span><span class="small ${g.added?"record":"muted"}">${safe(g.status)}</span></div>`).join("");
    $("syncStatus").textContent=`Journée traitée : ${added} match(s) ajouté(s)/actualisé(s), ${skipped} résultat(s) non exploitable(s). ${events.length} match(s) au calendrier.`;
    $("backtestBody").innerHTML='<tr><td colspan="6">Historique actualisé. Lance le backtest pour recalculer les statistiques.</td></tr>';
    $("backtestStatus").textContent=otGames.length>=2?"Historique prêt : lance le backtest.":"Synchronise d’autres journées terminées pour constituer un historique suffisant.";
  }catch(err){$("syncStatus").textContent=`Synchronisation impossible : ${err.message}. Vérifie la connexion ou réessaie plus tard.`;}
  finally{btn.disabled=false;btn.textContent="Récupérer les résultats de cette journée";}
}
$("syncDayBtn").addEventListener("click",syncOvertimeDay);
$("runBacktestBtn").addEventListener("click",runOtBacktest);
$("clearHistoryBtn").addEventListener("click",()=>{
  if(!confirm("Effacer tous les matchs historiques Overtime Lab enregistrés sur cet appareil ?"))return;
  otGames=[];otBacktest=null;saveOtGames();$("backtestBody").innerHTML='<tr><td colspan="6">Aucun backtest lancé.</td></tr>';$("backtestStatus").textContent="Historique effacé.";renderOvertimeSummary();
});
renderOvertimeSummary();
