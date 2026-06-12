const API_URL = '/api';

// Interceptor global para registrar en consola todas las llamadas a la API
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const isApiCall = typeof args[0] === 'string' && args[0].includes('/api');

    if (isApiCall) {
        const method = (args[1] && args[1].method) ? args[1].method : 'GET';
        console.groupCollapsed(`🌐 [API Request] ${method} ${args[0]}`);
        if (args[1] && args[1].body) {
            try { console.log('Payload:', JSON.parse(args[1].body)); }
            catch (e) { console.log('Payload:', args[1].body); }
        } else {
            console.log('Payload: none');
        }
        console.groupEnd();
    }

    try {
        const response = await originalFetch.apply(this, args);

        if (isApiCall) {
            const clonedResponse = response.clone();
            clonedResponse.text().then(text => {
                console.groupCollapsed(`✅ [API Response] ${response.status} ${args[0]}`);
                try {
                    console.log('Response Data:', JSON.parse(text));
                } catch (e) {
                    console.log('Response Text:', text);
                }
                console.groupEnd();
            }).catch(e => console.error('Error reading response clone', e));
        }

        return response;
    } catch (error) {
        if (isApiCall) {
            console.error(`❌ [API Error] ${args[0]}`, error);
        }
        throw error;
    }
};

let usuarioActivo = null;
let configuracionClinicas = { clinicaActiva: null, clinicas: [] };
let cajasDelUsuario = [];
let plantillasDelUsuario = [];
let nuevaPlantillaImplementos = [];
let plantillaEnEdicionId = null;
let inventarioCompleto = {};
let solicitudes = [];
let intervaloActualizacion;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupMobileMenu();
    verificarSesion();
    setupModals();
    setupEventListeners();
    setupDragAndDrop();
});

function initTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) document.body.classList.add('dark-mode');
    
    const btnToggle = document.getElementById('btnToggleTheme');
    if (btnToggle) {
        btnToggle.textContent = isDark ? '☀️' : '🌙';
        btnToggle.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const darkNow = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', darkNow ? 'dark' : 'light');
            btnToggle.textContent = darkNow ? '☀️' : '🌙';
        };
    }
}

function setupMobileMenu() {
    const btnMobileMenu = document.getElementById('btnMobileMenu');
    const sidebar = document.querySelector('.sidebar');
    
    if (btnMobileMenu && sidebar) {
        btnMobileMenu.onclick = () => {
            sidebar.classList.toggle('mobile-open');
        };

        // Close sidebar when clicking a link (mobile only)
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                }
            });
        });
    }
}

// ==========================================
// AUTENTICACIÓN Y SESIÓN
// ==========================================
function mostrarLogin() {
    document.getElementById('formLoginBlock').style.display = 'block';
    document.getElementById('formRegisterBlock').style.display = 'none';
    document.getElementById('formRecoverBlock').style.display = 'none';
}

function mostrarRegistro() {
    document.getElementById('formLoginBlock').style.display = 'none';
    document.getElementById('formRegisterBlock').style.display = 'block';
    document.getElementById('formRecoverBlock').style.display = 'none';
}

function mostrarRecuperar() {
    document.getElementById('formLoginBlock').style.display = 'none';
    document.getElementById('formRegisterBlock').style.display = 'none';
    document.getElementById('formRecoverBlock').style.display = 'block';
}

function verificarSesion() {
    const sesion = localStorage.getItem('usuarioActivo');
    if (sesion) {
        usuarioActivo = JSON.parse(sesion);
        iniciarAplicacion();
    } else {
        document.getElementById('modalLogin').style.display = 'flex';
        document.getElementById('appContent').style.display = 'none';

        // Lógica de Login
        document.getElementById('btnIngresar').onclick = async () => {
            const carnet = document.getElementById('loginUsuario').value;
            const clave = document.getElementById('loginClave').value;
            if (!carnet || !clave) return mostrarNotificacion('Llena ambos campos', 'warning');

            try {
                let res = await fetch(`${API_URL}/usuarios/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ carnet, password: clave })
                });

                let data = await res.json();
                if (!res.ok) {
                    return mostrarNotificacion(data.mensaje || 'Credenciales inválidas', 'error');
                }

                usuarioActivo = data.usuario;
                localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
                iniciarAplicacion();
            } catch (error) {
                mostrarNotificacion('Error de conexión', 'error');
            }
        };

        // Lógica de Registro
        const btnRegistrar = document.getElementById('btnRegistrar');
        if (btnRegistrar) {
            btnRegistrar.onclick = async () => {
                const nombre = document.getElementById('regNombre').value;
                const carnet = document.getElementById('regCarnet').value;
                const clave = document.getElementById('regClave').value;
                if (!nombre || !carnet || !clave) return mostrarNotificacion('Llena todos los campos', 'warning');

                try {
                    let res = await fetch(`${API_URL}/usuarios/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre, carnet, password: clave })
                    });
                    let data = await res.json();
                    
                    if (!res.ok) return mostrarNotificacion(data.mensaje, 'error');

                    // Auto login después del registro
                    usuarioActivo = data.usuario;
                    localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
                    iniciarAplicacion();
                } catch (error) {
                    mostrarNotificacion('Error al registrarse', 'error');
                }
            };
        }

        // Lógica de Recuperación (Mock)
        const btnRecuperar = document.getElementById('btnRecuperar');
        if (btnRecuperar) {
            btnRecuperar.onclick = () => {
                const carnet = document.getElementById('recoverCarnet').value;
                if (!carnet) return mostrarNotificacion('Ingresa tu carnet o ID', 'warning');
                
                mostrarNotificacion('Las instrucciones han sido enviadas a tu correo registrado.', 'success');
                setTimeout(() => {
                    mostrarLogin();
                }, 2000);
            };
        }
    }
}

