let width = 700, height = 400;

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
const margin = { top: 30, right: 20, bottom: 30, left: 165};
let barWidth = 700 - margin.left - margin.right; // 400
let barHeight = 475 - margin.top - margin.bottom; // 400

let barSvg = d3.select("#bar-graph-container").append("svg")
        .attr("width", barWidth + margin.left + margin.right)
        .attr("height", barHeight + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

let lineSvg = d3.select("#line-graph-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + 60 + "," + margin.top + ")");

// Create the scatterplot SVG
let scatterSvg = d3.select("#scatterplot-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + -10 + "," + margin.top + ")");

let legendSvg = scatterSvg.append("g")
    .attr("transform", "translate(" + margin.right-40 + "," + margin.top + ")");

// Define the color scale
let color = d3.scaleOrdinal([...d3.schemeTableau10, ...d3.schemePaired]);

ready();

let selectedValue = "Life expectancy";
let selectedText = "Life Expectancy";
let lifeExpec, countries;
let countryList = new Set();
let selectedRegions = new Set();
let deletedRegions = new Set();

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

    d3.selectAll('input[type="checkbox"]').on('change', function() {
        selectedRegions.clear()
        deletedRegions.clear()
        d3.selectAll('input[type="checkbox"]:checked').each(function() {
            countries.features.forEach(d => {
                if (this.value === d.properties.continent){
                    countryList.add(d.properties.name);
                    countryList.add(d.properties.name_long);
                    countryList.add(d.properties.formal_en);
                }
            });
        });

        d3.selectAll('input[type="checkbox"]:not(:checked)').each(function(){
            countries.features.forEach(d => {
                if (this.value === d.properties.continent && countryList.has(d.properties.name)){
                    countryList.delete(d.properties.name);
                    countryList.delete(d.properties.name_long);
                    countryList.delete(d.properties.formal_en);
                }
            });
        });

        updateMap();
        updateBarGraph();
        updateLineGraph();
        updateScatterPlot();
        updateLegend();
    });
    

    // Add event listener for the slider
    d3.select("#yearSlider").on("input", function() {
        // Get the current value of the slider
        let year = this.value;

        // Update the year label
        d3.select("#yearDisplay").text(year);

        // Update the bar graph
        updateBarGraph();
        updateScatterPlot();
    });
    updateBarGraph();
    updateLineGraph();
    updateScatterPlot();
    updateLegend();
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
        // Get the data for this year
        let yearData = finalList.filter(d => d.Year == sliderYear)[0];

        // If there's no data for this year, display a default message
        if (!yearData) {
            tooltip.html(countryData.properties.name + "<br/>No data for this year");
        } else if (!yearData[selectedValue]) {
            // If there's no selected value data for this country, display a default message
            tooltip.html(countryData.properties.name + "<br/>No " + selectedText.toLowerCase() + " data for this year");
        } else {
            // Otherwise, display the country name, the year, and the selected value for the slider year
            tooltip.html(countryData.properties.name + "<br/>Year: " + yearData["Year"] + "<br/>" + selectedText + ": " + yearData[selectedValue]);
        }
    }

    tooltip.style("opacity", 1)
        .style("left", (x + 20) + "px")
        .style("top", (y - 15) + "px")
        .style("display", "block");
}

function mouseOutEvent(d){
    // Hide tooltip on mouseout
    tooltip.style("opacity", 0).style("display", "none");
}

// Define a variable to keep track of the last added country
let lastAddedCountry = new Set();
function handleClick(d){
    let countryData = d3.select(this).datum();

    // check if country in set 
    if (countryList.has(countryData.properties.name)){
        countryList.delete(countryData.properties.name);
        countryList.delete(countryData.properties.name_long);
        countryList.delete(countryData.properties.formal_en);
        // d3.select(this).style("fill", "lightgray"); // hardcode color for selection as backup

        // If the removed country was the last added, clear lastAddedCountry
        if (lastAddedCountry.has(countryData.properties.name)) {
            lastAddedCountry.clear();
        }
    }
    else{
        countryList.add(countryData.properties.name);
        countryList.add(countryData.properties.name_long);
        countryList.add(countryData.properties.formal_en);
        // d3.select(this).style("fill", "blue"); // hardcode color for selection as backup

        // Update lastAddedCountry with the properties of the added country
        lastAddedCountry.clear();
        lastAddedCountry.add(countryData.properties.name);
        lastAddedCountry.add(countryData.properties.name_long);
        lastAddedCountry.add(countryData.properties.formal_en);
    }

    // Update map with selected 
    updateMap()
    // Update the bar graph
    updateBarGraph();

    // Update the line graph
    updateLineGraph();
    updateScatterPlot();

    updateLegend();
}

