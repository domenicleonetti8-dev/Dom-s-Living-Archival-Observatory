(()=>{'use strict';
let map=null;
function clearAtmosphere(){if(!map)return;try{if(typeof map.setSky==='function')map.setSky(null)}catch(_){try{if(typeof map.setSky==='function')map.setSky({'atmosphere-blend':0})}catch(__){}}
try{if(typeof map.setFog==='function')map.setFog(null)}catch(_){}
}
function attach(m){map=m;clearAtmosphere();setTimeout(clearAtmosphere,100);setTimeout(clearAtmosphere,750);try{map.on('styledata',clearAtmosphere)}catch(_){}}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
window.DOMHazardGlobeClarity=Object.freeze({clearAtmosphere,state:()=>({attached:!!map,policy:'Hazard Observatory globe uses no MapLibre atmospheric haze/fog overlay.'})});
})();