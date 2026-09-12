import {spawnSync} from 'node:child_process'
const result=spawnSync(process.execPath,['--import','./scripts/ignore-css.mjs','--import','tsx','scripts/verify-colleague.tsx'],{stdio:'inherit',windowsHide:true,env:{...process.env,TSX_TSCONFIG_PATH:'./tsconfig.app.json'}})
if(result.error)throw result.error
process.exit(result.status??1)
