(function(L) {
  'use strict';
  var classToExtend = 'Class';
  if (L.version.charAt(0) !== '0') {
    classToExtend = 'Layer';
  }

  L.EdgeMarker = L[classToExtend].extend({
    options: {
      distanceOpacity: false,
      distanceOpacityFactor: 4,
      layerGroup: null,
      rotateIcons: true,
      findEdge: function(map) {
        return L.bounds([0, 0], map.getSize());
      },
      icon: L.divIcon({
        className: 'edge-marker-icon',
        html: '<i class="fas fa-angle-left" style="font-size: 24px;"></i>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      }),
      colorMap: {}
    },

    initialize: function(options) {
      L.setOptions(this, options);
    },

    addTo: function(map) {
      this._map = map;

      if (typeof map._getFeatures !== 'function') {
        L.extend(map, {
          _getFeatures: function() {
            var out = [];
            for (var l in this._layers) {
              if (typeof this._layers[l].getLatLng !== 'undefined') {
                out.push(this._layers[l]);
              }
            }
            return out;
          }
        });
      }

      map.on('move', this._addEdgeMarkers, this);
      map.on('viewreset', this._addEdgeMarkers, this);

      this._addEdgeMarkers();

      map.addLayer(this);

      return this;
    },

    destroy: function() {
      if (this._map && this._borderMarkerLayer) {
        this._map.off('move', this._addEdgeMarkers, this);
        this._map.off('viewreset', this._addEdgeMarkers, this);

        this._borderMarkerLayer.clearLayers();
        this._map.removeLayer(this._borderMarkerLayer);

        delete this._map._getFeatures;

        this._borderMarkerLayer = undefined;
      }
    },

    onClick: function(e) {
      this._map.setView(e.target.options.latlng, this._map.getZoom());
    },

    onAdd: function() {},

    _borderMarkerLayer: undefined,

    _addEdgeMarkers: function() {
      if (typeof this._borderMarkerLayer === 'undefined') {
        this._borderMarkerLayer = new L.LayerGroup();
      }
      this._borderMarkerLayer.clearLayers();

      var features = [];
      if (this.options.layerGroup != null) {
        features = this.options.layerGroup.getLayers();
        console.log('Processing layerGroup with', features.length, 'features');
      } else {
        features = this._map._getFeatures();
        console.log('Processing all map features:', features.length);
      }

      var mapPixelBounds = this.options.findEdge(this._map);

      var markerWidth = this.options.icon.options.iconSize[0];
      var markerHeight = this.options.icon.options.iconSize[1];

      for (var i = 0; i < features.length; i++) {
        var markerType = features[i].options.markerType || 'territory';
        if (markerType !== 'territory-label') {
          console.log('Skipping feature', i, 'with markerType:', markerType);
          continue;
        }

        var currentMarkerPosition = this._map.latLngToContainerPoint(
          features[i].getLatLng()
        );
        console.log('Feature', i, 'markerType: territory-label, position:', currentMarkerPosition);

        if (currentMarkerPosition.y < mapPixelBounds.min.y ||
          currentMarkerPosition.y > mapPixelBounds.max.y ||
          currentMarkerPosition.x > mapPixelBounds.max.x ||
          currentMarkerPosition.x < mapPixelBounds.min.x
        ) {
          console.log('Feature', i, 'is off-screen, creating edge marker');
          var x = currentMarkerPosition.x;
          var y = currentMarkerPosition.y;
          var markerDistance;

          var center = mapPixelBounds.getCenter();
          var rad = Math.atan2(center.y - y, center.x - x);
          var rad2TopLeftcorner = Math.atan2(center.y - mapPixelBounds.min.y, center.x - mapPixelBounds.min.x);

          if (Math.abs(rad) > rad2TopLeftcorner && Math.abs(rad) < Math.PI - rad2TopLeftcorner) {
            if (y < center.y) {
              y = mapPixelBounds.min.y + markerHeight / 2;
              x = center.x - (center.y - y) / Math.tan(Math.abs(rad));
              markerDistance = currentMarkerPosition.y - mapPixelBounds.y;
            } else {
              y = mapPixelBounds.max.y - markerHeight / 2;
              x = center.x - (y - center.y) / Math.tan(Math.abs(rad));
              markerDistance = -currentMarkerPosition.y;
            }
          } else {
            if (x < center.x) {
              x = mapPixelBounds.min.x + markerWidth / 2;
              y = center.y - (center.x - x) * Math.tan(rad);
              markerDistance = -currentMarkerPosition.x;
            } else {
              x = mapPixelBounds.max.x - markerWidth / 2;
              y = center.y + (x - center.x) * Math.tan(rad);
              markerDistance = currentMarkerPosition.x - mapPixelBounds.x;
            }
          }

          if (y < mapPixelBounds.min.y + markerHeight / 2) {
            y = mapPixelBounds.min.y + markerHeight / 2;
          } else if (y > mapPixelBounds.max.y - markerHeight / 2) {
            y = mapPixelBounds.max.y - markerHeight / 2;
          }
          if (x > mapPixelBounds.max.x - markerWidth / 2) {
            x = mapPixelBounds.max.x - markerWidth / 2;
          } else if (x < markerWidth / 2) {
            x = mapPixelBounds.min.x + markerWidth / 2;
          }

          var newOptions = this.options;
          if (this.options.distanceOpacity) {
            newOptions.fillOpacity =
              (100 - markerDistance / this.options.distanceOpacityFactor) / 100;
          }

          if (this.options.rotateIcons) {
            var angle = rad / Math.PI * 180;
            newOptions.angle = angle;
          }

          var ref = { latlng: features[i].getLatLng() };
          newOptions = L.extend({}, newOptions, ref);

          var iconColor = newOptions.colorMap[markerType] || 'blue';
          console.log('Edge marker for territory-label, color:', iconColor);

          newOptions.icon = L.divIcon({
            className: 'edge-marker-icon',
            html: `<i class="fas fa-angle-left" style="font-size: 24px; color: ${iconColor};"></i>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          var marker = L.rotatedMarker(
            this._map.containerPointToLatLng([x, y]),
            newOptions
          ).addTo(this._borderMarkerLayer);

          marker.on('click', this.onClick, marker);
        }
      }
      if (!this._map.hasLayer(this._borderMarkerLayer)) {
        this._borderMarkerLayer.addTo(this._map);
      }
    }
  });

  L.RotatedMarker = L.Marker.extend({
    options: {
      angle: 0
    },

    statics: {
      TRANSFORM_ORIGIN: L.DomUtil.testProp([
        'transformOrigin',
        'WebkitTransformOrigin',
        'OTransformOrigin',
        'MozTransformOrigin',
        'msTransformOrigin'
      ])
    },

    _initIcon: function() {
      L.Marker.prototype._initIcon.call(this);
      if (this._icon) {
        this._icon.style[L.RotatedMarker.TRANSFORM_ORIGIN] = '50% 50%';
      }
    },

    _setPos: function(pos) {
      L.Marker.prototype._setPos.call(this, pos);

      if (this._icon) {
        if (L.DomUtil.TRANSFORM) {
          this._icon.style[L.DomUtil.TRANSFORM] +=
            ' rotate(' + this.options.angle + 'deg)';
        } else if (L.Browser.ie) {
          var rad = this.options.angle * (Math.PI / 180),
            costheta = Math.cos(rad),
            sintheta = Math.sin(rad);
          this._icon.style.filter +=
            " progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand', M11=" +
            costheta +
            ', M12=' +
            -sintheta +
            ', M21=' +
            sintheta +
            ', M22=' +
            costheta +
            ')';
        }
      }
    },

    setAngle: function(ang) {
      this.options.angle = ang;
    }
  });

  L.rotatedMarker = function(pos, options) {
    return new L.RotatedMarker(pos, options);
  };

  L.edgeMarker = function(options) {
    return new L.EdgeMarker(options);
  };
})(L);