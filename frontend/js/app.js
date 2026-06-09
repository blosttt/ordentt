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
    verificarSesion();
    setupModals();
    setupEventListeners();
});

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
        document.getElementById('modalLogin').style.display = 'block';
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
        document.getElementById('btnMenuAdminPanel').style.display = 'block';
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
    document.getElementById('vistaHome').style.display = 'block';
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
    const vistaConfig = document.getElementById('vistaConfig');
    const vistaPerfil = document.getElementById('vistaPerfil');
    const vistaAdmin = document.getElementById('vistaAdmin');

    function hideAll() {
        vistaHome.style.display = 'none';
        vistaMisCosas.style.display = 'none';
        vistaContenedores.style.display = 'none';
        vistaTabla.style.display = 'none';
        vistaHorario.style.display = 'none';
        vistaConfig.style.display = 'none';
        vistaPerfil.style.display = 'none';
        vistaAdmin.style.display = 'none';
    }

    // --- Header Logo ---
    document.getElementById('btnLogoHome').onclick = () => {
        hideAll();
        vistaHome.style.display = 'block';
    };

    // --- Dropdown Menu Logic ---
    const avatarTrigger = document.getElementById('avatarTrigger');
    const profileDropdown = document.getElementById('profileDropdown');

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

    // --- Dropdown Navigation Actions ---
    document.getElementById('btnMenuMisDatos').onclick = (e) => {
        e.preventDefault();
        hideAll();
        vistaPerfil.style.display = 'block';
        if (usuarioActivo) {
            document.getElementById('nombrePerfil').textContent = usuarioActivo.nombre;
            document.getElementById('carnetPerfil').textContent = `Carnet / ID: ${usuarioActivo.carnet}`;
            document.getElementById('avatarPerfil').textContent = usuarioActivo.nombre.charAt(0).toUpperCase();
        }
    };

    const openConfigAndScroll = (sectionId) => {
        hideAll();
        vistaConfig.style.display = 'block';
        cargarClinicas();
        cargarCajas();
        cargarPlantillas();
        setTimeout(() => {
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    document.getElementById('btnMenuConfPlantillas').onclick = (e) => { e.preventDefault(); openConfigAndScroll('secPlantillas'); };
    document.getElementById('btnMenuConfClinicas').onclick = (e) => { e.preventDefault(); openConfigAndScroll('secClinicas'); };
    document.getElementById('btnMenuConfContenedores').onclick = (e) => { e.preventDefault(); openConfigAndScroll('secContenedores'); };

    const btnAdminPanel = document.getElementById('btnMenuAdminPanel');
    if (btnAdminPanel) {
        btnAdminPanel.onclick = (e) => {
            e.preventDefault();
            hideAll();
            vistaAdmin.style.display = 'block';
            cargarLogsAdmin();
        };
    }

    document.getElementById('btnMenuMisCosas').onclick = (e) => {
        e.preventDefault();
        hideAll();
        vistaMisCosas.style.display = 'block';
        cargarInventario();
    };

    document.getElementById('btnMenuDashboard').onclick = (e) => {
        e.preventDefault();
        hideAll();
        vistaContenedores.style.display = 'block';
        cargarInventario();
    };

    document.getElementById('btnMenuHorario').onclick = (e) => {
        e.preventDefault();
        hideAll();
        vistaHorario.style.display = 'block';
        renderizarHorario();
    };

    document.getElementById('btnLogoutDropdown').onclick = (e) => {
        e.preventDefault();
        logout();
    };

    // --- Home Cards Logic ---
    document.getElementById('cardHomeMisCosas').onclick = () => { document.getElementById('btnMenuMisCosas').click(); };
    document.getElementById('cardHomeDashboard').onclick = () => { document.getElementById('btnMenuDashboard').click(); };
    document.getElementById('btnHomeToHorario').onclick = () => { document.getElementById('btnMenuHorario').click(); };
}

// ==========================================
// MODALS
// ==========================================
function setupModals() {
    const modalInsumo = document.getElementById('modalInsumo');
    const modalSolicitud = document.getElementById('modalSolicitud');

    // Placeholder para abrir modal
    window.abrirModalAddInsumo = () => {
        cargarCatalogo();
        modalInsumo.style.display = 'block';
    };

    document.getElementById('closeModalInsumo').onclick = () => modalInsumo.style.display = 'none';

    document.getElementById('btnAgregarSolicitud').onclick = () => abrirModalSolicitud();
    document.getElementById('closeModalSolicitud').onclick = () => modalSolicitud.style.display = 'none';

    window.onclick = (event) => {
        if (event.target === modalInsumo) modalInsumo.style.display = 'none';
        if (event.target === modalSolicitud) modalSolicitud.style.display = 'none';
    };

    document.getElementById('formInsumo').onsubmit = guardarInsumo;
    document.getElementById('formSolicitud').onsubmit = guardarSolicitud;
}

function cargarCatalogo() {
    const datalist = document.getElementById('listaCatalogo');
    if (!datalist) return;
    if (datalist.options.length === 0 && typeof catalogoInsumos !== 'undefined') {
        let html = '';
        catalogoInsumos.forEach(item => {
            html += `<option value="${item.codigo} - ${item.nombre}"></option>`;
        });
        html += '<option value="➕ Agregar insumo personalizado (OTRO)"></option>';
        datalist.innerHTML = html;
    }
}

function seleccionarDelCatalogo() {
    const inputBuscador = document.getElementById('catalogoInput');
    const customDiv = document.getElementById('camposPersonalizados');
    const inputNombre = document.getElementById('nombre');
    const inputCodigo = document.getElementById('codigo');

    const valor = inputBuscador.value;

    if (valor === '➕ Agregar insumo personalizado (OTRO)') {
        customDiv.style.display = 'block';
        inputNombre.value = '';
        inputCodigo.value = '';
        inputNombre.readOnly = false;
        inputCodigo.readOnly = false;
        inputNombre.required = true;
        inputCodigo.required = true;
    } else if (valor.includes(' - ')) {
        const partes = valor.split(' - ');
        const codigo = partes[0];
        const nombre = partes.slice(1).join(' - ');

        const existe = typeof catalogoInsumos !== 'undefined' && catalogoInsumos.find(i => i.codigo === codigo);

        customDiv.style.display = 'block';
        inputNombre.value = nombre;
        inputCodigo.value = codigo;

        if (existe) {
            inputNombre.readOnly = true;
            inputCodigo.readOnly = true;
        } else {
            inputNombre.readOnly = false;
            inputCodigo.readOnly = false;
        }
        inputNombre.required = true;
        inputCodigo.required = true;
    } else {
        customDiv.style.display = 'block';
        inputNombre.value = valor;
        inputCodigo.value = '';
        inputNombre.readOnly = false;
        inputCodigo.readOnly = false;
        inputNombre.required = true;
        inputCodigo.required = true;
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
    document.getElementById('modalSolicitud').style.display = 'block';
}

// ==========================================
// EVENT LISTENERS SECUNDARIOS
// ==========================================
function setupEventListeners() {
    const btnGuardarClinica = document.getElementById('btnGuardarClinica');
    if (btnGuardarClinica) btnGuardarClinica.onclick = guardarClinica;

    const btnAgregarDiaHorario = document.getElementById('btnAgregarDiaHorario');
    if (btnAgregarDiaHorario) btnAgregarDiaHorario.onclick = agregarHorarioTemp;

    const btnAgregarImplemento = document.getElementById('btnAgregarImplemento');
    if (btnAgregarImplemento) btnAgregarImplemento.onclick = agregarImplementoTemp;

    const btnAgregarInsumoHeader = document.getElementById('btnAgregarInsumoHeader');
    if (btnAgregarInsumoHeader) btnAgregarInsumoHeader.onclick = abrirModalAddInsumo;

    const btnAgregarCaja = document.getElementById('btnAgregarCaja');
    if (btnAgregarCaja) btnAgregarCaja.onclick = crearCaja;

    const btnPlantillaAddImp = document.getElementById('btnPlantillaAddImp');
    if (btnPlantillaAddImp) btnPlantillaAddImp.onclick = agregarImplementoPlantilla;

    const btnGuardarPlantilla = document.getElementById('btnGuardarPlantilla');
    if (btnGuardarPlantilla) btnGuardarPlantilla.onclick = guardarPlantilla;

    document.getElementById('fechaInicio')?.addEventListener('change', renderizarTablaSolicitudes);
    document.getElementById('soloVigentes')?.addEventListener('change', renderizarTablaSolicitudes);
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
    const nombre = document.getElementById('nombre').value;
    const codigo = document.getElementById('codigo').value;
    const descripcion = document.getElementById('descripcion').value || 'Sin descripción';
    const cantidad = document.getElementById('cantidadInsumo').value;

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
            document.getElementById('camposPersonalizados').style.display = 'none';
            mostrarNotificacion('✅ Insumo guardado en Mis Cosas', 'success');
            cargarInventario();
        } else {
            mostrarNotificacion('Error al guardar', 'error');
        }
    } catch (error) {
        mostrarNotificacion('Error de conexión', 'error');
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
                if (ins.nombre.toLowerCase().includes(nombreReq.toLowerCase()) || nombreReq.toLowerCase().includes(ins.nombre.toLowerCase())) {
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
function mostrarNotificacion(mensaje, tipo) {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s forwards';
        setTimeout(() => notificacion.remove(), 300);
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