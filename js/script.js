const SENHA_MESTRA = "bee123";
const CLOUDINARY_CLOUD_NAME = "atelier-do-gandolf";
const CLOUDINARY_UPLOAD_PRESET = "arvore_genealogica";

let vagas = [];
let isAdmin = false;
let vagaEmEdicao = null;

function showMessage(msg, type = "info") {
    const box = document.getElementById('messageBox');
    if (!box) return;
    box.textContent = msg;
    box.className = `message ${type}`;
    box.style.display = 'block';
    setTimeout(() => box.style.display = 'none', 5000);
}

function toggleAdminPanel() {
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('adminPassword').focus();
}

function fecharModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function verificarSenha() {
    const senha = document.getElementById('adminPassword').value;
    if (senha === SENHA_MESTRA) {
        isAdmin = true;
        showMessage("Painel ADM liberado!", "success");
        document.getElementById('managementSection').style.display = 'block';
        fecharModal();
        renderizarGrid();
    } else {
        showMessage("Senha incorreta!", "error");
    }
}

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : ''; // O Render/Host vai usar o caminho relativo automaticamente

async function carregarVagas() {
    try {
        const response = await fetch(`${API_URL}/api/vagas`);
        if (!response.ok) throw new Error('Falha ao carregar API');
        vagas = await response.json();
        renderizarGrid();
    } catch (err) {
        console.error("Erro ao carregar vagas:", err);
    }
}

function renderizarGrid(filtro = '') {
    const vagasContainer = document.getElementById('vagasContainer');
    const reservasContainer = document.getElementById('reservasContainer');
    
    if (!vagasContainer || !reservasContainer) return;

    const termo = filtro.toLowerCase().trim();
    const filtrados = vagas.filter(v => 
        v.personagem.toLowerCase().includes(termo) || 
        v.obra.toLowerCase().includes(termo)
    );

    // Se houver pesquisa e não encontrar nada no banco de dados
    if (termo && filtrados.length === 0) {
        vagasContainer.innerHTML = `
            <div class="not-found">
                <p>✨ Personagem Livre ✨</p>
                <span>"${termo}" não foi encontrado nas reservas, o que significa que está disponível para uso!</span>
            </div>`;
        reservasContainer.innerHTML = '';
        return;
    }

    const htmlVagas = filtrados
        .filter(v => v.status === 'Livre')
        .map(v => criarCardVaga(v))
        .join('');

    const htmlReservas = filtrados
        .filter(v => v.status !== 'Livre')
        .map(v => criarCardVaga(v))
        .join('');

    vagasContainer.innerHTML = htmlVagas || '<p>Nenhum personagem livre no momento.</p>';
    reservasContainer.innerHTML = htmlReservas || '<p>Nenhuma reserva ativa.</p>';
}

function criarCardVaga(v) {
    const placeholder = 'https://via.placeholder.com/150?text=Sem+Foto';
    const fotoUrl = v.foto || placeholder;
    const adminBtn = isAdmin ? `<button class="btn-admin" onclick="abrirEdicaoAdmin('${v._id}')">Gerenciar</button>` : '';
    const reservarBtn = v.status === 'Livre' ? `<button class="btn-reserva" onclick="abrirModalReserva('${v._id}')">Reservar</button>` : '';
    
    let infoStatus = `<p class="status-${v.status.toLowerCase()}">${v.status}</p>`;
    if (v.status !== 'Livre') {
        const whatsBtn = v.usuarioWhatsapp ? `<p><strong>WhatsApp:</strong> <a href="https://wa.me/${v.usuarioWhatsapp.replace(/\D/g,'')}" target="_blank" style="color:#25d366; text-decoration:none;">📱 Enviar Mensagem</a></p>` : '';
        infoStatus += `
            <div class="user-info">
                <p><strong>Dono:</strong> ${v.usuarioNome}</p>
                <p><strong>Idade:</strong> ${v.usuarioIdade}</p>
                <p><strong>Pronomes:</strong> ${v.usuarioPronomes}</p>
                ${whatsBtn}
            </div>`;
    }

    return `
        <div class="card-vaga">
            <img src="${fotoUrl}" alt="${v.personagem}">
            <div class="card-body">
                <h3>${v.personagem}</h3>
                <p class="obra"><em>${v.obra}</em></p>
                <p class="detalhes">Idade: ${v.idadePersonagem || '?'}</p>
                <p class="detalhes">Família: ${v.familia || 'Nenhuma'}</p>
                ${infoStatus}
                ${reservarBtn}
                ${adminBtn}
            </div>
        </div>
    `;
}

