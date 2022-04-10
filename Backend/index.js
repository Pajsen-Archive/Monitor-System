const http = require("http");
const express = require("express");
const path = require("path")

const app = express();
const server = http.createServer(app);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.use(express.static('public'))

app.get('/api/:type/:name.js', getFile);

function getFile(request, response) {
    const data = request.params;
    const fileRoute = data.type;
    const fileName = data.name;
    const apiCall = require(path.join(__dirname, '/views/api/' + fileRoute + '/' + fileName + '.js'))(request.query)
    response.setHeader('Content-type', 'text/json').send(JSON.stringify(apiCall)).end()
}

server.listen(3001, function() {
    console.log("Started server")
});