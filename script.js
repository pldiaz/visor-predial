const map = L.map('map').setView([-12.0464, -77.0428], 12);

// ================= MAPAS BASE =================
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
osm.addTo(map);

// ================= VARIABLES =================
let capaPredios;
let capaSeleccionada = null;
let listaCodigos = [];

// ================= MEDICIÓN =================
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

// ================= CARGA ÚNICA =================
fetch('data/BG_Predios.geojson')
  .then(r => r.json())
  .then(data => {

    // guardar códigos
    listaCodigos = data.features.map(f =>
      (f.properties.CODIGO || '').toString()
    );

    // crear capa
    capaPredios = L.geoJSON(data, {
      style: {
        color: '#b00000',
        weight: 1.5,
        fillOpacity: 0.4
      },
      onEachFeature: function (feature, layer) {

        let popup = "";
        for (const campo in feature.properties) {
          popup += `<b>${campo}:</b> ${feature.properties[campo]}<br>`;
        }

        layer.bindPopup(popup);

        layer.on('click', function () {
          if (capaSeleccionada) {
            capaPredios.resetStyle(capaSeleccionada);
          }

          capaSeleccionada = layer;
          layer.setStyle({ color: 'blue', weight: 3 });
        });

      }
    }).addTo(map);

    map.fitBounds(capaPredios.getBounds());
  });


// ================= AUTOCOMPLETE =================
const input = document.getElementById("buscarCodigo");
const lista = document.getElementById("listaSugerencias");

input.addEventListener("keyup", function() {

  const valor = this.value.toUpperCase();
  lista.innerHTML = "";

  if (valor.length < 2) return;

  listaCodigos
    .filter(c => c.toUpperCase().includes(valor))
    .slice(0, 10)
    .forEach(codigo => {

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

// ================= ZOOM =================
function zoomACodigo(codigo) {

  capaPredios.eachLayer(layer => {
    const cod = (layer.feature.properties.CODIGO || '').toString();

    if (cod === codigo) {
      map.fitBounds(layer.getBounds());
      layer.openPopup();
    }
  });

}

// ================= LIMPIAR =================
document.getElementById('btnLimpiar').onclick = () => {
  input.value = "";
  lista.innerHTML = "";

  if (capaPredios) {
    map.setView([-12.0464, -77.0428], 12);
  }
};

// ================= FILTRO =================
document.getElementById('btnFiltrar').onclick = () => {
  document.getElementById('panelFiltro').style.display = 'block';
};

document.getElementById('cerrarFiltro').onclick = () => {
  document.getElementById('panelFiltro').style.display = 'none';
};

document.getElementById('aplicarFiltro').onclick = () => {

  const campo = document.getElementById('campoFiltro').value;
  const condicion = document.getElementById('condicionFiltro').value;
  const valor = document.getElementById('valorFiltro').value.toUpperCase();

  capaPredios.eachLayer(layer => {

    const props = layer.feature.properties;
    const dato = (props[campo] || '').toString().toUpperCase();

    let cumple = false;

    if (condicion === 'igual') cumple = dato === valor;
    if (condicion === 'contiene') cumple = dato.includes(valor);

    layer.setStyle({
      fillOpacity: cumple ? 0.8 : 0
    });

  });

};