function iniciarAplicacion() {
    document.getElementById('modalLogin').style.display = 'none';
    document.getElementById('appContent').style.display = 'flex';
    
    if (usuarioActivo.rol === 'admin') {
        document.getElementById('btnMenuAdminPanel').style.display = 'flex';
    }

    const lblUsuario = document.getElementById('lblUsuarioDropdown');
    if (lblUsuario) {
        lblUsuario.textContent = usuarioActivo.nombre;
    }

    // Actualizar el trigger del avatar con la inicial del usuario
    const avatarTrigger = document.getElementById('avatarTrigger');
    if (avatarTrigger) {
        avatarTrigger.textContent = usuarioActivo.nombre.charAt(0).toUpperCase();
    }

    setupNavigation();
    cargarCajas().then(() => {
        cargarClinicas();
        cargarInventario();
        cargarSolicitudes();
        cargarPlantillas();
    });
    iniciarActualizacionTiempos();

    // Default view to Home
    const btnMenuHome = document.getElementById('btnMenuHome');
    if (btnMenuHome) {
        btnMenuHome.click();
    } else {
        document.getElementById('vistaHome').style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('usuarioActivo');
    location.reload();
}

// ==========================================
// NAVEGACIÓN Y VISTAS
// ==========================================
function setupNavigation() {
    const vistaHome = document.getElementById('vistaHome');
    const vistaMisCosas = document.getElementById('vistaMisCosas');
    const vistaContenedores = document.getElementById('vistaContenedores');
    const vistaTabla = document.getElementById('vistaTabla');
    const vistaHorario = document.getElementById('vistaHorario');
    const vistaCargaPDF = document.getElementById('vistaCargaPDF');
    const vistaConfig = document.getElementById('vistaConfig');
    const vistaPerfil = document.getElementById('vistaPerfil');
    const vistaAdmin = document.getElementById('vistaAdmin');
    const vistaAdminDashboard = document.getElementById('vistaAdminDashboard');

    function hideAll() {
        if(vistaHome) vistaHome.style.display = 'none';
        if(vistaMisCosas) vistaMisCosas.style.display = 'none';
        if(vistaContenedores) vistaContenedores.style.display = 'none';
        if(vistaTabla) vistaTabla.style.display = 'none';
        if(vistaHorario) vistaHorario.style.display = 'none';
        if(vistaCargaPDF) vistaCargaPDF.style.display = 'none';
        if(vistaConfig) vistaConfig.style.display = 'none';
        if(vistaPerfil) vistaPerfil.style.display = 'none';
        if(vistaAdmin) vistaAdmin.style.display = 'none';
        if(vistaAdminDashboard) vistaAdminDashboard.style.display = 'none';
    }

    // --- Sidebar Active State Logic ---
    function setActiveSidebarItem(id) {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.getElementById(id);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // --- Header Logo ---
    const btnLogoHome = document.getElementById('btnLogoHome');
    if (btnLogoHome) {
        btnLogoHome.onclick = () => {
            hideAll();
            if (vistaHome) vistaHome.style.display = 'block';
            setActiveSidebarItem('btnMenuHome');
        };
    }

    // --- Sidebar & Navigation Actions ---
    const btnMenuHome = document.getElementById('btnMenuHome');
    if(btnMenuHome) {
        btnMenuHome.onclick = (e) => {
            if (e) e.preventDefault();
            hideAll();
            if (vistaHome) vistaHome.style.display = 'block';
            setActiveSidebarItem('btnMenuHome');
        };
    }

    // --- Dropdown Menu Logic ---
    const avatarTrigger = document.getElementById('avatarTrigger');
    const profileDropdown = document.getElementById('profileDropdown');

    if(avatarTrigger && profileDropdown) {
        avatarTrigger.onclick = (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        };

        window.onclick = (e) => {
            if (!e.target.matches('.avatar-trigger')) {
                if (profileDropdown.classList.contains('show')) {
                    profileDropdown.classList.remove('show');
                }
            }
        };
    }

    // --- Dropdown & Sidebar Shared Navigation ---
    const btnMenuMisDatos = document.getElementById('btnMenuMisDatos');
    if (btnMenuMisDatos) {
        btnMenuMisDatos.onclick = (e) => {
            e.preventDefault();
            hideAll();
            if (vistaPerfil) vistaPerfil.style.display = 'block';
            setActiveSidebarItem('btnMenuMisDatos');
        };
    }

    const btnMenuMisCosas = document.getElementById('btnMenuMisCosas');
    if(btnMenuMisCosas) btnMenuMisCosas.onclick = (e) => {
        if(e) e.preventDefault();
        hideAll();
        if (vistaMisCosas) vistaMisCosas.style.display = 'block';
        setActiveSidebarItem('btnMenuMisCosas');
        cargarInventario();
    };

    const btnMenuDashboard = document.getElementById('btnMenuDashboard');
    if(btnMenuDashboard) btnMenuDashboard.onclick = (e) => {
        if(e) e.preventDefault();
        hideAll();
        if (vistaContenedores) vistaContenedores.style.display = 'block';
        setActiveSidebarItem('btnMenuDashboard');
        cargarInventario();
    };

    const btnMenuHorario = document.getElementById('btnMenuHorario');
    if(btnMenuHorario) btnMenuHorario.onclick = (e) => {
        if(e) e.preventDefault();
        hideAll();
        if (vistaHorario) vistaHorario.style.display = 'block';
        setActiveSidebarItem('btnMenuHorario');
        if (typeof renderizarHorario === 'function') renderizarHorario();
    };

    const btnMenuCargaPDF = document.getElementById('btnMenuCargaPDF');
    if(btnMenuCargaPDF) btnMenuCargaPDF.onclick = (e) => {
        if(e) e.preventDefault();
        hideAll();
        if (vistaCargaPDF) vistaCargaPDF.style.display = 'block';
        setActiveSidebarItem('btnMenuCargaPDF');
    };

    const openConfigAndScroll = (sectionId) => {
        hideAll();
        if (vistaConfig) vistaConfig.style.display = 'block';
        cargarClinicas();
        cargarCajas();
        cargarPlantillas();
        setTimeout(() => {
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const btnMenuConfPlantillas = document.getElementById('btnMenuConfPlantillas');
    if (btnMenuConfPlantillas) btnMenuConfPlantillas.onclick = (e) => { e.preventDefault(); openConfigAndScroll('secPlantillas'); };

    const btnMenuConfClinicas = document.getElementById('btnMenuConfClinicas');
    if (btnMenuConfClinicas) btnMenuConfClinicas.onclick = (e) => { e.preventDefault(); openConfigAndScroll('secClinicas'); };

    const btnMenuConfContenedores = document.getElementById('btnMenuConfContenedores');
    if (btnMenuConfContenedores) btnMenuConfContenedores.onclick = (e) => { e.preventDefault(); openConfigAndScroll('secContenedores'); };

    const btnAdminPanel = document.getElementById('btnMenuAdminPanel');
    if (btnAdminPanel) {
        btnAdminPanel.onclick = (e) => {
            e.preventDefault();
            hideAll();
            if (vistaAdmin) vistaAdmin.style.display = 'block';
            cargarLogsAdmin();
            cargarUsuariosAdmin();
        };
    }

    const btnLogoutDropdown = document.getElementById('btnLogoutDropdown');
    if (btnLogoutDropdown) {
        btnLogoutDropdown.onclick = (e) => {
            e.preventDefault();
            logout();
        };
    }

    // --- Home Cards Logic ---
    const cardHomeMisCosas = document.getElementById('cardHomeMisCosas');
    if (cardHomeMisCosas) cardHomeMisCosas.onclick = () => {
        const btn = document.getElementById('btnMenuMisCosas');
        if (btn) btn.click();
    };
    
    const cardHomeDashboard = document.getElementById('cardHomeDashboard');
    if (cardHomeDashboard) cardHomeDashboard.onclick = () => {
        const btn = document.getElementById('btnMenuDashboard');
        if (btn) btn.click();
    };
    
    const btnHomeToHorario = document.getElementById('btnHomeToHorario');
    if (btnHomeToHorario) btnHomeToHorario.onclick = () => {
        const btn = document.getElementById('btnMenuHorario');
        if (btn) btn.click();
    };
}

// ==========================================
// MODALS
// ==========================================
function setupModals() {
    try {
        const modalInsumo = document.getElementById('modalInsumo');
        const modalSolicitud = document.getElementById('modalSolicitud');

        const closeInsumo = document.getElementById('closeModalInsumo');
        if (closeInsumo) closeInsumo.onclick = () => { if (modalInsumo) modalInsumo.style.display = 'none'; };

        const btnAddSolicitud = document.getElementById('btnAgregarSolicitud');
        if (btnAddSolicitud) btnAddSolicitud.onclick = () => abrirModalSolicitud();
        
        const closeSolicitud = document.getElementById('closeModalSolicitud');
        if (closeSolicitud) closeSolicitud.onclick = () => { if (modalSolicitud) modalSolicitud.style.display = 'none'; };

        window.onclick = (event) => {
            if (event.target === modalInsumo) modalInsumo.style.display = 'none';
            if (event.target === modalSolicitud) modalSolicitud.style.display = 'none';
        };

        const formInsumo = document.getElementById('formInsumo');
        if (formInsumo) formInsumo.onsubmit = guardarInsumo;

        const formSolicitud = document.getElementById('formSolicitud');
        if (formSolicitud) formSolicitud.onsubmit = guardarSolicitud;
    } catch (err) {
        console.error("Error setting up modals:", err);
    }
}

function abrirModalAddInsumo() {
    console.log("abrirModalAddInsumo: Iniciado");
    cargarCatalogo();
    // Resetear formulario al abrir
    const form = document.getElementById('formInsumo');
    if (form) form.reset();

    const catalogoInput = document.getElementById('catalogoInput');
    if (catalogoInput) catalogoInput.value = '';

    const nombreInput = document.getElementById('nombre');
    if (nombreInput) {
        nombreInput.value = '';
        nombreInput.readOnly = false;
    }

    const codigoInput = document.getElementById('codigo');
    if (codigoInput) {
        codigoInput.value = '';
        codigoInput.readOnly = false;
    }

    const modalInsumo = document.getElementById('modalInsumo');
    if (modalInsumo) {
        console.log("abrirModalAddInsumo: Mostrando modal con display flex");
        modalInsumo.style.display = 'flex';
    } else {
        console.error("abrirModalAddInsumo: Error - No se encontró el elemento modalInsumo");
    }
}

function cargarCatalogo() {
    try {
        const datalist = document.getElementById('listaCatalogo');
        if (!datalist) return;
        
        // Use children.length instead of options.length for better cross-browser compatibility with datalist
        if (datalist.children.length === 0 && typeof catalogoInsumos !== 'undefined' && Array.isArray(catalogoInsumos)) {
            let html = '';
            catalogoInsumos.forEach(item => {
                html += `<option value="${item.codigo} - ${item.nombre}"></option>`;
            });
            html += '<option value="➕ Agregar insumo personalizado (OTRO)"></option>';
            datalist.innerHTML = html;
        }
    } catch (e) {
        console.error("Error cargando el catálogo:", e);
    }
}

function seleccionarDelCatalogo() {
    const inputBuscador = document.getElementById('catalogoInput');
    const inputNombre = document.getElementById('nombre');
    const inputCodigo = document.getElementById('codigo');
    const valor = inputBuscador.value;

    if (valor === '➕ Agregar insumo personalizado (OTRO)') {
        inputNombre.value = '';
        inputCodigo.value = '';
        inputNombre.readOnly = false;
        inputCodigo.readOnly = false;
        inputNombre.focus();
    } else if (valor.includes(' - ')) {
        const partes = valor.split(' - ');
        const codigo = partes[0];
        const nombre = partes.slice(1).join(' - ');

        const existe = typeof catalogoInsumos !== 'undefined' && catalogoInsumos.find(i => i.codigo === codigo);

        inputNombre.value = nombre;
        inputCodigo.value = codigo;

        if (existe) {
            inputNombre.readOnly = true;
            inputCodigo.readOnly = true;
        } else {
            inputNombre.readOnly = false;
            inputCodigo.readOnly = false;
        }
    } else if (valor.length > 0) {
        // El usuario está escribiendo algo que no matchea catálogo — dejar libre
        inputNombre.readOnly = false;
        inputCodigo.readOnly = false;
    }
}

function abrirModalSolicitud() {
    const selectInsumo = document.getElementById('solicitudInsumoId');
    if (selectInsumo) {
        let insumosDisponibles = [];
        for (const ubicacion in inventarioCompleto) {
            if (ubicacion !== 'central_esterilizacion') {
                insumosDisponibles = insumosDisponibles.concat(
                    inventarioCompleto[ubicacion].filter(i => !i.esterilizado)
                );
            }
        }

        selectInsumo.innerHTML = '<option value="">Seleccionar insumo no esterilizado</option>' +
            insumosDisponibles.map(insumo => {
                const cajaInfo = cajasDelUsuario.find(c => c.slug === insumo.ubicacionActual);
                const nombreUbicacion = cajaInfo ? cajaInfo.nombre : insumo.ubicacionActual.replace('_', ' ');
                return `<option value="${insumo._id}" data-max="${insumo.cantidad}">${insumo.nombre} (${insumo.codigo}) - Cantidad: ${insumo.cantidad} - ${nombreUbicacion}</option>`
            }).join('');

        selectInsumo.onchange = function () {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                const max = selectedOption.getAttribute('data-max');
                document.getElementById('solicitudCantidad').max = max;
                document.getElementById('solicitudCantidad').value = max;
            }
        };
    }
    const modalSolicitud = document.getElementById('modalSolicitud');
    if (modalSolicitud) {
        modalSolicitud.style.display = 'flex';
    }
}

// ==========================================
// EVENT LISTENERS SECUNDARIOS
// ==========================================
function setupEventListeners() {
    console.log("setupEventListeners: Iniciado");
    const btnGuardarClinica = document.getElementById('btnGuardarClinica');
    if (btnGuardarClinica) btnGuardarClinica.onclick = guardarClinica;

    const btnAgregarDiaHorario = document.getElementById('btnAgregarDiaHorario');
    if (btnAgregarDiaHorario) btnAgregarDiaHorario.onclick = agregarHorarioTemp;

    const btnAgregarImplemento = document.getElementById('btnAgregarImplemento');
    if (btnAgregarImplemento) btnAgregarImplemento.onclick = agregarImplementoTemp;

    const btnAgregarInsumoHeader = document.getElementById('btnAgregarInsumoHeader');
    if (btnAgregarInsumoHeader) {
        console.log("setupEventListeners: Vinculando click a btnAgregarInsumoHeader");
        btnAgregarInsumoHeader.addEventListener('click', (e) => {
            console.log("setupEventListeners: Click detectado en btnAgregarInsumoHeader");
            e.preventDefault();
            abrirModalAddInsumo();
        });
    } else {
        console.warn("setupEventListeners: No se encontró btnAgregarInsumoHeader en el DOM");
    }

    const btnAgregarCaja = document.getElementById('btnAgregarCaja');
    if (btnAgregarCaja) btnAgregarCaja.onclick = crearCaja;

    const btnPlantillaAddImp = document.getElementById('btnPlantillaAddImp');
    if (btnPlantillaAddImp) btnPlantillaAddImp.onclick = agregarImplementoPlantilla;

    const btnGuardarPlantilla = document.getElementById('btnGuardarPlantilla');
    if (btnGuardarPlantilla) btnGuardarPlantilla.onclick = guardarPlantilla;

    document.getElementById('fechaInicio')?.addEventListener('change', renderizarTablaSolicitudes);
    document.getElementById('soloVigentes')?.addEventListener('change', renderizarTablaSolicitudes);

    const formEditarPerfil = document.getElementById('formEditarPerfil');
    if (formEditarPerfil) {
        formEditarPerfil.onsubmit = guardarPerfil;
    }
}

// ==========================================
// API & LÓGICA DE INSUMOS
// ==========================================
async function cargarInventario() {
    if (!usuarioActivo) return;
    try {
        const response = await fetch(`${API_URL}/insumos?usuarioId=${usuarioActivo._id}`);
        const data = await response.json();
        inventarioCompleto = data;

        // Obtener TODOS los insumos para la vista "Mis Cosas" (Inventario Maestro)
        let todosLosInsumos = [];
        Object.keys(data).forEach(ubicacion => {
            if (data[ubicacion]) {
                todosLosInsumos = todosLosInsumos.concat(data[ubicacion]);
            }
        });

        // Renderizar Inventario Maestro
        renderizarInsumos('mis_cosas', todosLosInsumos, true);

        // Renderizar Cajas Individuales
        cajasDelUsuario.forEach(caja => {
            if (caja.slug !== 'mis_cosas') { // Evitar sobreescribir el maestro si tuvieran mismo ID en UI
                renderizarInsumos(caja.slug, data[caja.slug] || [], false);
            }
        });

        // ==============================
        // ACTUALIZAR STATS DEL MAINPAGE
        // ==============================
        let totalUnidades = 0;
        let totalEsterilizacion = 0;
        let totalListos = 0;

        todosLosInsumos.forEach(insumo => {
            const cant = insumo.cantidad || 1;
            totalUnidades += cant;
            
            if (insumo.ubicacionActual === 'central_esterilizacion') {
                totalEsterilizacion += cant;
            } else if (insumo.esterilizado || insumo.ubicacionActual.includes('locker')) {
                totalListos += cant;
            }
        });

        const elTotales = document.getElementById('homeStatTotales');
        const elEsteril = document.getElementById('homeStatEsteril');
        const elListos = document.getElementById('homeStatListos');

        if (elTotales) elTotales.textContent = totalUnidades;
        if (elEsteril) elEsteril.textContent = totalEsterilizacion;
        if (elListos) elListos.textContent = totalListos;

        calcularTiempoPromedioCentral(data.central_esterilizacion || []);
    } catch (error) {
        console.error('Error cargando inventario:', error);
    }
}

async function guardarInsumo(e) {
    e.preventDefault();
    let nombre = document.getElementById('nombre').value.trim();
    let codigo = document.getElementById('codigo').value.trim();
    const descripcion = document.getElementById('descripcion').value || 'Sin descripción';
    const cantidad = parseInt(document.getElementById('cantidadInsumo').value) || 1;

    if (!nombre) {
        return mostrarNotificacion('El nombre del insumo es obligatorio', 'warning');
    }

    // Si no hay código, generar uno automático
    if (!codigo) {
        codigo = 'CUSTOM-' + Date.now().toString(36).toUpperCase();
    }

    try {
        const response = await fetch(`${API_URL}/insumos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, codigo, tipo: descripcion, esterilizado: false, cantidad, usuarioId: usuarioActivo._id })
        });
        if (response.ok) {
            document.getElementById('modalInsumo').style.display = 'none';
            document.getElementById('formInsumo').reset();
            document.getElementById('catalogoInput').value = '';
            mostrarNotificacion('✅ Insumo guardado en Mis Cosas', 'success');
            cargarInventario();
        } else {
            const errData = await response.json().catch(() => ({}));
            mostrarNotificacion(errData.mensaje || 'Error al guardar', 'error');
        }
    } catch (error) {
        mostrarNotificacion('Error de conexión con el servidor', 'error');
    }
}

async function moverInsumoDOM(selectElement, id, ubicacionOrigen, maxCantidad) {
    const nuevaUbicacion = selectElement.value;
    if (!nuevaUbicacion) return;

    let cantidadMover = maxCantidad;
    if (maxCantidad > 1) {
        const res = await customPrompt(`Tienes ${maxCantidad} unidades. ¿Cuántas quieres mover a ${nuevaUbicacion.replace('_', ' ')}?`, maxCantidad);
        if (res === null) {
            selectElement.value = "";
            return; // Cancelado
        }
        cantidadMover = parseInt(res);
        if (isNaN(cantidadMover) || cantidadMover <= 0 || cantidadMover > maxCantidad) {
            mostrarNotificacion('Cantidad inválida', 'warning');
            selectElement.value = "";
            return;
        }
    }

    try {
        const response = await fetch(`${API_URL}/insumos/mover/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevaUbicacion, cantidadMover })
        });
        if (response.ok) {
            mostrarNotificacion(`✅ Movido a ${nuevaUbicacion.replace('_', ' ')}`, 'success');
            cargarInventario();
        }
    } catch (error) {
        mostrarNotificacion('Error al mover insumo', 'error');
        selectElement.value = "";
    }
}

function renderizarInsumos(ubicacionDOM, insumos, esVistaMaestra = false) {
    const container = document.getElementById(ubicacionDOM);
    if (!container) return;

    container.innerHTML = '';

    if (insumos.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem; text-align: center; margin-top: 1rem;">Vacío</p>';
        return;
    }

    insumos.forEach(insumo => {
        const div = document.createElement('div');
        div.className = 'insumo-item';

        let infoExtra = '';
        if (insumo.ubicacionActual === 'central_esterilizacion' && insumo.tiempoEnCentral) {
            infoExtra = `<p style="color: #eab308; font-weight: 600; margin-top: 5px;">⏱️ ${insumo.tiempoEnCentral.texto}</p>`;
        }

        let badgeUbicacion = '';
        if (esVistaMaestra) {
            let color = 'var(--primary)';
            if (insumo.ubicacionActual === 'central_esterilizacion') color = 'var(--danger)';
            else if (insumo.ubicacionActual === 'mis_cosas') color = 'var(--info)';
            else color = 'var(--success)';

            const cajaInfo = cajasDelUsuario.find(c => c.slug === insumo.ubicacionActual);
            const nombreUbicacion = cajaInfo ? cajaInfo.nombre : insumo.ubicacionActual.replace('_', ' ').toUpperCase();
            badgeUbicacion = `<div style="margin-bottom: 5px;"><span class="badge" style="background: ${color}; color: white; font-size: 0.65rem;">📍 ${nombreUbicacion}</span></div>`;
        }

        let optionsHtml = '';

        // Si no está en un proceso de esterilización de la central, permitir moverlo
        if (insumo.ubicacionActual !== 'central_esterilizacion') {
            let options = '<option value="">Mover a...</option>';

            cajasDelUsuario.forEach(caja => {
                if (caja.slug !== insumo.ubicacionActual && caja.slug !== 'central_esterilizacion') {
                    options += `<option value="${caja.slug}">${caja.nombre}</option>`;
                }
            });

            optionsHtml = `
            <div class="insumo-actions">
                <select onchange="moverInsumoDOM(this, '${insumo._id}', '${insumo.ubicacionActual}', ${insumo.cantidad})">
                    ${options}
                </select>
            </div>`;
        }

        div.innerHTML = `
            <div class="insumo-info">
                ${badgeUbicacion}
                <h4>${insumo.nombre} (${insumo.codigo})</h4>
                <p style="display: flex; align-items: center; gap: 5px;">
                    <span>Desc: ${insumo.tipo}</span> 
                    <button style="background: none; border: none; cursor: pointer; opacity: 0.6;" onclick="editarDescripcion('${insumo._id}', '${insumo.tipo.replace(/'/g, "\\'")}')" title="Editar descripción">✏️</button>
                </p>
                <p><strong style="color: var(--primary)">Cant: ${insumo.cantidad}</strong> | ${insumo.esterilizado ? '✅ Esterilizado' : '❌ No esterilizado'}</p>
                ${infoExtra}
            </div>
            ${optionsHtml}
        `;
        container.appendChild(div);
    });
}

async function editarDescripcion(id, descripcionActual) {
    const nuevaDescripcion = await customPrompt("Editar descripción del insumo:", descripcionActual);
    if (nuevaDescripcion !== null && nuevaDescripcion.trim() !== "" && nuevaDescripcion !== descripcionActual) {
        try {
            const res = await fetch(`${API_URL}/insumos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: nuevaDescripcion.trim() })
            });
            if (res.ok) {
                mostrarNotificacion('✅ Descripción actualizada', 'success');
                cargarInventario();
            } else {
                mostrarNotificacion('Error al actualizar descripción', 'error');
            }
        } catch (error) {
            mostrarNotificacion('Error de conexión', 'error');
        }
    }
}

function calcularTiempoPromedioCentral(insumosCentral) {
    const divPromedio = document.getElementById('tiempoPromedioCentral');
    if (!divPromedio) return;
    if (insumosCentral.length === 0) {
        divPromedio.innerHTML = '';
        return;
    }
    let totalHoras = 0; let itemsValidos = 0;
    insumosCentral.forEach(insumo => {
        if (insumo.tiempoEnCentral && typeof insumo.tiempoEnCentral.horas === 'number') {
            totalHoras += insumo.tiempoEnCentral.horas;
            itemsValidos++;
        }
    });
    if (itemsValidos > 0) {
        const promedio = Math.round(totalHoras / itemsValidos);
        divPromedio.innerHTML = `<p style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">⏱️ Tiempo promedio en central: <strong>${promedio} horas</strong></p>`;
    } else {
        divPromedio.innerHTML = '';
    }
}

// ==========================================
// API & LÓGICA DE SOLICITUDES
// ==========================================
async function cargarSolicitudes() {
    try {
        const response = await fetch(`${API_URL}/solicitudes`);
        solicitudes = await response.json();
        renderizarTablaSolicitudes();
    } catch (error) {
        console.error('Error cargando solicitudes:', error);
    }
}

async function guardarSolicitud(e) {
    e.preventDefault();
    const insumoId = document.getElementById('solicitudInsumoId').value;
    const cantidadMover = document.getElementById('solicitudCantidad').value;
    const nota = document.getElementById('solicitudNota').value;

    if (!insumoId || !cantidadMover) return mostrarNotificacion('⚠️ Faltan campos', 'warning');

    let insumoEncontrado = null;
    for (const u in inventarioCompleto) {
        const found = inventarioCompleto[u].find(i => i._id === insumoId);
        if (found) insumoEncontrado = found;
    }
    if (!insumoEncontrado) return mostrarNotificacion('Error: Insumo no encontrado', 'error');

    try {
        // 1. Mandar a esterilizar (divide cantidad si es necesario)
        const estRes = await fetch(`${API_URL}/insumos/enviar-esterilizacion/${insumoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidadMover })
        });
        if (!estRes.ok) {
            const errData = await estRes.json();
            throw new Error(errData.mensaje || 'Error al enviar a esterilizar');
        }
        const estData = await estRes.json();

        const consecutivo = 'SOL-' + Date.now().toString().slice(-6);

        // 2. Crear solicitud
        const solRes = await fetch(`${API_URL}/solicitudes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                consecutivo,
                estado: 'EN_ESTERILIZACION',
                insumoId: estData.insumo._id, // Usamos el ID del (posiblemente nuevo) insumo
                insumoNombre: insumoEncontrado.nombre,
                insumoCodigo: insumoEncontrado.codigo,
                cantidad: cantidadMover,
                usuario: usuarioActivo._id,
                devolucionEstimada: estData.fechaDevolucion,
                nota
            })
        });

        if (solRes.ok) {
            document.getElementById('modalSolicitud').style.display = 'none';
            document.getElementById('formSolicitud').reset();
            mostrarNotificacion(`✅ Solicitud enviada. Llegada: ${new Date(estData.fechaDevolucion).toLocaleString()}`, 'success');
            cargarSolicitudes();
            cargarInventario();
        } else {
            const errData = await solRes.json();
            throw new Error(errData.mensaje || 'Error al crear solicitud en BD');
        }
    } catch (error) {
        mostrarNotificacion(`❌ Error: ${error.message}`, 'error');
    }
}

