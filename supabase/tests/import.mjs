import {PGlite} from '@electric-sql/pglite';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'arcade-import-')),input=join(dir,'batch.json'),output=join(dir,'batch.sql');
const compiler=new URL('../../scripts/import-trivias.mjs',import.meta.url);
const quiz={id:'ps1-test-import',category:'ps1',difficulty:'easy',title:"Lote de prueba ' SQL",sort_order:10,publish:true,questions:Array.from({length:5},(_,i)=>({prompt:'Pregunta de prueba '+i+' ¿Qué opción?',choices:['Uno','Dos','Tres','Cuatro'],correct_index:i%4,explanation:'Explicación de prueba válida.',source:{reference:'Documento de prueba',evidence:'Sección '+i}}))};
function compile(q,path=output){writeFileSync(input,JSON.stringify({quizzes:[q]}));return spawnSync(process.execPath,[compiler.pathname,input,path],{encoding:'utf8'});}
try{
 assert.equal(compile(quiz).status,0);
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql','upgrade-v08.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
 const sql=readFileSync(output,'utf8');await db.exec(sql);
 assert.equal((await db.query('select count(*) as n from arcade_private.quiz_questions where quiz_id=$1',[quiz.id])).rows[0].n,5);
 assert.equal((await db.query('select published from public.arcade_quizzes where id=$1',[quiz.id])).rows[0].published,true);
 await assert.rejects(()=>db.exec(sql));await db.exec('rollback');
 assert.equal((await db.query('select count(*) as n from arcade_private.quiz_questions where quiz_id=$1',[quiz.id])).rows[0].n,5);
 const invalid=structuredClone(quiz);invalid.questions[0].choices=['a','a','b','c'];const bad=join(dir,'bad.sql');assert.notEqual(compile(invalid,bad).status,0);assert(!existsSync(bad));
 invalid.questions=quiz.questions;invalid.questions[0].source=null;assert.notEqual(compile(invalid,bad).status,0);assert(!existsSync(bad));
 await db.close();console.log('PASS batch import: validates questions/options/sources, generates executable transactional SQL, publishes explicit opt-in, safely quotes titles, refuses duplicate imports without changing existing data.');
}finally{rmSync(dir,{recursive:true,force:true});}
