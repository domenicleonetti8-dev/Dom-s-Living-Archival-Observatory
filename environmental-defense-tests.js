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
    const rawCells=[{lat:0,valueC:20,quality:1,coverage:1,uncertaintyC:.1},{lat:60,valueC:10,quality:1,coverage:1,uncertaintyC:.1}];
    const gUnknown=D.globalAreaWeightedMean(rawCells);
    t('global coverage unresolved without denominator',gUnknown.coverage===null&&gUnknown.coverageResolved===false&&gUnknown.valueC===null&&Number.isFinite(gUnknown.provisionalValueC));
    const cells=[{lat:0,valueC:20,quality:1,coverage:1,uncertaintyC:.1,nominalAreaWeight:1},{lat:60,valueC:10,quality:1,coverage:1,uncertaintyC:.1,nominalAreaWeight:.5}],expected=1.5,g=D.globalAreaWeightedMean(cells,{expectedAreaWeight:expected});
    t('explicit area weighting favors equator',g.valueC>15);
    t('global coverage bounded when explicit spatial support supplied',g.coverage>=0&&g.coverage<=1&&g.coverageResolved===true&&g.representativenessResolved===true);
    const fake=D.globalAreaWeightedMean(rawCells,{expectedAreaWeight:1.5});
    t('sensor points alone cannot claim global spatial support',fake.valueC===null&&fake.coverage===null&&fake.coverageResolved===false&&fake.representativenessResolved===false);
    const empty=D.globalAreaWeightedMean([]);
    t('missing global data remains unknown',empty.valueC===null&&empty.coverage===null&&empty.coverageResolved===false);
    const emptyKnown=D.globalAreaWeightedMean([],{expectedAreaWeight:100});
    t('empty field without spatial cells stays unresolved',emptyKnown.valueC===null&&emptyKnown.coverage===null&&emptyKnown.coverageResolved===false);
    t('anomaly exact difference',Math.abs(D.anomaly(14.2,13.9)-.3)<1e-12);
    const z=D.robustZ(20,[10,11,12,13,14]);
    t('robust z detects strong outlier',Number.isFinite(z)&&z>3);
    t('robust z refuses zero MAD',D.robustZ(10,[1,1,1,1])===null);
    const env=D.confidenceEnvelope({measurementUncertainty:.1,modelUncertainty:.2,representativenessUncertainty:.2});
    t('uncertainty combines in quadrature',Math.abs(env-.3)<1e-12);
    const f=D.assessTemperatureField({cells:[],baselineC:14});
    t('empty temperature field stays unresolved',f.globalMeanC===null&&f.coverage===null&&f.coverageResolved===false&&f.uncertaintyResolved===false);
    const partial=D.assessTemperatureField({cells:rawCells,baselineC:14,expectedAreaWeight:1.5});
    t('ungridded sensor field refuses fake global mean',partial.globalMeanC===null&&Number.isFinite(partial.provisionalMeanC)&&partial.coverage===null&&partial.representativenessResolved===false);
    const qualified=D.assessTemperatureField({cells,baselineC:14,expectedAreaWeight:expected,modelUncertaintyC:.2});
    t('gridded field can resolve global mean and uncertainty',Number.isFinite(qualified.globalMeanC)&&qualified.coverageResolved===true&&qualified.uncertaintyResolved===true);
    const v=D.verdict({evidenceStrength:.95,coverage:.1});
    t('low coverage blocks strong judgment',v.level==='unknown');
    const o=D.verdict({officialAlert:true});
    t('official alert takes precedence',o.level==='official');
  }catch(err){t('test execution',false,String(err&&err.message||err))}
  const failed=tests.filter(x=>!x.ok);window.DOMEnvironmentalDefenseTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. environmental-defense self-test failures',failed);else console.info('D.O.M. environmental-defense self-tests PASS',tests.length);
})();