async function recibirSolicitud(consecutivo, insumoId) {
    try {
        await fetch(`${API_URL}/insumos/recibir-esterilizado/${insumoId}`, { method: 'PUT' });
        await fetch(`${API_URL}/solicitudes/${consecutivo}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'ENTREGADO', fechaRecepcion: new Date() })
        });
        mostrarNotificacion(`✅ Insumo recibido y guardado en Locker`, 'success');
        cargarSolicitudes();
        cargarInventario();
    } catch (error) {
        mostrarNotificacion('Error al recibir solicitud', 'error');
    }
}

function renderizarTablaSolicitudes() {
    const tbody = document.getElementById('tablaSolicitudesBody');
    if (!tbody) return;

    const fechaInicio = document.getElementById('fechaInicio')?.value;
    const soloVigentes = document.getElementById('soloVigentes')?.checked;

    let filtradas = [...solicitudes];

    // Filtrar para ver solo las del usuario actual (o huérfanas por reinicio de DB en memoria)
    filtradas = filtradas.filter(s => !s.usuario || s.usuario._id === usuarioActivo._id || s.usuario === usuarioActivo._id);

    if (fechaInicio) {
        const dt = new Date(fechaInicio);
        filtradas = filtradas.filter(s => {
            const sd = new Date(s.fecha);
            return sd.getDate() === dt.getDate() && sd.getMonth() === dt.getMonth() && sd.getFullYear() === dt.getFullYear();
        });
    }

    if (soloVigentes) filtradas = filtradas.filter(s => s.estado !== 'ENTREGADO');

    tbody.innerHTML = filtradas.map(s => {
        const fechaSol = new Date(s.fecha);
        const fechaLlegada = s.devolucionEstimada ? new Date(s.devolucionEstimada) : null;
        const fechaRec = s.fechaRecepcion ? new Date(s.fechaRecepcion) : null;

        let llegadaHtml = '-';
        if (fechaLlegada) {
            const isLate = new Date() > fechaLlegada && s.estado !== 'ENTREGADO';
            llegadaHtml = `<span style="color: ${isLate ? 'var(--danger)' : 'var(--primary)'}; font-weight: 600;">${fechaLlegada.toLocaleDateString()} ${fechaLlegada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
        }

        return `
            <tr>
                <td><strong>${s.consecutivo}</strong></td>
                <td>${fechaSol.toLocaleDateString()}</td>
                <td><span class="badge ${s.estado === 'ENTREGADO' ? 'badge-success' : 'badge-warning'}">${s.estado.replace('_', ' ')}</span></td>
                <td>${s.insumoNombre}</td>
                <td><strong>${s.cantidad}</strong></td>
                <td>${llegadaHtml}</td>
                <td>${fechaRec ? fechaRec.toLocaleDateString() : '-'}</td>
                <td>
                    ${s.estado !== 'ENTREGADO' ? `<button class="btn-outline" onclick="recibirSolicitud('${s.consecutivo}', '${s.insumoId}')">Recibir</button>` : 'Entregado'}
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// API & LÓGICA DE CAJAS (CONTENEDORES)
// ==========================================
async function cargarCajas() {
    if (!usuarioActivo) return;
    try {
        const res = await fetch(`${API_URL}/cajas?usuarioId=${usuarioActivo._id}`);
        cajasDelUsuario = await res.json();
        renderizarCajasConfig();
        renderizarDashboardCajas();
    } catch (e) {
        console.error('Error cargando cajas:', e);
    }
}

function renderizarDashboardCajas() {
    const grid = document.getElementById('dashboardGrid');
    if (!grid) return;

    // Solo mostrar cajas en el dashboard que no sean "mis_cosas" (ya tiene su propia vista)
    const cajasMostrar = cajasDelUsuario.filter(c => c.slug !== 'mis_cosas');

    grid.innerHTML = cajasMostrar.map(caja => {
        let extraHtml = '';
        if (caja.slug === 'central_esterilizacion') {
            extraHtml = `<div class="tiempo-promedio" id="tiempoPromedioCentral"></div>`;
        }

        let icon = '📦';
        if (caja.slug === 'central_esterilizacion') icon = '🏥';
        else if (caja.slug === 'locker_universidad') icon = '📚';
        else if (caja.slug === 'en_consulta') icon = '👨‍⚕️';
        else if (caja.slug === 'cajon_casa') icon = '🏠';

        return `
            <div class="container-card" data-ubicacion="${caja.slug}">
                <div class="card-header">
                    <h3>${icon} ${caja.nombre}</h3>
                </div>
                ${extraHtml}
                <div class="insumos-container" id="${caja.slug}"></div>
            </div>
        `;
    }).join('');
}

function renderizarCajasConfig() {
    const container = document.getElementById('cajasListContainer');
    if (!container) return;

    container.innerHTML = cajasDelUsuario.map(c => `
        <div style="border: 1px solid var(--border); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; background: ${c.fija ? 'var(--background)' : 'white'};">
            <div>
                <strong>${c.nombre}</strong>
                ${c.fija ? '<span class="badge" style="margin-left:5px; font-size:0.65rem;">Fija</span>' : ''}
                <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${c.slug}</div>
            </div>
            ${!c.fija ? `
            <div style="display: flex; gap: 5px;">
                <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="renombrarCaja('${c._id}', '${c.nombre}')">✏️ Editar</button>
                <button class="btn-outline" style="color: var(--danger); border-color: var(--danger); padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="eliminarCajaDOM('${c._id}', '${c.nombre}')">🗑️</button>
            </div>
            ` : ''}
        </div>
    `).join('');
}

async function crearCaja() {
    const nombre = document.getElementById('nuevaCajaNombre').value;
    if (!nombre) return mostrarNotificacion('Ingresa el nombre de la caja', 'warning');

    try {
        const res = await fetch(`${API_URL}/cajas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, usuarioId: usuarioActivo._id })
        });
        if (res.ok) {
            document.getElementById('nuevaCajaNombre').value = '';
            mostrarNotificacion('✅ Caja creada', 'success');
            await cargarCajas();
            cargarInventario();
        } else {
            mostrarNotificacion('Error al crear caja', 'error');
        }
    } catch (e) {
        mostrarNotificacion('Error de red', 'error');
    }
}

