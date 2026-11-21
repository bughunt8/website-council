import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pitchHash, pilotGate, panelEnabled, simulate } from "../service/offers.mjs";
import { createService } from "../service/server.mjs";

const pitch="A scoped synthetic pilot with a written report.";
const hash=pitchHash(pitch);
const floor={currency:"HKD",minor:10000,approvalRef:"floor-1",pitchSha256:hash};
const pilot={offerId:"diagnostic",pitchSha256:hash,currency:"HKD",floorApprovalRef:"floor-1",companySigned:true,companyRef:"private-org",signedAgreementRef:"private-agreement",settledPaymentRef:"private-payment",reviewRef:"private-review",status:"verified",contractedMinor:10000,settledNetMinor:10000};
const offer=()=>({owner:"alice",id:"diagnostic",title:"Diagnostic",pitch,panel:"business",simulationPitchSha256:hash,floor:{...floor},pilots:[]});
const eligible=o=>pilotGate(o).status==="eligible-for-review";
test("pilot requires verified company signature and actual net payment in the approved currency, bound to this floor and pitch",()=>{
  const o=offer(); assert.equal(eligible(o),false);
  for(const patch of [{companySigned:false},{companyRef:" "},{contractedMinor:9999},{settledNetMinor:9999},{settledNetMinor:"10000"},{status:"refunded"},{currency:"USD"},{pitchSha256:"old"},{reviewRef:""},{offerId:"other"},{signedAgreementRef:""},{settledPaymentRef:""},{floorApprovalRef:"old"}])
    assert.equal(eligible({...o,pilots:[{...pilot,...patch}]}),false,JSON.stringify(patch));
  o.pilots=[pilot];assert.equal(eligible(o),true);
  for(const f of [null,{...floor,minor:0},{...floor,approvalRef:""},{...floor,pitchSha256:"stale"}]) assert.equal(eligible({...o,floor:f}),false);
  assert.equal(eligible({...o,pitch:"a different scope"}),false);
});
test("consumer simulation returns interview questions, no invented quotes, freeform forecast or buying votes",async()=>{
  const o={...offer(),panel:"consumer"};const calls=[];
  const ctx={model:"synthetic",maxCalls:3,transport:{json:async plan=>{calls.push(plan);return {concern:"scope",pitchExcerpt:"written report",forecast:"99%"};}}};
  const result=await simulate(o,ctx);assert.equal(calls.length,3);assert.equal(new Set(result.objections.map(r=>r.role)).size,3);
  assert.ok(result.objections.every(r=>r.question.endsWith("?")));assert.ok(!JSON.stringify(result).includes("99%"));
  assert.ok(calls.every(p=>p.prompt===JSON.stringify({pitch})));
  await assert.rejects(simulate(o,{...ctx,transport:{json:async()=>({concern:"scope",pitchExcerpt:"invented"})}}),/Invalid/);
  await assert.rejects(simulate(o,{...ctx,maxCalls:2}),/budget/);
});
test("owner-scoped HTTP workflow blocks forged evidence, isolates reviews and shares execution quotas",async()=>{
  const o=offer(), conf={models:{seat:"test-model"},limits:{runsPerUserPerDay:1,maxConcurrent:1,maxProviderCalls:3},executionEnabled:true,providerDisclosureApproved:true,offerValidation:{simulationApproved:true,offers:[o]}};
  const dir=mkdtempSync(path.join(tmpdir(),"offer-test-"));
  let calls=0,unblock,entered; const waiting=new Promise(r=>entered=r);
  const runtime=createService({config:conf,dataDir:dir,identity:async req=>{if(!req.headers.owner)throw Error();return req.headers.owner;},panelTransport:{json:async req=>{
    if(++calls===1){entered();await new Promise(r=>unblock=r);}
    assert.ok(!JSON.stringify(req).includes("private-"));return {concern:"scope",pitchExcerpt:"scoped"};
  }}});
  await new Promise(r=>runtime.server.listen(0,"127.0.0.1",r));
  const base=`http://127.0.0.1:${runtime.server.address().port}/api/offers`,p="/diagnostic/objections";
  const get=(suffix="",owner="alice")=>fetch(base+suffix,{headers:{owner}});
  const post=(body={pitchSha256:hash},owner="alice",extra={})=>fetch(base+p,{method:"POST",headers:{owner,"content-type":"application/json",...extra},body:JSON.stringify(body)});
  try{
    assert.equal((await get("","")).status,401);assert.equal((await get(p,"bob")).status,404);
    assert.deepEqual((await (await get("","bob")).json()).offers,[]);
    assert.equal((await post(undefined,"alice",{origin:"https://invalid.example"})).status,403);
    assert.equal((await post({pitchSha256:hash,pilots:[pilot]})).status,409);
    assert.equal((await post({pitchSha256:"old"})).status,409);
    conf.offerValidation.simulationApproved=false;assert.equal((await post()).status,503);conf.offerValidation.simulationApproved=true;
    assert.equal(panelEnabled(conf,{...o,pitch:"changed"}),false);assert.equal(calls,0);
    const pending=post();await waiting;assert.equal((await post()).status,429);unblock();
    const res=await pending;assert.equal(res.status,201);assert.equal(calls,3);
    const saved=await res.json();assert.equal((await (await get(p)).json()).latest.id,saved.id);
    assert.equal((await (await get()).json()).offers[0].gate.status,"blocked");
    assert.equal((await post()).status,429);
    o.pilots=[pilot];const catalogue=await(await get()).text();assert.match(catalogue,/eligible-for-review/);assert.doesNotMatch(catalogue,/private-|settledPaymentRef/);
    o.pitch="New offer terms";assert.equal((await (await get(p)).json()).latest,null);
  } finally {unblock?.();runtime.server.closeAllConnections();await new Promise(r=>runtime.server.close(r));rmSync(dir,{recursive:true,force:true});}
});
