// SCL class 6 is water; buffer all other and unknown cells conservatively.
function waterMask(scl,width,height,radius=3){if(scl.length!==width*height)throw Error('Geçersiz sınıflandırma ızgarası');let mask=new Uint8Array(scl.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(x<radius||y<radius||x>=width-radius||y>=height-radius)continue;let safe=true;for(let dy=-radius;dy<=radius&&safe;dy++)for(let dx=-radius;dx<=radius;dx++){if(dx*dx+dy*dy<=radius*radius&&scl[(y+dy)*width+x+dx]!==6){safe=false;break}}if(safe)mask[y*width+x]=1}return mask}
module.exports={waterMask};
