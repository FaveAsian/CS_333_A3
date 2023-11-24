let width = 960, height = 500;

let projection = d3.geoMercator()
    .scale(125) // scale to zoom in and out of the map
    .translate([width / 2, height / 2]);

let path = d3.geoPath().projection(projection);

let svg = d3.select("#map-container").append("svg")
    .attr("width", width)
    .attr("height", height);

let tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

// https://www.d3indepth.com/zoom-and-pan/
let zoom = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0, 0], [width, height]]) // restrict panning to within the map area
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
        .attr("class", "country")
        .on("mouseover", mouseOverEvent)
        .on("mouseout", mouseOutEvent);

    // Add a border around the map
    svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("fill", "none");

    // Add event listener for the slider
    document.getElementById('yearSlider').addEventListener('input', function(e) {
        let year = e.target.value;
        document.getElementById('yearDisplay').textContent = year;
        updateData(year);
    });
}

// handles the zooming and panning
function handleZoom(e){
    //  Easy zooming and panning
    svg.selectAll("path")
        .attr("transform", e.transform)
}

function mouseOverEvent(d){
    let countryData = d3.select(this).datum();
    let [x, y] = d3.pointer(d);

    tooltip.html(countryData.properties.name)
        .style("left", (x + 10) + "px")
        .style("top", (y - 15) + "px")
        .style("display", "block");
}

function mouseOutEvent(d){
    // Hide tooltip on mouseout
    tooltip.style("display", "none");
}

async function updateData(year) {
    let filteredData = data.features.filter(d => d.properties.year === year);
    // Assuming each data point is a [longitude, latitude] pair
    svg.selectAll("circle").remove(); // remove old circles
    filteredData.forEach(function(d) {
        let coordinates = projection(d.geometry.coordinates);
        svg.append("circle")
            .attr("cx", coordinates[0])
            .attr("cy", coordinates[1])
            .attr("r", 5); // radius of circle
    });
}