async function eliminarCajaDOM(id, nombre) {
    if (!(await customConfirm(`¿Eliminar la caja "${nombre}"? Los insumos dentro se moverán a "Mis Cosas".`))) return;
    try {
        const res = await fetch(`${API_URL}/cajas/${id}`, { method: 'DELETE' });
        if (res.ok) {
            mostrarNotificacion('🗑️ Caja eliminada', 'success');
            await cargarCajas();
            cargarInventario();
        } else {
            mostrarNotificacion('Error al eliminar', 'error');
        }
    } catch (e) {
        mostrarNotificacion('Error de red', 'error');
    }
}

async function renombrarCaja(id, nombreActual) {
    const nuevoNombre = await customPrompt("Nuevo nombre para la caja:", nombreActual);
    if (!nuevoNombre || nuevoNombre === nombreActual) return;

    try {
        const res = await fetch(`${API_URL}/cajas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre })
        });
        if (res.ok) {
            mostrarNotificacion('✅ Nombre actualizado', 'success');
            await cargarCajas();
            cargarInventario(); // para refrescar los headers
        }
    } catch (e) {
        mostrarNotificacion('Error', 'error');
    }
}

// ==========================================
// API & LÓGICA DE CLÍNICAS (ADMIN)
// ==========================================
// Las clínicas son globales en esta versión, todos ven las mismas
async function cargarClinicas() {
    try {
        const [resClinicas, resActiva] = await Promise.all([
            fetch(`${API_URL}/configuracion/clinicas`),
            fetch(`${API_URL}/configuracion/clinicas/activa`)
        ]);
        const dataClinicas = await resClinicas.json();
        const dataActiva = await resActiva.json();

        configuracionClinicas.clinicas = dataClinicas.clinicas || [];
        configuracionClinicas.clinicaActiva = dataActiva.clinicaActiva || null;

        renderizarClinicas();
        if (typeof renderizarHorarioPreview === 'function') {
            renderizarHorarioPreview();
        }
        // Ya no renderizamos el select porque todas están activas
    } catch (error) {
        console.error('Error cargando clinicas:', error);
    }
}

function renderizarClinicas() {
    const container = document.getElementById('clinicasContainer');
    if (!container) return;
    if (configuracionClinicas.clinicas.length === 0) return container.innerHTML = '<p class="text-muted">No hay clínicas configuradas.</p>';
    container.innerHTML = configuracionClinicas.clinicas.map(c => `
        <div style="border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
            <div>
                <strong>${c.nombre}</strong> ${c.activa ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-danger">Desactivada</span>'}
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">
                    ${c.diasHorarios.map(d => `${d.dia}: ${d.horaInicio} - ${d.horaFin}`).join('<br>')}
                </div>
                ${c.implementosRequeridos && c.implementosRequeridos.length > 0 ?
            `<div style="font-size: 0.8rem; margin-top: 10px;">
                        <strong>Implementos:</strong> ${c.implementosRequeridos.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
                    </div>` : ''
        }
            </div>
            <div style="display: flex; gap: 5px; align-items: flex-start;">
                <button class="btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="toggleClinica('${c._id}')">${c.activa ? 'Desactivar' : 'Activar'}</button>
                <button class="btn-outline" style="color: var(--danger); border-color: var(--danger); padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="eliminarClinica('${c._id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

// Renderiza el Horario Matricial
function renderizarHorario() {
    const container = document.getElementById('calendarMatrix');
    if (!container) return;

    // Obtener clínicas activas
    const clinicasActivas = configuracionClinicas.clinicas.filter(c => c.activa);
    const eventosPorDia = { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [] };

    clinicasActivas.forEach(clinica => {
        clinica.diasHorarios.forEach(horario => {
            if (eventosPorDia[horario.dia]) {
                eventosPorDia[horario.dia].push({
                    clinicaId: clinica._id,
                    nombre: clinica.nombre,
                    horaInicio: horario.horaInicio,
                    horaFin: horario.horaFin,
                    implementos: clinica.implementosRequeridos || []
                });
            }
        });
    });

    const verificarDisponibilidad = (nombreReq, cantReq) => {
        let totalDisponible = 0;
        for (const u in inventarioCompleto) {
            inventarioCompleto[u].forEach(ins => {
                const insNombre = ins.nombre || '';
                if (insNombre.toLowerCase().includes(nombreReq.toLowerCase()) || nombreReq.toLowerCase().includes(insNombre.toLowerCase())) {
                    if (ins.esterilizado || ins.ubicacionActual === 'mis_cosas') {
                        totalDisponible += ins.cantidad;
                    }
                }
            });
        }
        return totalDisponible >= cantReq;
    };

    const startHour = 6;
    const endHour = 22;
    const hourHeight = 60; // px

    let timeColHtml = '<div class="calendar-time-col">';
    let bgGridHtml = '<div class="calendar-bg-grid">';

    for (let h = startHour; h <= endHour; h++) {
        const hs = h.toString().padStart(2, '0') + ':00';
        timeColHtml += `<div class="time-slot">${hs}</div>`;
        bgGridHtml += `<div class="bg-hour-line"></div>`;
    }
    timeColHtml += '</div>';
    bgGridHtml += '</div>';

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    let daysHtml = '';
    dias.forEach(dia => {
        let eventsHtml = '';
        eventosPorDia[dia].forEach(ev => {
            const parseTime = (timeStr) => {
                const parts = timeStr.split(':');
                return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
            };

            const startT = parseTime(ev.horaInicio);
            let endT = parseTime(ev.horaFin);

            // Limit boundaries
            if (startT < startHour) return;
            if (endT > endHour + 1) endT = endHour + 1;

            const topPx = (startT - startHour) * hourHeight;
            const heightPx = (endT - startT) * hourHeight;

            let listaImplementos = '';
            if (ev.implementos.length > 0) {
                listaImplementos = '<ul class="implements">';
                ev.implementos.forEach(imp => {
                    const disponible = verificarDisponibilidad(imp.nombre, imp.cantidad);
                    const icon = disponible ? '✅' : '⚠️';
                    listaImplementos += `<li><span>${imp.cantidad}x ${imp.nombre}</span><span title="${disponible ? 'Disponible' : 'Faltante'}">${icon}</span></li>`;
                });
                listaImplementos += '</ul>';
            }

            eventsHtml += `
                <div class="calendar-event" style="top: ${topPx}px; height: ${heightPx}px;">
                    <div class="time">${ev.horaInicio} - ${ev.horaFin}</div>
                    <div class="title">${ev.nombre}</div>
                    ${listaImplementos}
                </div>
            `;
        });

        daysHtml += `
            <div class="calendar-day-col">
                <div class="day-header">${dia.charAt(0).toUpperCase() + dia.slice(1)}</div>
                <div class="day-events">
                    ${eventsHtml}
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        ${timeColHtml}
        <div class="calendar-days-container">
            ${bgGridHtml}
            ${daysHtml}
        </div>
    `;
}

function renderizarHorarioPreview() {
    const container = document.getElementById('homeHorarioPreview');
    if (!container) return;

    // Obtener clínicas activas
    const clinicasActivas = configuracionClinicas.clinicas.filter(c => c.activa);

    if (clinicasActivas.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No tienes clínicas configuradas o activas.</p>';
        return;
    }

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const eventosPorDia = { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [] };

    clinicasActivas.forEach(clinica => {
        clinica.diasHorarios.forEach(horario => {
            if (eventosPorDia[horario.dia]) {
                eventosPorDia[horario.dia].push({
                    nombre: clinica.nombre,
                    horaInicio: horario.horaInicio,
                    horaFin: horario.horaFin,
                    implementos: clinica.implementosRequeridos || []
                });
            }
        });
    });

    let html = '';
    let hayEventos = false;

    dias.forEach(dia => {
        if (eventosPorDia[dia].length > 0) {
            hayEventos = true;
            html += `<div style="margin-bottom: 1.5rem;">
                <h4 style="color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; margin-bottom: 0.5rem; text-transform: capitalize;">${dia}</h4>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">`;

            eventosPorDia[dia].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

            eventosPorDia[dia].forEach(ev => {
                let implStr = '';
                if (ev.implementos.length > 0) {
                    implStr = `<p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${ev.implementos.length} implementos requeridos</p>`;
                }

                html += `
                    <div style="background: var(--background); padding: 0.75rem; border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
                        <strong style="font-size: 0.9rem;">${ev.horaInicio} - ${ev.horaFin}</strong>
                        <div style="font-size: 0.95rem; font-weight: 500;">${ev.nombre}</div>
                        ${implStr}
                    </div>
                `;
            });

            html += `</div></div>`;
        }
    });

    if (!hayEventos) {
        html = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No hay clínicas programadas en tu horario.</p>';
    }

    container.innerHTML = html;
}

async function toggleClinica(id) {
    try {
        const res = await fetch(`${API_URL}/configuracion/clinicas/${id}/toggle`, { method: 'PUT' });
        if (res.ok) {
            mostrarNotificacion('✅ Estado actualizado', 'success');
            cargarClinicas();
        } else {
            mostrarNotificacion('Error al actualizar', 'error');
        }
    } catch (e) {
        mostrarNotificacion('Error de red', 'error');
    }
}

async function eliminarClinica(id) {
    if (!(await customConfirm('¿Eliminar esta clínica?'))) return;
    try {
        const res = await fetch(`${API_URL}/configuracion/clinicas/${id}`, { method: 'DELETE' });
        if (res.ok) { mostrarNotificacion('Clínica eliminada', 'success'); cargarClinicas(); }
    } catch (e) { mostrarNotificacion('Error al eliminar', 'error'); }
}

let horariosTemp = [];
function agregarHorarioTemp() { horariosTemp.push({ dia: 'lunes', horaInicio: '08:00', horaFin: '12:00' }); renderizarHorariosTemp(); }
function actualizarHorarioTemp(index, campo, valor) { horariosTemp[index][campo] = valor; }
function eliminarHorarioTemp(index) { horariosTemp.splice(index, 1); renderizarHorariosTemp(); }

function renderizarHorariosTemp() {
    const container = document.getElementById('nuevaClinicaHorarios');
    if (!container) return;
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const generarOptions = (seleccionada) => {
        let opts = '';
        for (let h = 6; h <= 22; h++) {
            for (let m = 0; m < 60; m += 5) {
                const hs = h.toString().padStart(2, '0');
                const ms = m.toString().padStart(2, '0');
                const val = `${hs}:${ms}`;
                opts += `<option value="${val}" ${val === seleccionada ? 'selected' : ''}>${val}</option>`;
            }
        }
        return opts;
    };
    container.innerHTML = horariosTemp.map((h, i) => `
        <div class="horario-row">
            <select class="input-select" onchange="actualizarHorarioTemp(${i}, 'dia', this.value)">
                ${diasSemana.map(d => `<option value="${d}" ${d === h.dia ? 'selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`).join('')}
            </select>
            <select class="input-select" onchange="actualizarHorarioTemp(${i}, 'horaInicio', this.value)">${generarOptions(h.horaInicio)}</select>
            <select class="input-select" onchange="actualizarHorarioTemp(${i}, 'horaFin', this.value)">${generarOptions(h.horaFin)}</select>
            <button class="btn-outline" style="color:var(--danger); border-color:var(--danger); padding:0.4rem 0.8rem;" onclick="eliminarHorarioTemp(${i})">X</button>
        </div>
    `).join('');
}

let implementosTemp = [];
function agregarImplementoTemp() {
    const nombre = document.getElementById('nuevoImplementoNombre').value;
    const cantidad = parseInt(document.getElementById('nuevoImplementoCant').value) || 1;
    if (!nombre) return mostrarNotificacion('Ingresa el nombre del implemento', 'warning');

    implementosTemp.push({ nombre, cantidad });
    document.getElementById('nuevoImplementoNombre').value = '';
    document.getElementById('nuevoImplementoCant').value = 1;
    renderizarImplementosTemp();
}

function eliminarImplementoTemp(index) {
    implementosTemp.splice(index, 1);
    renderizarImplementosTemp();
}

function renderizarImplementosTemp() {
    const container = document.getElementById('nuevaClinicaImplementos');
    if (!container) return;
    container.innerHTML = implementosTemp.map((imp, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--secondary); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
            <span>${imp.cantidad}x <strong>${imp.nombre}</strong></span>
            <button class="btn-outline" style="color:var(--danger); border-color:var(--danger); padding:0.2rem 0.5rem; font-size: 0.7rem;" onclick="eliminarImplementoTemp(${i})">X</button>
        </div>
    `).join('');
}

async function guardarClinica() {
    const nombre = document.getElementById('nuevaClinicaNombre').value;
    if (!nombre || horariosTemp.length === 0) return mostrarNotificacion('Nombre y al menos un horario son requeridos', 'warning');
    try {
        const res = await fetch(`${API_URL}/configuracion/clinicas`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, diasHorarios: horariosTemp, implementosRequeridos: implementosTemp })
        });
        if (res.ok) {
            document.getElementById('nuevaClinicaNombre').value = '';
            horariosTemp = []; renderizarHorariosTemp();
            implementosTemp = []; renderizarImplementosTemp();
            mostrarNotificacion('✅ Clínica guardada', 'success'); cargarClinicas();
        } else {
            const err = await res.json(); mostrarNotificacion(err.mensaje || 'Error', 'error');
        }
    } catch (e) { mostrarNotificacion('Error al guardar', 'error'); }
}

function cargarPlantillaSeleccionada() {
    const select = document.getElementById('selectPlantillaCargar');
    const plantillaId = select.value;
    if (!plantillaId) return;

    const plantilla = plantillasDelUsuario.find(p => p._id === plantillaId);
    if (!plantilla) return;

    document.getElementById('nuevaClinicaNombre').value = plantilla.nombre;

    // Limpiar horarios previos
    horariosTemp = [];
    renderizarHorariosTemp();

    // Cargar implementos de la plantilla
    implementosTemp = plantilla.implementos.map(i => ({ nombre: i.nombre, cantidad: i.cantidad }));
    renderizarImplementosTemp();

    mostrarNotificacion(`📋 Plantilla "${plantilla.nombre}" cargada.`, 'info');
    select.value = ""; // Reset select
}

// ==========================================
// API & LÓGICA DE PLANTILLAS
// ==========================================
async function cargarPlantillas() {
    if (!usuarioActivo) return;
    try {
        const res = await fetch(`${API_URL}/plantillas?usuarioId=${usuarioActivo._id}`);
        plantillasDelUsuario = await res.json();
        renderizarPlantillasConfig();
        renderizarSelectPlantillas();
    } catch (e) {
        console.error('Error cargando plantillas:', e);
    }
}

function renderizarPlantillasConfig() {
    const container = document.getElementById('plantillasListContainer');
    if (!container) return;

    if (plantillasDelUsuario.length === 0) {
        container.innerHTML = '<p class="text-muted">No tienes plantillas guardadas.</p>';
        return;
    }

    container.innerHTML = plantillasDelUsuario.map(p => `
        <div style="border: 1px solid var(--border); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; background: white;">
            <div>
                <strong>${p.nombre}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                    ${p.implementos.length} implementos
                </div>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="editarPlantillaDOM('${p._id}')">✏️</button>
                <button class="btn-outline" style="color: var(--danger); border-color: var(--danger); padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="eliminarPlantillaDOM('${p._id}', '${p.nombre}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderizarSelectPlantillas() {
    const select = document.getElementById('selectPlantillaCargar');
    if (!select) return;

    select.innerHTML = '<option value="">Cargar desde plantilla...</option>' +
        plantillasDelUsuario.map(p => `<option value="${p._id}">${p.nombre}</option>`).join('');
}

function agregarImplementoPlantilla() {
    const nombre = document.getElementById('plantillaImplementoNombre').value;
    const cantidad = parseInt(document.getElementById('plantillaImplementoCant').value) || 1;
    if (!nombre) return mostrarNotificacion('Ingresa el nombre del implemento', 'warning');

    nuevaPlantillaImplementos.push({ nombre, cantidad });
    document.getElementById('plantillaImplementoNombre').value = '';
    document.getElementById('plantillaImplementoCant').value = 1;
    renderizarImplementosPlantilla();
}

function eliminarImplementoPlantilla(index) {
    nuevaPlantillaImplementos.splice(index, 1);
    renderizarImplementosPlantilla();
}

function renderizarImplementosPlantilla() {
    const container = document.getElementById('plantillaImplementosList');
    if (!container) return;

    if (nuevaPlantillaImplementos.length === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">Sin implementos</p>';
        return;
    }

    container.innerHTML = nuevaPlantillaImplementos.map((imp, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--background); padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 0.85rem;">
            <span>${imp.cantidad}x <strong>${imp.nombre}</strong></span>
            <button class="btn-outline" style="color:var(--danger); border-color:var(--danger); padding:0.1rem 0.4rem; font-size: 0.6rem;" onclick="eliminarImplementoPlantilla(${i})">X</button>
        </div>
    `).join('');
}

async function guardarPlantilla() {
    const nombre = document.getElementById('nuevaPlantillaNombre').value;
    if (!nombre) return mostrarNotificacion('Ingresa el nombre de la plantilla', 'warning');

    try {
        const url = plantillaEnEdicionId ? `${API_URL}/plantillas/${plantillaEnEdicionId}` : `${API_URL}/plantillas`;
        const method = plantillaEnEdicionId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, implementos: nuevaPlantillaImplementos, usuarioId: usuarioActivo._id })
        });

        if (res.ok) {
            document.getElementById('nuevaPlantillaNombre').value = '';
            nuevaPlantillaImplementos = [];
            plantillaEnEdicionId = null;
            document.getElementById('btnGuardarPlantilla').textContent = 'Guardar Plantilla';
            renderizarImplementosPlantilla();
            mostrarNotificacion('✅ Plantilla guardada', 'success');
            await cargarPlantillas();
        } else {
            mostrarNotificacion('Error al guardar plantilla', 'error');
        }
    } catch (e) {
        mostrarNotificacion('Error de red', 'error');
    }
}

function editarPlantillaDOM(id) {
    const plantilla = plantillasDelUsuario.find(p => p._id === id);
    if (!plantilla) return;

    plantillaEnEdicionId = plantilla._id;
    document.getElementById('nuevaPlantillaNombre').value = plantilla.nombre;
    nuevaPlantillaImplementos = plantilla.implementos.map(i => ({ nombre: i.nombre, cantidad: i.cantidad }));

    document.getElementById('btnGuardarPlantilla').textContent = 'Actualizar Plantilla';
    renderizarImplementosPlantilla();
    mostrarNotificacion(`Editando plantilla: ${plantilla.nombre}`, 'info');
}

async function eliminarPlantillaDOM(id, nombre) {
    if (!(await customConfirm(`¿Eliminar la plantilla "${nombre}"?`))) return;
    try {
        const res = await fetch(`${API_URL}/plantillas/${id}`, { method: 'DELETE' });
        if (res.ok) {
            mostrarNotificacion('🗑️ Plantilla eliminada', 'success');
            await cargarPlantillas();
        } else {
            mostrarNotificacion('Error al eliminar', 'error');
        }
    } catch (e) {
        mostrarNotificacion('Error de red', 'error');
    }
}

// ==========================================
// UTILIDADES
// ==========================================
function mostrarNotificacion(mensaje, tipo = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    let icon = 'ℹ️';
    if (tipo === 'success') icon = '✅';
    else if (tipo === 'warning') icon = '⚠️';
    else if (tipo === 'error') icon = '❌';
    
    toast.innerHTML = `<span>${icon}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function iniciarActualizacionTiempos() {
    intervaloActualizacion = setInterval(() => {
        cargarInventario();
    }, 60000); // 1 minuto
}

function customConfirm(mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirm');
        document.getElementById('modalConfirmMensaje').textContent = mensaje;
        modal.style.display = 'flex';

        const btnConfirm = document.getElementById('btnConfirmAceptar');
        const btnCancel = document.getElementById('btnConfirmCancelar');

        const cleanup = () => {
            modal.style.display = 'none';
            btnConfirm.onclick = null;
            btnCancel.onclick = null;
        };

        btnConfirm.onclick = () => {
            cleanup();
            resolve(true);
        };
        btnCancel.onclick = () => {
            cleanup();
            resolve(false);
        };
    });
}

function customPrompt(mensaje, valorInicial = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalPrompt');
        document.getElementById('modalPromptMensaje').textContent = mensaje;
        const input = document.getElementById('modalPromptInput');
        input.value = valorInicial;
        modal.style.display = 'flex';
        input.focus();

        const btnConfirm = document.getElementById('btnPromptAceptar');
        const btnCancel = document.getElementById('btnPromptCancelar');

        const cleanup = () => {
            modal.style.display = 'none';
            btnConfirm.onclick = null;
            btnCancel.onclick = null;
        };

        btnConfirm.onclick = () => {
            cleanup();
            resolve(input.value);
        };
        btnCancel.onclick = () => {
            cleanup();
            resolve(null);
        };

        // Enter key support
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                btnConfirm.click();
            }
        };
    });
}

// ==========================================
// ADMINISTRADOR: LOGS DE AUDITORÍA
// ==========================================
async function cargarLogsAdmin() {
    try {
        const res = await fetch(`${API_URL}/logs`);
        const logs = await res.json();
        const tbody = document.getElementById('tablaLogsBody');
        tbody.innerHTML = '';

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay registros de actividad.</td></tr>';
        } else {
            logs.forEach(log => {
                const tr = document.createElement('tr');
                const fecha = new Date(log.createdAt).toLocaleString();
                tr.innerHTML = `
                    <td style="color:var(--text-muted); font-size:0.85rem;">${fecha}</td>
                    <td style="font-weight:bold; color:var(--primary);">${log.usuario}</td>
                    <td><span class="badge" style="background:var(--secondary-hover);">${log.accion}</span></td>
                    <td>${log.descripcion}</td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        document.getElementById('adminStatsLogs').textContent = logs.length;
        
        // Cargar stats de usuarios
        const resUsers = await fetch(`${API_URL}/usuarios`);
        const users = await resUsers.json();
        document.getElementById('adminStatsUsuarios').textContent = users.length || 0;

    } catch (error) {
        console.error('Error cargando logs:', error);
        mostrarNotificacion('No se pudieron cargar los logs', 'error');
    }
}

