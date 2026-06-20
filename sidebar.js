// Sidebar unificado para todas as páginas
(function() {
    // Criar sidebar
    const sidebarHTML = `
        <div class="sidebar" id="sidebar">
            <div style="margin-bottom: 2rem;">
                <div style="font-size: 2rem; text-align: center; margin-bottom: 0.5rem;">🎵</div>
                <h1 style="text-align: center; color: #3b82f6; font-size: 1.5rem;">SoundHub</h1>
            </div>
            
            <nav>
                <a href="/" class="sidebar-item" id="homeLink">
                    <span style="margin-right: 0.75rem;">🏠</span>
                    Início
                </a>
                <a href="/receive" class="sidebar-item" id="receiveLink">
                    <span style="margin-right: 0.75rem;">📥</span>
                    Receber
                </a>
                <a href="/project" class="sidebar-item" id="projectLink">
                    <span style="margin-right: 0.75rem;">🎥</span>
                    Projetar
                </a>
                <a href="/accounts" class="sidebar-item" id="accountsLink">
                    <span style="margin-right: 0.75rem;">👤</span>
                    Contas
                </a>
                <a href="/schedule" class="sidebar-item" id="scheduleLink">
                    <span style="margin-right: 0.75rem;">📅</span>
                    Escalas
                </a>
                <a href="/profile" class="sidebar-item" id="profileLink" style="display: none;">
                    <span style="margin-right: 0.75rem;">👤</span>
                    Meu Perfil
                </a>
            </nav>
            
            <div style="margin-top: auto; padding-top: 2rem; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem;">
                    <div style="width: 40px; height: 40px; background: #dbeafe; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #3b82f6; font-weight: bold;">
                        <span id="userInitial">U</span>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: #374151;" id="userName">Usuário</div>
                        <div style="font-size: 0.875rem; color: #6b7280;" id="userRole">Cargo</div>
                    </div>
                </div>
                <button onclick="logout()" style="width: 100%; padding: 0.75rem; margin-top: 0.5rem; background: #ef4444; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
                    Sair
                </button>
            </div>
        </div>

        <!-- Overlay para mobile -->
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
    `;

    // Adicionar CSS para sidebar
    const style = document.createElement('style');
    style.textContent = `
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 280px;
            height: 100vh;
            background: white;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            padding: 1.5rem;
        }

        .sidebar.open {
            transform: translateX(0);
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            margin-bottom: 0.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            color: #374151;
            transition: all 0.2s ease;
        }

        .sidebar-item:hover {
            background: #f3f4f6;
        }

        .sidebar-item.active {
            background: #dbeafe;
            color: #3b82f6;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: none;
        }

        .overlay.show {
            display: block;
        }

        @media (min-width: 768px) {
            .sidebar {
                transform: translateX(0);
            }
            .overlay {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Injetar sidebar
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // Funções para controlar sidebar
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    };

    window.closeSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    };

    // Função de logout
    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
    };

    // Atualizar sidebar com base no usuário
    window.updateSidebar = function(user) {
        if (!user) return;

        // Atualizar informações do usuário
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userInitial = document.getElementById('userInitial');

        if (userName) userName.textContent = user.nome || 'Usuário';
        if (userRole) userRole.textContent = user.cargo || 'Cargo';
        if (userInitial) userInitial.textContent = (user.nome || 'U').charAt(0).toUpperCase();

        // Mostrar/ocultar links baseado no cargo
        const homeLink = document.getElementById('homeLink');
        const receiveLink = document.getElementById('receiveLink');
        const projectLink = document.getElementById('projectLink');
        const accountsLink = document.getElementById('accountsLink');
        const scheduleLink = document.getElementById('scheduleLink');
        const profileLink = document.getElementById('profileLink');

        // Para ADMIN e DIRETOR: mostrar todos os links principais
        if (user.cargo === 'ADMIN' || user.cargo === 'DIRETOR') {
            if (homeLink) homeLink.style.display = 'flex';
            if (receiveLink) receiveLink.style.display = 'flex';
            if (projectLink) projectLink.style.display = 'flex';
            if (accountsLink) accountsLink.style.display = 'flex';
            if (scheduleLink) scheduleLink.style.display = 'flex';
            if (profileLink) profileLink.style.display = 'flex';
        }
        // Para SONOPLASTA: mostrar links específicos
        else if (user.cargo === 'SONOPLASTA') {
            if (homeLink) homeLink.style.display = 'flex';
            if (receiveLink) receiveLink.style.display = 'flex';
            if (projectLink) projectLink.style.display = 'flex';
            if (accountsLink) accountsLink.style.display = 'none';
            if (scheduleLink) scheduleLink.style.display = 'flex';
            if (profileLink) profileLink.style.display = 'flex';
        }
        // Para outros usuários
        else {
            if (homeLink) homeLink.style.display = 'flex';
            if (receiveLink) receiveLink.style.display = 'none';
            if (projectLink) projectLink.style.display = 'none';
            if (accountsLink) accountsLink.style.display = 'none';
            if (scheduleLink) scheduleLink.style.display = 'flex';
            if (profileLink) profileLink.style.display = 'flex';
        }

        // Marcar link ativo baseado na URL atual
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.sidebar-item');
        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    };

    // Verificar usuário no localStorage e atualizar sidebar
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        window.updateSidebar(user);
    }

    // Adicionar botão de menu no header se não existir
    const header = document.querySelector('.header');
    if (header && !header.querySelector('.menu-toggle')) {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '☰';
        menuToggle.onclick = window.toggleSidebar;
        menuToggle.style.cssText = 'background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0.5rem;';
        header.insertBefore(menuToggle, header.firstChild);
    }
})();
