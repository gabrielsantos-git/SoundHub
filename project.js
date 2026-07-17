// Estado Global da Aplicacao
const AppState = {
    currentUser: null,
    allMedia: [],
    selectedMedia: [],
    availableScreens: [],
    selectedScreen: null,
    isProjecting: false,
    projectionWindow: null,
    currentMediaIndex: 0,
    broadcastChannel: null,
    currentView: 'normal',
    loadedMediaCount: 0,
    mediaLoadBatch: 20,
    isLoading: false
};

// Função para carregar mídias da API
async function loadMedia() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Usuário não autenticado, usando fallback');
            AppState.allMedia = [];
            renderMediaByDate();
            return;
        }

        const response = await fetch('/api/files/approved', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const files = await response.json();
            // Converter formato do backend para o formato esperado pelo frontend
            AppState.allMedia = files.map(file => ({
                id: file.id.toString(),
                nome: file.nome,
                tipo: file.tipo.includes('image/') ? 'image' : file.tipo.includes('video/') ? 'video' : 'pdf',
                mimeType: file.tipo,
                url: file.caminho,
                isChunked: file.is_chunked || false,
                chunkUrls: file.chunk_urls || null,
                dataUpload: new Date(file.data_upload)
            }));
            
            console.log('Mídias carregadas da API:', AppState.allMedia.length);
            renderMediaByDate();
        } else {
            console.error('Erro ao carregar mídias:', response.status);
            AppState.allMedia = [];
            renderMediaByDate();
        }
    } catch (error) {
        console.error('Erro na requisição de mídias:', error);
        AppState.allMedia = [];
        renderMediaByDate();
    }
}

console.log('Arquivo project.js carregado com sucesso');

// Apenas um evento de inicialização para evitar conflitos
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, iniciando aplicacao...');
    initializeApp();
});

async function initializeApp() {
    console.log('=== INICIANDO APLICACAO ===');
    try {
        console.log('1. Verificando autenticacao...');
        await checkAuthentication();
        console.log('2. Autenticacao OK, inicializando canal...');
        initializeBroadcastChannel();
        console.log('3. Canal OK, configurando listeners...');
        setupEventListeners();
        console.log('4. Listeners OK, carregando midias...');
        await loadMedia();
        console.log('5. Midias OK, verificando seleção de grupo...');
        await checkGroupSelection();
        console.log('6. Seleção OK, detectando telas...');
        initScreenDetection();
        console.log('7. Telas OK, atualizando UI...');
        updateUI();
        console.log('=== APLICACAO INICIADA COM SUCESSO ===');
    } catch (error) {
        console.error('Erro na autenticacao, mas continuando para testes:', error);
        console.log('Continuando sem autenticacao para testes...');
        initializeBroadcastChannel();
        setupEventListeners();
        await loadMedia();
        await checkGroupSelection();
        initScreenDetection();
        updateUI();
        console.log('=== APLICACAO INICIADA EM MODO TESTE ===');
    }
}

// Verificar se há mídias pré-selecionadas de um grupo
async function checkGroupSelection() {
    try {
        const selectedIds = localStorage.getItem('selectedMediaIds');
        const groupName = localStorage.getItem('projectGroupName');
        
        if (selectedIds && groupName) {
            console.log(`Carregando grupo pré-selecionado: ${groupName}`);
            
            // Limpar localStorage após uso
            localStorage.removeItem('selectedMediaIds');
            localStorage.removeItem('projectGroupName');
            
            // Esperar um pouco para garantir que as mídias foram carregadas
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Selecionar mídias do grupo
            const ids = JSON.parse(selectedIds);
            let selectedCount = 0;
            
            ids.forEach(id => {
                const media = AppState.allMedia.find(m => m.id === id.toString());
                if (media && !AppState.selectedMedia.includes(media.id)) {
                    AppState.selectedMedia.push(media.id);
                    selectedCount++;
                }
            });
            
            console.log(`${selectedCount} mídias selecionadas do grupo "${groupName}"`);
            
            // Mostrar mensagem de feedback
            if (selectedCount > 0) {
                const message = document.getElementById('message');
                if (message) {
                    message.innerHTML = `<div class="success"> Grupo "${groupName}" carregado com ${selectedCount} mídias selecionadas</div>`;
                    setTimeout(() => {
                        message.innerHTML = '';
                    }, 5000);
                }
            }
        }
    } catch (error) {
        console.error('Erro ao verificar seleção de grupo:', error);
    }
}