// ==========================================
// AUTOMATIZACIÓN CON PDF
// ==========================================

// Console/Terminal PDF logging utility
function logPDFProgress(mensaje, tipo = 'info') {
    const consoleLog = document.getElementById('pdfConsoleLog');
    if (!consoleLog) return;

    const line = document.createElement('div');
    line.className = `terminal-line ${tipo}-line`;
    
    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${mensaje}`;
    consoleLog.appendChild(line);
    
    // Auto-scroll to bottom
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

window.limpiarTerminalPDF = function() {
    const consoleLog = document.getElementById('pdfConsoleLog');
    if (consoleLog) {
        consoleLog.innerHTML = '<div class="terminal-line system-line">> Terminal lista. Esperando archivo PDF...</div>';
    }
};

async function procesarArchivoPDF(file) {
    window.limpiarTerminalPDF();
    logPDFProgress(`Iniciando análisis del archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'system');
    logPDFProgress('Enviando archivo al servidor para procesamiento con IA/Regex...', 'system');

    const formData = new FormData();
    formData.append('pdf', file);
    
    try {
        const res = await fetch(`${API_URL}/insumos/parse-pdf`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error((data.mensaje || 'Error en el servidor') + (data.error ? ': ' + data.error : ''));
        
        logPDFProgress(`Análisis completado con éxito!`, 'success');
        logPDFProgress(`Método de extracción: ${data.mensaje || 'N/A'}`, 'success');
        logPDFProgress(`Se detectaron ${data.insumosDetectados ? data.insumosDetectados.length : 0} insumos en el documento.`, 'info');
        
        return data.insumosDetectados || [];
    } catch (error) {
        logPDFProgress(`ERROR: ${error.message}`, 'error');
        mostrarNotificacion('Fallo en el procesamiento del PDF', 'error');
        return null;
    }
}

