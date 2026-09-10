(()=>{
  if(!window.DOMObservationModel)return;
  const M=window.DOMObservationModel,tests=[];
  const t=(name,ok)=>tests.push({name,ok:!!ok});
  t('median odd',M.median([1,9,3])===3);
  t('median even',M.median([1,3,5,7])===4);
  t('MAD robust',M.mad([10,10,11,9,10])===0);
  t('lineage dedupe',M.uniqueLineages([{lineageId:'A'},{lineageId:'A'},{lineageId:'B'}])===2);
  t('evidence bounded',M.evidenceStrength({quality:2,freshness:2,geospatial:2,corroboration:2,uncertaintyQuality:2,trend:2})<=1);
  t('weak grade',M.evidenceGrade(.2)==='weak / insufficient');
  t('strong grade',M.evidenceGrade(.8)==='strong');
  t('no false certainty',!M.impactLanguage({evidence:.95,trend:.9}).includes('will'));
  const failed=tests.filter(x=>!x.ok);
  window.DOMObservationModelTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. observation model self-test failures',failed);else console.info('D.O.M. observation model self-tests PASS',tests.length);
})();