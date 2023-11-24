let width = 960, height = 500;

let projection = d3.geoMercator()
    .scale(150) // scale to zoom in and out of the map
    .translate([width / 2, height / 2]);

let path = d3.geoPath().projection(projection);

let svg = d3.select("#map-container").append("svg")
    .attr("width", width)
    .attr("height", height);

// https://www.d3indepth.com/zoom-and-pan/
let zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", handleZoom)

svg.call(zoom)

ready();

let data, countries;

async function ready(){
    data = await d3.json("life_expec.json");

    countries = await d3.json("countries.json")

    svg.selectAll("path")
        .data(countries.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "lightgray")
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);
}

function handleZoom(e){
    svg.selectAll("path")
        .attr("transform", e.transform)
}