// Event Listeners para inputs de PDF
document.getElementById('pdfImportInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const insumosPDF = await procesarArchivoPDF(file);
    e.target.value = ''; // reset

    if (insumosPDF && insumosPDF.length > 0) {
        const confirmar = await customConfirm(`Se encontraron ${insumosPDF.length} insumos. ¿Proceder con la importación en Mis Cosas?`);
        if (confirmar) {
            logPDFProgress(`Iniciando importación secuencial a Mis Cosas...`, 'system');
            let exitos = 0;
            for (let item of insumosPDF) {
                try {
                    logPDFProgress(`Guardando: ${item.producto} (${item.codigo || 'S/C'})...`, 'info');
                    const res = await fetch(`${API_URL}/insumos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            nombre: item.producto, 
                            codigo: item.codigo, 
                            tipo: 'Importado de PDF', 
                            esterilizado: false, 
                            cantidad: item.cantidad, 
                            usuarioId: usuarioActivo._id 
                        })
                    });
                    if (res.ok) {
                        exitos++;
                        logPDFProgress(`✅ Guardado: ${item.producto}`, 'success');
                    } else {
                        logPDFProgress(`❌ Error al guardar: ${item.producto}`, 'error');
                    }
                } catch (err) {
                    logPDFProgress(`❌ Error de conexión para: ${item.producto}`, 'error');
                }
            }
            logPDFProgress(`Proceso de importación finalizado. Exitosos: ${exitos}/${insumosPDF.length}`, 'success');
            mostrarNotificacion('✅ Importación completada', 'success');
            cargarInventario();
        } else {
            logPDFProgress(`Importación cancelada por el usuario.`, 'warning');
        }
    } else if (insumosPDF && insumosPDF.length === 0) {
        logPDFProgress('No se detectaron insumos válidos en el PDF.', 'warning');
    }
});

document.getElementById('pdfSendInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const insumosPDF = await procesarArchivoPDF(file);
    e.target.value = '';

    if (insumosPDF && insumosPDF.length > 0) {
        const confirmar = await customConfirm(`Detectados ${insumosPDF.length} códigos en el PDF. ¿Mandar coincidentes a Esterilización?`);
        if (confirmar) {
            logPDFProgress(`Iniciando envío de insumos a Central de Esterilización...`, 'system');
            let enviados = 0;
            for (let item of insumosPDF) {
                const miInsumo = inventarioCompleto['mis_cosas']?.find(i => i.codigo === item.codigo) 
                    || Object.values(inventarioCompleto).flat().find(i => i.codigo === item.codigo && i.ubicacionActual !== 'central_esterilizacion');
                
                if (miInsumo) {
                    try {
                        logPDFProgress(`Enviando ${Math.min(item.cantidad, miInsumo.cantidad)} unidades de ${miInsumo.nombre} (${miInsumo.codigo})...`, 'info');
                        const res = await fetch(`${API_URL}/insumos/enviar-esterilizacion/${miInsumo._id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cantidad: Math.min(item.cantidad, miInsumo.cantidad) })
                        });
                        if (res.ok) {
                            enviados++;
                            logPDFProgress(`✅ Enviado con éxito`, 'success');
                        } else {
                            logPDFProgress(`❌ Fallo al enviar a central`, 'error');
                        }
                    } catch (err) {
                        logPDFProgress(`❌ Error de red`, 'error');
                    }
                } else {
                    logPDFProgress(`⚠️ Insumo con código ${item.codigo} no encontrado en tu inventario activo.`, 'warning');
                }
            }
            logPDFProgress(`Proceso finalizado. Total enviados: ${enviados}`, 'success');
            mostrarNotificacion(`✅ ${enviados} insumos enviados a esterilización`, 'success');
            cargarInventario();
        } else {
            logPDFProgress(`Envío cancelado por el usuario.`, 'warning');
        }
    }
});

