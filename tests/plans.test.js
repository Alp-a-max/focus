const {test}=require('node:test'),assert=require('node:assert/strict'),p=require('../js/plans.js');
test('PAYG prices use forecast hours and exact integer cents, including all approved examples',()=>{
 for(const [h,c]of [[1,5],[12,60],[24,120],[48,240],[72,360]])assert.equal(p.paygCents(h),c);
 for(const invalid of [0,73,-1,1.5,'12',NaN,Infinity])assert.throws(()=>p.paygCents(invalid));
 assert.equal(p.paygCents(12)*100,6000);assert.ok(p.paygCents(12)*100<p.plans.find(x=>x.id==='starter').monthlyCents);
});
test('plan limits, monthly quotas and two free months are derived without rounding',()=>{
 const free=p.plans.find(x=>x.id==='free');assert.equal(free.maxHours,24);assert.equal(free.dailyForecasts,5);
 assert.deepEqual(p.plans.filter(x=>x.monthlyForecasts).map(x=>[x.maxHours,x.monthlyForecasts,x.monthlyCents,x.annualCents]),[[24,100,6900,69000],[48,200,27900,279000],[72,500,99900,999000]]);
 for(const plan of p.plans.filter(x=>x.monthlyForecasts))assert.equal(plan.annualCents,plan.monthlyCents*(12-p.annualFreeMonths));
});
test('one source and all three wind scenarios consume exactly one credit within the package horizon',()=>{
 for(const hours of [12,24]){const q=p.quote({planId:'starter',hours,remainingCredits:100});assert.equal(q.creditsUsed,1);assert.equal(q.amountCents,0);assert.equal(q.windScenarios,3);assert.equal(q.sourceSections,1);}
 for(const [planId,hours]of [['professional',48],['enterprise',72]]){const q=p.quote({planId,hours,remainingCredits:1});assert.equal(q.creditsUsed,1);assert.equal(q.engineSupported,false);}
 assert.throws(()=>p.quote({hours:12,sourceSections:2}));assert.throws(()=>p.quote({hours:12,windScenarios:9}));
});
test('exhausted or out-of-horizon credits use PAYG without silently spending three credits',()=>{
 assert.deepEqual([p.quote({planId:'starter',hours:24,remainingCredits:0}).amountCents,p.quote({planId:'starter',hours:48,remainingCredits:1}).amountCents],[120,240]);
 const q=p.quote({planId:'starter',hours:48,remainingCredits:1});assert.equal(q.additionalPayg,true);assert.equal(q.creditsUsed,0);
 let remaining=5;for(let i=0;i<5;i++){const q=p.quote({planId:'free',hours:3,remainingCredits:remaining});remaining-=q.creditsUsed;assert.equal(q.amountCents,0)}
 assert.equal(remaining,0);assert.equal(p.quote({planId:'free',hours:3,remainingCredits:remaining}).amountCents,15);
});
test('failed, invalid, cancelled and reopened forecasts never consume a fee or credit; no live payment exists',()=>{
 for(const planId of ['payg','starter'])for(const outcome of ['failed','invalid','cancelled']){
  const q=p.quote({planId,hours:24,remainingCredits:1,outcome});assert.equal(q.amountCents,0);assert.equal(q.creditsUsed,0);
 }
 for(const planId of ['payg','starter']){const q=p.quote({planId,hours:24,remainingCredits:1,reopening:true});assert.equal(q.amountCents,0);assert.equal(q.creditsUsed,0);assert.equal(q.paymentEnabled,false);assert.equal(q.pricingOnly,true);}
 assert.equal(p.salesEnabled,false);assert.equal(p.planChangesEnabled,false);assert.deepEqual(p.engineHorizons,[6,12,24]);
});
