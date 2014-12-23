"use strict";

(function(exports) {
  function Sink() {
    var source = new EventSource('/events');

    this.source = source.onmessage = this.onMessage.bind(this);
  }

  Sink.prototype.onMessage = function(event) {
    console.log(event);
  };

  function Graph(options) {
    if (options === undefined) options = {};
    this.el = document.createElement("svg");
    this.axes = options.axes;
    this.parse = options.parse;
    this.sink = new Sink('/events');
  }

  Graph.prototype = {
    load: function (data) {
      var _data = this.parse(data);
      _data = _data.sort(function (a, b) {
        return a.created_at > b.created_at ? 1 : -1;
      });
      var margin = { top: 100, right: 30, bottom: 30, left: 30 };
      var width = 800 - margin.left - margin.right;
      var height = 400 - margin.top - margin.bottom;

      var x = d3.time.scale.utc();
      var y = d3.scale.linear().domain([0, 200000]).range([height, 0]);

      x.ticks(d3.time.minute, 15);
      x.domain([new Date(data[0].created_at), new Date(data[data.length - 1].created_at)]).range([0, width]);

      var svg = d3.select("body").append("svg").attr({
        width: width + margin.left + margin.right,
        height: height + margin.top + margin.bottom
      });

      var axis = d3.svg.axis().orient("bottom").scale(x);

      svg.append("g").attr("class", "x axis").attr("transform", "translate(0, " + height + ")").call(axis);

      svg.append("defs").append("clipPath").attr("id", "clip").append("rect").attr("width", width).attr("height", height);

      var line = d3.svg.area().interpolate("linear").x(function (d, i) {
        return x(d.created_at);
      }).y0(height).y1(function (d, i) {
        return y(d.duration);
      });

      var path = svg.append("g").attr("clip-path", "url(#clip)").append("path").datum(_data).attr("class", "area").attr("d", line);
    }

  };

  exports.Zinc = {
    Graph: Graph
  };
}(window));
