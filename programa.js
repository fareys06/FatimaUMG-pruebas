
const db = new Dexie("RestauranteDB");

db.version(1).stores({
    pedidos: '++id, plato, bebida, extras, total, fecha'
});

document.addEventListener("DOMContentLoaded", async function () {

    const formulario = document.getElementById("formularioRestaurante");
    const recibo = document.getElementById("reciboRespuesta");
    const historial = document.getElementById("tablaHistorial");
    const btnHistorial = document.getElementById("btnVerHistorial");
    const btnBorrar = document.getElementById("btnBorrarHistorial");

    const productos = [
        { id: "cantPizza", nombre: "Pizza familiar", precio: 12, tipo: "plato" },
        { id: "cantHamburguesa", nombre: "Hamburguesa con queso", precio: 7.50, tipo: "plato" },
        { id: "cantTacos", nombre: "Tacos", precio: 8, tipo: "plato" },
        { id: "cantPasta", nombre: "Pasta cremosa", precio: 10, tipo: "plato" },
        { id: "cantPollo", nombre: "Pollo crujiente", precio: 9.50, tipo: "plato" },
        { id: "cantDerretido", nombre: "Derretido de queso", precio: 6.50, tipo: "plato" },

        { id: "cantCoca", nombre: "Coca-Cola", precio: 1.50, tipo: "bebida" },
        { id: "cantSprite", nombre: "Sprite", precio: 1.50, tipo: "bebida" },
        { id: "cantAgua", nombre: "Agua pura", precio: 1, tipo: "bebida" },
        { id: "cantJugo", nombre: "Jugo natural", precio: 2, tipo: "bebida" },

        { id: "cantPapas", nombre: "Papas fritas", precio: 2.50, tipo: "complemento" },
        { id: "cantPure", nombre: "Puré de papas", precio: 2.25, tipo: "complemento" },
        { id: "cantEnsalada", nombre: "Ensalada fresca", precio: 2, tipo: "complemento" },
        { id: "cantHelado", nombre: "Helado de vainilla", precio: 1.80, tipo: "complemento" },
        { id: "cantPostre", nombre: "Pastel del día", precio: 2.75, tipo: "complemento" }
    ];

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

    if (!formulario || !recibo || !historial || !btnHistorial || !btnBorrar) {
        console.error("Faltan elementos HTML. Revisa los identificadores.");
        return;
    }

    recibo.style.display = "none";
    historial.style.display = "none";

    try {
        await db.open();
        console.log("Base de datos RestauranteDB abierta correctamente.");
        console.log("Pedidos guardados:", await db.pedidos.count());
    } catch (error) {
        console.error("Error al abrir IndexedDB:", error);
        alert("No se pudo abrir la base de datos. Revisa F12 → Console.");
        return;
    }

    // ==========================================
    // REGISTRAR PEDIDOS
    // ==========================================

    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        const nombre = document.getElementById("nombreCliente").value.trim();
        const comentario = document.getElementById("comentario").value.trim();

        if (!nombre) {
            alert("Escribe el nombre del cliente.");
            return;
        }

        let total = 0;
        let hayPlato = false;
        const detalle = [];
        const platos = [];
        const bebidas = [];
        const complementos = [];

        for (const producto of productos) {
            const campo = document.getElementById(producto.id);
            const cantidad = Number(campo.value);

            if (!Number.isInteger(cantidad) ||
                cantidad < 0 ||
                cantidad > Number(campo.max)) {
                alert("Revisa la cantidad de " + producto.nombre + ".");
                campo.focus();
                return;
            }

            if (cantidad > 0) {
                const subtotal = cantidad * producto.precio;

                total += subtotal;

                const item = {
                    nombre: producto.nombre,
                    cantidad: cantidad,
                    precio: producto.precio,
                    subtotal: subtotal
                };

                detalle.push(item);

                if (producto.tipo === "plato") {
                    platos.push(item);
                    hayPlato = true;
                }

                if (producto.tipo === "bebida") {
                    bebidas.push(item);
                }

                if (producto.tipo === "complemento") {
                    complementos.push(item);
                }
            }
        }

        if (!hayPlato) {
            alert("Debes seleccionar al menos un plato principal.");
            return;
        }

        const fecha = new Date().toLocaleString();

        const filas = detalle.map(function (item) {
            return `
                <tr>
                    <td>${seguro(item.nombre)}</td>
                    <td>${item.cantidad}</td>
                    <td>${dinero(item.precio)}</td>
                    <td>${dinero(item.subtotal)}</td>
                </tr>`;
        }).join("");

        recibo.innerHTML = `
            <h3>🧾 FACTURA SAZÓN</h3>
            <p><strong>Pedido para:</strong> ${seguro(nombre)}</p>
            <p><strong>Fecha:</strong> ${seguro(fecha)}</p>

            <table class="tabla-recibo">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>

            <p><strong>Platos:</strong> ${platos.reduce((s, p) => s + p.cantidad, 0)}</p>
            <p><strong>Bebidas:</strong> ${bebidas.reduce((s, p) => s + p.cantidad, 0)}</p>
            <p><strong>Complementos:</strong> ${complementos.reduce((s, p) => s + p.cantidad, 0)}</p>
            <p><strong>Indicaciones:</strong> ${seguro(comentario || "Ninguna")}</p>
            <hr>
            <h2>TOTAL A PAGAR: ${dinero(total)}</h2>
            <p>✅ Pedido registrado correctamente.</p>
        `;

        recibo.style.display = "block";

        try {
            await db.pedidos.add({
                plato: platos.map(p => `${p.nombre} x ${p.cantidad}`).join(", "),
                bebida: bebidas.map(p => `${p.nombre} x ${p.cantidad}`).join(", ") || "Ninguna",
                extras: complementos.map(p => `${p.nombre} x ${p.cantidad}`).join(", ") || "Ninguno",
                total: total,
                fecha: fecha,

                // Información adicional del pedido.
                nombre: nombre,
                comentario: comentario,
                detalle: detalle
            });

            console.log("Pedido guardado correctamente.");
            alert("¡Pedido guardado correctamente!");

            if (historial.style.display !== "none") {
                await actualizarHistorial();
            }

        } catch (error) {
            console.error("Error al guardar:", error);
            alert("No se pudo guardar el pedido. Revisa F12 → Console.");
        }
    });

    // ==========================================
    // MOSTRAR HISTORIAL
    // ==========================================

    async function actualizarHistorial() {
        try {
            const pedidos = await db.pedidos.toArray();

            pedidos.reverse();

            if (pedidos.length === 0) {
                historial.innerHTML = "<p>No hay pedidos registrados todavía.</p>";
                return;
            }

            let ventas = 0;
            let contenido = "";

            pedidos.forEach(function (pedido) {
                ventas += Number(pedido.total) || 0;

                let productosHTML = "";

                if (Array.isArray(pedido.detalle)) {
                    productosHTML = pedido.detalle.map(function (item) {
                        return `
                            ${seguro(item.nombre)} x ${item.cantidad}
                            — ${dinero(item.subtotal)}<br>`;
                    }).join("");
                } else {
                    productosHTML = `
                        Platos: ${seguro(pedido.plato)}<br>
                        Bebidas: ${seguro(pedido.bebida)}<br>
                        Complementos: ${seguro(pedido.extras)}<br>`;
                }

                contenido += `
                    <div class="item-pedido">
                        <strong>🧾 Pedido #${pedido.id}</strong><br>
                        📅 ${seguro(pedido.fecha || "Sin fecha")}<br>
                        👤 Cliente: ${seguro(pedido.nombre || "No especificado")}<br>
                        ${productosHTML}
                        <strong>Total: ${dinero(pedido.total || 0)}</strong>
                    </div>`;
            });

            historial.innerHTML = `
                <h3>📋 Historial de ventas</h3>
                <p><strong>Pedidos registrados:</strong> ${pedidos.length}</p>
                <p><strong>Ventas acumuladas:</strong> ${dinero(ventas)}</p>
                <hr>
                ${contenido}`;

        } catch (error) {
            console.error("Error al cargar historial:", error);
            historial.innerHTML = "<p>No se pudo cargar el historial.</p>";
        }
    }

    btnHistorial.addEventListener("click", async function () {
        if (historial.style.display === "none") {
            await actualizarHistorial();
            historial.style.display = "block";
            btnHistorial.textContent = "🙈 Ocultar historial";
        } else {
            historial.style.display = "none";
            btnHistorial.textContent = "📋 Ver historial";
        }
    });

    // ==========================================
    // LIMPIAR BASE DE DATOS
    // ==========================================

    btnBorrar.addEventListener("click", async function () {
        const confirmar = confirm(
            "¿Estás segura de que deseas eliminar todos los pedidos?"
        );

        if (!confirmar) return;

        try {
            await db.pedidos.clear();
            await actualizarHistorial();
            alert("El historial se eliminó correctamente.");
        } catch (error) {
            console.error("Error al limpiar la base de datos:", error);
            alert("No se pudo limpiar el historial.");
        }
    });

    console.log("Restaurante SAZÓN listo.");
});
