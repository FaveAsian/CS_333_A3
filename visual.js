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
    .translateExtent([[-30, 30], [width, height-100]]) // restrict panning to within the map area
    .on("zoom", handleZoom)

svg.call(zoom)

ready();

let data, countries;

async function ready(){
    let lifeExpec = await d3.json("life_expec.json");
    let countries = await d3.json("countries.json");

    // Create a lookup object from lifeExpecData
    let lifeExpecLookup = {};
    lifeExpec.forEach(d => {
        if (!lifeExpecLookup[d.Country]) {
            lifeExpecLookup[d.Country] = [];
        }
        lifeExpecLookup[d.Country].push(d);
    });
    // Add life expectancy data to countries
    countries.features.forEach(d => {
        // Assuming the country name is stored in d.properties.name_long
        d.properties.lifeExpec = lifeExpecLookup[d.properties.name_long];
    });

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

    // Get the year from the slider
    let sliderYear = d3.select("#yearSlider").property("value");

    // Check if lifeExpec data exists for the country
    if (!countryData.properties.lifeExpec) {
        tooltip.html(countryData.properties.name + "<br/>No data available");
    } else {
        // Get the life expectancy data for this year
        let yearData = countryData.properties.lifeExpec.filter(d => d.Year == sliderYear)[0];

        // If there's no data for this year, display a default message
        if (!yearData) {
            tooltip.html(countryData.properties.name + "<br/>No data for this year");
        } else if (!yearData["Life expectancy "]) {
            // If there's no life expectancy data for this country, display a default message
            tooltip.html(countryData.properties.name + "<br/>No life expectancy data for this year");
        } else {
            // Otherwise, display the country name, the year, and the life expectancy for the slider year
            tooltip.html(countryData.properties.name + "<br/>Year: " + yearData["Year"] + "<br/>Life expectancy: " + yearData["Life expectancy "]);
        }
    }

    tooltip.style("left", (x + 10) + "px")
        .style("top", (y - 15) + "px")
        .style("display", "block");
}

function mouseOutEvent(d){
    // Hide tooltip on mouseout
    tooltip.style("display", "none");
}

