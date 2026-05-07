// Navegação consistente para todas as páginas do SoundHub
// Este arquivo garante que a lógica do menu seja a mesma em todo o sistema

function updateNavigationUI(currentUser) {
    if (!currentUser) return;
    
    // Elementos de navegação
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const accountsLink = document.getElementById('accountsLink');
    const receiveLink = document.getElementById('receiveLink');
    const projectLink = document.getElementById('projectLink');
    const profileLink = document.getElementById('profileLink');
    const scheduleLink = document.getElementById('scheduleLink');
    
    // Atualizar informações do usuário
    if (userNameEl) {
        userNameEl.textContent = currentUser.nome;
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = currentUser.cargo;
    }
    
    // Lógica de menu consistente
    // Esconder todos os menus restritos primeiro
    if (receiveLink) receiveLink.style.display = 'none';
    if (projectLink) projectLink.style.display = 'none';
    if (accountsLink) accountsLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
    if (scheduleLink) scheduleLink.style.display = 'none';
    
    // Mostrar menus baseados no cargo
    if (currentUser.cargo === 'SONOPLASTA' || currentUser.cargo === 'DIRETOR' || currentUser.cargo === 'ADMIN') {
        if (receiveLink) receiveLink.style.display = 'block';
        if (projectLink) projectLink.style.display = 'block';
    }
    
    if (currentUser.cargo === 'DIRETOR' || currentUser.cargo === 'ADMIN' || currentUser.cargo === 'SONOPLASTA') {
        if (accountsLink) accountsLink.style.display = 'block';
    }
    
    // Mostrar link de perfil para todos os usuários logados
    if (profileLink) profileLink.style.display = 'block';
    
    // Mostrar link de escalas para todos os usuários logados
    if (scheduleLink) {
        scheduleLink.style.display = 'block';
        console.log('✅ Link Escalas mostrado para usuário:', currentUser.nome, 'Cargo:', currentUser.cargo);
    } else {
        console.log('❌ Elemento scheduleLink não encontrado na página');
    }
    
    console.log('🔍 Elementos encontrados:', {
        userNameEl: !!userNameEl,
        userRoleEl: !!userRoleEl,
        accountsLink: !!accountsLink,
        receiveLink: !!receiveLink,
        projectLink: !!projectLink,
        profileLink: !!profileLink,
        scheduleLink: !!scheduleLink
    });
    
    console.log('Navegação atualizada para usuário:', currentUser.nome, 'Cargo:', currentUser.cargo);
}

// Função de logout global
function globalLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
}

// Inicialização automática para páginas que usam este script
document.addEventListener('DOMContentLoaded', function() {
    try {
        // ESPERAR UM POUCO PARA NÃO CONFLITAR COM OUTROS SCRIPTS
        setTimeout(function() {
        // Verificar se já existe usuário no AppState (do project.js)
        if (window.AppState && window.AppState.currentUser) {
            console.log('Usando usuário do AppState:', window.AppState.currentUser);
            updateNavigationUI(window.AppState.currentUser);
            return;
        }
        
        // Verificar se há usuário no localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        
        if (currentUser) {
            updateNavigationUI(currentUser);
        } else {
            // Se não há usuário, verificar token
            const token = localStorage.getItem('token');
            if (token) {
                // Tentar obter dados do usuário via API
                fetch('/api/auth/me', {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.user) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                        updateNavigationUI(data.user);
                    }
                })
                .catch(error => {
                    console.log('Não foi possível obter dados do usuário, usando fallback');
                    // Usar usuário de teste para desenvolvimento
                    const testUser = {
                        nome: 'Usuario Teste',
                        cargo: 'DIRETOR'
                    };
                    localStorage.setItem('user', JSON.stringify(testUser));
                    updateNavigationUI(testUser);
                });
            } else {
                // Usuário de teste para desenvolvimento
                const testUser = {
                    nome: 'Usuario Teste',
                    cargo: 'DIRETOR'
                };
                localStorage.setItem('user', JSON.stringify(testUser));
                updateNavigationUI(testUser);
            }
        }
        }, 500); // Esperar 500ms para não conflitar
    } catch (error) {
        console.error('Erro no DOMContentLoaded do navigation.js:', error);
    }
});

// Tornar funções disponíveis globalmente
window.updateNavigationUI = updateNavigationUI;
window.globalLogout = globalLogout;
