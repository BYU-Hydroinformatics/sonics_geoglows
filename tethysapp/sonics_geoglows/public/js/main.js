function get_requestData(watershed, subbasin, region, comid, startdate) {
  getdata = {
    watershed: watershed,
    subbasin: subbasin,
    region: region,
    comid: comid,
  };
  $.ajax({
    url: 'get-request-data',
    type: 'GET',
    data: getdata,
    error: function (e) {
      $('#info').html(
        '<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the data</strong></p>'
      );
      $('#info').removeClass('d-none');
      console.log(e);
      $('#hydrographs-loading').addClass('d-none');
      $('#dailyAverages-loading').addClass('d-none');
      $('#monthlyAverages-loading').addClass('d-none');
      $('#scatterPlot-loading').addClass('d-none');
      $('#scatterPlotLogScale-loading').addClass('d-none');
      $('#volumeAnalysis-loading').addClass('d-none');
      $('#forecast-loading').addClass('d-none');
      $('#forecast-bc-loading').addClass('d-none');
      setTimeout(function () {
        $('#info').addClass('d-none');
      }, 5000);
    },
    success: function (data) {
      get_hydrographs(watershed, subbasin, region, comid, startdate);
    },
  });
}

// Getting the csrf token
let csrftoken = Cookies.get('csrftoken');

function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return /^(GET|HEAD|OPTIONS|TRACE)$/.test(method);
}

$.ajaxSetup({
  beforeSend: function (xhr, settings) {
    if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
      xhr.setRequestHeader('X-CSRFToken', csrftoken);
    }
  },
});

var map;
var wmsLayer;

let $loading = $('#view-file-loading');
var m_downloaded_historical_streamflow = false;

function toggleAcc(layerID) {
  let layer = wms_layers[layerID];
  if (document.getElementById(`wmsToggle${layerID}`).checked) {
    // Turn the layer and legend on
    layer.setVisible(true);
    $('#wmslegend' + layerID).show(200);
  } else {
    layer.setVisible(false);
    $('#wmslegend' + layerID).hide(200);
  }
}

function init_map() {
  var base_layer = new ol.layer.Tile({
    source: new ol.source.OSM({}),
  });

  var streams = new ol.layer.Image({
    source: new ol.source.ImageWMS({
      //url: 'https://senamhi.westus2.cloudapp.azure.com/geoserver/peru_hydroviewer/wms',
      url: 'https://geoserver.hydroshare.org/geoserver/HS-9b6a7f2197ec403895bacebdca4d0074/wms',
      params: { LAYERS: 'south_america-peru-geoglows-drainage_line' },
      serverType: 'geoserver',
      crossOrigin: 'Anonymous',
    }),
    opacity: 0.5,
  });

  wmsLayer = streams;

  map = new ol.Map({
    target: 'map',
    layers: [base_layer, streams],
    view: new ol.View({
      center: ol.proj.fromLonLat([-77.02824, -10.07318]),
      zoom: 6,
    }),
  });
}

function get_hydrographs(watershed, subbasin, region, comid, startdate) {
  $('#hydrographs-loading').removeClass('d-none');
  m_downloaded_historical_streamflow = true;
  $.ajax({
    url: 'get-hydrographs',
    type: 'GET',
    data: {
      watershed: watershed,
      subbasin: subbasin,
      region: region,
      comid: comid,
    },
    contentType: 'application/json',
    error: function (e) {
      $('#hydrographs-loading').addClass('d-none');
      console.log(e);
      $('#info').html(
        '<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the data</strong></p>'
      );
      $('#info').removeClass('d-none');

      setTimeout(function () {
        $('#info').addClass('d-none');
      }, 5000);
    },
    success: function (data) {
      if (!data.error) {
        console.log('get_hydrographs in');
        $('#hydrographs-loading').addClass('d-none');
        $('#dates').removeClass('d-none');
        $loading.addClass('d-none');
        $('#hydrographs-chart').removeClass('d-none');
        $('#hydrographs-chart').html(data);

        //resize main graph
        Plotly.Plots.resize($('#hydrographs-chart .js-plotly-plot')[0]);
        Plotly.relayout($('#hydrographs-chart .js-plotly-plot')[0], {
          'xaxis.autorange': true,
          'yaxis.autorange': true,
        });

        var params_obs = {
          watershed: watershed,
          subbasin: subbasin,
          region: region,
          comid: comid,
        };

        $('#submit-download-observed-discharge').attr({
          target: '_blank',
          href: 'get-observed-discharge-csv?' + jQuery.param(params_obs),
        });

        $('#download_observed_discharge').removeClass('d-none');

        var params_sim = {
          watershed: watershed,
          subbasin: subbasin,
          region: region,
          comid: comid,
        };

        $('#submit-download-simulated-discharge').attr({
          target: '_blank',
          href: 'get-simulated-discharge-csv?' + jQuery.param(params_sim),
        });

        $('#download_simulated_discharge').removeClass('d-none');

        var params_sim_bc = {
          watershed: watershed,
          subbasin: subbasin,
          region: region,
          comid: comid,
        };

        $('#submit-download-simulated-bc-discharge').attr({
          target: '_blank',
          href: 'get-simulated-bc-discharge-csv?' + jQuery.param(params_sim_bc),
        });

        $('#download_simulated_bc_discharge').removeClass('d-none');

        get_time_series(watershed, subbasin, region, comid, startdate);
      } else if (data.error) {
        $('#hydrographs-loading').addClass('d-none');
        console.log(data.error);
        $('#info').html(
          '<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the Data</strong></p>'
        );
        $('#info').removeClass('d-none');

        setTimeout(function () {
          $('#info').addClass('d-none');
        }, 5000);
      } else {
        $('#info')
          .html('<p><strong>An unexplainable error occurred.</strong></p>')
          .removeClass('d-none');
      }
      console.log('get_hydrographs out');
    },
  });
}

