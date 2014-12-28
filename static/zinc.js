"use strict";

(function(exports) {
  var DAY_IN_MS = 1000 * 60 * 60 * 24,
      HOUR_IN_MS = 1000 * 60 * 60,
      MINUTE_IN_MS = 1000 * 60;

  function Sink(url) {
    var source = new EventSource(url);

    this.source = source.onmessage = this.onMessage.bind(this);
  }

  Emitter(Sink.prototype);

  Sink.prototype.onMessage = function(event) {
    var data = JSON.parse(event.data);
    data.created_at = new Date(data.created_at);
    data.converted_at = new Date(data.converted_at);
    data.duration = data.converted_at - data.created_at;
    this.emit('message', data);
  };

  function Graph(options) {
    if (options === undefined) options = {};
    this.el = document.createElement("svg");
    this.axes = options.axes;
    this.parse = options.parse;
    this.messages = [];
    this.sink = new Sink('/events');
    this.sink.on('message', this.onMessage.bind(this));
  }

  Graph.prototype.load = function(data) {
    var sorted = this.parse(data).sort(function (a, b) {
      return a.created_at > b.created_at ? 1 : -1;
    });
    var margin = { top: 100, right: 30, bottom: 30, left: 30 };
    var width = 800 - margin.left - margin.right;
    var height = 400 - margin.top - margin.bottom;

    var x = this._x = d3.time.scale.utc();
    var y = this._y = d3.scale.linear().domain([0, 4000000]).range([height, 0]);

    x.domain([new Date(data[0].created_at), new Date(data[data.length - 1].created_at)]).range([0, width]);

    var svg = this._svg = d3.select("body").append("svg").attr({
      width: width + margin.left + margin.right,
      height: height + margin.top + margin.bottom
    });

    var axis = this._axis = d3.svg.axis().orient("bottom").scale(x);

    svg.append("g").attr("class", "x axis").attr("transform", "translate(0, " + height + ")").call(axis);

    svg.append("defs").append("clipPath").attr("id", "clip").append("rect").attr("width", width).attr("height", height);

    var line = d3.svg.area().interpolate("linear").x(function (d, i) {
      return x(d.converted_at);
    }).y0(height).y1(function (d, i) {
      return y(d.duration);
    });

    this._path = svg.append("g").attr("clip-path", "url(#clip)").append("path").datum(this.messages).attr("class", "area").attr("d", line);
  };

  Graph.prototype.onMessage = function(message) {
    var to = message.converted_at,
        from = new Date(to - MINUTE_IN_MS),
        x = this._x,
        y = this._y;

    x.domain([from, to]);
    this._svg.select('.x.axis').call(this._axis);
    this.messages.push(message);
    var margin = { top: 100, right: 30, bottom: 30, left: 30 };
    var height = 400 - margin.top - margin.bottom;
    var line = d3.svg.area().interpolate("linear").x(function (d, i) {
      return x(d.converted_at);
    }).y0(height).y1(function (d, i) {
      return y(d.duration);
    });
    this._path.datum(this.messages).attr("d", line);
  };

  exports.Zinc = {
    Graph: Graph
  };
}(window));
