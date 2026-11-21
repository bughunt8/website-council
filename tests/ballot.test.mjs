import test from "node:test";
import assert from "node:assert/strict";
import { parseCard } from "../app/lib/seats.mjs";
import { finalNumbers, withheldVerdict, verdictSeats } from "../app/lib/council.mjs";

function run(cards, round=3) {
  const seats=cards.map((_,i)=>String(i));
  const entries=cards.map((t,i)=>[String(i),{parsed:parseCard(t,["A"])}]);
  const st={rounds:[round], seats, scores:{[round]:{A:{score:7}}}, weights:Object.fromEntries(seats.map(k=>[k,{weight:1}])), cards:{1:{},2:{},3:Object.fromEntries(entries)}};
  return {...finalNumbers(st), seats:verdictSeats(st,round)};
}
test("one dissent and one uncast vote cannot endorse, supply support, or produce a resolution",()=>{
  const r=run(["VOTE: Dissent","FINAL SCORE: 10"]);
  assert.deepEqual(r.votes,{endorse:0,amend:0,dissent:1,abstain:0,missing:1,invalid:0});
  assert.equal(r.support,null); assert.equal(r.seats[1].stance,"missing");
  assert.equal(withheldVerdict(r.ballot).label,"NO QUORUM");
});
test("ballots are exact; abstentions, malformed, duplicate and absent votes stay separate",()=>{
  const r=run(["VOTE: Endorse","VOTE: Endorse with amendment","VOTE: Abstain","VOTE: not endorse","VOTE: Endorse\nVOTE: Dissent","VOTE: Endorse | Dissent",""]);
  assert.deepEqual(r.votes,{endorse:1,amend:1,dissent:0,abstain:1,missing:1,invalid:3}); assert.equal(r.ballot.required,4);
  assert.equal(run(["VOTE: Dissent","VOTE: Endorse",""]).ballot.status,"quorate");
  assert.equal(run(["","",""],2).ballot.status,"not-held");
});
