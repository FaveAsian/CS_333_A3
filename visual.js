let width = 960, height = 500;

let projection = d3.geoMercator();

let path = d3.geoPath().projection(projection);

let svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

ready();

let data, country;

async function ready(){
    data = await d3.json("life_expec.json")
}