function get_time_series(watershed, subbasin, region, comid, startdate) {
  $('#forecast-loading').removeClass('d-none');
  $('#forecast-chart').addClass('d-none');
  $('#dates').addClass('d-none');
  $.ajax({
    type: 'GET',
    url: 'get-time-series/',
    data: {
      watershed: watershed,
      subbasin: subbasin,
      region: region,
      comid: comid,
      startdate: startdate,
    },
    error: function (e) {
      $('#forecast-loading').addClass('d-none');
      console.log(e);
      $('#info').html(
        '<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the forecast</strong></p>'
      );
      $('#info').removeClass('d-none');

      setTimeout(function () {
        $('#info').addClass('d-none');
      }, 5000);
    },
    success: function (data) {
      if (!data.error) {
        console.log('get_time_series in');

        $('#forecast-loading').addClass('d-none');
        $('#dates').removeClass('d-none');
        //$loading.addClass('d-none');
        $('#forecast-chart').removeClass('d-none');
        $('#forecast-chart').html(data);

        //resize main graph
        Plotly.Plots.resize($('#forecast-chart .js-plotly-plot')[0]);
        Plotly.relayout($('#forecast-chart .js-plotly-plot')[0], {
          'xaxis.autorange': true,
          'yaxis.autorange': true,
        });

        var params = {
          watershed: watershed,
          subbasin: subbasin,
          region: region,
          comid: comid,
          startdate: startdate,
        };

        $('#submit-download-sonics-forecast').attr({
          target: '_blank',
          href: 'get-sonics-forecast-data-csv?' + jQuery.param(params),
        });

        $('#download_sonics_forecast').removeClass('d-none');

        $('#submit-download-geoglows-forecast').attr({
          target: '_blank',
          href: 'get-geoglows-forecast-data-csv?' + jQuery.param(params),
        });

        $('#download_geoglows_forecast').removeClass('d-none');

        get_time_series_bc(watershed, subbasin, region, comid, startdate);
      } else if (data.error) {
        $('#forecast-loading').addClass('d-none');
        console.log(data.error);
        $('#info').html(
          '<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the forecast</strong></p>'
        );
        $('#info').removeClass('d-none');

        setTimeout(function () {
          $('#info').addClass('d-none');
        }, 5000);
      } else {
        $('#info')
          .html('<p><strong>An unexplainable error occurred.</strong></p>')
          .removeClass('d-none');
      }
      console.log('get_time_series out');
    },
  });
}

