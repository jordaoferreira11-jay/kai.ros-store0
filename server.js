import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import pg from 'pg';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('ERRO: define JWT_SECRET com pelo menos 32 caracteres no .env.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('ERRO: define DATABASE_URL no .env.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.PUBLIC_URL || true }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public')));

const seedProducts = [
  ['Camiseta clássica personalizada','Camiseta · DTF',850,'👕','Mais pedido'],
  ['Camiseta oversized','Oversized · Estampagem',1350,'👕','Em destaque'],
  ['Camiseta polo','Polo · Personalização',1100,'👔','Para empresas'],
  ['Boné personalizado','Bordado ou estampagem',750,'🧢','Favorito']
];
async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf8');
  await pool.query(schema);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (rows[0].count === 0) {
    for (const p of seedProducts) await pool.query('INSERT INTO products(name,category,price_mzn,emoji,tag) VALUES($1,$2,$3,$4,$5)', p);
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const existing = await pool.query('SELECT id FROM admins WHERE lower(email)=lower($1)', [process.env.ADMIN_EMAIL]);
    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await pool.query('INSERT INTO admins(email,password_hash) VALUES($1,$2)', [process.env.ADMIN_EMAIL.toLowerCase(), hash]);
      console.log('Conta administrativa inicial criada. Altera a palavra-passe temporária após o primeiro acesso.');
    }
  }
}
const safeProduct = r => ({ id: Number(r.id), name: r.name, category: r.category, price: Number(r.price_mzn), emoji: r.emoji, tag: r.tag });
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    if (!token) throw new Error('missing');
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Sessão inválida ou expirada. Inicia sessão novamente.' }); }
}
function str(value, max = 500) { return String(value ?? '').trim().slice(0, max); }
function newRef(prefix='KR') { return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }

