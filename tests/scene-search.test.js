const {test}=require('node:test'),assert=require('node:assert/strict');
const {findScene}=require('../scene-search.cjs');
function scene(date,cloud=10){return {id:date,properties:{datetime:date,'eo:cloud_cover':cloud},assets:Object.fromEntries(['nir','rededge2','swir16','scl','visual'].map(k=>[k,{href:'https://sentinel-cogs.s3.us-west-2.amazonaws.com/'+k}]))};}
test('requests descending acquisition time and continues past cloudy first pages',async()=>{
 let count=0;
 const result=await findScene(36.45,31.3,{before:'2026-11-19T00:00:00Z',fetchImpl:async url=>{
  const u=new URL(url);count++;if(count===1){assert.equal(u.searchParams.get('sortby'),'-properties.datetime');return {ok:true,json:async()=>({features:[scene('2026-11-18T10:00:00Z',80)],links:[{rel:'next',href:'https://earth-search.aws.element84.com/v1/search?next=1'}]})};}
  return {ok:true,json:async()=>({features:[scene('2026-11-16T10:00:00Z')],links:[]})};
 }});
 assert.equal(count,2);assert.equal(result.id,'2026-11-16T10:00:00Z');
});
test('rejects foreign pagination and missing valid images without fetching arbitrary URLs',async()=>{
 await assert.rejects(findScene(36,31,{fetchImpl:async()=>({ok:true,json:async()=>({features:[],links:[{rel:'next',href:'https://foreign.example/secret'}]})})}),/devam bağlantısı/);
 await assert.rejects(findScene(36,31,{fetchImpl:async()=>({ok:true,json:async()=>({features:[],links:[]})})}),/uygun bulutluluğa/);
});
