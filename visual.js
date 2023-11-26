let width = 960, height = 500;

let projection = d3.geoMercator()
    .scale(125) // scale to zoom in and out of the map
    .translate([width / 2, height / 2]);

let path = d3.geoPath().projection(projection);

let mapSvg = d3.select("#map-container").append("svg")
    .attr("width", width)
    .attr("height", height);

let tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

// https://www.d3indepth.com/zoom-and-pan/
let mapZoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[-30, 30], [width, height-100]]) // restrict panning to within the map area
    .on("zoom", handleZoom)

mapSvg.call(mapZoom)
const margin = { top: 30, right: 30, bottom: 30, left: 100 };
let barWidth = 600 - margin.left - margin.right; // 400
let barHeight = 300 - margin.top - margin.bottom; // 400

let barSvg = d3.select("#bar-graph-container").append("svg")
        .attr("width", barWidth + margin.left + margin.right)
        .attr("height", barHeight + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


ready();

let lifeExpec, countries;
let countryList = new Set()

async function ready(){
    lifeExpec = await d3.json("life_expec.json");
    countries = await d3.json("countries.json");

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

    mapSvg.selectAll("path")
        .data(countries.features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", "country")
        .on("mouseover", mouseOverEvent)
        .on("mouseout", mouseOutEvent)
        .on("click", handleClick);

    // Add a border around the map
    mapSvg.append("rect")
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
    mapSvg.selectAll("path")
        .attr("transform", e.transform)
}

function mouseOverEvent(d){
    let countryData = d3.select(this).datum();
    let [x, y] = d3.pointer(d);
    
    let nameList = lifeExpec.filter(d => d.Country === countryData.properties.name)
    let longList = lifeExpec.filter(d => d.Country === countryData.properties.name_long)
    let formalList = lifeExpec.filter(d => d.Country === countryData.properties.formal_en)

    let finalList;

    if (nameList.length != 0){
        finalList = nameList;
    }
    else if (longList.length != 0) {
        finalList = longList;
    } 
    else {
        finalList = formalList;
    }
    
    // Get the year from the slider
    let sliderYear = d3.select("#yearSlider").property("value");

    // Check if lifeExpec data exists for the country
    // countryData.properties.name or countryData.properties.name_long
    if (finalList.length == 0) {
        tooltip.html(countryData.properties.name + "<br/>No data available");
    } else {
        // Get the life expectancy data for this year
        let yearData = finalList.filter(d => d.Year == sliderYear)[0];

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

function handleClick(d){
    let countryData = d3.select(this).datum();

    // check if country in lise 
    if (countryList.has(countryData.properties.name)){
        countryList.delete(countryData.properties.name);
        countryList.delete(countryData.properties.name_long);
        countryList.delete(countryData.properties.formal_en);
        d3.select(this).style("fill", "lightgray");
    }
    else{
        countryList.add(countryData.properties.name);
        countryList.add(countryData.properties.name_long);
        countryList.add(countryData.properties.formal_en);
        d3.select(this).style("fill", "blue");
    }

    // Update the bar graph
    updateBarGraph();
}

// Define the scales and axis groups outside the function
let xScale = d3.scaleLinear().range([0, barWidth]);
let yScale = d3.scaleBand().range([0, barHeight]).padding(0.1);

let xAxisGroup = barSvg.append("g")
    .attr("transform", "translate(0," + barHeight + ")");
let yAxisGroup = barSvg.append("g");

function updateBarGraph() {
    // Get the year from the slider
    let sliderYear = d3.select("#yearSlider").property("value");

    // Filter the data based on the year and the countries in countryList
    let filteredData = lifeExpec.filter(d => d.Year == sliderYear && countryList.has(d.Country));

    // Update the domains of the scales with the new data
    xScale.domain([0, d3.max(filteredData, d => d["Life expectancy "])]);
    yScale.domain(filteredData.map(d => d.Country));

    // Update the axes
    xAxisGroup.transition().duration(500).call(d3.axisBottom(xScale));
    yAxisGroup.transition().duration(500).call(d3.axisLeft(yScale));

    // Sort the data by life expectancy
    filteredData.sort((a, b) => d3.descending(a["Life expectancy "], b["Life expectancy "]));

    // Remove the old bars
    barSvg.selectAll(".bar").remove();

    // Create the bars
    barSvg.selectAll(".bar")
        .data(filteredData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => yScale(d.Country))
        .attr("width", d => xScale(d["Life expectancy "]))
        .attr("height", yScale.bandwidth());

    // Update the y axis with the new scale
    barSvg.select(".y-axis")
        .call(d3.axisLeft(yScale));

    

    // Add label for the x axis
    xAxisGroup.append("text")
        .attr("y", 30) // Move the label up
        .attr("x", barWidth / 2) // Center the label
        .attr("text-anchor", "middle")
        .attr("fill", "black") // Set the color to black
        .text("Life expectancy");

    // Add label for the y axis
    yAxisGroup.append("text")
        .attr("y", -10) // Move the label up
        .attr("x", -20) // Align the label with the start of the axis
        .attr("text-anchor", "start")
        .attr("fill", "black") // Set the color to black
        .text("Country");
}