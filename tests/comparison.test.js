const {test}=require('node:test');
const assert=require('node:assert/strict');
const {compare,compareGrids}=require('../comparison.cjs');
function scene(value,date,id){return {width:10,height:10,values:Array(100).fill(value),gridCoordinates:Array.from({length:100},(_,i)=>[36+i*.00001,31]),date,sceneId:id}}
test('compares aligned valid pixels and reports the median change',()=>{const a=scene(.1,'2026-01-01','a'),b=scene(.3,'2026-01-10','b');assert.equal(compareGrids(a,b).commonPixels,100);assert.ok(Math.abs(compareGrids(a,b).medianDelta-.2)<1e-10)});
test('rejects incompatible coordinates and too little common water',()=>{const a=scene(.1,'2026-01-01','a'),b=scene(.3,'2026-01-10','b');b.gridCoordinates[0]=[40,31];assert.throws(()=>compareGrids(a,b),/eşleşmiyor/);b.gridCoordinates[0]=a.gridCoordinates[0];b.values[0]=null;assert.throws(()=>compareGrids(a,b),/yetersiz/)});
test('requests an earlier date after finding the latest scene',async()=>{const newer=scene(.3,'2026-01-10T10:00:00Z','b'),older=scene(.1,'2026-01-01T10:00:00Z','a');let calls=[];let result=await compare(36,31,async(lat,lon,options)=>{calls.push(options);return options?older:newer});assert.equal(calls[1].before,'2026-01-09T10:00:00.000Z');assert.equal(result.older.sceneId,'a')});
