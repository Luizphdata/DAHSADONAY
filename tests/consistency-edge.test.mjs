import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../supabase/functions/dashboard-whatsapp/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/,''))
function app({authorized=true,validSession=true,configured=true,snapshot=null}={}) {
 let handler, calls=0
 const context={Request,Response,URL,console:{error(){},warn(){}},createClient:()=>({auth:{getUser:async()=>({data:{user:validSession?{id:'test',email:authorized?'allowed@example.invalid':'other@example.invalid'}:null},error:null})},rpc:async()=>{calls++;return {data:snapshot,error:null}}}),Deno:{env:{get:key=>key==='DASHBOARD_ALLOWED_EMAILS'?(configured?'allowed@example.invalid':''):'test'},serve:fn=>{handler=fn}}}
 vm.runInNewContext(source,context)
 return {handle:(body,headers={})=>handler(new Request('https://test.invalid/',{method:'POST',headers:{authorization:'Bearer fake','content-type':'application/json',...headers},body})),calls:()=>calls}
}
test('rejects invalid sessions and unauthorized users before querying data',async()=>{
 for(const [options,status] of [[{validSession:false},401],[{authorized:false},403],[{configured:false},503]]){const a=app(options);assert.equal((await a.handle('{}')).status,status);assert.equal(a.calls(),0)}
})
test('rejects malformed JSON, non-object input, impossible/inverted/truncated dates',async()=>{
 for(const body of ['{','null','[]','1',JSON.stringify({preset:'custom',custom_start:'2026-02-30',custom_end:'2026-03-01'}),JSON.stringify({preset:'custom',custom_start:'2026-03-03',custom_end:'2026-03-01'}),JSON.stringify({preset:'custom',custom_start:'2026-03-01junk',custom_end:'2026-03-02'})]){const a=app();assert.equal((await a.handle(body)).status,400);assert.equal(a.calls(),0)}
})
test('does not accept a missing snapshot as a successful response',async()=>{
 const a=app();assert.equal((await a.handle('{}')).status,502);assert.equal(a.calls(),1)
})
test('accepts valid response, and refuses an unapproved origin',async()=>{
 const a=app({snapshot:{period:{},kpis:{current:{valid_clicks:0},previous:{},change:{}},breakdowns:{channels:[]},campaigns:{campaigns:[]},timeseries:{comparison:[],channels:[]},integrity:{core_totals_match:true}}});assert.equal((await a.handle('{}')).status,200);assert.equal((await a.handle('{}',{origin:'https://unapproved.invalid'})).status,403);assert.equal(a.calls(),1)
})
