// Sidebar unificado para todas as páginas
(function() {
    const sidebarHTML = `
        <!-- Botão hamburger fixo — só aparece no mobile -->
        <button class="sidebar-hamburger" id="sidebarHamburger" onclick="toggleSidebar()" aria-label="Abrir menu">
            <span class="hamburger-icon">&#9776;</span>
        </button>

        <div class="sidebar" id="sidebar">
            <!-- Cabeçalho com logo e botão fechar (mobile) -->
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <img src="/assets/SounHub-02.svg" alt="SoundHub Logo" style="width:200px;height:100px;margin-right:10px;margin-top:-40px;">
                </div>
                <button class="sidebar-close" id="sidebarClose" onclick="closeSidebar()" aria-label="Fechar menu">&#10005;</button>
            </div>

            <nav style="flex:1;overflow-y:auto;">
                <a href="/" class="sidebar-item" id="homeLink">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-house" viewBox="0 0 16 16">
                    <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/>
                    </svg>Início
                </a>
                <a href="/receive" class="sidebar-item" id="receiveLink">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-qr-code-scan" viewBox="0 0 16 16">
                    <path d="M0 .5A.5.5 0 0 1 .5 0h3a.5.5 0 0 1 0 1H1v2.5a.5.5 0 0 1-1 0zm12 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V1h-2.5a.5.5 0 0 1-.5-.5M.5 12a.5.5 0 0 1 .5.5V15h2.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H15v-2.5a.5.5 0 0 1 .5-.5M4 4h1v1H4z"/>
                    <path d="M7 2H2v5h5zM3 3h3v3H3zm2 8H4v1h1z"/>
                    <path d="M7 9H2v5h5zm-4 1h3v3H3zm8-6h1v1h-1z"/>
                    <path d="M9 2h5v5H9zm1 1v3h3V3zM8 8v2h1v1H8v1h2v-2h1v2h1v-1h2v-1h-3V8zm2 2H9V9h1zm4 2h-1v1h-2v1h3zm-4 2v-1H8v1z"/>
                    <path d="M12 9h2V8h-2z"/>
                    </svg>Receber
                </a>
                <a href="/project" class="sidebar-item" id="projectLink">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cast" viewBox="0 0 16 16">
                    <path d="m7.646 9.354-3.792 3.792a.5.5 0 0 0 .353.854h7.586a.5.5 0 0 0 .354-.854L8.354 9.354a.5.5 0 0 0-.708 0"/>
                    <path d="M11.414 11H14.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h3.086l-1 1H1.5A1.5 1.5 0 0 1 0 10.5v-7A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v7a1.5 1.5 0 0 1-1.5 1.5h-2.086z"/>
                    </svg>Projetar
                </a>
                <a href="/accounts" class="sidebar-item" id="accountsLink">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-gear" viewBox="0 0 16 16">
                    <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m.256 7a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1zm3.63-4.54c.18-.613 1.048-.613 1.229 0l.043.148a.64.64 0 0 0 .921.382l.136-.074c.561-.306 1.175.308.87.869l-.075.136a.64.64 0 0 0 .382.92l.149.045c.612.18.612 1.048 0 1.229l-.15.043a.64.64 0 0 0-.38.921l.074.136c.305.561-.309 1.175-.87.87l-.136-.075a.64.64 0 0 0-.92.382l-.045.149c-.18.612-1.048.612-1.229 0l-.043-.15a.64.64 0 0 0-.921-.38l-.136.074c-.561.305-1.175-.309-.87-.87l.075-.136a.64.64 0 0 0-.382-.92l-.148-.045c-.613-.18-.613-1.048 0-1.229l.148-.043a.64.64 0 0 0 .382-.921l-.074-.136c-.306-.561.308-1.175.869-.87l.136.075a.64.64 0 0 0 .92-.382zM14 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/>
                    </svg>Contas
                </a>
                <a href="/schedule" class="sidebar-item" id="scheduleLink">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-journal-text" viewBox="0 0 16 16">
                    <path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/>
                    <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/>
                    <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/>
                    </svg>Escalas
                </a>
                <a href="/profile" class="sidebar-item" id="profileLink" style="display:none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person" viewBox="0 0 16 16">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                    </svg>Meu Perfil
                </a>
            </nav>

            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-avatar">
                        <span id="userInitial">U</span>
                    </div>
                    <div class="sidebar-user-info">
                        <div id="userName">Usuário</div>
                        <div id="userRole" class="sidebar-user-role">Cargo</div>
                    </div>
                </div>
                <button onclick="logout()" class="sidebar-logout">Sair</button>
            </div>
        </div>

        <!-- Overlay escuro ao abrir no mobile -->
        <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
    `;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/sidebar.css';
    document.head.appendChild(link);

    // Injetar HTML
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // ── Controles ──
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isOpen = sidebar.classList.toggle('open');
        overlay.classList.toggle('show', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    window.closeSidebar = function() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
        document.body.style.overflow = '';
    };

    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') window.closeSidebar();
    });

    // Fechar ao navegar (mobile)
    document.querySelectorAll('.sidebar-item').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 768) window.closeSidebar();
        });
    });

    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
    };

    // ── Atualizar visibilidade dos links ──
    window.updateSidebar = function(user) {
        if (!user) return;

        const userName    = document.getElementById('userName');
        const userRole    = document.getElementById('userRole');
        const userInitial = document.getElementById('userInitial');

        if (userName)    userName.textContent    = user.nome  || 'Usuário';
        if (userRole)    userRole.textContent    = user.cargo || 'Cargo';
        if (userInitial) userInitial.textContent = (user.nome || 'U').charAt(0).toUpperCase();

        const homeLink     = document.getElementById('homeLink');
        const receiveLink  = document.getElementById('receiveLink');
        const projectLink  = document.getElementById('projectLink');
        const accountsLink = document.getElementById('accountsLink');
        const scheduleLink = document.getElementById('scheduleLink');
        const profileLink  = document.getElementById('profileLink');

        const show = el => { if (el) el.style.display = 'flex'; };
        const hide = el => { if (el) el.style.display = 'none'; };

        show(homeLink);
        show(receiveLink);
        show(projectLink);
        show(scheduleLink);

        if (user.cargo === 'ADMIN' || user.cargo === 'DIRETOR') {
            show(accountsLink);
            hide(profileLink);
        } else if (user.cargo === 'SONOPLASTA') {
            hide(accountsLink);
            show(profileLink);
        } else {
            hide(accountsLink);
            hide(receiveLink);
            hide(projectLink);
            show(profileLink);
        }

        // Marcar link ativo
        const currentPath = window.location.pathname;
        document.querySelectorAll('.sidebar-item').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === currentPath);
        });
    };

    // Aplicar dados do localStorage imediatamente (sem esperar auth)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try { window.updateSidebar(JSON.parse(storedUser)); } catch {}
    }
})();
