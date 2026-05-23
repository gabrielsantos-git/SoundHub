// Variáveis globais
try {
  if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
    window.currentToken = null;
  }
} catch (e) {
  window.currentUser = null;
  window.currentToken = null;
}

// Funções de navegação
function updateNavigationUI(user) {
    if (!user) {
        console.error('Usuário não fornecido para updateNavigationUI');
        return;
    }

    window.currentUser = user;
    window.currentToken = user.token;

    // Elementos da navegação
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const scheduleLink = document.getElementById('scheduleLink');
    const accountsLink = document.getElementById('accountsLink');
    const receiveLink = document.getElementById('receiveLink');
    const projectLink = document.getElementById('projectLink');
    const profileLink = document.getElementById('profileLink');

    if (userNameEl) userNameEl.textContent = user.nome || 'Usuário';
    if (userRoleEl) userRoleEl.textContent = user.cargo || 'Sem Cargo';

    // Mostrar links baseado no cargo
    const isAdmin = user.cargo === 'ADMIN';
    const isDiretor = user.cargo === 'DIRETOR';
    const isSonoplasta = user.cargo === 'SONOPLASTA';

    if (scheduleLink) {
        scheduleLink.style.display = (isAdmin || isDiretor) ? 'block' : 'none';
        console.log('✅ Link Escalas mostrado para usuário:', user.nome, 'Cargo:', user.cargo);
    }
    
    if (accountsLink) {
        accountsLink.style.display = isAdmin ? 'block' : 'none';
        console.log('✅ Link Contas mostrado para usuário:', user.nome, 'Cargo:', user.cargo);
    }
    
    if (receiveLink) {
        receiveLink.style.display = (isAdmin || isDiretor || isSonoplasta) ? 'block' : 'none';
        console.log('✅ Link Receber mostrado para usuário:', user.nome, 'Cargo:', user.cargo);
    }
    
    if (projectLink) {
        projectLink.style.display = (isAdmin || isDiretor || isSonoplasta) ? 'block' : 'none';
        console.log('✅ Link Projetos mostrado para usuário:', user.nome, 'Cargo:', user.cargo);
    }
    
    if (profileLink) {
        profileLink.style.display = user ? 'block' : 'none';
        console.log('✅ Link Perfil mostrado para usuário:', user.nome, 'Cargo:', user.cargo);
    }

    // Log para debug
    const elements = {
        userNameEl: !!userNameEl,
        userRoleEl: !!userRoleEl,
        scheduleLink: !!scheduleLink,
        accountsLink: !!accountsLink,
        receiveLink: !!receiveLink,
        projectLink: !!projectLink,
        profileLink: !!profileLink
    };
    
    console.log('🔍 Elementos encontrados:', elements);
    console.log('Navegação atualizada para usuário:', user.nome, 'Cargo:', user.cargo);
}

// Verificar autenticação ao carregar a página
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        try {
            const userData = JSON.parse(user);
            updateNavigationUI(userData);
        } catch (error) {
            console.error('Erro ao parsear dados do usuário:', error);
            logout();
        }
    } else {
        // Redirecionar para login se não estiver autenticado
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/auth.html') && !currentPath.includes('/auth')) {
            window.location.href = '/auth.html';
        }
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.currentUser = null;
    window.currentToken = null;
    window.location.href = '/auth.html';
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Navigation.js - Página carregada');
    checkAuth();
});

// Exportar funções para uso em outras páginas
window.updateNavigationUI = updateNavigationUI;
window.checkAuth = checkAuth;
window.logout = logout;