document.getElementById('pdfReceiveInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const insumosPDF = await procesarArchivoPDF(file);
    e.target.value = '';

    if (insumosPDF && insumosPDF.length > 0) {
        const confirmar = await customConfirm(`Detectados ${insumosPDF.length} códigos en el PDF. ¿Recibir coincidentes desde Esterilización?`);
        if (confirmar) {
            logPDFProgress(`Iniciando recepción de insumos desde Central de Esterilización...`, 'system');
            let recibidos = 0;
            for (let item of insumosPDF) {
                const enCentral = inventarioCompleto['central_esterilizacion']?.filter(i => i.codigo === item.codigo);
                if (enCentral && enCentral.length > 0) {
                    for (let esterilizando of enCentral) {
                        try {
                            logPDFProgress(`Recibiendo: ${esterilizando.nombre} (${esterilizando.codigo})...`, 'info');
                            const res = await fetch(`${API_URL}/insumos/recibir-esterilizado/${esterilizando._id}`, {
                                method: 'PUT'
                            });
                            if (res.ok) {
                                recibidos++;
                                logPDFProgress(`✅ Recibido y guardado en Locker`, 'success');
                            } else {
                                logPDFProgress(`❌ Fallo al recibir de central`, 'error');
                            }
                        } catch (err) {
                            logPDFProgress(`❌ Error de red`, 'error');
                        }
                    }
                } else {
                    logPDFProgress(`⚠️ No hay insumos pendientes en Central con el código ${item.codigo}.`, 'warning');
                }
            }
            logPDFProgress(`Proceso finalizado. Total recibidos: ${recibidos}`, 'success');
            mostrarNotificacion(`✅ ${recibidos} registros recibidos y guardados en Locker`, 'success');
            cargarInventario();
        } else {
            logPDFProgress(`Recepción cancelada por el usuario.`, 'warning');
        }
    }
});

