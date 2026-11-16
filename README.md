# 🌴 LEONIDA VI — Tactical Companion & Cheats Database

Base de datos interactiva ultrarrápida y guía móvil para **Grand Theft Auto VI** (Vice City y Estado de Leonida).

Desarrollada con **HTML5 semántico**, **Tailwind CSS (CDN)** y **Vanilla JavaScript**.

---

## ⚡ Características Principales

* 📱 **Mobile-First & Ultra Rápido**: Diseñado con botones táctiles grandes ($\ge 44\text{px}$) y arquitectura sin dependencias pesadas.
* 🌴 **Estética Vice City Neon**: Tema oscuro profundo (`#09090b`) con acentos rosa neón (`#ff2a85`) y cian neón (`#00f0ff`).
* 🔍 **Buscador en Tiempo Real**: Filtrado instantáneo por título, efecto, descripción, códigos o palabras clave.
* 🎮 **Filtros por Categoría**:
  * 🌴 Todos
  * 🟦 Trucos PS5 (con iconos y keycaps visuales de DualSense)
  * 🟩 Trucos Xbox (con badges de controles Xbox Series X|S)
  * 🏎️ Vehículos
  * 🔮 Secretos y Misterios del mapa
* 📋 **Copiado al Portapapeles con Feedback**: Botón táctil que confirma la copia con animación verde esmeralda y toast emergente.
* 💾 **Progreso Persistente**: Checkbox *"Completado / Usado"* almacenado en `localStorage`.
* 📢 **Espacios Publicitarios**: Contenedores señalizados `<!-- AD_SLOT_TOP -->` y `<!-- AD_SLOT_BOTTOM -->` listos para redes de anuncios.
* ☕ **Apoyo Comunitario**: Modal discreto de donación y agradecimiento.

---

## 📁 Estructura del Repositorio

```text
leonida/
├── index.html     # Estructura semántica, Tailwind CDN y componentes
├── styles.css     # Estilos neon Vice City, keycaps y animaciones
├── app.js         # Lógica Vanilla JS de búsqueda, filtros y localStorage
├── data.json      # Base de datos externa editable
└── README.md      # Documentación del proyecto
```

---

## 🚀 Despliegue Rápido

Al ser una aplicación 100% estática, no requiere compilación previa (`build step`).

Puedes servirla localmente con cualquier servidor HTTP:

```bash
# Con Python
python -m http.server 8080

# O abrir directamente index.html en el navegador
```

---

## ⚖️ Aviso Legal

*Este es un proyecto comunitario sin fines comerciales. Grand Theft Auto, Vice City y Rockstar Games son marcas registradas propiedad de Take-Two Interactive Software, Inc.*
