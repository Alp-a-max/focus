'use strict';
// The read-only ML adapter can wrap catalogue exhaustion in its own safe coverage message.
const unavailableScenes=new Set([
 'Son 45 günde uygun bulutluluğa sahip Sentinel-2 sahnesi bulunamadı.',
 'Son taranan uydu sahnelerinde yeterli açık su alanı bulunamadı. Başka bir bölge veya daha sonra tekrar deneyin.'
]);
module.exports={isSceneUnavailable:error=>error?.code==='NO_USABLE_SCENE'||unavailableScenes.has(error?.message)};
