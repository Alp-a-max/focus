const {test}=require('node:test');const assert=require('node:assert/strict');const {fdi,validCoordinates}=require('../satellite.cjs');
test('FDI uses the stated spectral baseline',()=>{let expected=.02-(.01+(.003-.01)*(842-665)/(1610-665)*10);assert.ok(Math.abs(fdi(.02,.01,.003)-expected)<1e-12)});
test('coordinates validation excludes invalid and polar regions',()=>{assert.equal(validCoordinates(36.45,31.3),true);for(const c of [[NaN,1],[90,0],[0,180],['36',1]])assert.equal(validCoordinates(...c),false)});
