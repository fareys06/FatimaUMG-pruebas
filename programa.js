
 // ==========================================
 // 1. CONFIGURACIÓN DE LA BASE DE DATOS
 // ==========================================

const db = new Dexie("RestauranteDB");

db.version(1).stores({
    pedidos: '++id, plato, bebida, extras, total, fecha'
});

// Esperar a que cargue el HTML
document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // 2. PRECIOS DE LOS PRODUCTOS
    // ==========================================

    const PRECIOS = {
        pizza: 12.00,
        hamburguesa: 7.50,
        pequena: 1.00,
        mediana: 1.50,
        grande: 2.00,
        papas: 2.50,
        helado: 1.80
    };

    // Obtener los elementos del HTML
    const formulario = document.getElementById("formularioRestaurante");
    const areaRecibo = document.getElementById("reciboRespuesta");
    const divHistorial = document.getElementById("tablaHistorial");
    const btnHistorial = document.getElementById("btnVerHistorial");
    const btnBorrar = document.getElementById("btnBorrarHistorial");

    // Comprobar que existan los elementos necesarios
    if (!formulario || !areaRecibo || !divHistorial ||
        !btnHistorial || !btnBorrar) {
        console.error("Error: revisa los ID de los elementos en tu HTML.");
        return;
    }

    // Ocultar recibo e historial al iniciar
    areaRecibo.style.display = "none";
    divHistorial.style.display = "none";

    // Función para mostrar dinero
    function dinero(cantidad) {
        return "$" + cantidad.toFixed(2);
    }

    // ==========================================
    // 3. REGISTRAR UN PEDIDO
    // ==========================================

    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        let total = 0;
        let cuentaDetalle = "<strong>🍽️ DETALLE DE TU PEDIDO</strong><br><hr>";

        // Obtener el plato seleccionado
        const plato = document.getElementById("platoPrincipal").value;

        if (plato === "pizza") {
            total += PRECIOS.pizza;
            cuentaDetalle += "• Pizza Familiar: " +
                dinero(PRECIOS.pizza) + "<br>";

        } else if (plato === "hamburguesa") {
            total += PRECIOS.hamburguesa;
            cuentaDetalle += "• Hamburguesa con Queso: " +
                dinero(PRECIOS.hamburguesa) + "<br>";

        } else {
            alert("Por favor, selecciona un plato principal.");
            return;
        }

        // Obtener la bebida seleccionada
        const bebida = document.querySelector(
            'input[name="tamanoBebida"]:checked'
        );

        if (!bebida || PRECIOS[bebida.value] === undefined) {
            alert("Por favor, selecciona el tamaño de tu bebida.");
            return;
        }

        const bebidaSeleccionada = bebida.value;

        total += PRECIOS[bebidaSeleccionada];

        cuentaDetalle += "• Bebida (" + bebidaSeleccionada +
            "): " + dinero(PRECIOS[bebidaSeleccionada]) + "<br>";

        // Obtener los extras
        const quierePapas =
            document.getElementById("extraPapas").checked;

        const quiereHelado =
            document.getElementById("extraHelado").checked;

        const listaExtras = [];

        if (quierePapas) {
            total += PRECIOS.papas;
            listaExtras.push("Papas Fritas");

            cuentaDetalle += "• Papas Fritas: " +
                dinero(PRECIOS.papas) + "<br>";
        }

        if (quiereHelado) {
            total += PRECIOS.helado;
            listaExtras.push("Helado");

            cuentaDetalle += "• Helado: " +
                dinero(PRECIOS.helado) + "<br>";
        }

        cuentaDetalle += "<hr><strong>💵 TOTAL A PAGAR: " +
            dinero(total) + "</strong>";

        // Mostrar el recibo
        areaRecibo.innerHTML = cuentaDetalle;
        areaRecibo.style.display = "block";

        // ==========================================
        // 4. GUARDAR EL PEDIDO EN LA BASE DE DATOS
        // ==========================================

        try {
            await db.pedidos.add({
                plato: plato,
                bebida: bebidaSeleccionada,
                extras: listaExtras.join(", ") || "Ninguno",
                total: total,
                fecha: new Date().toLocaleString()
            });

            console.log("Pedido guardado correctamente.");

            // Actualizar el historial si está abierto
            if (divHistorial.style.display !== "none") {
                await actualizarHistorialPantalla();
            }

        } catch (error) {
            console.error("Error al guardar el pedido:", error);
            alert("No se pudo guardar el pedido. Inténtalo de nuevo.");
        }
    });

    // ==========================================
    // 5. MOSTRAR LOS PEDIDOS GUARDADOS
    // ==========================================

    async function actualizarHistorialPantalla() {
        try {
            const todosLosPedidos = await db.pedidos.toArray();

            if (todosLosPedidos.length === 0) {
                divHistorial.innerHTML =
                    "<p style='text-align:center;color:#6c757d;'>" +
                    "No hay pedidos registrados todavía.</p>";
                return;
            }

            let htmlContenido = "";
            let gananciasTotales = 0;

            todosLosPedidos.forEach(function (pedido) {
                gananciasTotales += pedido.total;

                htmlContenido += `
                    <div class="item-pedido">
                        <strong>Pedido #${pedido.id}</strong>
                        — ${pedido.fecha}<br>
                        🍕 Plato: ${pedido.plato}<br>
                        🥤 Bebida: ${pedido.bebida}<br>
                        ➕ Extras: ${pedido.extras}<br>
                        💵 Total: <strong>${dinero(pedido.total)}</strong>
                    </div>
                    <hr>
                `;
            });

            htmlContenido =
                "<strong>💰 Caja total: " +
                dinero(gananciasTotales) +
                "</strong><hr>" + htmlContenido;

            divHistorial.innerHTML = htmlContenido;

        } catch (error) {
            console.error("Error al consultar el historial:", error);
            divHistorial.textContent =
                "No se pudo cargar el historial de pedidos.";
        }
    }

    // ==========================================
    // 6. BOTÓN PARA MOSTRAR U OCULTAR HISTORIAL
    // ==========================================

    btnHistorial.addEventListener("click", async function () {
        if (divHistorial.style.display === "none") {
            await actualizarHistorialPantalla();
            divHistorial.style.display = "block";
        } else {
            divHistorial.style.display = "none";
        }
    });

    // ==========================================
    // 7. BOTÓN PARA BORRAR EL HISTORIAL
    // ==========================================

    btnBorrar.addEventListener("click", async function () {
        const confirmar = confirm(
            "¿Estás seguro de que deseas eliminar todos los pedidos?"
        );

        if (confirmar) {
            try {
                await db.pedidos.clear();

                alert("El historial se eliminó correctamente.");

                if (divHistorial.style.display !== "none") {
                    await actualizarHistorialPantalla();
                }

            } catch (error) {
                console.error("Error al borrar el historial:", error);
                alert("No se pudo borrar el historial.");
            }
        }
    });

});
