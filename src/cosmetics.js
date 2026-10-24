export const slotNames={background:'Fondos',glasses:'Gafas y visores',hat:'Accesorios',frame:'Marcos',badge:'Emblemas',theme:'Temas del menú',font:'Tipografías'};
export const badges={'ghost-badge':'👾','flame-badge':'🔥','comet-badge':'☄️','star-badge':'⭐'};
const stars='<path d="M9 16h2v2H9zM28 10h2v2h-2zM104 12h2v2h-2zM116 35h2v2h-2zM16 73h2v2h-2zM95 30h2v2h-2z" fill="#e4deff"/>';
export function decorateAvatar(source,n,style={}){
 let svg=decodeURIComponent(source.split(',')[1]);
 const scenes={
  'sunset-drive':'<rect width="128" height="128" fill="#24123f"/><circle cx="65" cy="48" r="30" fill="#f8ae69"/><path d="M30 42h68M28 49h74M28 57h74M30 65h68" stroke="#ad396c" stroke-width="3"/><path d="M0 84L23 60 43 83 65 65 93 84 111 66 128 83V128H0" fill="#422956"/><path d="M0 98h128M0 112h128M64 83L10 128M64 83L118 128" stroke="#eb63cb" fill="none"/>',
  'neon-city':'<rect width="128" height="128" fill="#0b1934"/>'+stars+'<path d="M0 92V42H20V70H30V24H51V64H72V36H94V61H102V17H120V83H128V128H0" fill="#173958" stroke="#5bcde6"/><path d="M7 50h6m-6 9h6m24-27h7m-7 9h7m65-15h6m-6 12h6M78 43h8m-8 12h8" stroke="#f480d1" stroke-width="3"/>',
  'aurora':'<rect width="128" height="128" fill="#081d2d"/>'+stars+'<path d="M-12 40Q25 7 52 32T143 8M-12 60Q33 14 70 46T143 22" stroke="#38dfc3" stroke-width="14" opacity=".4" fill="none"/><path d="M-8 46Q42 9 77 29T139 19" stroke="#b889fc" stroke-width="7" opacity=".65" fill="none"/><path d="M0 101L20 79 30 94 52 70 73 94 96 73 128 104V128H0" fill="#142c43"/>',
  'arcade-room':'<rect width="128" height="128" fill="#241528"/><path d="M0 95h128M0 110h128M15 128L40 85M113 128L88 85" stroke="#a2509e"/><g stroke="#e36fbd" fill="#222940"><path d="M5 30h27v42l6 12v24H3V84l2-12zM99 30h24v42l3 12v24H94V84l5-12z"/></g><path d="M9 38h18v23H9zM103 38h16v23h-16z" fill="#63dfdf"/><path d="M10 68h17M104 68h14" stroke="#e9cb70" stroke-width="3"/>',
  'deep-space':'<rect width="128" height="128" fill="#10162f"/>'+stars+'<circle cx="102" cy="31" r="20" fill="#74539b"/><ellipse cx="102" cy="31" rx="30" ry="7" fill="none" stroke="#83b9dc" stroke-width="4" transform="rotate(-20 102 31)"/><circle cx="18" cy="99" r="25" fill="#254c67"/>',
  'zen-garden':'<rect width="128" height="128" fill="#142b35"/><circle cx="96" cy="27" r="17" fill="#e6d8b5"/><path d="M8 128V5M20 128V17M113 128V5M123 128V33" stroke="#3f6a59" stroke-width="5"/><path d="M4 25l15 7M12 58l17-9M105 44l16-8M109 78l18 8" stroke="#8bb578" stroke-width="4"/><path d="M0 112Q33 85 65 107T128 101V128H0" fill="#31594c"/>',
  'spiral-galaxy':'<rect width="128" height="128" fill="#18132f"/>'+stars+'<g fill="none" stroke-linecap="round"><path d="M8 25Q82-3 109 33T32 82Q-2 53 41 27T121 73" stroke="#5c448d" stroke-width="18"/><path d="M7 31Q84 1 102 35T33 75Q7 55 42 33T117 74" stroke="#bb75c9" stroke-width="5" opacity=".6"/></g>',
  'laser-grid':'<rect width="128" height="128" fill="#15132b"/><circle cx="64" cy="41" r="23" fill="#cc578a"/><path d="M0 79L19 57 38 79 64 60 84 79 108 53 128 78V128H0" fill="#2d2352"/><path d="M0 85h128M0 99h128M0 120h128M64 78L0 128M64 78L128 128M64 78L34 128M64 78L94 128" stroke="#598bfb"/>'
 };
 if(scenes[style.background])svg=svg.replace(/(<rect[^>]*fill="#1c1c30"[^>]*\/?>)/, '$1'+scenes[style.background]);
 if(style.background==='violet-grid')svg=svg.replace('fill="#1c1c30"','fill="#3b224d"');
 if(style.background==='night-sky')svg=svg.replace('fill="#1c1c30"','fill="#102c49"').replace('<path d="M0 96',stars+'<path d="M0 96');
 let overlay='';const y=n===4?28:50;
 if(style.glasses==='cyber-visor')overlay+='<path d="M27 '+y+'h74l-5 22H33z" fill="#294e72" stroke="#7cefff" stroke-width="3"/><path d="M33 '+(y+8)+'h62" stroke="#dd82ee" stroke-width="3"/>';
 else if(style.glasses){const color=style.glasses==='pink-glasses'?'#ff83d3':'#83e7ff';overlay+='<g stroke="'+color+'" stroke-width="4" fill="#283461" fill-opacity=".5"><rect x="30" y="'+y+'" width="25" height="21" rx="4"/><rect x="73" y="'+y+'" width="25" height="21" rx="4"/><path d="M55 '+(y+9)+'H73" fill="none"/></g>';}
 if(style.hat==='retro-cap')overlay+='<path d="M29 34L35 16 65 10 90 17 97 35 55 37Z" fill="#984a76"/><path d="M23 34L97 34 107 43 43 43Z" fill="#2845c5"/><path d="M60 16H69V29H60Z" fill="#f4d4eb"/>';
 if(style.hat==='gold-crown')overlay+='<path d="M32 35L26 12 47 23 64 7 80 23 102 12 96 35Z" fill="#e7bd63"/><path d="M32 35H96V42H32Z" fill="#a77b31"/><path d="M59 24L64 18 69 24 64 31Z" fill="#984a76"/>';
 if(style.hat==='retro-headphones')overlay+='<path d="M25 61V41Q25 11 64 11T103 41V61" fill="none" stroke="#91bfe5" stroke-width="8"/><rect x="19" y="43" width="16" height="30" rx="5" fill="#df8acb" stroke="#302b50" stroke-width="3"/><rect x="93" y="43" width="16" height="30" rx="5" fill="#df8acb" stroke="#302b50" stroke-width="3"/>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('</svg>',overlay+'</svg>'));
}
