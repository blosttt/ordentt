const Insumo = require('../models/Insumo');
const Clinica = require('../models/Clinica');
const Log = require('../models/Log');
const Usuario = require('../models/Usuario');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

function calcularTiempoEnCentral(fechaEnvio) {
    if (!fechaEnvio) return null;
    const ahora = new Date();
    const envio = new Date(fechaEnvio);
    const diffMs = ahora - envio;
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);
    const horasRestantes = diffHoras % 24;

    return {
        horas: diffHoras,
        dias: diffDias,
        horasRestantes: horasRestantes,
        texto: `${diffDias} días y ${horasRestantes} horas`
    };
}

function calcularFechaDevolucion(fechaEnvio) {
    // 72 horas hábiles / 8 horas diarias = 9 días hábiles exactos
    let fechaDevolucion = new Date(fechaEnvio);
    let diasNecesarios = 9;
    let diasContados = 0;
    
    while (diasContados < diasNecesarios) {
        fechaDevolucion.setDate(fechaDevolucion.getDate() + 1);
        const diaSemana = fechaDevolucion.getDay();
        // 0 es Domingo, 6 es Sábado
        if (diaSemana !== 0 && diaSemana !== 6) {
            diasContados++;
        }
    }
    
    // Establecer el horario de entrega (16:30 hrs)
    fechaDevolucion.setHours(16, 30, 0, 0);
    
    return fechaDevolucion;
}

exports.getInventario = async (req, res) => {
    try {
        const { usuarioId } = req.query;
        let query = {};
        if (usuarioId) query.usuarioId = usuarioId;

        // Obtener las cajas del usuario para inicializar el inventario
        const Caja = require('../models/Caja');
        let cajas = [];
        if (usuarioId) {
            cajas = await Caja.find({ usuarioId });
        }
        
        const inventario = {};
        // Inicializar todas las cajas conocidas (y mis_cosas por defecto)
        inventario['mis_cosas'] = [];
        cajas.forEach(c => {
            inventario[c.slug] = [];
        });
        
        // Asegurar que central de esterilización exista
        if (!inventario['central_esterilizacion']) inventario['central_esterilizacion'] = [];

        const insumos = await Insumo.find(query);
        
        insumos.forEach(insumo => {
            const iObj = insumo.toObject();
            if (iObj.ubicacionActual === 'central_esterilizacion' && iObj.fechaEnvioEsterilizacion) {
                iObj.tiempoEnCentral = calcularTiempoEnCentral(iObj.fechaEnvioEsterilizacion);
            }
            
            // Si la caja ya no existe, la ponemos en mis_cosas o creamos el arreglo dinámicamente
            if (!inventario[iObj.ubicacionActual]) {
                inventario[iObj.ubicacionActual] = [];
            }
            
            inventario[iObj.ubicacionActual].push(iObj);
        });
        
        res.json(inventario);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo inventario', error: error.message });
    }
};

exports.crearInsumo = async (req, res) => {
    try {
        const { nombre, codigo, tipo, esterilizado, cantidad, usuarioId } = req.body;
        
        if (!usuarioId) return res.status(400).json({ mensaje: 'Se requiere un usuario activo' });

        const esterilizadoE = esterilizado || false;
        const cantE = cantidad || 1;

        const existente = await Insumo.findOne({
            usuarioId,
            codigo,
            tipo,
            esterilizado: esterilizadoE,
            ubicacionActual: 'mis_cosas'
        });

        if (existente) {
            existente.cantidad += cantE;
            existente.historial.push({
                accion: 'Suma de inventario',
                nota: `Se agregaron ${cantE} unidades (Total: ${existente.cantidad})`
            });
            await existente.save();
            return res.status(200).json({ mensaje: 'Insumo apilado correctamente', insumo: existente });
        }

        const nuevoInsumo = new Insumo({
            usuarioId,
            nombre,
            codigo,
            tipo,
            cantidad: cantE,
            esterilizado: esterilizadoE,
            ubicacionActual: 'mis_cosas',
            historial: [{
                accion: 'Creación de insumo',
                nota: `Insumo creado en Mis Cosas con cantidad: ${cantE}`
            }]
        });
        
        await nuevoInsumo.save();
        
        const user = await Usuario.findById(usuarioId);
        await Log.create({
            usuario: user ? user.nombre : 'Desconocido',
            accion: 'CREAR_INSUMO',
            descripcion: `Creó el insumo "${nombre}" (${cantE} uds) en Mis Cosas.`
        });
        
        res.status(201).json({ mensaje: 'Insumo creado correctamente', insumo: nuevoInsumo });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error creando insumo', error: error.message });
    }
};

