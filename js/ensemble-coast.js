/* Exact source coast segments, filtered to a bounded scenario region for speed. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.OdakEnsembleCoast=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function create(index,bounds,coast) {
    const edges=[];
    // Keep nearby segments whole. No simplification or coordinate rounding.
    const box={minLat:bounds.minLat-1,maxLat:bounds.maxLat+1,minLon:bounds.minLon-1,maxLon:bounds.maxLon+1};
    for(const item of index) for(const ring of item.polygon.geometry.coordinates) for(let i=1;i<ring.length;i++) {
      const a=ring[i-1],b=ring[i];
      if(Math.max(a[0],b[0])>=box.minLon&&Math.min(a[0],b[0])<=box.maxLon&&Math.max(a[1],b[1])>=box.minLat&&Math.min(a[1],b[1])<=box.maxLat) edges.push([a,b]);
    }
    const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
    function crossing(a,b) {
      const p=[a.lon,a.lat],r=[b.lon-a.lon,b.lat-a.lat];
      if(r[0]===0&&r[1]===0)return null;
      if([a,b].some(v=>v.lat<box.minLat||v.lat>box.maxLat||v.lon<box.minLon||v.lon>box.maxLon))return coast.crossing(index,a,b);
      let closest=Infinity,hit=null;
      for(const [q,end] of edges) {
        const s=[end[0]-q[0],end[1]-q[1]],qp=[q[0]-p[0],q[1]-p[1]],denom=cross(r,s);
        if(Math.abs(denom)<1e-14) {
          if(Math.abs(cross(qp,r))<1e-14) return coast.crossing(index,a,b);
          continue;
        }
        const t=cross(qp,s)/denom,u=cross(qp,r)/denom;
        if(t>=0&&t<=1&&u>=0&&u<=1&&t<closest) {closest=t;hit={lat:p[1]+t*r[1],lon:p[0]+t*r[0]};}
      }
      return hit;
    }
    return {pointOnLand:(lat,lon)=>coast.pointOnLand(index,lat,lon),crossing,segmentCount:edges.length};
  }
  return {create};
});