async function checkAuthentication() {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/auth';
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.ok) {
            const data = await response.json();
            AppState.currentUser = data.user;
            updateUserInterface();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/auth';
        }
    } catch (error) {
        window.location.href = '/auth';
    }
}

function updateUserInterface() {
    if (!AppState.currentUser) return;
    
    // VERIFICACAO DE SEGURANCA - EVITAR NULL REFERENCE ERRORS
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const accountsLink = document.getElementById('accountsLink');
    const receiveLink = document.getElementById('receiveLink');
    const projectLink = document.getElementById('projectLink');
    
    // Atualizar informações do usuário
    if (userNameEl) {
        userNameEl.textContent = AppState.currentUser.nome;
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = AppState.currentUser.cargo;
    }
    
    // Sidebar gerenciada pelo sidebar.js via updateSidebar
    if (typeof updateSidebar === 'function') {
        updateSidebar(AppState.currentUser);
    }
}

async function initializeMedia() {
    const container = document.getElementById('mediaContainer');
    
    // VERIFICACAO CRITICA: SE O CONTAINER NAO EXISTE, O SCRIPT MORRE AQUI.
    if (!container) {
        console.error('ERRO FATAL: #mediaContainer não existe no DOM');
        return;
    }

    console.log('Carregando mídias da API...');
    
    // CARREGAR MÍDIAS DA API
    await loadMedia();
}

function renderMediaByDate() {
    const container = document.getElementById('mediaContainer');
    if (!container) return;

    const mediaByDate = groupMediaByDate(AppState.allMedia);
    let html = '';

    // LIMPA O SPINNER IMEDIATAMENTE
    container.innerHTML = '';

    Object.entries(mediaByDate).forEach(([date, list]) => {
        html += `
            <div class="media-date-group">
                <div class="media-date-header"> ${date}</div>
                <div class="media-grid">
                    ${list.map(media => createMediaItem(media)).join('')}
                </div>
            </div>`;
    });

    container.innerHTML = html;
    generateAllVideoThumbnails();
}

function generateAllVideoThumbnails() {
    AppState.allMedia.forEach(function(media) {
        if (media.tipo === 'video') {
            generateVideoThumbnail(
                media,
                document.getElementById('vthumb-' + media.id),
                document.getElementById('vfallback-' + media.id)
            );
        }
    });
}

function generateVideoThumbnail(media, canvas, fallback) {
    if (!canvas) return;

    var srcUrl = (media.isChunked && media.chunkUrls && media.chunkUrls[0])
        ? media.chunkUrls[0]
        : media.url;
    if (!srcUrl) return;

    var video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';

    video.addEventListener('loadedmetadata', function() {
        video.currentTime = video.duration > 1 ? 1 : video.duration * 0.5;
    });

    video.addEventListener('seeked', function() {
        try {
            canvas.width = canvas.offsetWidth || 320;
            canvas.height = canvas.offsetHeight || 150;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            if (fallback) fallback.style.display = 'none';
        } catch (e) { /* CORS - mantém o ícone */ }
        video.src = '';
    });

    video.src = srcUrl;
}