function mostrarAba(aba) {
    const vCont = document.getElementById('vagasContainer');
    const rCont = document.getElementById('reservasContainer');
    const buttons = document.querySelectorAll('.btn-tab');

    buttons.forEach(b => b.classList.remove('active'));
    
    if (aba === 'vagas') {
        vCont.style.display = 'grid';
        rCont.style.display = 'none';
        buttons[0] && buttons[0].classList.add('active');
    } else {
        vCont.style.display = 'none';
        rCont.style.display = 'grid';
        buttons[1] && buttons[1].classList.add('active');
    }
}

function buscarVaga() {
    const termo = document.getElementById('searchInput').value;
    renderizarGrid(termo);
}

function abrirModalReserva(id) {
    vagaEmEdicao = id;
    const vaga = vagas.find(v => v._id === id);
    document.getElementById('reservaNomePersonagem').textContent = `Personagem: ${vaga.personagem}`;
    document.getElementById('reservaModal').style.display = 'block';
}

function fecharReservaModal() {
    document.getElementById('reservaModal').style.display = 'none';
    document.getElementById('reservaUsuarioNome').value = '';
    document.getElementById('reservaUsuarioIdade').value = '';
    document.getElementById('reservaUsuarioPronomes').value = '';
    document.getElementById('reservaUsuarioWhatsapp').value = '';
}

async function confirmarReserva() {
    const usuarioNome = document.getElementById('reservaUsuarioNome').value.trim();
    const usuarioIdade = document.getElementById('reservaUsuarioIdade').value.trim();
    const usuarioPronomes = document.getElementById('reservaUsuarioPronomes').value.trim();
    const usuarioWhatsapp = document.getElementById('reservaUsuarioWhatsapp').value.trim();
    const usuarioParentesco = document.getElementById('reservaUsuarioParentesco').value;

    if (!usuarioNome || !usuarioIdade || !usuarioPronomes || !usuarioWhatsapp) {
        return showMessage("Preencha todos os seus dados!", "error");
    }

    try {
        const res = await fetch(`${API_URL}/api/vagas/${vagaEmEdicao}/reservar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                usuarioNome, 
                usuarioIdade, 
                usuarioPronomes, 
                usuarioWhatsapp,
                usuarioParentesco
            })
        });
        
        if (res.ok) {
            showMessage("Reserva enviada!", "success");
            fecharReservaModal();
            carregarVagas();
        } else {
            const data = await res.json();
            showMessage(data.error, "error");
        }
    } catch (err) {
        showMessage("Erro ao reservar.", "error");
    }
}

function mostrarFormVaga() {
    const form = document.getElementById('vagaForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function toggleCamposUsuario() {
    const tipo = document.getElementById('vagaTipoCadastro').value;
    const section = document.getElementById('sectionUsuarioCadastro');
    section.style.display = tipo === 'Ocupado' ? 'block' : 'none';
}

async function executarCadastroVaga() {
    const tipo = document.getElementById('vagaTipoCadastro').value;
    const personagem = document.getElementById('nomePersonagem').value.trim();
    const idadePersonagem = document.getElementById('idadePersonagem').value.trim();
    const obra = document.getElementById('obraPersonagem').value.trim();
    const familia = document.getElementById('familiaPersonagem').value.trim();
    const fotoFile = document.getElementById('fotoPersonagem').files[0];
    
    // Dados do usuário
    const usuarioNome = document.getElementById('usuarioNome').value.trim();
    const usuarioIdade = document.getElementById('usuarioIdade').value.trim();
    const usuarioPronomes = document.getElementById('usuarioPronomes').value.trim();
    const usuarioWhatsapp = document.getElementById('usuarioWhatsapp').value.trim();
    const usuarioParentesco = document.getElementById('usuarioParentesco').value;

    if (!personagem || !obra) return showMessage("Nome e Obra são obrigatórios!", "error");

    const formData = new FormData();
    formData.append('personagem', personagem);
    formData.append('idadePersonagem', idadePersonagem);
    formData.append('obra', obra);
    formData.append('familia', familia);
    if (fotoFile) formData.append('foto', fotoFile);
    
    // Se for Occupado, os dados do usuário são obrigatórios
    if (tipo === 'Ocupado') {
        if (!usuarioNome || !usuarioWhatsapp) {
            return showMessage("Para cadastrar como ocupado, informe pelo menos o Nome e WhatsApp do usuário!", "error");
        }
        formData.append('usuarioNome', usuarioNome);
        formData.append('usuarioIdade', usuarioIdade);
        formData.append('usuarioPronomes', usuarioPronomes);
        formData.append('usuarioWhatsapp', usuarioWhatsapp);
        formData.append('usuarioParentesco', usuarioParentesco);
        formData.append('status', 'Ocupado');
    } else {
        formData.append('status', 'Livre');
    }
    
    if (usuarioNome) {
        formData.append('usuarioNome', usuarioNome);
        formData.append('usuarioIdade', usuarioIdade);
        formData.append('usuarioPronomes', usuarioPronomes);
        formData.append('usuarioWhatsapp', usuarioWhatsapp);
    }

    try {
        const res = await fetch(`${API_URL}/api/vagas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioNome, usuarioIdade, usuarioPronomes, usuarioWhatsapp })
        });

        if (res.ok) {
            showMessage("Personagem cadastrado!", "success");
            document.getElementById('vagaForm').reset();
            document.getElementById('vagaForm').style.display = 'none';
            carregarVagas();
        } else {
            const data = await res.json();
            showMessage(data.error, "error");
        }
    } catch (err) {
        showMessage("Erro ao cadastrar.", "error");
    }
}

