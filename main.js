// dev
// import './leaflet-1.8-dev/leaflet-src.js';
// import './leaflet-overpass-layer/dist/OverPassLayer.bundle.js';

import "./leaflet.js";
import "./OverPassLayer.bundle.js";

var current_road_name = "";
var currentStreetLayer;

// point ids with lat, lon values
var nodes = {};
// all ways with the same street name
var ways = {};

var map = L.map("map").setView(new L.LatLng(62.93, 17.78), 14);

map.addEventListener("click", function (ev) {
  if (currentStreetLayer) {
    currentStreetLayer.remove();
  }
  if (Object.keys(ways).length === 0) {
    return;
  }
});

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}" +
    (L.Browser.retina ? "@2x.png" : ".png"),
  {
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  }
).addTo(map);

var opl = new L.OverPassLayer({
  debug: false,
  endPoint: "https://lz4.overpass-api.de/api/",

  query: '( way["highway"]["name"]({{bbox}}); >; ); out;',
  minZoomIndicatorOptions: {
    position: "topright",
    minZoomMessage:
      "Current zoom level: CURRENTZOOM - All data at level: MINZOOMLEVEL",
  },
  onSuccess(data) {
    //TODO: Handle status 429 Rate limit and other error codes
    nodes, (ways = {});
    for (const e of data.elements) {
      // save all nodes for easy indexing later
      if (e.type === "node") {
        nodes[e.id] = [e.lat, e.lon];
        // collect all ways with the same name tag
      } else if (e.type === "way") {
        const street_name = e.tags.name;
        if (ways[street_name]) {
          ways[street_name] = ways[street_name].concat([e.nodes]);
        } else {
          ways[street_name] = [e.nodes];
        }
      }
    }

    // Array of streetnames for the listbox
    //var shuffled_street_names = shuffle(Object.keys(ways));
    var shuffled_street_names = Object.keys(ways);

    // Display the number of streets
    var tmp = document.getElementById("number_of_streets");
    tmp.innerHTML = shuffled_street_names.length;

    // Populate the listbox
    var list = document.getElementById("ss_elem_list");
    for (let i = 0; i < shuffled_street_names.length; i++) {
      // Create the list item:
      var item = document.createElement("li");

      // Set its contents:
      item.appendChild(document.createTextNode(shuffled_street_names[i]));

      item.setAttribute("role", "option");
      item.setAttribute("id", "street_" + i);

      // Add it to the list:
      list.appendChild(item);
    }
  },
});

map.addLayer(opl);

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

// Set up the listbox on page load
window.addEventListener("load", function () {
  var exListbox = new aria.Listbox(document.getElementById("ss_elem_list"));
  exListbox.setHandleFocusChange(function (target) {
    highlight_street(target.innerHTML);
  });
});

function highlight_street(current_road_name) {
  if (currentStreetLayer) {
    currentStreetLayer.remove();
  }
  if (Object.keys(ways).length === 0) {
    return;
  }

  currentStreetLayer = L.featureGroup().addTo(map);

  // each street has often more than one way
  for (const way of ways[current_road_name]) {
    var temp = [];
    // collect all nodes for a specific way
    for (const n of way) {
      temp.push(nodes[n]);
    }

    // add a polyline for each way
    currentStreetLayer.addLayer(L.polyline(temp));
  }

    var checkbox = document.getElementById('center_on_street');
  if (checkbox.checked) {
    map.setView(currentStreetLayer.getBounds().getCenter());
  }
}

