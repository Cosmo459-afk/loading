export function streakBadge(best,current=0){
 best=Number(best)||0;current=Number(current)||0;if(best<1)return '';
 const tier=best>=20?'mythic':best>=10?'prism':best>=5?'gold':best>=3?'silver':'bronze';
 const label={bronze:'Bronce',silver:'Plata',gold:'Oro',prism:'Prisma',mythic:'Maestría'}[tier];
 return '<div class="streak-display"><span class="streak-medal '+tier+'" role="img" aria-label="Mejor racha: '+best+' trivias perfectas seguidas · '+label+'"><span>'+best+'</span></span><span><strong>Racha perfecta · '+label+'</strong><small>Mejor: '+best+' seguidas · Actual: '+current+'</small></span></div>';
}
