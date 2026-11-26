/* Single source for planned pricing. Integer cents; no payments or live entitlements. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.FocusPlans=value;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const centsPerForecastHour=5,annualPaidMonths=10,annualFreeMonths=2;
 const plans=Object.freeze([
  {id:'free',name:{tr:'Ücretsiz',en:'Free'},maxHours:24,dailyForecasts:5,monthlyCents:0,annualCents:0},
  {id:'payg',name:{tr:'Kullandıkça öde',en:'Pay as you go'},maxHours:72,centsPerForecastHour},
  ...[
   ['starter','Başlangıç','Starter',24,100,6900],
   ['professional','Profesyonel','Professional',48,200,27900],
   ['enterprise','Kurumsal','Enterprise',72,500,99900]
  ].map(([id,tr,en,maxHours,monthlyForecasts,monthlyCents])=>({id,name:{tr,en},maxHours,monthlyForecasts,monthlyCents,annualCents:monthlyCents*annualPaidMonths}))
 ].map(p=>Object.freeze({...p,name:Object.freeze(p.name)})));
 const engineHorizons=Object.freeze([6,12,24]);
 function paygCents(hours){if(!Number.isSafeInteger(hours)||hours<1||hours>72)throw RangeError('Forecast hours must be an integer from 1 to 72');return hours*centsPerForecastHour;}
 function quote({planId='payg',hours,remainingCredits=0,outcome='succeeded',reopening=false,sourceSections=1,windScenarios=3}={}){
  const amount=paygCents(hours),plan=plans.find(p=>p.id===planId);
  if(!plan||!Number.isSafeInteger(remainingCredits)||remainingCredits<0||!['succeeded','failed','invalid','cancelled'].includes(outcome)||typeof reopening!=='boolean'||sourceSections!==1||windScenarios!==3)throw RangeError('Invalid pricing preview');
  const noCharge=outcome!=='succeeded'||reopening,covered=plan.id!=='payg'&&remainingCredits>0&&hours<=plan.maxHours;
  return Object.freeze({amountCents:noCharge||covered?0:amount,creditsUsed:!noCharge&&covered?1:0,
   reason:noCharge?'unsuccessful_or_reopened':covered?'included_credit':'payg',forecastHours:hours,sourceSections:1,windScenarios:3,
   additionalPayg:!noCharge&&!covered&&plan.id!=='payg',engineSupported:engineHorizons.includes(hours),pricingOnly:true,paymentEnabled:false});
 }
 return Object.freeze({currency:'USD',billing:'month',salesEnabled:false,planChangesEnabled:false,centsPerForecastHour,annualPaidMonths,annualFreeMonths,engineHorizons,plans,paygCents,quote});
});