exports.eliminarInsumo = async (req, res) => {
    try {
        await Insumo.findByIdAndDelete(req.params.id);
        res.json({ mensaje: 'Insumo eliminado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error eliminando insumo', error: error.message });
    }
};

exports.actualizarInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.body; // Assuming 'tipo' stores the description
        
        const insumo = await Insumo.findById(id);
        if (!insumo) return res.status(404).json({ mensaje: 'Insumo no encontrado' });
        
        insumo.tipo = tipo; // Updating description (stored in 'tipo' based on earlier context)
        insumo.historial.push({
            accion: 'Actualización de descripción',
            nota: 'Descripción modificada en el dashboard'
        });
        
        await insumo.save();
        res.json({ mensaje: 'Insumo actualizado', insumo });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error actualizando insumo', error: error.message });
    }
};
exports.moverInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevaUbicacion, cantidadMover } = req.body;
        
        const insumo = await Insumo.findById(id);
        if (!insumo) return res.status(404).json({ mensaje: 'Insumo no encontrado' });
        
        const cant = parseInt(cantidadMover) || insumo.cantidad;
        
        if (cant > insumo.cantidad || cant <= 0) {
            return res.status(400).json({ mensaje: 'Cantidad inválida' });
        }

        // Buscar si ya existe uno igual en el destino
        const insumoDestino = await Insumo.findOne({
            usuarioId: insumo.usuarioId,
            codigo: insumo.codigo,
            tipo: insumo.tipo,
            esterilizado: insumo.esterilizado,
            ubicacionActual: nuevaUbicacion
        });

        if (insumoDestino && insumoDestino._id.toString() !== insumo._id.toString()) {
            insumoDestino.cantidad += cant;
            insumoDestino.historial.push({ accion: 'Suma por movimiento', nota: `${cant} unidades recibidas de ${insumo.ubicacionActual}` });
            await insumoDestino.save();

            insumo.cantidad -= cant;
            if (insumo.cantidad <= 0) {
                await Insumo.findByIdAndDelete(insumo._id);
            } else {
                insumo.historial.push({ accion: 'División por movimiento', nota: `${cant} enviadas a ${nuevaUbicacion}` });
                await insumo.save();
            }
            const user = await Usuario.findById(insumo.usuarioId);
            if(user) {
                await Log.create({
                    usuario: user.nombre,
                    accion: 'MOVER_INSUMO',
                    descripcion: `Movió ${cant} uds de "${insumo.nombre}" a ${nuevaUbicacion}`
                });
            }
            return res.json({ mensaje: 'Insumo movido y apilado', insumo: insumoDestino });
        }

        if (cant === insumo.cantidad) {
            // Mover todo sin apilar
            insumo.ubicacionActual = nuevaUbicacion;
            insumo.historial.push({ accion: 'Movimiento completo', nota: `Movido a ${nuevaUbicacion}` });
            await insumo.save();
            
            const user = await Usuario.findById(insumo.usuarioId);
            if(user) {
                await Log.create({
                    usuario: user.nombre,
                    accion: 'MOVER_INSUMO',
                    descripcion: `Movió ${cant} uds de "${insumo.nombre}" a ${nuevaUbicacion}`
                });
            }
            
            return res.json({ mensaje: 'Insumo movido completamente', insumo });
        } else {
            // Dividir insumo sin apilar
            insumo.cantidad -= cant;
            insumo.historial.push({ accion: 'División de inventario', nota: `${cant} unidades movidas a ${nuevaUbicacion}` });
            await insumo.save();

            const nuevoInsumo = new Insumo({
                usuarioId: insumo.usuarioId,
                nombre: insumo.nombre,
                codigo: insumo.codigo,
                tipo: insumo.tipo,
                cantidad: cant,
                esterilizado: insumo.esterilizado,
                ubicacionActual: nuevaUbicacion,
                historial: [{ accion: 'Separación por movimiento', nota: `Creado a partir del original movido a ${nuevaUbicacion}` }]
            });
            await nuevoInsumo.save();
            
            const user = await Usuario.findById(insumo.usuarioId);
            if(user) {
                await Log.create({
                    usuario: user.nombre,
                    accion: 'MOVER_INSUMO',
                    descripcion: `Movió ${cant} uds de "${insumo.nombre}" a ${nuevaUbicacion}`
                });
            }
            
            return res.json({ mensaje: 'Insumo dividido y movido', insumo: nuevoInsumo });
        }
    } catch (error) {
        res.status(500).json({ mensaje: 'Error moviendo insumo', error: error.message });
    }
};

