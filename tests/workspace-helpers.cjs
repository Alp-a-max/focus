const {expect}=require('@playwright/test');
async function openTool(page,name){
 if(!await page.locator('#simpleTools').evaluate(el=>el.open))await page.locator('#simpleToolsOpen').click();
 await page.locator('#simpleTab-'+name).click();
}
async function search(page,value){
 await page.locator('#mapSearchInput').fill(value);
 await page.locator('#mapSearchForm').evaluate(form=>form.requestSubmit());
}
async function fields(page,state={}){
 await page.route('**/api/observations**',r=>r.fulfill({json:[]}));
 await page.route('**/v1/{marine,forecast}?*',async r=>{
  const u=new URL(r.request().url()),marine=u.pathname.includes('marine'),release=(u.searchParams.get('hourly')||'').includes('wave_period');
  if(release&&state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
  if(release&&state.fail)return r.fulfill({status:503,body:'unavailable'}).catch(()=>{});
  const time=Array.from({length:73},(_,i)=>new Date(Math.floor(Date.now()/3600000)*3600000+i*3600000).toISOString().slice(0,16)),speed=marine?'ocean_current_velocity':'wind_speed_10m',direction=marine?'ocean_current_direction':'wind_direction_10m';
  const lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(',');
  const values=lats.map((lat,i)=>({latitude:+lat,longitude:+lons[i],utc_offset_seconds:0,current:{time:time[0],wave_height:1,sea_surface_temperature:20,[speed]:marine?.4:2,[direction]:90},
   current_units:{[speed]:'km/h',[direction]:'°'},hourly_units:{[speed]:'km/h',[direction]:'°',wave_height:'m',wave_direction:'°',wave_period:'s'},
   hourly:{time,[speed]:time.map(()=>marine?.4:2),[direction]:time.map(()=>90),wave_height:time.map(()=>1.5),wave_direction:time.map(()=>270),wave_period:time.map(()=>8)}}));
  await r.fulfill({json:values.length===1?values[0]:values}).catch(()=>{});
 });
}
async function forecast(page){
 await page.locator('#releaseExample').click();
 await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','result');
}
module.exports={openTool,search,fields,forecast};
