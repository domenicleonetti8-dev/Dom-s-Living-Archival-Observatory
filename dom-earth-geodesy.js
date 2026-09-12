(()=>{
  'use strict';
  // WGS 84 reference ellipsoid. Geographic sensor coordinates remain source data;
  // these helpers only convert them into a physically meaningful Earth-centered frame.
  const WGS84=Object.freeze({
    semiMajorAxisM:6378137.0,
    inverseFlattening:298.257223563,
    flattening:1/298.257223563,
    semiMinorAxisM:6356752.314245179,
    eccentricitySquared:6.6943799901413165e-3
  });
  const valid=(lat,lon)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;
  function geodeticToECEF(latitude,longitude,heightM=0){
    const lat=Number(latitude),lon=Number(longitude),h=Number.isFinite(Number(heightM))?Number(heightM):0;
    if(!valid(lat,lon))return null;
    const p=lat*Math.PI/180,l=lon*Math.PI/180,a=WGS84.semiMajorAxisM,e2=WGS84.eccentricitySquared;
    const sin=Math.sin(p),cos=Math.cos(p),N=a/Math.sqrt(1-e2*sin*sin);
    return {x:(N+h)*cos*Math.cos(l),y:(N+h)*cos*Math.sin(l),z:(N*(1-e2)+h)*sin};
  }
  function ecefToAR(ecef){
    if(!ecef||![ecef.x,ecef.y,ecef.z].every(Number.isFinite))return null;
    // RealityKit/ARKit convention is Y-up. This proper rotation preserves handedness:
    // ECEF +X -> AR +X, ECEF +Z (north) -> AR +Y, ECEF +Y -> AR -Z.
    return {x:ecef.x,y:ecef.z,z:-ecef.y};
  }
  function surfaceFrame(latitude,longitude,elevationM=0,depthM=0){
    const h=(Number.isFinite(Number(elevationM))?Number(elevationM):0)-(Number.isFinite(Number(depthM))?Number(depthM):0);
    const ecef=geodeticToECEF(latitude,longitude,h);if(!ecef)return null;
    const radius=Math.hypot(ecef.x,ecef.y,ecef.z);if(!radius)return null;
    return {ecefM:ecef,unit:{x:ecef.x/radius,y:ecef.y/radius,z:ecef.z/radius},heightM:h};
  }
  function scenePosition(latitude,longitude,elevationM=0,depthM=0,globeRadiusM=0.35){
    const frame=surfaceFrame(latitude,longitude,elevationM,depthM),surface=surfaceFrame(latitude,longitude,0,0);if(!frame||!surface)return null;
    const scale=Number.isFinite(Number(globeRadiusM))&&Number(globeRadiusM)>0?Number(globeRadiusM):0.35;
    const actualRadius=Math.hypot(frame.ecefM.x,frame.ecefM.y,frame.ecefM.z),surfaceRadius=Math.hypot(surface.ecefM.x,surface.ecefM.y,surface.ecefM.z);
    const radial=scale*(actualRadius/surfaceRadius),arUnit=ecefToAR(frame.unit);if(!arUnit)return null;
    return {x:arUnit.x*radial,y:arUnit.y*radial,z:arUnit.z*radial,globeRadiusM:scale};
  }
  const earthShell=Object.freeze({
    datum:'WGS84',
    geodeticFrame:'ECEF-right-handed',
    arFrame:'RealityKit-right-handed-Y-up',
    arAxisMapping:'ECEF(X,Y,Z) -> AR(X,Z,-Y)',
    semiMajorAxisM:WGS84.semiMajorAxisM,
    semiMinorAxisM:WGS84.semiMinorAxisM,
    inverseFlattening:WGS84.inverseFlattening,
    visualBaseline:Object.freeze({
      provider:'NASA EOSDIS GIBS',
      layer:'BlueMarble_ShadedRelief_Bathymetry',
      role:'static-geographic-baseline',
      live:false,
      sourceUrl:'https://gibs.earthdata.nasa.gov/'
    })
  });
  window.DOMEarthGeodesy=Object.freeze({WGS84,validLatLon:valid,geodeticToECEF,ecefToAR,surfaceFrame,scenePosition,earthShell});
})();
