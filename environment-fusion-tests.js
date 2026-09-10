(()=>{
  const tests=[];const t=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
  if(!window.DOMEnvironmentFusion){window.DOMEnvironmentFusionTestReport={passed:0,failed:1,tests:[{name:'environment fusion loaded',ok:false}]};return}
  const F=DOMEnvironmentFusion;
  try{
    const empty=F.compoundIndex({});
    t('no data remains unknown',empty.total===null&&empty.coverage===0);
    const partial=F.compoundIndex({wind:.8,pressureAnomaly:.7});
    t('partial atmosphere produces measured value',partial.atmosphere!==null&&partial.atmosphere>0);
    t('missing ocean remains unknown',partial.ocean===null);
    t('partial coverage is explicit',partial.coverage>0&&partial.coverage<1);
    const noImpact=F.explain({wind:.8,pressureAnomaly:.7});
    t('low coverage does not fabricate compound impact',noImpact.impact===null&&noImpact.action.stage==='unknown');
    const official=F.horizon({officialETA:'18:00 UTC'});
    t('official ETA outranks estimates',official.kind==='official');
    const physics=F.horizon({distanceToImpactKm:120,motionSpeedKmh:40,trackConfidence:.8});
    t('physics horizon carries uncertainty',physics.kind==='physics-estimate'&&physics.hours===3&&physics.plusMinusHours>0);
    const trend=F.horizon({trendVelocity:.1,currentLoad:.4,overwhelmThreshold:.8,stepHours:1,trendConfidence:.6});
    t('qualified trend horizon is bounded',trend.kind==='trend-estimate'&&trend.hours>0);
    const none=F.horizon({distanceToImpactKm:100});
    t('insufficient timing evidence stays unknown',none.kind==='unknown');
    const evac=F.actionStage({officialEvacuation:true});
    t('official evacuation retains authority',evac.stage==='evacuate'&&evac.authority==='official');
    const research=F.actionStage({localImpact:.9,evidence:.9});
    t('research cannot create official evacuation',research.stage==='consider-early-departure'&&research.authority==='research');
  }catch(err){t('test execution',false,String(err&&err.message||err))}
  const failed=tests.filter(x=>!x.ok);window.DOMEnvironmentFusionTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. environment-fusion self-test failures',failed);else console.info('D.O.M. environment-fusion self-tests PASS',tests.length);
})();
