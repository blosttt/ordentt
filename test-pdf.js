const pdfParse = require('pdf-parse');
const fs = require('fs');

async function test() {
    try {
        console.log("pdf-parse is available");
    } catch(err) {
        console.error(err);
    }
}
test();