function abrirEdicaoAdmin(id) {
    vagaEmEdicao = id;
    const vaga = vagas.find(v => v._id === id);
    document.getElementById('editInfoPersonagem').textContent = `Editando: ${vaga.personagem}`;
    document.getElementById('editStatusVaga').value = vaga.status;
    document.getElementById('editUsuarioNome').value = vaga.usuarioNome || '';
    document.getElementById('editUsuarioIdade').value = vaga.usuarioIdade || '';
    document.getElementById('editUsuarioPronomes').value = vaga.usuarioPronomes || '';
    document.getElementById('editUsuarioWhatsapp').value = vaga.usuarioWhatsapp || '';
    document.getElementById('editModal').style.display = 'block';
}

function fecharEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function salvarAlteracaoAdmin() {
    const status = document.getElementById('editStatusVaga').value;
    const usuarioNome = document.getElementById('editUsuarioNome').value.trim();
    const usuarioIdade = document.getElementById('editUsuarioIdade').value.trim();
    const usuarioPronomes = document.getElementById('editUsuarioPronomes').value.trim();
    const usuarioWhatsapp = document.getElementById('editUsuarioWhatsapp').value.trim();

    try {
        const res = await fetch(`${API_URL}/api/vagas/${vagaEmEdicao}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, usuarioNome, usuarioIdade, usuarioPronomes, usuarioWhatsapp })
        });

        if (res.ok) {
            showMessage("Alterado com sucesso!", "success");
            fecharEditModal();
            carregarVagas();
        }
    } catch (err) {
        showMessage("Erro ao atualizar.", "error");
    }
}

async function excluirVaga() {
    if (!confirm("Tem certeza que deseja excluir este personagem?")) return;

    try {
        const res = await fetch(`${API_URL}/api/vagas/${vagaEmEdicao}`, { method: 'DELETE' });
        if (res.ok) {
            showMessage("Removido!", "success");
            fecharEditModal();
            carregarVagas();
        }
    } catch (err) {
        showMessage("Erro ao excluir.", "error");
    }
}

// Inicialização
window.onload = () => {
    carregarVagas();
};
