require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const Vaga = require('./models/Vaga');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Servir arquivos da raiz (index.html, js, css)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Servir pasta de uploads

// Criar pasta de uploads se não existir
const fs = require('fs');
if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vagas_reservas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Configuração para upload de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Rotas para Vagas
app.get('/api/vagas', async (req, res) => {
  try {
    const vagas = await Vaga.find();
    res.json(vagas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vagas', upload.single('foto'), async (req, res) => {
  try {
    const { personagem, obra, idadePersonagem, familia, usuarioNome, usuarioIdade, usuarioPronomes, usuarioWhatsapp } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : req.body.foto;

    const existe = await Vaga.findOne({ personagem: new RegExp(`^${personagem}$`, 'i') });
    if (existe) {
      return res.status(400).json({ error: `${personagem} já está cadastrado!` });
    }

    const novaVaga = new Vaga({ 
        personagem, 
        obra, 
        idadePersonagem, 
        familia, 
        usuarioNome, 
        usuarioIdade, 
        usuarioPronomes, 
        usuarioWhatsapp, 
        foto,
        status: usuarioNome ? 'Ocupado' : 'Livre' // Se já vem com nome de usuário, assume ocupado
    });
    await novaVaga.save();
    res.json(novaVaga);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vagas/:id/reservar', async (req, res) => {
  try {
    const { usuarioNome, usuarioIdade, usuarioPronomes, usuarioWhatsapp } = req.body;
    const vaga = await Vaga.findById(req.params.id);
    if (!vaga) return res.status(404).json({ error: 'Vaga não encontrada' });
    if (vaga.status !== 'Livre') return res.status(400).json({ error: 'Personagem não está livre' });

    vaga.status = 'Reservado';
    vaga.usuarioNome = usuarioNome;
    vaga.usuarioIdade = usuarioIdade;
    vaga.usuarioPronomes = usuarioPronomes;
    vaga.usuarioWhatsapp = usuarioWhatsapp;
    vaga.reservadoEm = new Date();
    await vaga.save();
    res.json(vaga);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vagas/:id/status', async (req, res) => {
  try {
    const { status, usuarioNome, usuarioIdade, usuarioPronomes, usuarioWhatsapp } = req.body;
    const vaga = await Vaga.findById(req.params.id);
    if (!vaga) return res.status(404).json({ error: 'Vaga não encontrada' });

    vaga.status = status;
    if (status === 'Ocupado' || status === 'Reservado') {
        vaga.usuarioNome = usuarioNome;
        vaga.usuarioIdade = usuarioIdade;
        vaga.usuarioPronomes = usuarioPronomes;
        vaga.usuarioWhatsapp = usuarioWhatsapp;
    } else if (status === 'Livre') {
        vaga.usuarioNome = null;
        vaga.usuarioIdade = null;
        vaga.usuarioPronomes = null;
        vaga.usuarioWhatsapp = null;
    }
    await vaga.save();
    res.json(vaga);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vagas/:id', async (req, res) => {
    try {
        await Vaga.findByIdAndDelete(req.params.id);
        res.json({ message: 'Vaga removida' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});