exports.enviarEsterilizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidadMover } = req.body;
        
        const insumo = await Insumo.findById(id);
        if (!insumo) return res.status(404).json({ mensaje: 'Insumo no encontrado' });
        
        const cant = parseInt(cantidadMover) || insumo.cantidad;
        if (cant > insumo.cantidad || cant <= 0) return res.status(400).json({ mensaje: 'Cantidad inválida' });

        const fechaActual = new Date();
        const fechaDevolucion = calcularFechaDevolucion(fechaActual);
        
        let insumoEsterilizar = insumo;

        if (cant < insumo.cantidad) {
            // Se manda solo una parte, crear nuevo doc
            insumo.cantidad -= cant;
            insumo.historial.push({ accion: 'División para esterilizar', nota: `${cant} enviados a esterilizar` });
            await insumo.save();

            insumoEsterilizar = new Insumo({
                usuarioId: insumo.usuarioId,
                nombre: insumo.nombre,
                codigo: insumo.codigo,
                tipo: insumo.tipo,
                cantidad: cant,
                esterilizado: false,
                ubicacionActual: 'central_esterilizacion',
                fechaEnvioEsterilizacion: fechaActual,
                fechaDevolucionEstimada: fechaDevolucion,
                historial: [{ accion: 'Enviado a esterilización', nota: `Devolución estimada: ${fechaDevolucion.toLocaleString()}` }]
            });
            await insumoEsterilizar.save();
        } else {
            // Se manda todo
            insumoEsterilizar.ubicacionActual = 'central_esterilizacion';
            insumoEsterilizar.esterilizado = false;
            insumoEsterilizar.fechaEnvioEsterilizacion = fechaActual;
            insumoEsterilizar.fechaDevolucionEstimada = fechaDevolucion;
            insumoEsterilizar.historial.push({ accion: 'Enviado a esterilización', nota: `Devolución estimada: ${fechaDevolucion.toLocaleString()}` });
            await insumoEsterilizar.save();
        }
        
        res.json({ 
            mensaje: 'Enviado a esterilización',
            fechaDevolucion,
            insumo: insumoEsterilizar
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error enviando a esterilizar', error: error.message });
    }
};

