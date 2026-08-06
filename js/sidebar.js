// ════════════════════════════════════════════════════
//  js/sidebar.js
//  Menú lateral compartido entre todas las páginas
// ════════════════════════════════════════════════════
(function() {

    var path = window.location.pathname;

    var paginaActiva =
        (path === '/' || path.includes('index') || path.includes('dashboard'))
            ? 'dashboard'
        : path.includes('contratacion-directa')
            ? 'contratacion'
        : path.includes('directa-3')
            ? 'directa3p'
        : path.includes('convocatoria')
            ? 'convocatoria'
        : path.includes('subasta')
            ? 'subasta'
        : path.includes('supervision')
            ? 'supervision'
        : path.includes('historial')
            ? 'historial'
        : path.includes('proceso')
            ? null   // detalle de un proceso puntual: ningún ítem del menú aplica
        : 'dashboard';

    var items = [
        { id: 'dashboard',    url: '/dashboard',              label: 'Dashboard'                          },
        { id: 'contratacion', url: '/contratacion-directa',   label: 'Contratación Directa 1 Propuesta'   },
        { id: 'directa3p',   url: '/directa-3-invitaciones', label: 'Contratación Directa (3 Invitaciones)' },
        { id: 'convocatoria', url: '/convocatoria',           label: 'Convocatoria Pública'               },
        { id: 'subasta',      url: '/subasta',                label: 'Subasta Inversa'                    },
        { id: 'supervision',  url: '/supervision',            label: 'Supervisión'                        },
        { id: 'historial',    url: '/historial',              label: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px;"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Historial de Procesos' }
    ];

    var itemsHTML = items.map(function(item) {
        var esActivo = item.id === paginaActiva;
        var estiloActivo = esActivo
            ? 'background:white;color:#046A38;transform:translateX(4px);'
            : '';
        return '<a href="' + item.url + '" class="menu-item" ' +
               'style="display:block;text-decoration:none;' + estiloActivo + '">' +
               item.label +
               '</a>';
    }).join('');

    var sidebarHTML =
        // Logo
        '<div class="sidebar-logo">' +
            '<img src="/assets/img/Agora_HSLV.png" alt="ÁGORA HSLV"  ' +
                'style="width:90px;margin-bottom:10px;" ' +
                'onerror="this.style.display=\'none\'">' +
            '<h2>HOSPITAL</h2>' +
            '<p>Susana López de Valencia E.S.E.<br>Sistema Integral de Contratación</p>' +
        '</div>' +

        // Bloque de texto institucional (recuperado del original)
        '<h2>Contratación HSLV</h2>' +
        '<small>' +
            'Manual de Contratación HSLV E.S.E.<br>' +
            'Acuerdo 015 de 2024<br>' +
            'Resolución 0456 de 2024<br>' +
            'Integración SECOP II' +
        '</small>' +

        // Ítems del menú
        itemsHTML +

        // Botón cerrar sesión
        '<div class="sidebar-logout-wrap">' +
            '<button class="btn-logout" onclick="cerrarSesion()">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:8px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
                'Cerrar Sesión' +
            '</button>' +
        '</div>';

    var sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.innerHTML = sidebarHTML;

})();