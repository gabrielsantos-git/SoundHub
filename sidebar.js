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
                    <span style="font-size:1.75rem;">🎵</span>
                    <h1 style="color:#3b82f6;font-size:1.25rem;font-weight:700;margin:0;">SoundHub</h1>
                </div>
                <button class="sidebar-close" id="sidebarClose" onclick="closeSidebar()" aria-label="Fechar menu">&#10005;</button>
            </div>

            <nav style="flex:1;overflow-y:auto;">
                <a href="/" class="sidebar-item" id="homeLink">
                    <span class="sidebar-icon">🏠</span>Início
                </a>
                <a href="/receive" class="sidebar-item" id="receiveLink">
                    <span class="sidebar-icon">📥</span>Receber
                </a>
                <a href="/project" class="sidebar-item" id="projectLink">
                    <span class="sidebar-icon">🎥</span>Projetar
                </a>
                <a href="/accounts" class="sidebar-item" id="accountsLink">
                    <span class="sidebar-icon">👥</span>Contas
                </a>
                <a href="/schedule" class="sidebar-item" id="scheduleLink">
                    <span class="sidebar-icon">📅</span>Escalas
                </a>
                <a href="/profile" class="sidebar-item" id="profileLink" style="display:none;">
                    <span class="sidebar-icon">👤</span>Meu Perfil
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

    const style = document.createElement('style');
    style.textContent = `
        /* ── Layout base ── */
        body {
            margin: 0;
            padding-left: 280px; /* espaço para a sidebar no desktop */
            box-sizing: border-box;
            transition: padding-left 0.3s ease;
        }

        /* ── Sidebar ── */
        .sidebar {
            position: fixed;
            top: 0; left: 0;
            width: 280px;
            height: 100vh;
            background: #ffffff;
            box-shadow: 2px 0 12px rgba(0,0,0,0.08);
            display: flex;
            flex-direction: column;
            z-index: 1000;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
        }

        /* Cabeçalho da sidebar */
        .sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.25rem 1rem;
            border-bottom: 1px solid #f1f5f9;
            flex-shrink: 0;
        }

        .sidebar-logo {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        /* Botão fechar — oculto no desktop */
        .sidebar-close {
            display: none;
            background: none;
            border: none;
            font-size: 1.1rem;
            color: #6b7280;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
            border-radius: 0.375rem;
            line-height: 1;
            transition: background 0.15s;
        }
        .sidebar-close:hover { background: #f3f4f6; color: #111; }

        /* Itens de navegação */
        .sidebar-icon {
            margin-right: 0.75rem;
            font-size: 1.1rem;
            width: 1.5rem;
            text-align: center;
            flex-shrink: 0;
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            padding: 0.7rem 1.25rem;
            margin: 0.15rem 0.75rem;
            border-radius: 0.5rem;
            text-decoration: none;
            color: #374151;
            font-size: 0.9375rem;
            font-weight: 500;
            transition: background 0.15s, color 0.15s;
        }
        .sidebar-item:hover { background: #f1f5f9; color: #1d4ed8; }
        .sidebar-item.active { background: #dbeafe; color: #1d4ed8; }

        /* Rodapé com usuário */
        .sidebar-footer {
            padding: 1rem 1.25rem;
            border-top: 1px solid #f1f5f9;
            flex-shrink: 0;
        }

        .sidebar-user {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .sidebar-avatar {
            width: 38px; height: 38px;
            background: #dbeafe;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: #1d4ed8;
            font-weight: 700;
            font-size: 1rem;
            flex-shrink: 0;
        }

        .sidebar-user-info { flex: 1; min-width: 0; }
        .sidebar-user-info #userName { font-weight: 600; color: #111827; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-user-role { font-size: 0.75rem; color: #6b7280; margin-top: 0.1rem; }

        .sidebar-logout {
            width: 100%;
            padding: 0.625rem;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.875rem;
            transition: background 0.15s;
        }
        .sidebar-logout:hover { background: #dc2626; }

        /* ── Hamburger ── */
        .sidebar-hamburger {
            display: none; /* oculto no desktop */
            position: fixed;
            top: 0.875rem;
            left: 0.875rem;
            z-index: 1001;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 0.5rem;
            width: 2.5rem; height: 2.5rem;
            font-size: 1.2rem;
            cursor: pointer;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(59,130,246,0.4);
            transition: background 0.15s;
        }
        .sidebar-hamburger:hover { background: #2563eb; }

        /* ── Overlay ── */
        .sidebar-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 999;
            backdrop-filter: blur(2px);
        }
        .sidebar-overlay.show { display: block; }

        /* ── Mobile (< 768px) ── */
        @media (max-width: 767px) {
            body {
                padding-left: 0 !important;
                padding-top: 3.5rem; /* espaço para o hamburger */
            }

            .sidebar {
                transform: translateX(-100%);
            }

            .sidebar.open {
                transform: translateX(0);
                box-shadow: 4px 0 24px rgba(0,0,0,0.18);
            }

            .sidebar-hamburger {
                display: flex;
            }

            .sidebar-close {
                display: flex;
                align-items: center;
            }
        }
    `;
    document.head.appendChild(style);

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
