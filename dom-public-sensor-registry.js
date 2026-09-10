const DOMPublicSensorRegistry=(()=>{
  const feeds=[
    {id:'usgs-eq',domain:'seismic',agency:'USGS',name:'Earthquake GeoJSON',coverage:'global',cadence:'~1 min',mode:'json',auth:'none',url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',lineage:'usgs-comcat',modality:'seismic-event'},
    {id:'usgs-water',domain:'hydrology',agency:'USGS',name:'Water instantaneous values',coverage:'United States',cadence:'site dependent',mode:'json',auth:'none',url:'https://waterservices.usgs.gov/nwis/iv/',lineage:'usgs-water',modality:'river-gauge'},
    {id:'ndbc-stdmet',domain:'ocean-atmosphere',agency:'NOAA NDBC',name:'Standard meteorological buoy observations',coverage:'ocean stations',cadence:'station dependent',mode:'opendap',auth:'none',url:'https://dods.ndbc.noaa.gov/thredds/catalog/data/stdmet/catalog.html',lineage:'ndbc',modality:'buoy-meteorology'},
    {id:'ndbc-ocean',domain:'ocean',agency:'NOAA NDBC',name:'Oceanographic observations',coverage:'ocean stations',cadence:'station dependent',mode:'opendap',auth:'none',url:'https://dods.ndbc.noaa.gov/thredds/catalog/data/ocean/catalog.html',lineage:'ndbc',modality:'ocean-buoy'},
    {id:'ndbc-waterlevel',domain:'ocean',agency:'NOAA NDBC',name:'Water-level observations',coverage:'coastal/ocean stations',cadence:'station dependent',mode:'opendap',auth:'none',url:'https://dods.ndbc.noaa.gov/thredds/catalog/data/wlevel/catalog.html',lineage:'ndbc',modality:'water-level'},
    {id:'ndbc-dart',domain:'tsunami',agency:'NOAA NDBC',name:'DART deep-ocean tsunami observations',coverage:'ocean stations',cadence:'station dependent',mode:'opendap',auth:'none',url:'https://dods.ndbc.noaa.gov/thredds/catalog/data/dart/catalog.html',lineage:'ndbc-dart',modality:'tsunami-buoy'},
    {id:'nws-alerts',domain:'weather-warning',agency:'NOAA/NWS',name:'Active CAP-style alerts',coverage:'United States',cadence:'operational',mode:'json',auth:'none',url:'https://api.weather.gov/alerts/active',lineage:'nws-cap',modality:'official-warning'},
    {id:'ntwc',domain:'tsunami-warning',agency:'NOAA/NTWC',name:'NTWC Atom products',coverage:'US continental/Alaska/Canada service area',cadence:'event driven',mode:'atom',auth:'none',url:'https://www.tsunami.gov/events/xml/PAAQAtom.xml',lineage:'ntwc',modality:'official-tsunami-product'},
    {id:'ptwc',domain:'tsunami-warning',agency:'NOAA/PTWC',name:'PTWC Atom products',coverage:'Pacific/Caribbean service areas',cadence:'event driven',mode:'atom',auth:'none',url:'https://www.tsunami.gov/events/xml/PHEBAtom.xml',lineage:'ptwc',modality:'official-tsunami-product'},
    {id:'nasa-firms',domain:'fire',agency:'NASA FIRMS',name:'MODIS/VIIRS/Landsat active fire',coverage:'global',cadence:'NRT; RT/URT where available',mode:'api/wms/wfs/kml',auth:'MAP_KEY for some API access',url:'https://firms.modaps.eosdis.nasa.gov/api/',lineage:'nasa-firms',modality:'satellite-thermal'},
    {id:'nasa-eonet',domain:'multi-hazard',agency:'NASA EONET',name:'Open event catalog',coverage:'global',cadence:'event dependent',mode:'json',auth:'none',url:'https://eonet.gsfc.nasa.gov/api/v3/events',lineage:'nasa-eonet',modality:'event-aggregation'},
    {id:'gdacs',domain:'multi-hazard',agency:'UN/EC GDACS',name:'Global disaster API and feeds',coverage:'global',cadence:'~6 min common feeds',mode:'geojson/rss',auth:'none',url:'https://www.gdacs.org/gdacsapi/swagger/index.html',lineage:'gdacs',modality:'multi-hazard-aggregation'},
    {id:'swpc',domain:'space-weather',agency:'NOAA SWPC',name:'Operational JSON services',coverage:'space/Earth geospace',cadence:'product dependent',mode:'json',auth:'none',url:'https://services.swpc.noaa.gov/json/',lineage:'noaa-swpc',modality:'space-weather'}
  ];
  const byDomain=d=>feeds.filter(f=>f.domain===d);
  const summary=()=>({families:feeds.length,global:feeds.filter(f=>f.coverage==='global').length,openNoAuth:feeds.filter(f=>f.auth==='none').length,feeds:feeds.slice()});
  return{feeds,byDomain,summary};
})();
