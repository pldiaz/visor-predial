const map = L.map('map').setView([-12.0464, -77.0428], 12);

// ===============================
// MAPAS BASE
// ===============================
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 22,
  attribution: '© OpenStreetMap'
});

const topografia = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: '© OpenTopoMap'
});

const esriSatelital = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
  {
    maxZoom: 22,
    attribution: 'Tiles © Esri'
  }
);

const esriCalles = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', 
  {
    maxZoom: 22,
    attribution: 'Tiles © Esri'
  }
);

osm.addTo(map);

const mapasBase = {
  "OpenStreetMap": osm,
  "Topografía": topografia,
  "Esri Satelital": esriSatelital,
  "Esri Calles": esriCalles
};

// MEDICIÓN SIMPLE (estable)
let linea;

map.on('click', function(e) {
  if (!linea) {
    linea = L.polyline([e.latlng], {color: 'blue'}).addTo(map);
  } else {
    linea.addLatLng(e.latlng);

    const distancia = linea.getLatLngs()
      .reduce((acc, curr, i, arr) => {
        if (i === 0) return 0;
        return acc + curr.distanceTo(arr[i-1]);
      }, 0);

    alert("Distancia: " + (distancia/1000).toFixed(2) + " km");

    map.removeLayer(linea);
    linea = null;
  }
});
// ===============================
// SIMBOLOGÍA
// ===============================
function obtenerEstado(properties) {
  return (
    properties.ESTADO ||
    properties.Estado ||
    properties.ESTAD_AVANC ||
    properties.estado ||
    properties.ESTADO_PREDIAL ||
    properties.estado_predial ||
    properties.SITUACION ||
    properties.Situacion ||
    ''
  ).toString().trim().toUpperCase();
}

function getColor(estado) {
  estado = estado.toUpperCase().trim();
  if (estado.includes('EN CUSTODIA')) return '#2ecc71';
  if (estado.includes('PAGADO')) return '#2ecc71';
  if (estado.includes('CONSIGNADO')) return '#2ecc71';
  if (estado.includes('CON RESOLUCION')) return '#2ecc71';
  if (estado.includes('CON TASACION')) return '#f1c40f';
  if (estado.includes('PENDIENTE')) return '#e74c3c';
  return '#95a5a6';
}

function estiloPredio(feature) {
  const estado = obtenerEstado(feature.properties);

  return {
    color: '#b00000',
    weight: 1.5,
    fillColor: getColor(estado),
    fillOpacity: 0.45
  };
}

function estiloSeleccionado() {
  return {
    color: '#0000ff',
    weight: 4,
    fillOpacity: 0.65
  };
}

// ===============================
// VARIABLES
// ===============================
let capaPredios;
let capaSeleccionada = null;

// ===============================
// CARGAR GEOJSON
// ===============================
fetch('data/BG_Predios.geojson')
  .then(response => {
    if (!response.ok) {
      throw new Error('No se encontró el archivo GeoJSON');
    }
    return response.json();
  })
  .then(data => {
    capaPredios = L.geoJSON(data, {
      style: estiloPredio,

      onEachFeature: function (feature, layer) {
        let popup = '<div class="popup">';

        if (feature.properties) {
          for (const campo in feature.properties) {
            popup += `<b>${campo}:</b> ${feature.properties[campo]}<br>`;
          }
        }

        popup += '</div>';
        layer.bindPopup(popup);

        layer.on('click', function () {
          if (capaSeleccionada) {
            capaPredios.resetStyle(capaSeleccionada);
          }

          capaSeleccionada = layer;
          layer.setStyle(estiloSeleccionado());
          layer.bringToFront();
        });
      }
    }).addTo(map);

    L.control.layers(mapasBase, {
      "Predios": capaPredios
    }).addTo(map);

    map.fitBounds(capaPredios.getBounds());
  })
  .catch(error => {
    console.error('Error cargando GeoJSON:', error);
    alert('No se pudo cargar el archivo data/BG_Predios.geojson');
  });

