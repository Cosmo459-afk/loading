import re4 from '../content/collections/re4.json';
import images from 'arcade:card-images';
export const collectionDefinitions=[re4];
export const collectionCards=re4.cards.map((c,index)=>({...c,ordinal:index+1,image:images[c.id]||null,art:'',rarityKey:c.rarity,rarity:({common:'Común',epic:'Épica',legendary:'Legendaria'})[c.rarity]}));