exports.recibirEsterilizado = async (req, res) => {
    try {
        const { id } = req.params;
        const insumo = await Insumo.findById(id);
        if (!insumo) return res.status(404).json({ mensaje: 'Insumo no encontrado' });
        
        const destinoAca = await Insumo.findOne({
            usuarioId: insumo.usuarioId,
            codigo: insumo.codigo,
            tipo: insumo.tipo,
            esterilizado: true,
            ubicacionActual: 'locker_universidad'
        });

        if (destinoAca) {
            destinoAca.cantidad += insumo.cantidad;
            destinoAca.historial.push({ accion: 'Recibido de esterilización', nota: `${insumo.cantidad} unidades agregadas` });
            await destinoAca.save();
            await Insumo.findByIdAndDelete(insumo._id);
            return res.json({ mensaje: 'Insumo recibido y apilado', insumo: destinoAca });
        }
        
        insumo.ubicacionActual = 'locker_universidad';
        insumo.esterilizado = true;
        insumo.historial.push({ accion: 'Recibido de esterilización', nota: 'Guardado en locker' });
        await insumo.save();
        
        res.json({ mensaje: 'Insumo recibido correctamente', insumo });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error recibiendo insumo', error: error.message });
    }
};

exports.parsePdf = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ mensaje: 'No se subió ningún archivo PDF' });
        }

        const dataBuffer = req.file.buffer;
        const data = await pdfParse(dataBuffer);
        const text = data.text;

        let parsedItems = [];
        let usoIA = false;
        let metodo = 'ninguno';

        // Intentar con IA si hay API Key
        if (process.env.GEMINI_API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            const prompt = `
Analiza el siguiente texto extraído de un documento PDF de inventario médico/odontológico.
Es una orden de esterilización de una universidad con una tabla que tiene columnas CANTIDAD, CODIGO y PRODUCTO.
Extrae ÚNICAMENTE los insumos de la tabla (ignora encabezados, metadatos del documento como usuario, fecha, etc.).
Devuelve ÚNICAMENTE un arreglo JSON válido donde cada objeto tenga:
- "cantidad": número entero
- "codigo": string del código del producto
- "producto": string con el nombre del producto

No incluyas markdown, ni saludos, ni ningún otro texto. Solo el arreglo JSON crudo.
Si no encuentras insumos, devuelve un arreglo vacío [].

TEXTO DEL PDF:
${text}
`;

            const modelosATratar = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
            let lastError;

            for (let i = 0; i < modelosATratar.length; i++) {
                try {
                    const response = await ai.models.generateContent({
                        model: modelosATratar[i],
                        contents: prompt,
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: 'ARRAY',
                                items: {
                                    type: 'OBJECT',
                                    properties: {
                                        cantidad: { type: 'INTEGER' },
                                        codigo: { type: 'STRING' },
                                        producto: { type: 'STRING' }
                                    },
                                    required: ['cantidad', 'codigo', 'producto']
                                }
                            }
                        }
                    });
                    
                    let rawResponse = response.text;
                    let parsed = JSON.parse(rawResponse);
                    let items = null;
                    
                    if (Array.isArray(parsed)) {
                        items = parsed;
                    } else if (parsed && typeof parsed === 'object') {
                        // Buscar cualquier propiedad que sea un arreglo
                        for (const key in parsed) {
                            if (Array.isArray(parsed[key])) {
                                items = parsed[key];
                                break;
                            }
                        }
                        // Si no es arreglo pero es un objeto con propiedades esperadas, envolverlo
                        if (!items && (parsed.cantidad !== undefined || parsed.codigo !== undefined || parsed.producto !== undefined)) {
                            items = [parsed];
                        }
                    }

                    if (items && items.length > 0) {
                        parsedItems = items.map(item => ({
                            cantidad: parseInt(item.cantidad, 10) || 1,
                            codigo: String(item.codigo || 'S/C').trim(),
                            producto: String(item.producto || 'Insumo sin nombre').trim()
                        }));
                        usoIA = true;
                        metodo = `IA (${modelosATratar[i]})`;
                        break;
                    }
                } catch (err) {
                    lastError = err;
                    console.warn(`Intento ${i + 1} con ${modelosATratar[i]} falló: ${err.message}`);
                    // Reintento rápido para no exceder los 30s de Render
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            if (!usoIA) {
                console.warn(`IA falló después de todos los intentos: ${lastError ? lastError.message : 'Error desconocido'}. Usando fallback regex.`);
            }
        } else {
            console.warn('GEMINI_API_KEY no configurada. Usando parseo regex directamente.');
        }

        // Fallback: Parseo con Regex si la IA no funcionó
        if (!usoIA || parsedItems.length === 0) {
            parsedItems = [];
            
            const palabrasIgnorar = /^\s*(CANTIDAD|CODIGO|PRODUCTO|TOTAL|USUARIO|FECHA|GRADO|ESTADO|DETALLE|OBSERV|No\.\s*de|Orden de|CLINICA DE|PAGINA|PAGE)/i;
            const lineas = text.split('\n');

            for (const linea of lineas) {
                const lineaTrim = linea.trim();
                if (!lineaTrim || palabrasIgnorar.test(lineaTrim)) continue;

                // Patrón separado por pipes (ej. tablas markdown)
                if (lineaTrim.includes('|')) {
                    const partes = lineaTrim.split('|').map(p => p.trim()).filter(p => p);
                    if (partes.length >= 2) {
                        const cant = parseInt(partes[0], 10);
                        if (!isNaN(cant) && cant > 0 && cant < 1000) {
                            let cod = 'S/C';
                            let prod = partes[1];
                            if (partes.length >= 3) {
                                cod = partes[1];
                                prod = partes.slice(2).join(' ');
                            }
                            parsedItems.push({ cantidad: cant, codigo: cod, producto: prod });
                            continue;
                        }
                    }
                }

                // Patrón súper flexible: "cantidad resto"
                const matchFlexible = lineaTrim.match(/^\s*(\d+)\s+(.+?)\s*$/);
                if (matchFlexible) {
                    const cant = parseInt(matchFlexible[1], 10);
                    const resto = matchFlexible[2].trim();
                    
                    if (cant > 0 && cant < 1000 && resto.length > 1) {
                        // Buscar si la primera palabra es un código (números o mayúsculas cortas)
                        const matchCodigo = resto.match(/^([A-Za-z0-9\-]*\d+[A-Za-z0-9\-]*|[A-Z]{2,5})\s+(.+)$/);
                        let cod = 'S/C';
                        let prod = resto;
                        
                        if (matchCodigo) {
                            cod = matchCodigo[1].trim();
                            prod = matchCodigo[2].trim();
                        }
                        
                        const esFecha = prod.match(/^\d{2,4}[\-\/]\d{2}[\-\/]\d{2,4}/);
                        const esCorreo = prod.includes('@');
                        const esSoloNumeros = !isNaN(prod.replace(/\s/g, ''));
                        
                        if (prod && !esFecha && !esCorreo && !esSoloNumeros && prod.length > 1) {
                            parsedItems.push({ cantidad: cant, codigo: cod, producto: prod });
                        }
                    }
                }
            }

            if (parsedItems.length > 0) {
                metodo = 'Escaneo de texto (Regex)';
            }
        }

        if (parsedItems.length === 0) {
            return res.status(422).json({ 
                mensaje: 'No se pudieron detectar insumos en este PDF', 
                error: 'El formato del PDF no fue reconocido ni por la IA ni por el escaneo de texto.',
                rawTextPreview: text.substring(0, 1000)
            });
        }

        res.json({
            mensaje: `PDF procesado correctamente por ${metodo}`,
            insumosDetectados: parsedItems,
            rawTextPreview: text.substring(0, 500)
        });
    } catch (error) {
        console.error('Error parseando PDF:', error);
        res.status(500).json({ mensaje: 'Error al procesar el archivo PDF', error: error.message });
    }
};

exports.getInsumosGlobales = async (req, res) => {
    try {
        const insumos = await Insumo.find()
            .populate('usuarioId', 'nombre carnet')
            .sort({ createdAt: -1 });
        res.json(insumos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener insumos globales', error: error.message });
    }
};