// ===============================
// BUSCADOR POR CODIGO
// ===============================
document.getElementById('buscarCodigo').addEventListener('keyup', function (e) {
  const valor = e.target.value.trim().toUpperCase();

  if (!capaPredios || valor.length < 2) return;

  let encontrado = false;

  capaPredios.eachLayer(function (layer) {
    const props = layer.feature.properties;
    const codigo = (
      props.CODIGO ||
      props.Codigo ||
      props.codigo ||
      props.COD_PREDIO ||
      ''
    ).toString().toUpperCase();

    if (codigo.includes(valor) && !encontrado) {
      encontrado = true;

      if (capaSeleccionada) {
        capaPredios.resetStyle(capaSeleccionada);
      }

      capaSeleccionada = layer;
      layer.setStyle(estiloSeleccionado());
      layer.bringToFront();

      map.fitBounds(layer.getBounds(), {
        maxZoom: 18
      });

      layer.openPopup();
    }
  });
});

// LISTA CODIGOS

let listaCodigos = [];

fetch('data/BG_Predios.geojson')
  .then(r => r.json())
  .then(data => {

    // 🔥 EXTRAER TODOS LOS CODIGOS
    listaCodigos = data.features.map(f =>
      (f.properties.CODIGO || '').toString()
    );

  });

// ===============================
// LIMPIAR BÚSQUEDA
// ===============================
document.getElementById('btnLimpiar').addEventListener('click', function () {
  document.getElementById('buscarCodigo').value = '';

  if (capaSeleccionada && capaPredios) {
    capaPredios.resetStyle(capaSeleccionada);
    capaSeleccionada = null;
  }

  if (capaPredios) {
    map.fitBounds(capaPredios.getBounds());
  }
});

// ABRIR PANEL
document.getElementById('btnFiltrar').onclick = () => {
  document.getElementById('panelFiltro').style.display = 'block';
};

// CERRAR PANEL
document.getElementById('cerrarFiltro').onclick = () => {
  document.getElementById('panelFiltro').style.display = 'none';
};

// APLICAR FILTRO
document.getElementById('aplicarFiltro').onclick = () => {

  const campo = document.getElementById('campoFiltro').value;
  const condicion = document.getElementById('condicionFiltro').value;
  const valor = document.getElementById('valorFiltro').value.toUpperCase();

  capaPredios.eachLayer(layer => {

    const props = layer.feature.properties;
    const dato = (props[campo] || '').toString().toUpperCase();

    let cumple = false;

    if (condicion === 'igual') {
      cumple = dato === valor;
    }

    if (condicion === 'contiene') {
      cumple = dato.includes(valor);
    }

    if (cumple) {
      layer.setStyle({
        fillOpacity: 0.8
      });
    } else {
      layer.setStyle({
        fillOpacity: 0
      });
    }

  });

};

const input = document.getElementById("buscarCodigo");
const lista = document.getElementById("listaSugerencias");

input.addEventListener("keyup", function() {

  const valor = this.value.toUpperCase();
  lista.innerHTML = "";

  if (valor.length < 2) return;

  const coincidencias = listaCodigos
    .filter(c => c.toUpperCase().includes(valor))
    .slice(0, 10); // limita resultados

  coincidencias.forEach(codigo => {

    const div = document.createElement("div");
    div.textContent = codigo;

    div.onclick = () => {
      input.value = codigo;
      lista.innerHTML = "";

      zoomACodigo(codigo);
    };

    lista.appendChild(div);
  });

});

function zoomACodigo(codigo) {

  capaPredios.eachLayer(layer => {

    const cod = (layer.feature.properties.CODIGO || '').toString();

    if (cod === codigo) {
      map.fitBounds(layer.getBounds());
      layer.openPopup();
    }

  });

}

let campos = [];

fetch('data/BG_Predios.geojson')
  .then(r => r.json())
  .then(data => {

    campos = Object.keys(data.features[0].properties);

    const select = document.getElementById("campoFiltro");

    campos.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.text = c;
      select.appendChild(opt);
    });

  });