'use strict';
let input='';process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{input+=chunk;if(input.length>5000000){console.error('Input exceeds bound');process.exit(1)}});
process.stdin.on('end',async()=>{try{const {scene,grid}=JSON.parse(input);const result=await require('../l2a-grid.cjs').readGrid(scene,grid);process.stdout.write(JSON.stringify(result));}catch(error){console.error(error.message);process.exitCode=1}});