function get_time_series_bc(watershed, subbasin, region, comid, startdate) {
  $('#forecast-bc-loading').removeClass('d-none');
  $('#forecast-bc-chart').addClass('d-none');
  $('#dates').addClass('d-none');
  $.ajax({
    type: 'GET',
    url: 'get-time-series-bc/',
    data: {
      watershed: watershed,
      subbasin: subbasin,
      region: region,
      comid: comid,
      startdate: startdate,
    },
    error: function (e) {
      $('#forecast-bc-loading').addClass('d-none');
      console.log(e);
      $('#info').html(
        '<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the forecast</strong></p>'
      );
      $('#info').removeClass('d-none');

      setTimeout(function () {
        $('#info').addClass('d-none');
      }, 5000);
    },
    success: function (data) {
      if (!data.error) {
        console.log('get_time_series_bc in');

        $('#forecast-bc-loading').addClass('d-none');
        $('#dates').removeClass('d-none');
        //$loading.addClass('d-none');
        $('#forecast-bc-chart').removeClass('d-none');
        $('#forecast-bc-chart').html(data);

        //resize main graph
        Plotly.Plots.resize($('#forecast-bc-chart .js-plotly-plot')[0]);
        Plotly.relayout($('#forecast-bc-chart .js-plotly-plot')[0], {
          'xaxis.autorange': true,
          'yaxis.autorange': true,
        });

        var params = {
          watershed: watershed,
          subbasin: subbasin,
          region: region,
          comid: comid,
          startdate: startdate,
        };

        $('#submit-download-sonics-forecast').attr({
          target: '_blank',
          href: 'get-sonics-forecast-data-csv?' + jQuery.param(params),
        });

        $('#download_sonics_forecast').removeClass('d-none');

        $('#submit-download-bc-geoglows-forecast').attr({
          target: '_blank',
          href: 'get-bc-geoglows-forecast-data-csv?' + jQuery.param(params),
        });

        $('#download_bc_geoglows_forecast').removeClass('d-none');
      } else if (data.error) {
        $('#forecast-bc-loading').addClass('d-none');
        console.log(data.error);
        $('#info').html(
          '<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the forecast</strong></p>'
        );
        $('#info').removeClass('d-none');

        setTimeout(function () {
          $('#info').addClass('d-none');
        }, 5000);
      } else {
        $('#info')
          .html('<p><strong>An unexplainable error occurred.</strong></p>')
          .removeClass('d-none');
      }
      console.log('get_time_series_bc out');
    },
  });
}

function map_events() {
  map.on('pointermove', function (evt) {
    if (evt.dragging) {
      return;
    }
    var pixel = map.getEventPixel(evt.originalEvent);
    var hit = map.forEachLayerAtPixel(pixel, function (layer) {
      if (layer == wmsLayer) {
        current_layer = layer;
        return true;
      }
    });
    map.getTargetElement().style.cursor = hit ? 'pointer' : '';
  });

  map.on('singleclick', function (evt) {
    if (map.getTargetElement().style.cursor == 'pointer') {
      var view = map.getView();
      var viewResolution = view.getResolution();
      var wms_url = current_layer
        .getSource()
        .getGetFeatureInfoUrl(
          evt.coordinate,
          viewResolution,
          view.getProjection(),
          { INFO_FORMAT: 'application/json' }
        );

      if (wms_url) {
        $('#obsgraph').modal('show');
        $('#hydrographs-chart').addClass('d-none');
        $('#forecast-chart').addClass('d-none');
        $('#forecast-bc-chart').addClass('d-none');
        $('#hydrographs-loading').removeClass('d-none');
        $('#forecast-loading').removeClass('d-none');
        $('#forecast-bc-loading').removeClass('d-none');
        $('#download_simulated_discharge').addClass('d-none');
        $('#download_observed_discharge').addClass('d-none');
        $('#download_simulated_discharge').addClass('d-none');
        $('#download_simulated_bc_discharge').addClass('d-none');
        $('#download_sonics_forecast').addClass('d-none');
        $('#download_geoglows_forecast').addClass('d-none');
        $('#download_bc_geoglows_forecast').addClass('d-none');
        $('#stream-info').empty();

        $.ajax({
          type: 'GET',
          url: wms_url,
          dataType: 'json',
          success: function (result) {
            watershed = result['features'][0]['properties']['watershed'];
            subbasin = result['features'][0]['properties']['subbasin'];
            region = result['features'][0]['properties']['region'];
            comid = result['features'][0]['properties']['COMID'];
            var startdate = '';
            $('#stream-info').append(
              '<h3 id="Watershed-Tab">Watershed: ' +
                watershed +
                '</h3><h5 id="Subbasin-Tab">Subbassin: ' +
                subbasin +
                '</h3><h5 id="Region-Tab">Region: ' +
                region +
                '</h5><h5>COMID: ' +
                comid +
                '</h5>'
            );
            get_requestData(watershed, subbasin, region, comid, startdate);
          },
          error: function (e) {
            console.log(e);
          },
        });
      }
    }
  });
}

