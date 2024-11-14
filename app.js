const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(express.json());  // Parsing JSON body
app.use(express.static('public'));  // Serve static files like HTML, CSS

// Fungsi untuk menghasilkan nama file acak
function generateRandomFilename() {
    const randomPart = crypto.randomBytes(8).toString('hex');  // Generate a random 16-char string
    return `jhody-${randomPart}.pdf`;  // Prefix the name with "jhody-"
}

// Endpoint untuk membuat PDF
app.post('/create-pdf', async (req, res) => {
    const { tableData, layout } = req.body;  // tableData adalah data tabel, layout mengatur styling

    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        let yPosition = height - 50;  // Mulai dari posisi atas halaman
        const rowHeight = layout.rowHeight || 20;  // Default row height
        const colWidths = layout.columns.map(col => col.width); // Lebar kolom

        // Menulis Header Tabel
        let xPosition = 50;
        page.drawRectangle({
            x: xPosition,
            y: yPosition - rowHeight,
            width: width - 100,
            height: rowHeight,
            color: rgb(0.9, 0.9, 0.9),
        });

        layout.columns.forEach((col, index) => {
            page.drawText(col.name, {
                x: xPosition + 5,
                y: yPosition - 15,
                size: 12,
                font: boldFont,
            });

            xPosition += colWidths[index];

            // Gambar garis vertikal untuk pemisah kolom
            page.drawLine({
                start: { x: xPosition, y: yPosition },
                end: { x: xPosition, y: yPosition - rowHeight },
                thickness: 1,
                color: rgb(0, 0, 0),
            });
        });

        yPosition -= rowHeight;

        // Isi Data Tabel
        tableData.forEach(row => {
            xPosition = 50;
            layout.columns.forEach((col, index) => {
                const cellText = row[index].toString();

                // Menggambar teks dalam sel
                page.drawText(cellText, {
                    x: xPosition + 5,
                    y: yPosition - 15,
                    size: 10,
                    font: font,
                });

                // Gambar border untuk setiap sel
                page.drawRectangle({
                    x: xPosition,
                    y: yPosition - rowHeight,
                    width: colWidths[index],
                    height: rowHeight,
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 0.5,
                });

                xPosition += colWidths[index];
            });

            yPosition -= rowHeight; // Pindah ke baris berikutnya
        });

        // Menambahkan Nomor Halaman
        const pageCount = pdfDoc.getPageCount();
        page.drawText(`Halaman 1 dari ${pageCount}`, {
            x: width - 100,
            y: 20,
            size: 10,
            font: font,
            color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();
        const filename = generateRandomFilename();
        const filePath = path.join(__dirname, 'uploads', filename);
        fs.writeFileSync(filePath, pdfBytes);

        res.json({ filePath: filename });
    } catch (error) {
        console.error(error);
        res.status(500).send('Gagal membuat PDF');
    }
});

// Endpoint untuk mengunduh PDF
app.get('/download-pdf', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.query.file);
    res.download(filePath);
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
