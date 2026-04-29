const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

const satelite = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');

osm.addTo(map);

L.control.layers({
  "OpenStreetMap": osm,
  "Topografía": satelite
}).addTo(map);

fetch('data/BG_Predios.geojson')
  .then(response => response.json())
  .then(data => {
    const capa = L.geoJSON(data, {
      style: {
        color: '#ff0000',
        weight: 2,
        fillColor: '#ff6666',
        fillOpacity: 0.4
      },
      onEachFeature: function (feature, layer) {
        let popup = '';

        if (feature.properties) {
          for (const campo in feature.properties) {
            popup += `<b>${campo}:</b> ${feature.properties[campo]}<br>`;
          }
        }

        layer.bindPopup(popup);
      }
    }).addTo(map);

    map.fitBounds(capa.getBounds());
  })
  .catch(error => console.log(error));