$(function () {
  $('#app-content-wrapper').removeClass('show-nav');
  $('.toggle-nav').removeClass('toggle-nav');

  init_map();
  map_events();

  $('#datesSelect').change(function () {
    //when date is changed

    //var sel_val = ($('#datesSelect option:selected').val()).split(',');
    sel_val = $('#datesSelect').val();

    //var startdate = sel_val[0];
    var startdate = sel_val;
    startdate = startdate.replace('-', '');
    startdate = startdate.replace('-', '');

    $loading.removeClass('d-none');
    get_time_series(watershed, subbasin, region, comid, startdate);
  });
});

function getRegionGeoJsons() {
  let geojsons = region_index[$('#regions').val()]['geojsons'];
  for (let i in geojsons) {
    var regionsSource = new ol.source.Vector({
      url: staticGeoJSON + geojsons[i],
      format: new ol.format.GeoJSON(),
    });

    var regionStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'red',
        width: 3,
      }),
    });

    var regionsLayer = new ol.layer.Vector({
      name: 'myRegion',
      source: regionsSource,
      style: regionStyle,
    });

    map.getLayers().forEach(function (regionsLayer) {
      if (regionsLayer.get('name') == 'myRegion') map.removeLayer(regionsLayer);
    });
    map.addLayer(regionsLayer);

    setTimeout(function () {
      var myExtent = regionsLayer.getSource().getExtent();
      map.getView().fit(myExtent, map.getSize());
    }, 500);
  }
}

function getProvinceGeoJsons() {
  let geojsons = region_index2[$('#provinces').val()]['geojsons'];
  for (let i in geojsons) {
    var regionsSource = new ol.source.Vector({
      url: staticGeoJSON2 + geojsons[i],
      format: new ol.format.GeoJSON(),
    });

    var regionStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'red',
        width: 3,
      }),
    });

    var regionsLayer = new ol.layer.Vector({
      name: 'myRegion',
      source: regionsSource,
      style: regionStyle,
    });

    map.getLayers().forEach(function (regionsLayer) {
      if (regionsLayer.get('name') == 'myRegion') map.removeLayer(regionsLayer);
    });
    map.addLayer(regionsLayer);

    setTimeout(function () {
      var myExtent = regionsLayer.getSource().getExtent();
      map.getView().fit(myExtent, map.getSize());
    }, 500);
  }
}

function getBasinGeoJsons() {
  let basins = region_index3[$('#basins').val()]['geojsons'];
  for (let i in basins) {
    var regionsSource = new ol.source.Vector({
      url: staticGeoJSON3 + basins[i],
      format: new ol.format.GeoJSON(),
    });

    var regionStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#0050a0',
        width: 3,
      }),
    });

    var regionsLayer = new ol.layer.Vector({
      name: 'myRegion',
      source: regionsSource,
      style: regionStyle,
    });

    map.getLayers().forEach(function (regionsLayer) {
      if (regionsLayer.get('name') == 'myRegion') map.removeLayer(regionsLayer);
    });
    map.addLayer(regionsLayer);

    setTimeout(function () {
      var myExtent = regionsLayer.getSource().getExtent();
      map.getView().fit(myExtent, map.getSize());
    }, 500);
  }
}

function getSubBasinGeoJsons() {
  let subbasins = region_index4[$('#subbasins').val()]['geojsons'];
  for (let i in subbasins) {
    var regionsSource = new ol.source.Vector({
      url: staticGeoJSON4 + subbasins[i],
      format: new ol.format.GeoJSON(),
    });

    var regionStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#009C3B',
        width: 3,
      }),
    });

    var regionsLayer = new ol.layer.Vector({
      name: 'myRegion',
      source: regionsSource,
      style: regionStyle,
    });

    map.getLayers().forEach(function (regionsLayer) {
      if (regionsLayer.get('name') == 'myRegion') map.removeLayer(regionsLayer);
    });
    map.addLayer(regionsLayer);

    setTimeout(function () {
      var myExtent = regionsLayer.getSource().getExtent();
      map.getView().fit(myExtent, map.getSize());
    }, 500);
  }
}

$('#stp-stream-toggle').on('change', function () {
  wmsLayer.setVisible($('#stp-stream-toggle').prop('checked'));
});
$('#stp-stations-toggle').on('change', function () {
  wmsLayer2.setVisible($('#stp-stations-toggle').prop('checked'));
});

// Regions gizmo listener
$('#regions').change(function () {
  getRegionGeoJsons();
});
$('#provinces').change(function () {
  getProvinceGeoJsons();
});
$('#basins').change(function () {
  getBasinGeoJsons();
});
$('#subbasins').change(function () {
  getSubBasinGeoJsons();
});
