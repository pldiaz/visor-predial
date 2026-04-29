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

// ===============================
// MEDICIÓN
// ===============================
L.control.measure({
  position: 'topleft',
  primaryLengthUnit: 'meters',
  secondaryLengthUnit: 'kilometers',
  primaryAreaUnit: 'sqmeters',
  secondaryAreaUnit: 'hectares'
}).addTo(map);

// ===============================
// SIMBOLOGÍA
// ===============================
function obtenerEstado(properties) {
  return (
    properties.ESTADO ||
    properties.Estado ||
    properties.estado ||
    properties.ESTADO_PREDIAL ||
    properties.estado_predial ||
    properties.SITUACION ||
    properties.Situacion ||
    ''
  ).toString().trim().toUpperCase();
}

function getColor(estado) {
  if (estado.includes('LIBERADO')) return '#2ecc71';
  if (estado.includes('PROCESO')) return '#f1c40f';
  if (estado.includes('PENDIENTE')) return '#e74c3c';
  return '#e74c3c';
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