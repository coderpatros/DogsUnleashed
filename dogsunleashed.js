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
L.esri.dynamicMapLayer({
    url: 'https://cloud.locate.scc.qld.gov.au/arcgis/rest/services/ImageryBaseMapsEarthCover/LightGreyMap_SCRC/MapServer',
    layers: [25]
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
        'https://gislegacy.scc.qld.gov.au/arcgis/rest/services/Structure/Structure_SCRC/MapServer/1',
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

var offLeashStyles = {
    "Dogs prohibited at all times": DOGS_NEVER_OK,
    "Prohibited animal area at all times": DOGS_NEVER_OK,
    "Dogs off leash at all times": DOGS_OK,
    "Dogs off leash at times indicated on signs": DOGS_SOMETIMES_OK,
    "Dogs off leash 4pm to 8am": DOGS_SOMETIMES_OK,
    "Dogs off leash 5am to 8am and 5pm to 8pm": DOGS_SOMETIMES_OK,
    "Dogs off leash May to October, 4pm to 8am": DOGS_SOMETIMES_OK,
    "Pedestrian Thoroughfare - dogs on leash at all times": DOGS_ON_LEASH,
    "Spectators with dogs on leash at all times allowed": DOGS_ON_LEASH,
    "Other": OTHER
};

var offLeashLegendItems = [
    [DOGS_OK, 'Dogs off leash at all times'],
    [DOGS_SOMETIMES_OK, 'Dogs off leash at specified times'],
    [DOGS_ON_LEASH, 'Dogs on leash at all times'],
    [DOGS_NEVER_OK, 'Dogs prohibited at all times'],
    [OTHER, 'Other']
];

var offLeashAreas = L.esri.featureLayer({
    url: 'https://gislegacy.scc.qld.gov.au/arcgis/rest/services/Boundaries/Boundaries_SCRC/MapServer/6',
    style: function (feature) {
        var style = {
            fillOpacity: 0.5,
            weight: 2
        };

        style.color = offLeashStyles[feature.properties.Times_1] || OTHER;
        style.fillColor = style.color;

        return style;
    }
});

offLeashAreas.bindPopup(function (evt) {
    if (evt.feature.properties.Location == null) evt.feature.properties.Location = '';
    return L.Util.template('<p>{Times_1}<br>{Location}</p>', evt.feature.properties);
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
