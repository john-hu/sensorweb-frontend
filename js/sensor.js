(function(exports){
  const CHART_FORMAT = 'LLL';

  $(document).ready(function(){
    $('.modal-trigger').leanModal();
  });

  var fakeDataMode = false;

  var latestUpdateElm = $('#latest-update');
  var pm25Elm = $('#pm25');
  var sensorDataElm = $('#sensor-data');
  var sensorId = $.url().param('id');

  var mapAPIReady = false;
  var infowindow;

  // google map realted.
  var latestSensorData;
  var gMap;
  var gMapMarker;

  // Chart related
  var dataChart;

  if (fakeDataMode) {
    latestSensorData = {
      name: "Mozilla Taiwan",
      description: "Mozilla Taiwan Taipei office",
      latestUpdate: moment().format(CHART_FORMAT),
      pm25Index: Math.random() * 100
    }

    var ctx = $("#sensor-data-chart").get(0).getContext("2d");
    var fakeArray = [];

    for (var i=300; i>0; i--) {
      fakeArray.push({
        datetime: Date.now() - i * 60000,
        pm25Index: Math.random() * 100
      })
    }
    dataChart = new Chart(ctx, dataConvertion(fakeArray));
  }

  function updateInfo(sensor) {
    var newContent =
      '<div id="map-infowindow">'+
        '<h5 id="info-title">' + sensor.name + '</h5>'+
        '<div id="bodyContent">'+
          '<p id="info-description">' + sensor.description + '</p>'+
          '<p>PM2.5: <span id="info-pm25-index">' + sensor.pm25Index + '</span></p>'+
          '<p>Last Update: <span id="info-last-update">' + moment(sensor.latestUpdate).format(CHART_FORMAT) + '</span></p>'+
        '</div>'+
      '</div>';
    infowindow.setContent(newContent);
  }

  function initMap() {
    mapAPIReady = true;

    if (!latestSensorData) {
      return;
    }
    var coords = latestSensorData.coords;
    var location = coords ?
      {lat: Number(coords.lat), lng: Number(coords.lng)} :
      {lat: 25.032506, lng: 121.5674536};

    gMap = new google.maps.Map(document.getElementById('sensor-location-map'), {
      zoom: 16,
      center: location
    });

    infowindow = new google.maps.InfoWindow();

    gMapMarker = new google.maps.Marker({
      position: location,
      map: gMap,
      title: latestSensorData.name
    });

    updateInfo(latestSensorData);

    infowindow.open(gMap, gMapMarker);

    gMapMarker.addListener('click', function() {
      infowindow.open(gMap, gMapMarker);
    });
  }

  function dataConvertion(dataArray) {
    var config = {
      type: 'line',
      data: {
        datasets: [{
          label: "PM2.5 value",
    			 pointBorderWidth: 1,
          fill: false,
          data: dataArray.map(function(d) {
            return { x: moment(d.datetime).format(CHART_FORMAT), y: d.pm25Index };
          })
        }]
      },
      options: {
        responsive: true,
        scales: {
          xAxes: [{
            type: "time",
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Time'
            }
          }, ],
          yAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'PM2.5 (μg/m)'
            }
          }]
        }
      }
    };
    return config;
  }

  $.ajax({
    url: API_URL + 'sensors/' + sensorId,
    dataType: 'jsonp'
  })
  .done(function(sensors) {
    var sensor = sensors[0];
    var sensorNameElm = $('#sensor-name');
    var sensorIdElm = $('#sensor-id')
    var sensorDescriptionElm = $('#sensor-description');
    sensorNameElm.text(sensor.name);
    sensorIdElm.text(sensor._id);
    sensorDescriptionElm.text(sensor.description);
    latestUpdateElm.text(moment(sensor.latestUpdate).fromNow());
    pm25Elm.text(sensor.pm25Index);
    latestSensorData = sensor;

    // Init the map if API is ready
    if (mapAPIReady) {
      initMap();
    }
  })
  .fail(function(error) {
    console.error(error);
  });

  $.ajax({
    url: API_URL + 'sensors/' + sensorId + '/data',
    dataType: 'jsonp'
  })
  .done(function(dataArray) {
    if (dataArray.length === 0) {
      return;
    }

    dataChart && dataChart.destroy();

    var ctx = $("#sensor-data-chart").get(0).getContext("2d");
    dataChart = new Chart(ctx, dataConvertion(dataArray));
  })
  .fail(function(error) {
    console.error(error);
  });

  // XXX: Hack to sync the latest data.
  setInterval(function() {
    $.ajax({
      url: API_URL + 'sensors/' + sensorId,
      dataType: 'jsonp'
    })
    .done(function(sensors) {
      var sensor = sensors[0];
      if (sensor.latestUpdate !== undefined &&
          sensor.pm25Index !== undefined) {
        latestUpdateElm.text(moment(sensor.latestUpdate).fromNow());
        pm25Elm.text(sensor.pm25Index);

        latestSensorData = sensor;
        updateInfo(sensor);

        var formattedDate = moment(sensor.latestUpdate).format(CHART_FORMAT);
        if (!dataChart) {
          var ctx = $("#sensor-data-chart").get(0).getContext("2d");
          dataChart = new Chart(ctx, dataConvertion([sensor]));
        } else if (formattedDate > dataChart.data.datasets[0].data[0].x) {
          dataChart.data.datasets[0].data.unshift({
            x: moment(sensor.latestUpdate).format(CHART_FORMAT),
            y: sensor.pm25Index
          });
          dataChart.update();
        }
      }
    });
  }, 60000);

  exports.initMap = initMap;

})(window);
