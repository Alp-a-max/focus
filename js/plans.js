/* Approved annual USD prices. These describe planned memberships, not active entitlements. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.FocusPlans=value;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  return Object.freeze({currency:'USD',billing:'year',salesEnabled:false,
    plans:Object.freeze([
      {id:'standard',name:'Standart',annualPrice:0,hours:6,features:['Temel harita ve deniz koşulları','6 saate kadar tek rota','Kaynak ve tarih bilgileri']},
      {id:'pro',name:'Pro',annualPrice:20,hours:12,features:['Standart kapsamı','12 saate kadar yayılım senaryoları','CSV ve JSON dışa aktarma']},
      {id:'max',name:'Max',annualPrice:100,hours:24,features:['Pro kapsamı','24 saat ve 75 sanal parçacık','Uydu tarihlerini karşılaştırma','Deneysel spektral inceleme']}
    ])});
});
