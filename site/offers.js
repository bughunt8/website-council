const el = id => document.getElementById(id);
let catalogue, ticket=0;
async function api(url, options) {
  const r=await fetch(url,{...options,cache:"no-store"});
  if (r.status===401) el("login").hidden=false;
  const data=await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || "The protected offer service is unavailable.");
  return data;
}
const selected=()=>catalogue.offers[el("offer").selectedIndex];
const url=o=>`/api/offers/${encodeURIComponent(o.id)}/objections`;
function draw(result) {
  el("objections").replaceChildren();
  if (!result) return;
  for (const row of result.objections) {
    const li=document.createElement("li");
    li.textContent=`${row.role}: ${row.question} Prompted by “${row.pitchExcerpt}”.`;
    el("objections").append(li);
  }
}
async function show() {
  const n=++ticket, o=selected();
  el("gate").textContent=o.gate.status==="eligible-for-review"?"Pilot verified. Investment review can begin.":"Wider investment blocked";
  el("reason").textContent=o.gate.reason;
  let floor="";
  if (o.gate.currency) {
    const fmt=new Intl.NumberFormat(undefined,{style:"currency",currency:o.gate.currency});
    floor=`Approved fee floor: ${fmt.format(o.gate.floorMinor / 10 ** fmt.resolvedOptions().maximumFractionDigits)} (${o.gate.currency})`;
  }
  el("floor").textContent=floor;
  el("pitch").textContent=o.pitch;
  el("panel-note").textContent=`Three simulated ${o.panel==="business"?"business buyers":"consumers"} review only this pitch. Their objections are interview prompts, not a demand forecast. Each run uses the model budget.`;
  el("run").disabled=true; draw(null); el("review-status").textContent="Checking for a previous review…";
  try {
    const {latest}=await api(url(o)); if(n!==ticket)return;
    draw(latest); el("review-status").textContent=latest?"Last completed simulation for this pitch.":o.simulationEnabled?"No review yet.":"Simulation is disabled. The commercial gate still applies.";
    el("run").disabled=!o.simulationEnabled;
  } catch(e){if(n===ticket)el("review-status").textContent=e.message;}
}
el("run").onclick=async()=>{
  const o=selected(); el("run").disabled=true; el("offer").disabled=true;
  el("review-status").textContent="Reviewing the pitch. No changes will be made to the pilot decision.";
  try {
    const result=await api(url(o),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pitchSha256:o.pitchSha256})});
    draw(result); el("review-status").textContent="Simulated objections. Verify them with real buyers.";
  } catch(e){el("review-status").textContent=e.message;}
  finally {el("run").disabled=!o.simulationEnabled;el("offer").disabled=false;}
};
el("offer").onchange=show;
try {
  catalogue=await api("/api/offers");
  if(!catalogue.offers.length) el("load").textContent="No approved offers are assigned to this account.";
  else {
    for(const o of catalogue.offers) el("offer").add(new Option(o.title,o.id));
    el("load").textContent="";el("workspace").hidden=false;await show();
  }
} catch(e){el("load").textContent=e.message;}
