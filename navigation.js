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
        scheduleLink.style.display = (isAdmin || isDiretor || isSonoplasta) ? 'block' : 'none';
    }

    if (accountsLink) {
        // Contas visível para ADMIN e DIRETOR; oculta para SONOPLASTA
        accountsLink.style.display = (isAdmin || isDiretor) ? 'block' : 'none';
    }

    if (profileLink) {
        // Meu Perfil visível só para SONOPLASTA
        profileLink.style.display = isSonoplasta ? 'block' : 'none';
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

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.currentUser = null;
    window.currentToken = null;
    window.location.href = '/auth.html';
}

// Exportar funções para uso em outras páginas
window.updateNavigationUI = updateNavigationUI;
window.logout = logout;