function groupMediaByDate(mediaList) {
    const grouped = {};
    
    // Agrupar mídias
    mediaList.forEach(media => {
        let d = new Date(media.dataUpload);
        // Formata a data para uma string legível (ex: "28 de abril de 2026")
        let key = isNaN(d.getTime()) ? 
            "Data Desconhecida" : 
            d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(media);
    });

    // Ordenar as chaves (datas) para que as mais novas apareçam no topo
    const sortedGrouped = {};
    Object.keys(grouped).sort((a, b) => {
        if (a === "Data Desconhecida") return 1;
        if (b === "Data Desconhecida") return -1;
        return new Date(b) - new Date(a);
    }).forEach(key => {
        sortedGrouped[key] = grouped[key];
    });

    return sortedGrouped;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function createMediaItem(media) {
    const orderIndex = AppState.selectedMedia.indexOf(media.id);
    const isSelected = orderIndex !== -1;
    const selectedClass = isSelected ? 'selected' : '';
    const typeIcon = media.tipo === 'image' ? '' : '';
    const typeText = media.tipo === 'image' ? 'Imagem' : 'Video';
    const badgeHtml = isSelected ? '<div class="order-badge">' + (orderIndex + 1) + '</div>' : '';

    const mediaThumbnail = media.tipo === 'image'
        ? '<img src="' + media.url + '" alt="' + media.nome + '" class="media-thumbnail" loading="lazy">'
        : '<div class="video-thumb-container">' +
              '<canvas class="video-thumb-canvas" id="vthumb-' + media.id + '"></canvas>' +
              '<div class="video-thumb-fallback" id="vfallback-' + media.id + '"><span style="font-size:2rem;opacity:0.6">🎥</span></div>' +
          '</div>';

    return '<div class="media-item ' + selectedClass + '" onclick="toggleMediaSelection(\'' + media.id + '\')" id="media-' + media.id + '" data-media-id="' + media.id + '">' +
        badgeHtml +
        mediaThumbnail +
        '<div class="media-name">' + media.nome + '</div>' +
        '<span class="media-type">' + typeText + '</span>' +
        '</div>';
}

function toggleMediaSelection(mediaId) {
    const mediaItem = document.getElementById('media-' + mediaId);
    const idx = AppState.selectedMedia.indexOf(mediaId);

    if (idx !== -1) {
        AppState.selectedMedia.splice(idx, 1);
        mediaItem.classList.remove('selected');
        const badge = mediaItem.querySelector('.order-badge');
        if (badge) badge.remove();
        // Numbers of remaining items shift, refresh all badges
        refreshOrderBadges();
    } else {
        AppState.selectedMedia.push(mediaId);
        mediaItem.classList.add('selected');
        const badge = document.createElement('div');
        badge.className = 'order-badge';
        badge.textContent = AppState.selectedMedia.length;
        mediaItem.appendChild(badge);
    }

    updateProjectionButton();
}

function refreshOrderBadges() {
    AppState.selectedMedia.forEach(function(id, i) {
        const badge = document.querySelector('#media-' + id + ' .order-badge');
        if (badge) badge.textContent = i + 1;
    });
}

function updateProjectionButton() {
    const button = document.getElementById('projectBtn');
    const hasSelection = AppState.selectedMedia.length > 0;

    button.disabled = !hasSelection || AppState.isProjecting;

    if (AppState.isProjecting) {
        button.textContent = 'Projetando...';
        button.className = 'btn btn-secondary';
    } else {
        button.textContent = 'Projetar';
        button.className = 'btn btn-primary';
    }
}

// ─── Window Management API ────────────────────────────────────────────────────

async function initScreenDetection() {
    if (!('getScreenDetails' in window)) {
        renderScreenUnsupported();
        return;
    }

    try {
        const perm = await navigator.permissions.query({ name: 'window-management' });
        perm.onchange = () => handlePermissionChange(perm.state);
        handlePermissionChange(perm.state);
    } catch (e) {
        // Navegador não implementa query para window-management — tenta direto
        renderScreenPermissionPrompt();
    }
}

function handlePermissionChange(state) {
    if (state === 'granted') {
        detectScreensWithAPI();
    } else if (state === 'denied') {
        renderScreenPermissionDenied();
    } else {
        renderScreenPermissionPrompt();
    }
}

async function requestScreenPermission() {
    try {
        await detectScreensWithAPI();
    } catch (e) {
        if (e.name === 'NotAllowedError') {
            renderScreenPermissionDenied();
        } else {
            console.error('Erro ao solicitar permissão de tela:', e);
        }
    }
}

async function detectScreensWithAPI() {
    const container = document.getElementById('screenContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><div>Detectando telas...</div></div>';

    // Deregistra listener anterior se existir
    if (AppState._screenDetailsRef) {
        AppState._screenDetailsRef.removeEventListener('screenschange', onScreensChange);
    }

    const screenDetails = await window.getScreenDetails();
    AppState._screenDetailsRef = screenDetails;
    screenDetails.addEventListener('screenschange', onScreensChange);

    applyScreenDetails(screenDetails.screens);
}

function onScreensChange() {
    applyScreenDetails(AppState._screenDetailsRef.screens);
}

function applyScreenDetails(screens) {
    AppState.availableScreens = screens.map(function(s, i) {
        return {
            id: i,
            label: s.label || (s.isPrimary ? 'Monitor Principal' : 'Projetor ' + i),
            width: s.width,
            height: s.height,
            availLeft: s.availLeft,
            availTop: s.availTop,
            availWidth: s.availWidth,
            availHeight: s.availHeight,
            isPrimary: s.isPrimary,
        };
    });

    // Auto-seleciona a tela não-primária (projetor); mantém seleção manual se ainda existir
    const currentId = AppState.selectedScreen ? AppState.selectedScreen.id : null;
    const stillExists = currentId !== null && AppState.availableScreens.some(s => s.id === currentId);
    if (!stillExists) {
        AppState.selectedScreen =
            AppState.availableScreens.find(s => !s.isPrimary) ||
            AppState.availableScreens[0] ||
            null;
    }

    renderScreens();
    updateProjectionButton();
}

function selectScreen(screenId) {
    AppState.selectedScreen = AppState.availableScreens.find(s => s.id === screenId) || null;
    document.querySelectorAll('.monitor-item').forEach(el => el.classList.remove('selected'));
    const el = document.getElementById('screen-' + screenId);
    if (el) el.classList.add('selected');
    updateProjectionButton();
}

function renderScreens() {
    const container = document.getElementById('screenContainer');

    if (AppState.availableScreens.length === 0) {
        container.innerHTML = '<p style="color:#64748b;font-size:0.875rem">Nenhuma tela detectada.</p>';
        return;
    }

    let html = '<div class="monitor-grid">';
    AppState.availableScreens.forEach(function(s) {
        const badge = s.isPrimary
            ? '<span class="primary-badge">PRINCIPAL</span>'
            : '<span class="primary-badge" style="background:#7c3aed">PROJETOR</span>';
        const selectedClass = AppState.selectedScreen && AppState.selectedScreen.id === s.id ? 'selected' : '';
        html +=
            '<div class="monitor-item ' + selectedClass + '" onclick="selectScreen(' + s.id + ')" id="screen-' + s.id + '">' +
            '<div class="monitor-name">' + s.label + ' ' + badge + '</div>' +
            '<div class="monitor-resolution">' + s.availWidth + ' × ' + s.availHeight + '</div>' +
            '</div>';
    });
    html += '</div>';

    if (AppState.availableScreens.length === 1) {
        html += '<p style="color:#f59e0b;font-size:0.8rem;margin-top:0.5rem">⚠️ Apenas 1 tela detectada. Conecte o projetor.</p>';
    }

    container.innerHTML = html;
}

function renderScreenPermissionPrompt() {
    document.getElementById('screenContainer').innerHTML =
        '<div class="screen-permission">' +
        '<p>O SoundHub precisa de permissão para detectar e gerenciar telas externas.</p>' +
        '<button class="btn btn-primary" onclick="requestScreenPermission()">Autorizar acesso às telas</button>' +
        '</div>';
}

function renderScreenPermissionDenied() {
    document.getElementById('screenContainer').innerHTML =
        '<div class="screen-permission screen-permission--denied">' +
        '<p>Permissão negada. Para usar o projetor, clique no ícone 🔒 na barra de endereços, ' +
        'encontre "Gerenciamento de janelas" e altere para "Permitir".</p>' +
        '<button class="btn btn-secondary" onclick="requestScreenPermission()">Tentar novamente</button>' +
        '</div>';
}

function renderScreenUnsupported() {
    document.getElementById('screenContainer').innerHTML =
        '<div class="screen-permission screen-permission--denied">' +
        '<p>Seu navegador não suporta a Window Management API. Use o Google Chrome 100+ para detectar o projetor automaticamente.</p>' +
        '</div>';
}

async function startProjection() {
    if (AppState.selectedMedia.length === 0) {
        showError('Selecione ao menos uma mídia primeiro.');
        return;
    }

    // Se a tela ainda não foi detectada, solicita permissão agora (user gesture ativo)
    if (!AppState.selectedScreen) {
        try {
            await detectScreensWithAPI();
        } catch (e) {
            showError('Permissão de gerenciamento de telas necessária para projetar.');
            return;
        }
    }

    if (!AppState.selectedScreen) {
        showError('Nenhuma tela disponível para projeção.');
        return;
    }

    try {
        const selectedMediaList = AppState.selectedMedia.map(id => AppState.allMedia.find(m => m.id === id)).filter(Boolean);

        const { availLeft, availTop, availWidth, availHeight } = AppState.selectedScreen;
        const features = [
            'left=' + availLeft,
            'top=' + availTop,
            'width=' + availWidth,
            'height=' + availHeight,
            'menubar=no,toolbar=no,location=no,status=no,scrollbars=no'
        ].join(',');
        
        // Abre a janela
        AppState.projectionWindow = window.open('projection.html', 'SoundHub-Screen', features);

        if (!AppState.projectionWindow) {
            console.log('Pop-up bloqueado! Por favor, autorize pop-ups para este site.');
            return;
        }

        // --- NOVO SISTEMA DE SINCRONIZAÇÃO ---
        // Criamos um listener temporário para esperar a janela dizer que está pronta
        const syncHandler = (event) => {
            try {
                if (event.data.type === 'PROJECTION_READY') {
                    console.log('Janela confirmou que está pronta. Enviando dados...');

                    AppState.broadcastChannel.postMessage({
                        type: 'INITIALIZE_PROJECTION',
                        data: {
                            mediaList: selectedMediaList,
                            currentMediaIndex: 0
                        }
                    });

                    AppState.isProjecting = true;
                    AppState.currentMediaIndex = 0;
                    switchToControlPanel(selectedMediaList);
                    updateStatus('Projeção Ativa');

                    AppState.broadcastChannel.removeEventListener('message', syncHandler);
                }
            } catch (handlerError) {
                console.error('Erro no syncHandler:', handlerError);
                updateStatus('Erro na sincronização');
            }
        };

        // Adicionar listener com tratamento de erro
        try {
            AppState.broadcastChannel.addEventListener('message', syncHandler);
        } catch (listenerError) {
            console.error('Erro ao adicionar listener de sincronização:', listenerError);
            updateStatus('Erro ao configurar sincronização');
        }

    } catch (error) {
        console.error('Erro ao projetar:', error);
        showError('Falha ao iniciar: ' + error.message);
    }
}

function toggleProjectionFullscreen() {
    try {
        AppState.broadcastChannel.postMessage({ type: 'TOGGLE_FULLSCREEN' });
    } catch (e) {
        console.error('Erro ao enviar comando de tela cheia:', e);
    }
}

function switchToControlPanel(mediaList) {
    AppState.currentView = 'control';
    
    document.getElementById('normalView').style.display = 'none';
    
    const controlPanel = document.getElementById('controlPanel');
    controlPanel.classList.add('active');
    
    renderMediaList(mediaList);
    updatePreviews();
    setupKeyboardControls();
}

function renderMediaList(mediaList) {
    const container = document.getElementById('mediaList');
    
    let html = '';
    mediaList.forEach(function(media, index) {
        const activeClass = index === AppState.currentMediaIndex ? 'active' : '';
        const typeIcon = media.tipo === 'image' ? '' : '';
        
        html += '<div class="media-list-item ' + activeClass + '" onclick="jumpToMedia(' + index + ')" id="list-item-' + index + '">' +
            typeIcon + ' ' + media.nome +
            '</div>';
    });
    
    container.innerHTML = html;
}

function updatePreviews() {
    const selectedMediaList = AppState.selectedMedia.map(function(id) {
        return AppState.allMedia.find(function(m) { return m.id === id; });
    }).filter(Boolean);
    
    const currentPreview = document.getElementById('currentPreview');
    const currentMedia = selectedMediaList[AppState.currentMediaIndex];
    
    if (currentMedia) {
        setPreviewContent(currentPreview, currentMedia, 'vprev-current');
    }

    const nextPreview = document.getElementById('nextPreview');
    const nextIndex = (AppState.currentMediaIndex + 1) % selectedMediaList.length;
    const nextMedia = selectedMediaList[nextIndex];

    if (nextMedia) {
        setPreviewContent(nextPreview, nextMedia, 'vprev-next');
    }
}

function setPreviewContent(container, media, canvasId) {
    if (media.tipo === 'image') {
        container.innerHTML = '<img src="' + media.url + '" alt="' + media.nome + '" style="width:100%;height:100%;object-fit:contain;">';
    } else {
        container.innerHTML =
            '<div style="position:relative;width:100%;height:100%;background:#1e293b;border-radius:0.25rem;overflow:hidden;">' +
                '<canvas id="' + canvasId + '" style="width:100%;height:100%;display:block;"></canvas>' +
                '<div id="' + canvasId + '-fb" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;">' +
                    '<span style="font-size:2rem;opacity:0.6">🎥</span>' +
                    '<span style="font-size:0.75rem;margin-top:0.5rem">' + media.nome + '</span>' +
                '</div>' +
            '</div>';
        generateVideoThumbnail(
            media,
            document.getElementById(canvasId),
            document.getElementById(canvasId + '-fb')
        );
    }
}

function nextMedia() {
    const selectedMediaList = AppState.selectedMedia.map(function(id) {
        return AppState.allMedia.find(function(m) { return m.id === id; });
    }).filter(Boolean);
    
    AppState.currentMediaIndex = (AppState.currentMediaIndex + 1) % selectedMediaList.length;
    
    updateMediaListSelection();
    updatePreviews();
    
    try {
        AppState.broadcastChannel.postMessage({
            type: 'CHANGE_MEDIA',
            data: {
                mediaIndex: AppState.currentMediaIndex,
                media: selectedMediaList[AppState.currentMediaIndex]
            }
        });
    } catch (broadcastError) {
        console.error('Erro ao enviar mensagem de próxima mídia:', broadcastError);
    }
}

function previousMedia() {
    const selectedMediaList = AppState.selectedMedia.map(function(id) {
        return AppState.allMedia.find(function(m) { return m.id === id; });
    }).filter(Boolean);
    
    AppState.currentMediaIndex = AppState.currentMediaIndex === 0 ? 
        selectedMediaList.length - 1 : AppState.currentMediaIndex - 1;
    
    updateMediaListSelection();
    updatePreviews();
    
    try {
        AppState.broadcastChannel.postMessage({
            type: 'CHANGE_MEDIA',
            data: {
                mediaIndex: AppState.currentMediaIndex,
                media: selectedMediaList[AppState.currentMediaIndex]
            }
        });
    } catch (broadcastError) {
        console.error('Erro ao enviar mensagem de mídia anterior:', broadcastError);
    }
}

function jumpToMedia(index) {
    AppState.currentMediaIndex = index;
    
    updateMediaListSelection();
    updatePreviews();
    
    const selectedMediaList = AppState.selectedMedia.map(function(id) {
        return AppState.allMedia.find(function(m) { return m.id === id; });
    }).filter(Boolean);
    
    try {
        AppState.broadcastChannel.postMessage({
            type: 'CHANGE_MEDIA',
            data: {
                mediaIndex: AppState.currentMediaIndex,
                media: selectedMediaList[AppState.currentMediaIndex]
            }
        });
    } catch (broadcastError) {
        console.error('Erro ao enviar mensagem de pulo de mídia:', broadcastError);
    }
}

function playPauseMedia() {
    try {
        AppState.broadcastChannel.postMessage({
            type: 'TOGGLE_PLAY_PAUSE'
        });
    } catch (broadcastError) {
        console.error('Erro ao enviar mensagem de play/pause:', broadcastError);
    }
}

function updateMediaListSelection() {
    document.querySelectorAll('.media-list-item').forEach(function(item, index) {
        if (index === AppState.currentMediaIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function endProjection() {
    if (AppState.projectionWindow && !AppState.projectionWindow.closed) {
        AppState.projectionWindow.close();
    }
    
    AppState.isProjecting = false;
    AppState.projectionWindow = null;
    AppState.currentMediaIndex = 0;
    AppState.currentView = 'normal';
    
    document.getElementById('normalView').style.display = 'block';
    document.getElementById('controlPanel').classList.remove('active');
    
    updateProjectionButton();
    updateStatus('Sistema pronto para projecao');
    
    removeKeyboardControls();
}

function initializeBroadcastChannel() {
    try {
        AppState.broadcastChannel = new BroadcastChannel('soundhub-projection');
        
        // Adicionar tratamento de erro para o listener
        const messageHandler = (event) => {
            try {
                const { type, data } = event.data;
                if (type === 'PROJECTION_CLOSED') {
                    endProjection();
                } else if (type === 'MEDIA_CHANGED') {
                    AppState.currentMediaIndex = data.index;
                    updateMediaListSelection();
                    updatePreviews();
                }
            } catch (handlerError) {
                console.warn('Erro no handler do BroadcastChannel:', handlerError);
            }
        };
        
        AppState.broadcastChannel.onmessage = messageHandler;
        
        // Adicionar tratamento de erro para o canal
        AppState.broadcastChannel.addEventListener('error', (error) => {
            console.warn('Erro no BroadcastChannel:', error);
        });
        
        // Adicionar tratamento para quando o canal fecha
        AppState.broadcastChannel.addEventListener('messageerror', (error) => {
            console.warn('Erro de mensagem no BroadcastChannel:', error);
        });
        
    } catch (error) {
        console.error('Erro ao inicializar BroadcastChannel:', error);
        // Criar fallback se BroadcastChannel não estiver disponível
        AppState.broadcastChannel = {
            postMessage: (data) => {
                try {
                    console.log('Fallback: postMessage chamado com:', data);
                } catch (fallbackError) {
                    console.warn('Erro no fallback postMessage:', fallbackError);
                }
            },
            addEventListener: () => {},
            removeEventListener: () => {},
            close: () => {}
        };
    }
}

function setupLazyLoading() {
    console.log('=== DEBUG: Configurando lazy loading ===');
    
    // VERIFICAR SE INTERSECTIONOBSERVER ESTA DISPONIVEL
    if ('IntersectionObserver' in window) {
        console.log('IntersectionObserver disponivel, configurando...');
        
        try {
            const options = {
                root: null,
                rootMargin: '50px',
                threshold: 0.1
            };
            
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            console.log('Carregando imagem lazy:', img.dataset.src);
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            }, options);
            
            const images = document.querySelectorAll('img[data-src]');
            console.log('Imagens para lazy loading encontradas:', images.length);
            
            images.forEach(function(img) {
                observer.observe(img);
            });
            
        } catch (error) {
            console.error('Erro ao configurar IntersectionObserver:', error);
            // Fallback: carregar todas as imagens imediatamente
            loadAllImagesImmediately();
        }
        
    } else {
        console.log('IntersectionObserver nao disponivel, usando fallback');
        // FALLBACK: Carregar todas as imagens imediatamente
        loadAllImagesImmediately();
    }
    
    console.log('=== DEBUG: Lazy loading configurado ===');
}

function loadAllImagesImmediately() {
    console.log('Carregando todas as imagens imediatamente (fallback)');
    
    const images = document.querySelectorAll('img[data-src]');
    console.log('Imagens para carregar imediatamente:', images.length);
    
    images.forEach(function(img) {
        if (img.dataset.src) {
            console.log('Carregando imagem:', img.dataset.src);
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        }
    });
}

function setupKeyboardControls() {
    AppState.keyboardHandler = function(event) {
        switch (event.key) {
            case 'ArrowRight':
                event.preventDefault();
                nextMedia();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                previousMedia();
                break;
            case ' ':
                event.preventDefault();
                playPauseMedia();
                break;
            case 'Escape':
                event.preventDefault();
                endProjection();
                break;
        }
    };
    
    document.addEventListener('keydown', AppState.keyboardHandler);
}

function removeKeyboardControls() {
    if (AppState.keyboardHandler) {
        document.removeEventListener('keydown', AppState.keyboardHandler);
        AppState.keyboardHandler = null;
    }
}

function refreshMedia() {
    loadMedia();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
}

function updateStatus(message) {
    const statusEl = document.getElementById('projectionStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    
    statusEl.className = 'status';
    if (message.includes('pronto')) {
        statusEl.classList.add('ready');
    } else if (message.includes('ativa') || message.includes('Projetando')) {
        statusEl.classList.add('projecting');
    } else if (message.includes('Erro') || message.includes('Falha')) {
        statusEl.classList.add('error');
    }
}

function showError(message) {
    updateStatus('Erro: ' + message);
    console.error(message);
}

function updateUI() {
    updateProjectionButton();
}

function setupEventListeners() {
    window.addEventListener('beforeunload', function() {
        if (AppState.isProjecting) {
            endProjection();
        }
    });
    
    setInterval(function() {
        if (AppState.projectionWindow && AppState.projectionWindow.closed) {
            endProjection();
        }
    }, 1000);
}

// FUNCAO DE EMERGENCIA - TESTE DE RENDERIZACAO DIRETA
async function emergencyRender() {
    console.log('=== EMERGENCIA: Forcando renderizacao direta ===');
    try {
        const container = document.getElementById('mediaContainer');
        if (!container) {
            console.error('Container nao encontrado!');
            return;
        }
        
        // CARREGAR MÍDIAS DA API
        await loadMedia();
        
        // RENDERIZACAO DIRETA
        renderMediaByDate();
        
        console.log('=== EMERGENCIA: Renderizacao concluida ===');
    } catch (error) {
        console.error('ERRO NA RENDERIZACAO DE EMERGENCIA:', error);
    }
}

// TORNAR A FUNCAO DISPONIVEL NO CONSOLE PARA DEBUG
window.emergencyRender = emergencyRender;
