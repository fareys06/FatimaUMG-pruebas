
 // ==========================================
 // 1. CONFIGURACIÓN DE LA BASE DE DATOS
 // ==========================================

const db = new Dexie("RestauranteDB");

db.version(1).stores({
    pedidos: '++id, plato, bebida, extras, total, fecha'
});

// ==========================================
// 2. INICIAR EL PROGRAMA
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {

    const formulario = document.getElementById("formularioRestaurante");
    const areaRecibo = document.getElementById("reciboRespuesta");
    const divHistorial = document.getElementById("tablaHistorial");
    const btnHistorial = document.getElementById("btnVerHistorial");
    const btnBorrar = document.getElementById("btnBorrarHistorial");

    if (!formulario || !areaRecibo || !divHistorial ||
        !btnHistorial || !btnBorrar) {
        console.error("Revisa los identificadores de los elementos HTML.");
        return;
    }

    try {
        await db.open();
        console.log("Conectado a RestauranteDB correctamente.");
        console.log("Pedidos guardados:", await db.pedidos.count());
    } catch (error) {
        console.error("Error al abrir la base de datos:", error);
        alert("No se pudo abrir la base de datos. Revisa la consola.");
        return;
    }

    areaRecibo.style.display = "none";
    divHistorial.style.display = "none";

    // ==========================================
    // 3. PRECIOS DEL MENÚ
    // ==========================================

    const PRECIOS = {
        pizza: 12.00,
        hamburguesa: 7.50,
        tacos: 8.00,
        pasta: 10.00,
        pollo: 9.50,
        pequena: 1.00,
        mediana: 1.50,
        grande: 2.00,
        papas: 2.50,
        helado: 1.80,
        ensalada: 2.00,
        postre: 2.75
    };

    const NOMBRES = {
        pizza: "Pizza Familiar",
        hamburguesa: "Hamburguesa con Queso",
        tacos: "Tacos",
        pasta: "Pasta Cremosa",
        pollo: "Pollo Crujiente",
        pequena: "Bebida pequeña",
        mediana: "Bebida mediana",
        grande: "Bebida grande",
        papas: "Papas Fritas",
        helado: "Helado de Vainilla",
        ensalada: "Ensalada Fresca",
        postre: "Pastel del Día"
    };

    function dinero(cantidad) {
        return "$" + Number(cantidad).toFixed(2);
    }

    function seguro(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, function (letra) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[letra];
        });
    }

    // ==========================================
    // 4. CALCULAR Y GUARDAR PEDIDOS
    // ==========================================

    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
            const nombre = document.getElementById("nombreCliente").value.trim();
            const plato = document.getElementById("platoPrincipal").value;
            const cantidad = Number(document.getElementById("cantidad").value);
            const bebida = document.querySelector(
                'input[name="tamanoBebida"]:checked'
            );
            const comentario = document.getElementById("comentario").value.trim();

            if (!nombre) {
                alert("Escribe el nombre del cliente.");
                return;
            }

            if (!PRECIOS[plato] ||
                !Number.isInteger(cantidad) ||
                cantidad < 1 || cantidad > 20) {
                alert("Selecciona un plato e indica una cantidad válida.");
                return;
            }

            if (!bebida || PRECIOS[bebida.value] === undefined) {
                alert("Selecciona el tamaño de la bebida.");
                return;
            }

            const tamanoBebida = bebida.value;

            // Calcular el plato y las bebidas por cantidad.
            const subtotalPlatos = PRECIOS[plato] * cantidad;
            const subtotalBebidas = PRECIOS[tamanoBebida] * cantidad;

            // Los extras se cobran una vez por pedido.
            const extrasSeleccionados = [
                { id: "extraPapas", valor: "papas" },
                { id: "extraHelado", valor: "helado" },
                { id: "extraEnsalada", valor: "ensalada" },
                { id: "extraPostre", valor: "postre" }
            ];

            let subtotalExtras = 0;
            const listaExtras = [];

            extrasSeleccionados.forEach(function (extra) {
                const elemento = document.getElementById(extra.id);

                if (elemento && elemento.checked) {
                    subtotalExtras += PRECIOS[extra.valor];
                    listaExtras.push(NOMBRES[extra.valor]);
                }
            });

            const subtotal = subtotalPlatos + subtotalBebidas + subtotalExtras;
            const total = subtotal;

            const fecha = new Date().toLocaleString();

            // Crear el recibo.
            let detalleExtras = listaExtras.length
                ? listaExtras.map(seguro).join(", ")
                : "Ninguno";

            areaRecibo.innerHTML = `
                <h3>🧾 FACTURA SAZÓN</h3>
                <p><strong>Cliente:</strong> ${seguro(nombre)}</p>
                <p><strong>Fecha:</strong> ${seguro(fecha)}</p>
                <hr>
                <p>🍽️ ${seguro(NOMBRES[plato])} x ${cantidad}:
                    ${dinero(subtotalPlatos)}</p>
                <p>🥤 ${seguro(NOMBRES[tamanoBebida])} x ${cantidad}:
                    ${dinero(subtotalBebidas)}</p>
                <p>✨ Extras: ${detalleExtras}</p>
                <p>📝 Indicaciones: ${seguro(comentario || "Ninguna")}</p>
                <hr>
                <h3>TOTAL A PAGAR: ${dinero(total)}</h3>
                <p>✅ Pedido registrado correctamente.</p>
            `;

            areaRecibo.style.display = "block";

            // ==========================================
            // 5. GUARDAR EN LA BASE ORIGINAL
            // ==========================================

            const nuevoPedido = {
                // Campos de la base original:
                plato: plato,
                bebida: tamanoBebida,
                extras: listaExtras.join(", ") || "Ninguno",
                total: total,
                fecha: fecha,

                // Datos adicionales guardados sin cambiar el esquema:
                nombre: nombre,
                cantidad: cantidad,
                comentario: comentario
            };

            const id = await db.pedidos.add(nuevoPedido);

            console.log("Pedido guardado con ID:", id);

            alert("¡Pedido guardado correctamente!");

            if (divHistorial.style.display !== "none") {
                await actualizarHistorialPantalla();
            }

        } catch (error) {
            console.error("Error al guardar el pedido:", error);
            alert("No se pudo guardar el pedido. Revisa F12 → Console.");
        }
    });

    // ==========================================
    // 6. MOSTRAR LOS PEDIDOS GUARDADOS
    // ==========================================

    async function actualizarHistorialPantalla() {
        try {
            const pedidos = await db.pedidos.orderBy("id").reverse().toArray();

            if (pedidos.length === 0) {
                divHistorial.innerHTML = `
                    <p style="text-align:center;">
                        Todavía no hay pedidos registrados.
                    </p>`;
                return;
            }

            let contenido = "";
            let totalVentas = 0;

            pedidos.forEach(function (pedido) {
                totalVentas += Number(pedido.total) || 0;

                contenido += `
                    <div class="item-pedido">
                        <strong>🧾 Pedido #${pedido.id}</strong><br>
                        📅 ${seguro(pedido.fecha || "Sin fecha")}<br>
                        👤 Cliente: ${seguro(pedido.nombre || "No especificado")}<br>
                        🍽️ Plato: ${seguro(NOMBRES[pedido.plato] || pedido.plato)}
                        x ${Number(pedido.cantidad) || 1}<br>
                        🥤 Bebida: ${seguro(NOMBRES[pedido.bebida] || pedido.bebida)}<br>
                        ✨ Extras: ${seguro(pedido.extras || "Ninguno")}<br>
                        📝 Comentario: ${seguro(pedido.comentario || "Ninguno")}<br>
                        💵 Total: <strong>${dinero(pedido.total || 0)}</strong>
                    </div>
                `;
            });

            divHistorial.innerHTML = `
                <h3>📋 Historial de ventas</h3>
                <p><strong>Pedidos registrados:</strong> ${pedidos.length}</p>
                <p><strong>Ventas acumuladas:</strong> ${dinero(totalVentas)}</p>
                <hr>
                ${contenido}
            `;

        } catch (error) {
            console.error("Error al consultar los pedidos:", error);
            divHistorial.innerHTML =
                "<p>No se pudo mostrar el historial.</p>";
        }
    }

    // ==========================================
    // 7. BOTÓN VER / OCULTAR HISTORIAL
    // ==========================================

    btnHistorial.addEventListener("click", async function () {
        if (divHistorial.style.display === "none") {
            await actualizarHistorialPantalla();
            divHistorial.style.display = "block";
            btnHistorial.textContent = "🙈 Ocultar historial";
        } else {
            divHistorial.style.display = "none";
            btnHistorial.textContent = "📋 Ver historial";
        }
    });

    // ==========================================
    // 8. BORRAR LOS PEDIDOS
    // ==========================================

    btnBorrar.addEventListener("click", async function () {
        const confirmar = confirm(
            "¿Seguro que deseas eliminar todos los pedidos guardados?"
        );

        if (!confirmar) return;

        try {
            await db.pedidos.clear();

            await actualizarHistorialPantalla();

            alert("El historial se eliminó correctamente.");

        } catch (error) {
            console.error("Error al borrar los pedidos:", error);
            alert("No se pudo limpiar la base de datos.");
        }
    });

    console.log("Restaurante SAZÓN listo.");
});
