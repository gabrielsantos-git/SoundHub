// Sidebar unificado para todas as páginas
(function() {
    const GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.901-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52z"/></svg>`;

    const SHIELD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/><path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0"/></svg>`;

    const CHEVRON_SVG = `<svg class="dropdown-chevron" id="settingsChevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/></svg>`;

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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/>
                    </svg>Início
                </a>
                <a href="/receive" class="sidebar-item" id="receiveLink">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 .5A.5.5 0 0 1 .5 0h3a.5.5 0 0 1 0 1H1v2.5a.5.5 0 0 1-1 0zm12 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V1h-2.5a.5.5 0 0 1-.5-.5M.5 12a.5.5 0 0 1 .5.5V15h2.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H15v-2.5a.5.5 0 0 1 .5-.5M4 4h1v1H4z"/>
                    <path d="M7 2H2v5h5zM3 3h3v3H3zm2 8H4v1h1z"/>
                    <path d="M7 9H2v5h5zm-4 1h3v3H3zm8-6h1v1h-1z"/>
                    <path d="M9 2h5v5H9zm1 1v3h3V3zM8 8v2h1v1H8v1h2v-2h1v2h1v-1h2v-1h-3V8zm2 2H9V9h1zm4 2h-1v1h-2v1h3zm-4 2v-1H8v1z"/>
                    <path d="M12 9h2V8h-2z"/>
                    </svg>Receber
                </a>
                <a href="/project" class="sidebar-item" id="projectLink">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="m7.646 9.354-3.792 3.792a.5.5 0 0 0 .353.854h7.586a.5.5 0 0 0 .354-.854L8.354 9.354a.5.5 0 0 0-.708 0"/>
                    <path d="M11.414 11H14.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h3.086l-1 1H1.5A1.5 1.5 0 0 1 0 10.5v-7A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v7a1.5 1.5 0 0 1-1.5 1.5h-2.086z"/>
                    </svg>Projetar
                </a>
                <a href="/schedule" class="sidebar-item" id="scheduleLink">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/>
                    <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/>
                    <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/>
                    </svg>Escalas
                </a>

                <!-- Dropdown de Configurações -->
                <div class="sidebar-dropdown" id="settingsDropdown">
                    <button class="sidebar-item sidebar-dropdown-btn" id="settingsBtn" onclick="toggleSettingsDropdown()" aria-expanded="false">
                        ${GEAR_SVG}
                        <span style="flex:1;text-align:left;">Configurações</span>
                        ${CHEVRON_SVG}
                    </button>
                    <div class="sidebar-dropdown-menu" id="settingsMenu">
                        <a href="/accounts" class="sidebar-item sidebar-subitem" id="accountsLink">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m.256 7a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1zm3.63-4.54c.18-.613 1.048-.613 1.229 0l.043.148a.64.64 0 0 0 .921.382l.136-.074c.561-.306 1.175.308.87.869l-.075.136a.64.64 0 0 0 .382.92l.149.045c.612.18.612 1.048 0 1.229l-.15.043a.64.64 0 0 0-.38.921l.074.136c.305.561-.309 1.175-.87.87l-.136-.075a.64.64 0 0 0-.92.382l-.045.149c-.18.612-1.048.612-1.229 0l-.043-.15a.64.64 0 0 0-.921-.38l-.136.074c-.561.305-1.175-.309-.87-.87l.075-.136a.64.64 0 0 0-.382-.92l-.148-.045c-.613-.18-.613-1.048 0-1.229l.148-.043a.64.64 0 0 0 .382-.921l-.074-.136c-.306-.561.308-1.175.869-.87l.136.075a.64.64 0 0 0 .92-.382zM14 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/></svg>
                            Contas
                        </a>
                        <a href="/profile" class="sidebar-item sidebar-subitem" id="profileLink">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/></svg>
                            Minha Conta
                        </a>
                        <a href="/privacidade" class="sidebar-item sidebar-subitem" target="_blank" rel="noopener">
                            ${SHIELD_SVG}
                            Privacidade
                        </a>
                    </div>
                </div>
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

        <!-- Bottom navbar (mobile only) -->
        <nav class="bottom-nav" id="bottomNav">
            <a href="/" class="bottom-nav-item" id="bn-home">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/>
                </svg>
                <span>Início</span>
            </a>
            <a href="/receive" class="bottom-nav-item" id="bn-receive">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 .5A.5.5 0 0 1 .5 0h3a.5.5 0 0 1 0 1H1v2.5a.5.5 0 0 1-1 0zm12 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V1h-2.5a.5.5 0 0 1-.5-.5M.5 12a.5.5 0 0 1 .5.5V15h2.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H15v-2.5a.5.5 0 0 1 .5-.5M4 4h1v1H4z"/>
                    <path d="M7 2H2v5h5zM3 3h3v3H3zm2 8H4v1h1z"/>
                    <path d="M7 9H2v5h5zm-4 1h3v3H3zm8-6h1v1h-1z"/>
                    <path d="M9 2h5v5H9zm1 1v3h3V3zM8 8v2h1v1H8v1h2v-2h1v2h1v-1h2v-1h-3V8zm2 2H9V9h1zm4 2h-1v1h-2v1h3zm-4 2v-1H8v1z"/>
                    <path d="M12 9h2V8h-2z"/>
                </svg>
                <span>Receber</span>
            </a>
            <a href="/project" class="bottom-nav-item" id="bn-project">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                    <path d="m7.646 9.354-3.792 3.792a.5.5 0 0 0 .353.854h7.586a.5.5 0 0 0 .354-.854L8.354 9.354a.5.5 0 0 0-.708 0"/>
                    <path d="M11.414 11H14.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h3.086l-1 1H1.5A1.5 1.5 0 0 1 0 10.5v-7A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v7a1.5 1.5 0 0 1-1.5 1.5h-2.086z"/>
                </svg>
                <span>Projetar</span>
            </a>
            <a href="/schedule" class="bottom-nav-item" id="bn-schedule">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/>
                    <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/>
                    <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/>
                </svg>
                <span>Escalas</span>
            </a>
            <button class="bottom-nav-item" id="bn-settings" onclick="openSettingsModal()">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.901-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52z"/>
                </svg>
                <span>Config.</span>
            </button>
            <button class="bottom-nav-item bottom-nav-logout" onclick="logout()">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                    <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
                </svg>
                <span>Sair</span>
            </button>
        </nav>

        <!-- Modal de configurações (mobile) -->
        <div class="settings-modal-overlay" id="settingsModalOverlay" onclick="closeSettingsModal()"></div>
        <div class="settings-modal" id="settingsModal" role="dialog" aria-modal="true" aria-label="Configurações">
            <div class="settings-modal-header">
                <span>Configurações</span>
                <button class="settings-modal-close" onclick="closeSettingsModal()" aria-label="Fechar">&#10005;</button>
            </div>
            <a href="/accounts" class="settings-modal-item" id="sm-accounts">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m.256 7a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1zm3.63-4.54c.18-.613 1.048-.613 1.229 0l.043.148a.64.64 0 0 0 .921.382l.136-.074c.561-.306 1.175.308.87.869l-.075.136a.64.64 0 0 0 .382.92l.149.045c.612.18.612 1.048 0 1.229l-.15.043a.64.64 0 0 0-.38.921l.074.136c.305.561-.309 1.175-.87.87l-.136-.075a.64.64 0 0 0-.92.382l-.045.149c-.18.612-1.048.612-1.229 0l-.043-.15a.64.64 0 0 0-.921-.38l-.136.074c-.561.305-1.175-.309-.87-.87l.075-.136a.64.64 0 0 0-.382-.92l-.148-.045c-.613-.18-.613-1.048 0-1.229l.148-.043a.64.64 0 0 0 .382-.921l-.074-.136c-.306-.561.308-1.175.869-.87l.136.075a.64.64 0 0 0 .92-.382zM14 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/></svg>
                Contas
            </a>
            <a href="/profile" class="settings-modal-item" id="sm-profile">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/></svg>
                Minha Conta
            </a>
            <a href="/privacidade" class="settings-modal-item" target="_blank" rel="noopener">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/><path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0"/></svg>
                Privacidade
            </a>
        </div>
    `;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/sidebar.css';
    document.head.appendChild(link);

    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // ── Sidebar desktop ──
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isOpen = sidebar.classList.toggle('open');
        overlay.classList.toggle('show', isOpen);
        document.body.classList.toggle('sidebar-open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    window.closeSidebar = function() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
        document.body.classList.remove('sidebar-open');
        document.body.style.overflow = '';
    };

    // ── Dropdown de Configurações (desktop) ──
    window.toggleSettingsDropdown = function() {
        const menu    = document.getElementById('settingsMenu');
        const chevron = document.getElementById('settingsChevron');
        const btn     = document.getElementById('settingsBtn');
        const isOpen  = menu.classList.toggle('open');
        chevron.classList.toggle('open', isOpen);
        btn.setAttribute('aria-expanded', isOpen);
    };

    // ── Modal de Configurações (mobile) ──
    window.openSettingsModal = function() {
        document.getElementById('settingsModal').classList.add('show');
        document.getElementById('settingsModalOverlay').classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    window.closeSettingsModal = function() {
        document.getElementById('settingsModal').classList.remove('show');
        document.getElementById('settingsModalOverlay').classList.remove('show');
        document.body.style.overflow = '';
    };

    // ESC fecha tudo
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.closeSidebar();
            window.closeSettingsModal();
        }
    });

    // Fechar sidebar ao navegar (mobile)
    document.querySelectorAll('.sidebar-item:not(.sidebar-dropdown-btn)').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 768) window.closeSidebar();
        });
    });

    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
    };

    // ── Atualizar visibilidade e estado ──
    window.updateSidebar = function(user) {
        if (!user) return;

        const userName    = document.getElementById('userName');
        const userRole    = document.getElementById('userRole');
        const userInitial = document.getElementById('userInitial');

        if (userName)    userName.textContent    = user.nome  || 'Usuário';
        if (userRole)    userRole.textContent    = user.cargo || 'Cargo';
        if (userInitial) userInitial.textContent = (user.nome || 'U').charAt(0).toUpperCase();

        const show = el => { if (el) el.style.display = 'flex'; };
        const hide = el => { if (el) el.style.display = 'none'; };

        // Links fixos da sidebar
        show(document.getElementById('homeLink'));
        show(document.getElementById('scheduleLink'));

        const receiveLink  = document.getElementById('receiveLink');
        const projectLink  = document.getElementById('projectLink');

        // Sub-itens do dropdown desktop
        const accountsLink = document.getElementById('accountsLink');
        const profileLink  = document.getElementById('profileLink');

        // Itens do modal mobile
        const smAccounts = document.getElementById('sm-accounts');
        const smProfile  = document.getElementById('sm-profile');

        // Bottom nav
        const bnReceive  = document.getElementById('bn-receive');
        const bnProject  = document.getElementById('bn-project');

        if (user.cargo === 'ADMIN' || user.cargo === 'DIRETOR') {
            show(receiveLink);
            show(projectLink);
            show(accountsLink);
            hide(profileLink);
            show(bnReceive);
            show(bnProject);
            show(smAccounts);
            hide(smProfile);
        } else if (user.cargo === 'SONOPLASTA') {
            show(receiveLink);
            show(projectLink);
            hide(accountsLink);
            show(profileLink);
            show(bnReceive);
            show(bnProject);
            hide(smAccounts);
            show(smProfile);
        } else {
            hide(receiveLink);
            hide(projectLink);
            hide(accountsLink);
            show(profileLink);
            hide(bnReceive);
            hide(bnProject);
            hide(smAccounts);
            show(smProfile);
        }

        // Marcar link ativo na sidebar e auto-abrir dropdown se na página de settings
        const currentPath = window.location.pathname;
        const settingsPages = ['/accounts', '/profile'];
        const isSettingsPage = settingsPages.includes(currentPath);

        document.querySelectorAll('.sidebar-item').forEach(item => {
            const href = item.getAttribute('href');
            item.classList.toggle('active', !!href && href === currentPath);
        });

        // Botão de configurações ativo se estiver em /accounts ou /profile
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.classList.toggle('active', isSettingsPage);

        // Auto-abrir dropdown se estiver na página de configurações
        if (isSettingsPage) {
            const menu    = document.getElementById('settingsMenu');
            const chevron = document.getElementById('settingsChevron');
            if (menu)    menu.classList.add('open');
            if (chevron) chevron.classList.add('open');
            if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'true');
        }

        // Marcar item ativo na bottom nav
        document.querySelectorAll('.bottom-nav-item[href]').forEach(item => {
            item.classList.toggle('active', item.getAttribute('href') === currentPath);
        });

        // Gear ativo na bottom nav se em settings
        const bnSettings = document.getElementById('bn-settings');
        if (bnSettings) bnSettings.classList.toggle('active', isSettingsPage);
    };

    // Aplicar dados do localStorage imediatamente (sem esperar auth)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try { window.updateSidebar(JSON.parse(storedUser)); } catch {}
    }
})();
