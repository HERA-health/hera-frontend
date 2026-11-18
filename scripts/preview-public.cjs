// Local preview of the exported pages and the production public-page handler.
// No unknown-route fallback: private rewrites are read from vercel.json.
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const {createGzip}=require('node:zlib');
const {pipeline}=require('node:stream');
const apiUrl=process.env.HERA_PREVIEW_API_URL || 'http://localhost:3000/api';
const apiOrigin=new URL(apiUrl).origin;
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(apiUrl).hostname))throw new Error('Preview requires a local backend');
process.env.EXPO_PUBLIC_API_URL=apiUrl;
const root=path.resolve(__dirname,'../dist');process.chdir(path.resolve(__dirname,'..'));
const handler=require('../api/public-page');const rules=require('../vercel.json').rewrites;
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost:8088');let pathname;
  try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
  if(pathname==='/especialistas'||pathname==='/psicologos-online'||/^\/(psicologos|especialista|e)\//.test(pathname))return handler(req,res);
  if(pathname.startsWith('/legal/')||pathname==='/sitemap.xml'){const response=await fetch(apiOrigin+req.url);res.writeHead(response.status,{'Content-Type':response.headers.get('Content-Type')||'text/html'});res.end(Buffer.from(await response.arrayBuffer()));return;}
  let target=path.resolve(root,'.'+pathname);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(400).end();return;}
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  if(!fs.existsSync(target)){
    const privateRoute=rules.some(rule=>rule.destination==='/app-shell.html'&&new RegExp('^'+rule.source.replace(/:[^/]+/g,'[^/]+')+'/?$').test(pathname));
    if(privateRoute)target=path.join(root,'app-shell.html');
    else {res.statusCode=404;target=path.join(root,'404.html');}
  }
  const ext=path.extname(target);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.otf':'font/otf','.ttf':'font/ttf','.json':'application/json'})[ext]||'application/octet-stream');
  const immutable = /[.-][a-f0-9]{32}\.[^.]+$/.test(path.basename(target));
  res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
  const compressible = ['.js','.html','.css','.json','.svg','.otf','.ttf'].includes(ext);
  if (compressible) res.setHeader('Vary','Accept-Encoding');
  const gzip = compressible && /(?:^|,)\s*gzip\s*(?:,|$)/i.test(req.headers['accept-encoding'] || '');
  if (gzip) res.setHeader('Content-Encoding','gzip');
  if (req.method === 'HEAD') return res.end();
  const source = fs.createReadStream(target);
  const streams = gzip ? [source, createGzip(), res] : [source, res];
  pipeline(streams, error => { if (error) res.destroy(); });
}).listen(8088,'127.0.0.1',()=>console.log('Public preview on http://localhost:8088'));
