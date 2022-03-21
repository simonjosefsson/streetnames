// dev
// import './leaflet-1.8-dev/leaflet-src.js';

import "./leaflet.js";

var current_road_name = "";
var currentStreetLayer;

// point ids with lat, lon values
var nodes = {};
// all ways with the same street name
var ways = {};

var map = L.map("map").setView(new L.LatLng(62.93, 17.78), 14);

function sendOverpassQuery() {
  const request = new XMLHttpRequest();

  var bounds = map.getBounds();
  const sw = bounds._southWest;
  const ne = bounds._northEast;
  const coordinates = [sw.lat, sw.lng, ne.lat, ne.lng].join(",");
  //https://overpass.kumi.systems/api/interpreter
  var url =
    'https://lz4.overpass-api.de/api/interpreter?data=[out:json];(way["highway"]["name"](' +
    coordinates +
    "); >; ); out;";
  request.open("GET", url);
  request.onload = handleOverpassResponse;
  request.send();
}

function handleOverpassResponse(event) {
  //TODO: Handle status 429 Rate limit, 504 timeout and other error codes
  if (event.target.status != 200) {
    alert("HTTP status: " + event.target.status + event.target.responseText);
    return;
  }

  var data = JSON.parse(event.target.response);
  // reset nodes and ways
  nodes = {};
  ways = {};

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
  var shuffled_street_names = shuffle(Object.keys(ways));

  // Display the number of streets
  var tmp = document.getElementById("number_of_streets");
  tmp.innerHTML = shuffled_street_names.length;

  // Populate the listbox
  var list = document.getElementById("ss_elem_list");
  list.innerHTML = "";

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
  toggle_all_streets(true);
}


L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}" +
    (L.Browser.retina ? "@2x.png" : ".png"),
  {
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  }
).addTo(map);

// Initialize the listbox on page load
window.addEventListener("load", function () {
  var exListbox = new aria.Listbox(document.getElementById("ss_elem_list"));
  exListbox.setHandleFocusChange(function (target) {
    highlight_street(target.innerHTML);
  });

  document.getElementById("highlight_all_streets").onclick = function () {
    toggle_all_streets(this.checked);
  };

  document.getElementById("load_button").onclick = function () {
    sendOverpassQuery();
  };
});

// Plot a single street
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

  var checkbox = document.getElementById("center_on_street");
  if (checkbox.checked) {
    map.setView(currentStreetLayer.getBounds().getCenter());
    //map.fitBounds(currentStreetLayer.getBounds());
  }
}

var all_streets = L.layerGroup();
 
function toggle_all_streets(checked) {
  if (checked) {
    for (const road_name in ways) {
      // each street has often more than one way
      for (const way of ways[road_name]) {
        var temp = [];
        // collect all nodes for a specific way
        for (const n of way) {
          temp.push(nodes[n]);
        }
        var street = L.polyline(temp, {weight:3, color:'gray'});
        
        //TODO: highlight streetname on click
        street.on("click", function (e) { 
          highlight_street(road_name);
          var popup = L.popup()
          .setLatLng(e.latlng)
          .setContent(road_name);
          map.openPopup(popup);
        }); 

        all_streets.addLayer(street).addTo(map);
      }
    }
    all_streets.addTo(map);
  } else {
    all_streets.removeFrom(map);
  }
}

// Helper shuffle function
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
