(()=>{'use strict';
Promise.allSettled([
  import('./dom-hazard-visibility-repair.js?v=20260917-1'),
  import('./dom-global-realtime-hazard-bridge.js?v=20260917-1'),
  import('./dom-firms-thermal-anomaly-bridge.js?v=20260917-1')
]).then(r=>{for(const x of r)if(x.status==='rejected')console.warn('D.O.M. additive hazard module load failed',x.reason)});
})();