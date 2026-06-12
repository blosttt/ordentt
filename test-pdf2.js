const pdfParse = require('pdf-parse');
const fs = require('fs');

// Create a dummy simple PDF
const { PDFDocument } = require('pdf-lib');

async function test() {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText('CANTIDAD CODIGO PRODUCTO\n1 107 Bandeja Sola');
        const pdfBytes = await pdfDoc.save();
        
        const dataBuffer = Buffer.from(pdfBytes);
        const data = await pdfParse(dataBuffer);
        
        console.log("PDF text:", data.text);
    } catch(err) {
        console.error("Error inside pdfParse:", err);
    }
}
test();
