(()=>{
  const tests=[];const t=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
  if(!window.DOMEnvironmentalDefense){window.DOMEnvironmentalDefenseTestReport={passed:0,failed:1,tests:[{name:'environmental defense loaded',ok:false}]};return}
  const D=DOMEnvironmentalDefense;
  try{
    t('Celsius normalization',D.normalizeTemperature({value:20,unit:'C'}).valueC===20);
    t('Kelvin normalization',Math.abs(D.normalizeTemperature({value:273.15,unit:'K'}).valueC)<1e-12);
    t('Fahrenheit normalization',Math.abs(D.normalizeTemperature({value:32,unit:'F'}).valueC)<1e-12);
    t('invalid units rejected',D.normalizeTemperature({value:10,unit:'bananas'})===null);
    const fused=D.fusePoint([{value:10,unit:'C',quality:1,freshness:1,uncertaintyC:.2},{value:10.2,unit:'C',quality:1,freshness:1,uncertaintyC:.2}]);
    t('point fusion finite',Number.isFinite(fused.valueC)&&Number.isFinite(fused.uncertaintyC));
    t('point fusion near expected mean',Math.abs(fused.valueC-10.1)<1e-9);
    const cells=[{lat:0,valueC:20,quality:1,coverage:1,uncertaintyC:.1},{lat:60,valueC:10,quality:1,coverage:1,uncertaintyC:.1}];
    const gUnknown=D.globalAreaWeightedMean(cells);
    t('global coverage unresolved without denominator',gUnknown.coverage===null&&gUnknown.coverageResolved===false);
    const expected=cells.reduce((a,c)=>a+D.areaWeight(c.lat),0),g=D.globalAreaWeightedMean(cells,{expectedAreaWeight:expected});
    t('area weighting favors equator',g.valueC>15);
    t('global coverage bounded when denominator supplied',g.coverage>=0&&g.coverage<=1&&g.coverageResolved===true);
    t('missing global data remains unknown',D.globalAreaWeightedMean([]).valueC===null);
    t('anomaly exact difference',Math.abs(D.anomaly(14.2,13.9)-.3)<1e-12);
    const z=D.robustZ(20,[10,11,12,13,14]);
    t('robust z detects strong outlier',Number.isFinite(z)&&z>3);
    t('robust z refuses zero MAD',D.robustZ(10,[1,1,1,1])===null);
    const env=D.confidenceEnvelope({measurementUncertainty:.1,modelUncertainty:.2,representativenessUncertainty:.2});
    t('uncertainty combines in quadrature',Math.abs(env-.3)<1e-12);
    const f=D.assessTemperatureField({cells:[],baselineC:14});
    t('empty temperature field stays unknown',f.globalMeanC===null&&f.coverage===0);
    const partial=D.assessTemperatureField({cells,baselineC:14});
    t('partial field refuses fake global coverage',partial.coverage===null&&partial.coverageResolved===false);
    const v=D.verdict({evidenceStrength:.95,coverage:.1});
    t('low coverage blocks strong judgment',v.level==='unknown');
    const o=D.verdict({officialAlert:true});
    t('official alert takes precedence',o.level==='official');
  }catch(err){t('test execution',false,String(err&&err.message||err))}
  const failed=tests.filter(x=>!x.ok);window.DOMEnvironmentalDefenseTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. environmental-defense self-test failures',failed);else console.info('D.O.M. environmental-defense self-tests PASS',tests.length);
})();