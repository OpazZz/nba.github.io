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
function switchTab(tab){state.tab=tab;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));$("scoresPanel").hidden=tab!=="scores";$("standingsPanel").hidden=tab!=="standings";$("favoritesPanel").hidden=tab!=="favorites";if(tab==="favorites")renderGames();}
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