function updateMap(){
    mapSvg.selectAll("path")
        .classed("selected", d => countryList.has(d.properties.name))
}

// Define the scales and axis groups outside the function
let xScale = d3.scaleLinear().range([0, barWidth]);
let yScale = d3.scaleBand().range([0, barHeight]).padding(0.1);

let xAxisGroup = barSvg.append("g")
    .attr("transform", "translate(0," + barHeight + ")");
let yAxisGroup = barSvg.append("g");
// For the title
barSvg.append("text")
    .attr("id", "bar-title") // Add this line
    .attr("x", barWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("fill", "black")
    .text("Life Expectancy by Country in 2000");

// For the x-axis label
xAxisGroup.append("text")
    .attr("id", "x-axis-label") // Add this line
    .attr("y", 25)
    .attr("x", barWidth / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .text("Life expectancy");

// Add label for the y axis
yAxisGroup.append("text")
    .attr("y", -10) // Move the label up
    .attr("x", -20) // Align the label with the start of the axis
    .attr("text-anchor", "start")
    .attr("fill", "black") // Set the color to black
    .text("Country");

function updateBarGraph() {
    // Get the year from the slider
    let sliderYear = d3.select("#yearSlider").property("value");

    // Filter the data based on the year and the countries in countryList
    let filteredData = lifeExpec.filter(d => d.Year == sliderYear && countryList.has(d.Country));

    // Filter out the countries with null values
    filteredData = filteredData.filter(d => d[selectedValue] !== null);

    // Sort the data by selectedValue
    filteredData.sort((a, b) => d3.descending(a[selectedValue], b[selectedValue]));

    // Update the domains of the scales with the new data
    xScale.domain([0, d3.max(filteredData, d => d[selectedValue])]);
    yScale.domain(filteredData.map(d => d.Country));

    // Update the axes
    xAxisGroup.transition().duration(500).call(d3.axisBottom(xScale));
    yAxisGroup.transition().duration(500).call(d3.axisLeft(yScale));

    // Remove the old bars
    barSvg.selectAll("rect").remove();

    // Create the bars
    let bars = barSvg.selectAll("rect")
        .data(filteredData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("fill", d => color(d.Country))
        .attr("x", 0)
        .attr("y", d => yScale(d.Country))
        .attr("width", d => xScale(d[selectedValue]))
        .attr("height", yScale.bandwidth())
        .on("mouseover", function(event, d) {
            // Show the tooltip
            tooltip.style("opacity", 1)
                .html(`Country: ${d.Country}<br/>${selectedValue}: ${d[selectedValue]}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .style("display", "block");
        })
        .on("mouseout", function(d) {
            // Hide the tooltip
            tooltip.style("opacity", 0)
                .style("display", "none");
        });

    

    // Highlight the bar of the last added country
    bars.filter(d => lastAddedCountry.has(d.Country))
        .attr("fill", "red"); // Change the color to red

    // Update the y axis with the new scale
    barSvg.select(".y-axis")
        .call(d3.axisLeft(yScale));
}

// line graph title
lineSvg.append("text")
    .attr("id", "line-title") // Add this line
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("fill", "black")
    .text("Life Expectancy Over the Years");

let xLineScale = d3.scaleLinear()
    .domain([2000, 2015])
    .range([0, width]);
let yLineScale = d3.scaleLinear()
    .range([height, 0]);

let xAxisLine = d3.axisBottom(xLineScale)
    .tickValues(d3.range(2000, 2016))  // Generate tick values from 2000 to 2015
    .tickFormat(d3.format("d"));  // Format the tick values as integers
let yAxisLine = d3.axisLeft(yLineScale);

let line = d3.line()
    .x(d => xLineScale(d.Year))
    .y(d => yLineScale(d[selectedValue]));

// Append the axes
lineSvg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxisLine);



// Create the y-axis group once
let yAxisGroupLine = lineSvg.append("g")
    .attr("class", "y-axis-line")  // Assign a unique class
    .attr("transform", `translate(0, 0)`)
    .call(yAxisLine);  // Call the y-axis here

// Append a y-axis label
let yAxisLabel = lineSvg.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 100)
    .attr("x", 0 - (height / 2))  // Shift the label 20 pixels to the right
    .attr("dy", "1em")
    .style("text-anchor", "middle");

function updateLineGraph() {
    // Filter the data based on the countries in countryList
    let filteredData = lifeExpec.filter(d => countryList.has(d.Country));

    // Group the data by country
    let dataByCountry = d3.group(filteredData, d => d.Country);

    // Map each group to an object that includes the country name and the values array
    filteredData = Array.from(dataByCountry, ([Country, values]) => ({Country, values}));

    // Update the domain of the y-axis scale with the new data
    yLineScale.domain([0, d3.max(filteredData, d => d3.max(d.values, v => v[selectedValue]))]);

    // Select the y-axis and update it with the new scale
    d3.select(".y-axis-line")  // Select the y-axis using the unique class
        .transition()
        .duration(500)
        .call(d3.axisLeft(yLineScale));

    // Update the y-axis
    yAxisGroupLine.call(yAxisLine);

    // Remove the old lines
    lineSvg.selectAll(".line").remove();

    // Bind the data to the lines
    let countryLines = lineSvg.selectAll(".line")
        .data(filteredData, d => d.Country);

    // Enter new lines
    let countryLinesEnter = countryLines.enter().append("path")
        .attr("class", "line")
        .style("fill", "none");

    // Update existing lines
    countryLines = countryLines.merge(countryLinesEnter)
        .attr("d", d => line(d.values))
        .style("stroke",d => color(d.Country));

    // Exit old lines
    countryLines.exit().remove();

    // Flatten the data for the circles
    let circleData = filteredData.flatMap(d => d.values.map(value => ({...value, Country: d.Country})));

    // Filter the data to remove points with null values
    let filteredCircleData = circleData.filter(d => d[selectedValue] !== null);

    // Bind the data to the circles
    let circles = lineSvg.selectAll("circle")
        .data(filteredCircleData, d => d.Country + d.Year);
    
    // Handle the exit selection
    circles.exit().remove();

    // Select the tooltip div
    let tooltip = d3.select(".tooltip");

    // Enter new circles
    let circlesEnter = circles.enter().append("circle")
        .attr("r", 3.5)
        .attr("fill", d => color(d.Country))  // Use the color scale
        .on("mouseover", function(event, d) {
            // Show the tooltip
            tooltip.style("opacity", 1)
                .html(`Country: ${d.Country}<br/>Year: ${d.Year}<br/>${selectedValue}: ${d[selectedValue]}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .style("display", "block");
        })
        .on("mouseout", function(d) {
            // Hide the tooltip
            tooltip.style("opacity", 0)
                .style("display", "none");  // Add this line
        });

    // Update existing circles
    circles = circles.merge(circlesEnter)
        .attr("cx", d => xLineScale(d.Year))
        .attr("cy", d => yLineScale(d[selectedValue]));


    // Update the text of the y-axis label
    yAxisLabel.text(selectedValue);
}


function handleSelectChange(e) {
    selectedValue = e.value;
    selectedText = e.options[e.selectedIndex].text;
    
    let sliderYear = d3.select("#yearSlider").property("value");

    // Update the title and x-axis label
    d3.select("#bar-title").text(`${selectedText} by Country in ${sliderYear}`);
    d3.select("#x-axis-label").text(selectedText);
    d3.select("#line-title").text(`${selectedText} Over the Years`);
    
    // Update the bar graph
    updateBarGraph();

    // Update the line graph
    updateLineGraph();
    updateScatterPlot();

    updateLegend();
}

function handleSliderChange(){
    // Update map with selected 
    updateMap()
    // Update the bar graph
    updateBarGraph();
    // Update the title
    updateScatterPlot();

    updateLegend();
    
    let sliderYear = d3.select("#yearSlider").property("value");
    d3.select("#bar-title").text(`${selectedText} by Country in ${sliderYear}`);
}

function resetEverything(){
    countryList.clear();

    let allInputs = document.getElementsByTagName("input");

    for (let i = 0, max = allInputs.length; i < max; i++){
        if (allInputs[i].type === 'checkbox')
            allInputs[i].checked = false;
    }

    // Update map
    updateMap()
    // Update the bar graph
    updateBarGraph();
    // Update the line graph
    updateLineGraph();
    updateScatterPlot();
    updateLegend();
}

// Define the x and y scales
let xScatterScale = d3.scaleLinear().range([margin.left, width - margin.right]);
let yScatterScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);

// Define the x and y axes
let xAxisScatter = d3.axisBottom(xScatterScale);
let yAxisScatter = d3.axisLeft(yScatterScale);

// Create g elements for the x and y axes
let xAxisScatterG = scatterSvg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`);
let yAxisScatterG = scatterSvg.append("g")
    .attr("transform", `translate(${margin.left},0)`);

// Update the x and y axes
xAxisScatterG.call(xAxisScatter);
yAxisScatterG.call(yAxisScatter);

function updateScatterPlot() {
    // Get the year from the slider
    let sliderYear = d3.select("#yearSlider").property("value");

    // Filter the data based on the year and the countries in countryList
    let filteredData = lifeExpec.filter(d => d.Year == sliderYear && countryList.has(d.Country));

    // Filter out the countries with null values
    filteredData = filteredData.filter(d => d["Life expectancy"] !== null && d[selectedValue] !== null);
    
    // Update the domain of the x-axis scale with the new data
    xScatterScale.domain(d3.extent(filteredData, d => +d["Life expectancy"])).range([margin.left, width - margin.right]);

    // Update the domain of the y-axis scale with the new data
    yScatterScale.domain([0, d3.max(filteredData, d => +d[selectedValue])]).range([height - margin.bottom, margin.top]);

    // Update the x and y axes
    xAxisScatterG.call(xAxisScatter);
    yAxisScatterG.call(yAxisScatter);

    // Bind the data to the circles
    let circles = scatterSvg.selectAll("circle")
        .data(filteredData, d => d.Country);

    // Enter new circles
    circles.enter().append("circle")
        .attr("r", 5)
        .attr("fill", d => color(d.Country))  // Use the color scale
        .merge(circles)
        .attr("cx", d => xScatterScale(+d["Life expectancy"]))
        .attr("cy", d => yScatterScale(+d[selectedValue]))
        .style("opacity", 0.6)
        .on("mouseover", function(event, d) {
            // Show the tooltip
            tooltip.style("opacity", 1)
                .html(`Country: ${d.Country}<br/>Life expectancy: ${d["Life expectancy"]}<br/>${selectedValue}: ${d[selectedValue]}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .style("display", "block");
        })
        .on("mouseout", function(d) {
            // Hide the tooltip
            tooltip.style("opacity", 0)
                .style("display", "none");
        });

    // Exit old circles
    circles.exit().remove();

}

function updateLegend(){
    let sliderYear = d3.select("#yearSlider").property("value");

    // Filter the data based on the year and the countries in countryList
    let filteredData = lifeExpec.filter(d => d.Year == sliderYear && countryList.has(d.Country));

    legendSvg.selectAll('rect').remove()
    legendSvg.selectAll('text').remove()

    let legendItems = legendSvg.selectAll("g")
        .data(filteredData)
        .enter()
        .append("g")
        .attr('transform', (d, i) => `translate(0, ${i * 30})`);

    legendItems.append('rect')
        .attr('width', 20)
        .attr('height', 20)
        .attr('fill', d => color(d.Country));

    legendItems.append('text')
        .attr('x', 30)
        .attr('y', 15)
        .text(d => d.Country);
}