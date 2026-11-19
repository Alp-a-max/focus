/* A release event is a user-defined scenario, not a measured fragmentation rate. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./ensemble-drift.js'));else root.FocusRelease=factory(root.OdakEnsemble);})(typeof globalThis!=='undefined'?globalThis:this,function(ensemble){
 'use strict';
 function seeds({lat,lon,radiusKm=.5,releaseHours=1}){
  if(!Number.isFinite(lat)||Math.abs(lat)>79||!Number.isFinite(lon)||Math.abs(lon)>178.5||!Number.isFinite(radiusKm)||radiusKm<.1||radiusKm>2||![1,6].includes(releaseHours))throw Error('Geçersiz kopuş bölgesi veya salım süresi.');
  const count=releaseHours===1?25:5,out=[];
  for(let h=0;h<releaseHours;h++)for(let i=0;i<count;i++){const angle=2*Math.PI*i/count;out.push({lat:lat+Math.sin(angle)*radiusKm/111.32,lon:lon+Math.cos(angle)*radiusKm/(111.32*Math.cos(lat*Math.PI/180)),releaseHour:h});}
  return out;
 }
 function simulate(input){const starts=seeds(input);return {...ensemble.simulate({...input,starts}),source:{kind:'assumed_breakaway_section',lat:input.lat,lon:input.lon,radius_km:input.radiusKm??.5,release_hours:input.releaseHours??1},release_count_per_scenario:starts.length,fragmentation_rate_measured:false,extra_stokes_velocity_added:false};}
 return {seeds,simulate,snapshot:ensemble.snapshot};
});
