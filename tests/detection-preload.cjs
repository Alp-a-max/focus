/* Loaded only by isolated HTTP tests. No model, credentials or external provider is used. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const log=value=>fs.appendFileSync(path.join(process.env.PELAGIC_DATA_DIR,'detection-calls.txt'),value+'\n');
const mode=process.env.FOCUS_TEST_DETECT_MODE||'normal';
const actualTimeout=AbortSignal.timeout;
AbortSignal.timeout=ms=>actualTimeout(ms===110000?35:ms);
const pause=(ms,signal)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(resolve,ms);
  signal?.addEventListener('abort',()=>{clearTimeout(timer);log('aborted');reject(signal.reason)},{once:true});
});
const detectorPath=require.resolve('../ml/detect-pretrained.cjs');
require.cache[detectorPath]={id:detectorPath,filename:detectorPath,loaded:true,exports:{
  status:()=>({available:mode!=='unavailable',model_id:'test-unetpp',validation_status:'research_only'}),
  async detect(lat,lon,{signal}){
    log('started');
    if(mode==='provider')throw Error('private-provider-debug-details');
    if(mode==='inference-timeout')throw Error('Detector inference timed out');
    if(mode==='timeout')await pause(1000,signal);
    if(mode==='ignore-abort')await pause(150);
    if(mode==='slow')await pause(500,signal);
    return {type:'FeatureCollection',features:[],metadata:{observed_at:'2026-10-22T08:58:00Z',source:'https://doi.org/10.1016/j.isci.2023.108402',query:{lat,lon}}};
  }
}};
const satellitePath=require.resolve('../satellite.cjs'),satellite=require(satellitePath);
require.cache[satellitePath].exports={...satellite,analyze:async()=>{log('analysis');await pause(80);return {test:true}}};
