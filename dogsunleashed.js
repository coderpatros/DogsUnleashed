function dismissDialog(dialogId) {
    document.getElementById(dialogId).style.visibility = 'hidden';
}

function displayDialog(dialogId) {
    document.getElementById(dialogId).style.visibility = 'visible';
}

function POI(label, url, iconUrl, where) {
    return {
        label: label,
        url: url,
        iconUrl: iconUrl,
        where: where
    }
}

function Area(label, url, defaultStyle, where) {
    return {
        label: label,
        url: url,
        defaultStyle: defaultStyle,
        where: where
    }
}

function Control(label, position, clickHandler) {
    return {
        label: label,
        position: position,
        clickHandler: clickHandler
    }
}

var map, locationMarker, locationAccuracyCircle;

// setup base map
map = L.map('map').setView([ -26.653127, 153.067969 ], 11);
// Sunshine Coast Council "Street Map Grey WebMerc" vector tile basemap (ArcGIS Online item ID)
L.esri.Vector.vectorTileLayer('414c2168f3d0450699547b63abfad940', {
    attribution: 'Sunshine Coast Council'
}).addTo(map);
L.control.scale().addTo(map);

var controls = [
    Control(
        'Legend',
        'topright',
        function() { displayDialog('legend'); })
];

var pois = [
    POI(
        'Dog Water Bowls',
        'https://geopublic.scc.qld.gov.au/arcgis/rest/services/Structure/Structure_SCRC/MapServer/1',
        'markers/water.png',
        "FeatureTypeCode='WO01'"
    )
//        POI(
//            'Beach Access Point',
//            'https://gislegacy.scc.qld.gov.au/arcgis/rest/services/Society/Society_SCRC/MapServer/5',
//            'markers/beach-access.png',
//            "AccessType='Pedestrian Access'"
//        )
];

var DOGS_OK = "#009933";
var DOGS_SOMETIMES_OK = "#ffff00";
var DOGS_NEVER_OK = "#ff0000";
var DOGS_ON_LEASH = "#ff6600";
var OTHER = "#000000";

// keyed on Local Law 2 category code (LL2_Category)
var offLeashStyles = {
    "DOLAT": DOGS_OK,              // off leash at all times
    "DOLOS": DOGS_SOMETIMES_OK,    // off leash at specified times
    "TMSEAS": DOGS_SOMETIMES_OK,   // off leash seasonally at specified times
    "ONLSH": DOGS_ON_LEASH,        // on leash at all times
    "PROHIB": DOGS_NEVER_OK,       // prohibited at all times
    "PROHBS": DOGS_NEVER_OK,       // prohibited at all times (seasonal)
    "PROHEV": DOGS_NEVER_OK        // prohibited other than during approved events
};

var offLeashLegendItems = [
    [DOGS_OK, 'Dogs off leash at all times'],
    [DOGS_SOMETIMES_OK, 'Dogs off leash at specified times'],
    [DOGS_ON_LEASH, 'Dogs on leash at all times'],
    [DOGS_NEVER_OK, 'Dogs prohibited at all times'],
    [OTHER, 'Other']
];

var offLeashAreas = L.esri.featureLayer({
    url: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/Boundaries/Boundaries_SCRC/MapServer/15',
    style: function (feature) {
        var style = {
            fillOpacity: 0.5,
            weight: 2
        };

        style.color = offLeashStyles[feature.properties.LL2_Category] || OTHER;
        style.fillColor = style.color;

        return style;
    }
});

offLeashAreas.bindPopup(function (evt) {
    var properties = evt.feature.properties;
    return L.Util.template('<p>{description}<br>{location}</p>', {
        description: properties.LL2_CategoryDescription || '',
        location: properties.Location || ''
    });
});

offLeashAreas.addTo(map);

// setup legend items and poi layers
var legendItemContainer = document.getElementById('legendItemContainer');
var poiLayers = [];
for (var i=0; i<pois.length; i++) {
    (function() {
        var poi = pois[i];

        var legendItem = document.createElement('li');
        var legendImage = document.createElement('img');
        legendImage.src = poi.iconUrl;
        legendItem.appendChild(legendImage);
        var legendText = document.createTextNode(poi.label);
        legendItem.appendChild(legendText);
        legendItemContainer.appendChild(legendItem);

        var layer = L.esri.featureLayer({
            url:  poi.url,
            pointToLayer: function(geojson, latlng) {
                return L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: poi.iconUrl,
                        iconSize: [32, 37],
                        iconAnchor: [16, 37],
                        popupAnchor: [0, -11]
                    })
                });
            }
        });
        if (poi.where) layer.setWhere(poi.where);
        layer.addTo(map);
        poiLayers.push(layer);
    })();
}

for (var i=0; i<offLeashLegendItems.length; i++) {
    (function() {
        var color = offLeashLegendItems[i][0];
        var text = offLeashLegendItems[i][1];
        var legendItem = document.createElement('li');
        var legendColorDiv = document.createElement('div');
        legendColorDiv.className = 'legend-color';
        legendColorDiv.style = 'background-color: ' + color;
        legendItem.appendChild(legendColorDiv);
        var legendText = document.createTextNode(text);
        legendItem.appendChild(legendText);
        legendItemContainer.appendChild(legendItem);
    })();
}

// setup device location handling
function onLocationFound(e) {
    var radius = e.accuracy / 2;

    if (locationMarker) {
        locationMarker.setLatLng(e.latlng);
    } else {
        locationMarker = L.marker(e.latlng).addTo(map);
    }

    if (locationAccuracyCircle) {
        locationAccuracyCircle.setLatLng(e.latlng).setRadius(radius);
    } else {
        locationAccuracyCircle = L.circle(e.latlng, radius).addTo(map);
    }
}
map.on('locationfound', onLocationFound);
map.locate({setView: true, maxZoom: 16});

// setup controls
for (var i=0; i<controls.length; i++) {
    (function() {
        var control = controls[i];
        var Control = L.Control.extend({
            onAdd: function(map) {
                var leafletControl = L.DomUtil.create('button');
                leafletControl.type = 'button';
                leafletControl.className = 'map-control';
                leafletControl.appendChild(document.createTextNode(control.label));
                leafletControl.onclick = control.clickHandler || function() { alert(control.label); };
                return leafletControl;
            }
        });
        (new Control({ position: control.position })).addTo(map);
    })();
}