app.get('/api/health', async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, service: 'Kai.ros API', database: 'connected' }); }
  catch { res.status(503).json({ ok: false, database: 'unavailable' }); }
});
app.get('/api/products', async (_req,res,next) => {
  try { const { rows } = await pool.query('SELECT * FROM products WHERE active=TRUE ORDER BY id'); res.json(rows.map(safeProduct)); } catch(e) { next(e); }
});
app.post('/api/orders', async (req,res,next) => {
  try {
    const b = req.body || {};
    const name = str(b.name,120), phone = str(b.phone,40), email = str(b.email,180);
    const items = Array.isArray(b.items) ? b.items.slice(0,30).map(i => ({ name: str(i.name,160), price: Math.max(0, Number(i.price)||0), detail: str(i.detail,1000), quantity: Math.max(1,Math.min(1000,Number(i.quantity)||1)) })) : [];
    if (!name || !phone || !items.length) return res.status(400).json({ error: 'Indica nome, telefone e pelo menos um produto.' });
    const total = items.reduce((sum,i)=>sum+i.price*i.quantity,0);
    if (total > 100000000) return res.status(400).json({ error: 'Total inválido.' });
    const reference = newRef('KR');
    const { rows } = await pool.query(`INSERT INTO orders(reference,customer_name,phone,email,delivery,payment_preference,notes,items,total_mzn,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'Recebida') RETURNING reference,created_at,status,total_mzn`,
      [reference,name,phone,email||null,str(b.delivery,120),str(b.payment,120),str(b.notes,2000),JSON.stringify(items),total]);
    res.status(201).json({ message:'Pedido recebido.', reference: rows[0].reference, createdAt: rows[0].created_at, status: rows[0].status, total: Number(rows[0].total_mzn) });
  } catch(e) { next(e); }
});
app.post('/api/quotes', async (req,res,next) => {
  try {
    const b=req.body||{}, name=str(b.name,120), phone=str(b.phone,40), product=str(b.product,200), quantity=Math.max(1,Math.min(100000,Number(b.quantity)||1));
    if(!name||!phone||!product) return res.status(400).json({error:'Preenche nome, telefone e produto.'});
    const reference=newRef('OR');
    await pool.query(`INSERT INTO orders(reference,order_type,customer_name,phone,notes,items,total_mzn,status)
      VALUES($1,'quote',$2,$3,$4,$5,0,'Pedido de orçamento')`,[reference,name,phone,`Produto: ${product}; Quantidade: ${quantity}; Detalhes: ${str(b.details,2000)}`,JSON.stringify([])]);
    res.status(201).json({message:'Pedido de orçamento recebido.',reference});
  } catch(e){next(e)}
});
app.post('/api/admin/login', async (req,res,next) => {
  try {
    const email=str(req.body?.email,180).toLowerCase(), password=String(req.body?.password||'');
    const {rows}=await pool.query('SELECT id,email,password_hash FROM admins WHERE lower(email)=lower($1)',[email]);
    if(!rows.length || !(await bcrypt.compare(password,rows[0].password_hash))) return res.status(401).json({error:'Email ou palavra-passe incorretos.'});
    const token=jwt.sign({id:Number(rows[0].id),email:rows[0].email},JWT_SECRET,{expiresIn:'8h',issuer:'kai-ros'});
    res.json({token,admin:{email:rows[0].email},expiresIn:28800});
  } catch(e){next(e)}
});
app.get('/api/admin/me',auth,(req,res)=>res.json({email:req.admin.email}));
app.get('/api/admin/orders',auth,async(_req,res,next)=>{
  try {const {rows}=await pool.query('SELECT id,reference,order_type,customer_name,phone,email,delivery,payment_preference,notes,items,total_mzn,status,created_at FROM orders ORDER BY created_at DESC LIMIT 500');res.json(rows.map(r=>({...r,id:Number(r.id),total:Number(r.total_mzn)})));}catch(e){next(e)}
});
app.patch('/api/admin/orders/:id',auth,async(req,res,next)=>{
  try {const status=str(req.body?.status,60);const allowed=['Recebida','A aguardar pagamento','Pagamento confirmado','Em preparação','Em produção','Pronta para entrega','Enviada ou levantada','Concluída','Cancelada','Pedido de orçamento'];if(!allowed.includes(status))return res.status(400).json({error:'Estado não permitido.'});const q=await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING id,reference,status',[status,Number(req.params.id)]);if(!q.rowCount)return res.status(404).json({error:'Pedido não encontrado.'});res.json(q.rows[0]);}catch(e){next(e)}
});
app.get('/api/admin/products',auth,async(_req,res,next)=>{try{const {rows}=await pool.query('SELECT * FROM products ORDER BY id');res.json(rows.map(r=>({...safeProduct(r),active:r.active})));}catch(e){next(e)}});
app.post('/api/admin/products',auth,async(req,res,next)=>{try{const b=req.body||{},name=str(b.name,160),category=str(b.category,160)||'Personalização sob encomenda',price=Number(b.price);if(!name||!Number.isFinite(price)||price<0)return res.status(400).json({error:'Nome e preço válido são obrigatórios.'});const {rows}=await pool.query('INSERT INTO products(name,category,price_mzn,emoji,tag) VALUES($1,$2,$3,$4,$5) RETURNING *',[name,category,price,str(b.emoji,12)||'👕',str(b.tag,60)||'Personalizável']);res.status(201).json(safeProduct(rows[0]));}catch(e){next(e)}});
app.patch('/api/admin/products/:id',auth,async(req,res,next)=>{try{const b=req.body||{},name=str(b.name,160),category=str(b.category,160),price=Number(b.price);if(!name||!category||!Number.isFinite(price)||price<0)return res.status(400).json({error:'Nome, categoria e preço válido são obrigatórios.'});const {rows}=await pool.query('UPDATE products SET name=$1,category=$2,price_mzn=$3,emoji=$4,tag=$5,updated_at=NOW() WHERE id=$6 RETURNING *',[name,category,price,str(b.emoji,12)||'👕',str(b.tag,60)||'Personalizável',Number(req.params.id)]);if(!rows.length)return res.status(404).json({error:'Produto não encontrado.'});res.json(safeProduct(rows[0]));}catch(e){next(e)}});
app.delete('/api/admin/products/:id',auth,async(req,res,next)=>{try{const q=await pool.query('UPDATE products SET active=FALSE,updated_at=NOW() WHERE id=$1 RETURNING id', [Number(req.params.id)]);if(!q.rowCount)return res.status(404).json({error:'Produto não encontrado.'});res.json({ok:true});}catch(e){next(e)}});

// Uploads privados de arte: endpoint disponível apenas a administradores neste starter.
const uploadDir=path.join(__dirname,'private-uploads');fs.mkdirSync(uploadDir,{recursive:true});
const upload=multer({storage:multer.diskStorage({destination:uploadDir,filename:(_req,file,cb)=>cb(null,crypto.randomUUID()+path.extname(file.originalname).toLowerCase())}),limits:{fileSize:10*1024*1024,files:1},fileFilter:(_req,file,cb)=>{const ok=['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf'].includes(file.mimetype);cb(ok?null:new Error('Formato não permitido.'),ok)}});
app.post('/api/admin/uploads',auth,upload.single('art'),(req,res)=>{if(!req.file)return res.status(400).json({error:'Seleciona um ficheiro.'});res.status(201).json({message:'Ficheiro guardado em armazenamento privado.',fileName:req.file.filename,size:req.file.size});});
app.use((err,_req,res,_next)=>{console.error(err?.message||err);if(err instanceof multer.MulterError)return res.status(400).json({error:'Upload inválido ou ficheiro demasiado grande.'});res.status(500).json({error:'Ocorreu um erro interno. Tenta novamente.'});});

initDb().then(()=>app.listen(PORT,()=>console.log(`Kai.ros disponível em http://localhost:${PORT}`))).catch(err=>{console.error('Falha ao iniciar base de dados:',err.message);process.exit(1)});
