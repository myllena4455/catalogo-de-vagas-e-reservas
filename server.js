require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar Firebase Admin (Usando credenciais básicas para Cloud Functions/Local)
// Nota: Em produção, você deve usar o Service Account JSON.
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
});

const db = admin.database();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Forçar o tipo MIME correto para CSS antes de servir arquivos estáticos
app.use('/css', (req, res, next) => {
  if (req.url.endsWith('.css')) {
    res.header('Content-Type', 'text/css');
  }
  next();
});

app.use(express.static(path.join(__dirname))); 

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'vagas_vagas',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });

// Rotas para Vagas
app.get('/api/vagas', async (req, res) => {
  try {
    const ref = db.ref('vagas');
    const snapshot = await ref.once('value');
    const data = snapshot.val() || {};
    // Converter objeto do Firebase para array compatível com o frontend
    const lista = Object.keys(data).map(key => ({
      _id: key,
      ...data[key]
    }));
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vagas', upload.single('foto'), async (req, res) => {
  try {
    const { personagem, obra, idadePersonagem, familia, usuarioNome, usuarioIdade, usuarioPronomes, usuarioWhatsapp } = req.body;
    const foto = req.file ? req.file.path : req.body.foto;

    const ref = db.ref('vagas');
    const novaVagaRef = ref.push();
    
    const dadosVaga = {
        personagem, 
        obra, 
        idadePersonagem, 
        familia, 
        usuarioNome: usuarioNome || null, 
        usuarioIdade: usuarioIdade || null, 
        usuarioPronomes: usuarioPronomes || null, 
        usuarioWhatsapp: usuarioWhatsapp || null, 
        foto: foto || null,
        status: usuarioNome ? 'Ocupado' : 'Livre'
    };

    await novaVagaRef.set(dadosVaga);
    res.json({ _id: novaVagaRef.key, ...dadosVaga });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vagas/:id/reservar', async (req, res) => {
  try {
    const { usuarioNome, usuarioIdade, usuarioPronomes, usuarioWhatsapp } = req.body;
    const ref = db.ref(`vagas/${req.params.id}`);
    const snapshot = await ref.once('value');
    const vaga = snapshot.val();

    if (!vaga) return res.status(404).json({ error: 'Vaga não encontrada' });
    if (vaga.status !== 'Livre') return res.status(400).json({ error: 'Personagem não está livre' });

    await ref.update({
        status: 'Reservado',
        usuarioNome,
        usuarioIdade,
        usuarioPronomes,
        usuarioWhatsapp,
        reservadoEm: new Date().toISOString()
    });

    res.json({ message: 'Reservado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vagas/:id/status', async (req, res) => {
  try {
    const { status, usuarioNome, usuarioIdade, usuarioPronomes, usuarioWhatsapp } = req.body;
    const ref = db.ref(`vagas/${req.params.id}`);
    
    let updates = { status };
    if (status === 'Ocupado' || status === 'Reservado') {
        updates.usuarioNome = usuarioNome;
        updates.usuarioIdade = usuarioIdade;
        updates.usuarioPronomes = usuarioPronomes;
        updates.usuarioWhatsapp = usuarioWhatsapp;
    } else {
        updates.usuarioNome = null;
        updates.usuarioIdade = null;
        updates.usuarioPronomes = null;
        updates.usuarioWhatsapp = null;
    }

    await ref.update(updates);
    res.json({ message: 'Status atualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vagas/:id', async (req, res) => {
    try {
        await db.ref(`vagas/${req.params.id}`).remove();
        res.json({ message: 'Vaga removida' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});