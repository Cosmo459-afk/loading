// Rebuild the reviewed, atomic, rerunnable v15 migration from immutable inputs.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);process.chdir(root.pathname);
execFileSync(process.execPath,['scripts/import-trivias.mjs','content/batches/retro-v15.json','/tmp/loading-retro-v15.sql'],{stdio:'inherit'});
const schema=await readFile('supabase/upgrade-v15-schema.sql','utf8');
const seed=(await readFile('/tmp/loading-retro-v15.sql','utf8')).split('\n').filter(l=>!l.startsWith('--')&&l!=='begin;'&&l!=='commit;').join('\n');
const batch=JSON.parse(await readFile('content/batches/retro-v15.json','utf8'));
const ids=batch.quizzes.map(q=>"'"+q.id+"'").join(',');
const bank=`\n-- New edition: preserve history; never change a previously played question.\ndo $bank$\ndeclare n integer;\nbegin\n select count(*) into n from public.arcade_quizzes where id in (${ids});\n if n=0 then\n${seed}\n elsif n<>96 then raise exception 'Incomplete v15 bank: import rolled back';\n end if;\nend $bank$;\nupdate public.arcade_quizzes set published=false where id in ('ps1-easy-01','ps1-medium-01','ps1-hard-01','ps2-easy-01','ps2-medium-01','ps2-hard-01');\n`;
const route=await readFile('supabase/upgrade-v15-route.sql','utf8');
const combined=schema.slice(0,schema.indexOf("notify pgrst"))+bank+route+"\nnotify pgrst,'reload schema';\ncommit;\nselect category,difficulty,count(*) as trivias from public.arcade_quizzes where published group by category,difficulty order by category,difficulty;\n";
await writeFile('supabase/upgrade-v15.sql',combined);
