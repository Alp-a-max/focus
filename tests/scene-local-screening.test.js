const {test}=require('node:test'),assert=require('node:assert/strict');
const {findScene}=require('../scene-search.cjs');
test('optional local-cloud screening can inspect cloudier scenes while the original default stays conservative',async()=>{
 const item={id:'20261118',properties:{datetime:'2026-11-18T08:00:00Z','eo:cloud_cover':80},assets:Object.fromEntries(['nir','rededge2','swir16','scl','visual'].map(k=>[k,{href:'https://example.invalid/'+k}]))};
 const options={before:'2026-11-19T00:00:00Z',fetchImpl:async()=>({ok:true,json:async()=>({features:[item],links:[]})})};
 await assert.rejects(findScene(41,30,options),/uygun bulutluluğa/);
 assert.equal((await findScene(41,30,{...options,maxCloudCover:100})).id,item.id);
 await assert.rejects(findScene(41,30,{...options,maxCloudCover:101}),/bulutluluk sınırı/);
});

test('equal-time overlapping scenes are not lost when a different tile is excluded',async()=>{
 const item=id=>({id,properties:{datetime:'2026-11-18T08:00:00Z','eo:cloud_cover':10},assets:Object.fromEntries(['nir','rededge2','swir16','scl','visual'].map(k=>[k,{href:'https://example.invalid/'+k}]))});
 const result=await findScene(41,30,{before:'2026-11-19T00:00:00Z',excludeSceneIds:['tile-a'],fetchImpl:async()=>({ok:true,json:async()=>({features:[item('tile-a'),item('tile-b')],links:[]})})});
 assert.equal(result.id,'tile-b');
});