// ==========================================
// ADMIN DASHBOARD
// ==========================================
async function cargarDatosAdminDashboard() {
    try {
        const res = await fetch(`${API_URL}/admin/dashboard`);
        if (!res.ok) throw new Error('Error al obtener datos del admin');
        const data = await res.json();
        
        document.getElementById('adminStatClinicas').textContent = data.totalClinicas || 0;
        document.getElementById('adminStatInsumos').textContent = data.totalInsumos || 0;
        document.getElementById('adminStatUsuarios').textContent = data.totalUsuarios || 0;

        const tbody = document.getElementById('adminTablaClinicas');
        if (tbody) {
            tbody.innerHTML = '';
            if (data.clinicas && data.clinicas.length > 0) {
                data.clinicas.forEach(clinica => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${clinica.nombre}</strong></td>
                        <td style="color: var(--text-muted); font-size: 0.85rem;">${clinica.idInterno || clinica._id.substring(0, 8)}</td>
                        <td>${clinica.plantillasCount || 0} plantillas</td>
                        <td>${clinica.horariosCount || 0} turnos</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No hay clínicas registradas</td></tr>`;
            }
        }
    } catch (error) {
        console.error(error);
        mostrarNotificacion('No se pudieron cargar los datos del Admin Dashboard', 'error');
    }
}

// ==========================================
// PERFIL Y GESTIÓN DE USUARIOS
// ==========================================
function cargarPerfil() {
    if (!usuarioActivo) return;
    
    document.getElementById('perfilCarnet').value = usuarioActivo.carnet;
    document.getElementById('perfilNombre').value = usuarioActivo.nombre;
    document.getElementById('perfilPassword').value = '';
    
    const titulo = document.getElementById('nombrePerfilTitle');
    if (titulo) titulo.textContent = usuarioActivo.nombre;
    
    const rolBadge = document.getElementById('rolPerfilBadge');
    if (rolBadge) {
        rolBadge.textContent = usuarioActivo.rol === 'admin' ? 'Administrador' : 'Usuario';
        rolBadge.className = usuarioActivo.rol === 'admin' ? 'badge badge-warning' : 'badge badge-success';
    }
    
    const avatar = document.getElementById('avatarPerfil');
    if (avatar) avatar.textContent = usuarioActivo.nombre.charAt(0).toUpperCase();
}

async function guardarPerfil(e) {
    e.preventDefault();
    if (!usuarioActivo) return;
    
    const nombre = document.getElementById('perfilNombre').value;
    const password = document.getElementById('perfilPassword').value;
    
    const payload = {};
    if (nombre) payload.nombre = nombre;
    if (password) payload.password = password;
    
    try {
        const res = await fetch(`${API_URL}/usuarios/${usuarioActivo._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error al guardar');
        
        // Update local session
        usuarioActivo = data.usuario;
        localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
        
        cargarPerfil();
        mostrarNotificacion('✅ Perfil actualizado correctamente', 'success');
        
        const lblUsuario = document.getElementById('lblUsuarioDropdown');
        if (lblUsuario) lblUsuario.textContent = usuarioActivo.nombre;
        const avatarTrigger = document.getElementById('avatarTrigger');
        if (avatarTrigger) avatarTrigger.textContent = usuarioActivo.nombre.charAt(0).toUpperCase();
        
    } catch (error) {
        mostrarNotificacion(error.message, 'error');
    }
}

async function cargarUsuariosAdmin() {
    try {
        const res = await fetch(`${API_URL}/usuarios`);
        if (!res.ok) throw new Error('Error al cargar usuarios');
        
        const usuarios = await res.json();
        const tbody = document.getElementById('tablaUsuariosAdminBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.carnet}</strong></td>
                <td>${u.nombre}</td>
                <td>
                    <select onchange="cambiarRolUsuario('${u._id}', this.value)" class="input-select" style="padding: 0.2rem; font-size: 0.85rem; background-color: var(--background);">
                        <option value="usuario" ${u.rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                        <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                    </select>
                </td>
                <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn-outline text-danger" onclick="eliminarUsuario('${u._id}')" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; border-color: var(--danger);" ${u.carnet === 'admin' ? 'disabled' : ''}>🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        mostrarNotificacion('Error al cargar usuarios', 'error');
    }
}

async function cambiarRolUsuario(id, nuevoRol) {
    if (!confirm(`¿Estás seguro de cambiar el rol a ${nuevoRol}?`)) {
        cargarUsuariosAdmin(); // reset select
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rol: nuevoRol })
        });
        
        if (!res.ok) throw new Error('Error al cambiar rol');
        mostrarNotificacion('✅ Rol actualizado', 'success');
        cargarUsuariosAdmin();
    } catch (error) {
        mostrarNotificacion(error.message, 'error');
        cargarUsuariosAdmin();
    }
}

async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción es irreversible.')) return;
    
    try {
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) throw new Error('Error al eliminar usuario');
        mostrarNotificacion('✅ Usuario eliminado', 'success');
        cargarUsuariosAdmin();
    } catch (error) {
        mostrarNotificacion(error.message, 'error');
    }
}

function setupDragAndDrop() {
    const setupZone = (zoneId, inputId, onFileDrop) => {
        const zone = document.getElementById(zoneId);
        if (!zone) return;

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                onFileDrop(file);
            } else {
                mostrarNotificacion('Solo se permiten archivos PDF', 'warning');
            }
        });
    };

    // 1. Importar en Mis Cosas
    setupZone('pdfImportDropZone', 'pdfImportInput', async (file) => {
        const insumosPDF = await procesarArchivoPDF(file);
        if (insumosPDF && insumosPDF.length > 0) {
            const confirmar = await customConfirm(`Se encontraron ${insumosPDF.length} insumos. ¿Proceder con la importación en Mis Cosas?`);
            if (confirmar) {
                logPDFProgress(`Iniciando importación secuencial a Mis Cosas...`, 'system');
                let exitos = 0;
                for (let item of insumosPDF) {
                    try {
                        logPDFProgress(`Guardando: ${item.producto} (${item.codigo || 'S/C'})...`, 'info');
                        const res = await fetch(`${API_URL}/insumos`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                nombre: item.producto, 
                                codigo: item.codigo, 
                                tipo: 'Importado de PDF', 
                                esterilizado: false, 
                                cantidad: item.cantidad, 
                                usuarioId: usuarioActivo._id 
                            })
                        });
                        if (res.ok) {
                            exitos++;
                            logPDFProgress(`✅ Guardado: ${item.producto}`, 'success');
                        } else {
                            logPDFProgress(`❌ Error al guardar: ${item.producto}`, 'error');
                        }
                    } catch (err) {
                        logPDFProgress(`❌ Error de conexión para: ${item.producto}`, 'error');
                    }
                }
                logPDFProgress(`Proceso de importación finalizado. Exitosos: ${exitos}/${insumosPDF.length}`, 'success');
                mostrarNotificacion('✅ Importación completada', 'success');
                cargarInventario();
            } else {
                logPDFProgress(`Importación cancelada por el usuario.`, 'warning');
            }
        } else if (insumosPDF && insumosPDF.length === 0) {
            logPDFProgress('No se detectaron insumos válidos en el PDF.', 'warning');
        }
    });

    // 2. Enviar según PDF
    setupZone('pdfSendDropZone', 'pdfSendInput', async (file) => {
        const insumosPDF = await procesarArchivoPDF(file);
        if (insumosPDF && insumosPDF.length > 0) {
            const confirmar = await customConfirm(`Detectados ${insumosPDF.length} códigos en el PDF. ¿Mandar coincidentes a Esterilización?`);
            if (confirmar) {
                logPDFProgress(`Iniciando envío de insumos a Central de Esterilización...`, 'system');
                let enviados = 0;
                for (let item of insumosPDF) {
                    const miInsumo = inventarioCompleto['mis_cosas']?.find(i => i.codigo === item.codigo) 
                        || Object.values(inventarioCompleto).flat().find(i => i.codigo === item.codigo && i.ubicacionActual !== 'central_esterilizacion');
                    
                    if (miInsumo) {
                        try {
                            logPDFProgress(`Enviando ${Math.min(item.cantidad, miInsumo.cantidad)} unidades de ${miInsumo.nombre} (${miInsumo.codigo})...`, 'info');
                            const res = await fetch(`${API_URL}/insumos/enviar-esterilizacion/${miInsumo._id}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ cantidad: Math.min(item.cantidad, miInsumo.cantidad) })
                            });
                            if (res.ok) {
                                enviados++;
                                logPDFProgress(`✅ Enviado con éxito`, 'success');
                            } else {
                                logPDFProgress(`❌ Fallo al enviar a central`, 'error');
                            }
                        } catch (err) {
                            logPDFProgress(`❌ Error de red`, 'error');
                        }
                    } else {
                        logPDFProgress(`⚠️ Insumo con código ${item.codigo} no encontrado en tu inventario activo.`, 'warning');
                    }
                }
                logPDFProgress(`Proceso finalizado. Total enviados: ${enviados}`, 'success');
                mostrarNotificacion(`✅ ${enviados} insumos enviados a esterilización`, 'success');
                cargarInventario();
            } else {
                logPDFProgress(`Envío cancelado por el usuario.`, 'warning');
            }
        }
    });

    // 3. Recibir según PDF
    setupZone('pdfReceiveDropZone', 'pdfReceiveInput', async (file) => {
        const insumosPDF = await procesarArchivoPDF(file);
        if (insumosPDF && insumosPDF.length > 0) {
            const confirmar = await customConfirm(`Detectados ${insumosPDF.length} códigos en el PDF. ¿Recibir coincidentes desde Esterilización?`);
            if (confirmar) {
                logPDFProgress(`Iniciando recepción de insumos desde Central de Esterilización...`, 'system');
                let recibidos = 0;
                for (let item of insumosPDF) {
                    const enCentral = inventarioCompleto['central_esterilizacion']?.filter(i => i.codigo === item.codigo);
                    if (enCentral && enCentral.length > 0) {
                        for (let esterilizando of enCentral) {
                            try {
                                logPDFProgress(`Recibiendo: ${esterilizando.nombre} (${esterilizando.codigo})...`, 'info');
                                const res = await fetch(`${API_URL}/insumos/recibir-esterilizado/${esterilizando._id}`, {
                                    method: 'PUT'
                                });
                                if (res.ok) {
                                    recibidos++;
                                    logPDFProgress(`✅ Recibido y guardado en Locker`, 'success');
                                } else {
                                    logPDFProgress(`❌ Fallo al recibir de central`, 'error');
                                }
                            } catch (err) {
                                logPDFProgress(`❌ Error de red`, 'error');
                            }
                        }
                    } else {
                        logPDFProgress(`⚠️ No hay insumos pendientes en Central con el código ${item.codigo}.`, 'warning');
                    }
                }
                logPDFProgress(`Proceso finalizado. Total recibidos: ${recibidos}`, 'success');
                mostrarNotificacion(`✅ ${recibidos} registros recibidos y guardados en Locker`, 'success');
                cargarInventario();
            } else {
                logPDFProgress(`Recepción cancelada por el usuario.`, 'warning');
            }
        }
    });

    // Evitar el comportamiento por defecto de drag & drop del navegador en la página
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });
}