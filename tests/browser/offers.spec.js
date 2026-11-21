import { test, expect } from "@playwright/test";
test("offer review shows buyer objections without changing the investment gate",async({page})=>{
  const offer={id:"pilot",title:"Example pilot",pitch:"A written report",pitchSha256:"synthetic-hash",panel:"consumer",simulationEnabled:true,gate:{status:"blocked",reason:"No signed paid pilot verified.",floorMinor:10000,currency:"HKD"}};
  await page.route("**/api/offers",r=>r.fulfill({json:{offers:[offer]}}));
  await page.route("**/api/offers/pilot/objections",r=>{
    if(r.request().method()==="GET")return r.fulfill({json:{latest:null}});
    expect(r.request().postDataJSON()).toEqual({pitchSha256:offer.pitchSha256});
    return r.fulfill({status:201,json:{objections:[{role:"First-time buyer",question:"What is included?",pitchExcerpt:"written report"}]}});
  });
  await page.goto("/");await page.getByRole("link",{name:"Validate an offer"}).click();
  await expect(page.getByRole("heading",{name:"Wider investment blocked"})).toBeVisible();
  await page.getByRole("button",{name:"Run objection review"}).click();
  await expect(page.getByRole("listitem")).toContainText("What is included?");
  await expect(page.getByRole("heading",{name:"Wider investment blocked"})).toBeVisible();
});
