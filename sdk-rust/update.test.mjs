import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const platform=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const workspace=resolve(platform,'..');
const scratch=resolve(workspace,'.scratch');
function assertNoLinks(path){
  const entry=lstatSync(path);
  assert.ok(!entry.isSymbolicLink(),`link in test directory: ${path}`);
  if(entry.isDirectory())for(const name of readdirSync(path))assertNoLinks(join(path,name));
}
test('regenerates declarations and rejects a header/export mismatch without partial writes',()=>{
  mkdirSync(scratch,{recursive:true});
  const base=realpathSync(scratch);
  const temp=mkdtempSync(join(base,'sdk-update-test-'));
  try{
    const files=['sdk-rust/update.mjs','core-rust/core-native.h','core-rust/lib/fullmeta_core.dll',
      'model-rust/model-native.h','model-rust/lib/fullmeta_model.dll',
      'operation-contracts-rust/contracts-native.h','operation-contracts-rust/lib/fullmeta_operation_contracts.dll'];
    for(const file of files){const to=join(temp,file);mkdirSync(dirname(to),{recursive:true});copyFileSync(join(platform,file),to);}
    for(const component of ['core','model','operation-contracts'])mkdirSync(join(temp,'sdk-rust',component,'src'),{recursive:true});
    function run(...args){return spawnSync(process.execPath,[join(temp,'sdk-rust/update.mjs'),...args],{encoding:'utf8',windowsHide:true});}
    let result=run();assert.equal(result.status,0,result.stderr);
    result=run('--check');assert.equal(result.status,0,result.stderr);
    const generated=join(temp,'sdk-rust/core/src/native.rs');
    const header=join(temp,'core-rust/core-native.h');
    const source=readFileSync(header,'utf8');
    assert.ok(source.includes('core_language_abi_version(void)'));
    writeFileSync(header,source.replace('core_language_abi_version(void)','core_language_abi_version()'));
    // An equivalent C declaration produces identical generated code.
    result=run('--check');assert.equal(result.status,0,result.stderr);
    writeFileSync(header,source.replace('core_quantity_release(uint64_t handle)','core_quantity_release(uint64_t context_handle)'));
    result=run('--check');assert.notEqual(result.status,0);assert.match(result.stderr,/out of date/);
    result=run();assert.equal(result.status,0,result.stderr);assert.match(result.stderr,/review higher-level SDK wrappers/);
    assert.match(readFileSync(generated,'utf8'),/core_quantity_release_fn = unsafe extern "C" fn\(context_handle: u64\)/);
    const before=readFileSync(generated,'utf8');
    writeFileSync(header,source.replace('uint32_t core_language_abi_version(void);','uint32_t core_language_abi_version(void);\nint32_t core_future_missing(void);'));
    result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/core_future_missing/);
    assert.equal(readFileSync(generated,'utf8'),before);
  } finally {
    const actual=realpathSync(temp);
    assert.ok(actual.startsWith(base+sep) && actual!==base);
    assertNoLinks(actual);
    rmSync(actual,{recursive:true,force:true});
  }
});
