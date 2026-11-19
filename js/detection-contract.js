/* Satellite result validation; no DOM or credentials. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FocusDetectionContract=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict'; const paper='https://doi.org/10.1016/j.isci.2023.108402';
  function validate(data){
    const m=data?.metadata,validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
    if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length>25||m?.schema_version!==1||
      m.validation_status!=='research_only'||m.score_kind!=='uncalibrated neural-network score'||m.source!==paper||
      !validDate(m.observed_at)||!validDate(m.retrieved_at)||Date.parse(m.observed_at)>Date.now()+300000||
      typeof m.model_id!=='string'||m.model_id.length>200||typeof m.scene_id!=='string'||m.scene_id.length>500||
      !/^[a-f0-9]{64}$/.test(m.model_sha256)||!/^[a-f0-9]{64}$/.test(m.checkpoint_sha256)||
      !Number.isFinite(m.threshold)||m.threshold<=0||m.threshold>=1||
      !Number.isInteger(m.eligible_pixels)||m.eligible_pixels<0||!Number.isInteger(m.excluded_pixels)||m.excluded_pixels<0||
      !Number.isInteger(m.candidate_clusters)||m.candidate_clusters<data.features.length)throw Error('INVALID_RESULT');
    const ids=new Set();
    for(const f of data.features){
      const p=f?.properties,c=f?.geometry?.coordinates;
      if(f?.type!=='Feature'||f.geometry?.type!=='Point'||!Array.isArray(c)||c.length!==2||
        !c.every(Number.isFinite)||Math.abs(c[0])>179||Math.abs(c[1])>79||
        p?.status!=='unverified_model_candidate'||p.observed_at!==m.observed_at||p.scene_id!==m.scene_id||
        typeof p.candidate_id!=='string'||p.candidate_id.length>600||ids.has(p.candidate_id)||
        !Number.isInteger(p.grid_pixels)||p.grid_pixels<2||!Number.isFinite(p.max_score)||p.max_score<m.threshold||p.max_score>1)throw Error('INVALID_RESULT');
      ids.add(p.candidate_id);
    }
    return data;
  }

return {validate};
});
