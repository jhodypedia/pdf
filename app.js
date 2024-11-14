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
    const { tableData, columnNames, tableName, addNumbering } = req.body;

    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();

        // Menggunakan font standar yang disediakan oleh pdf-lib
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontSize = 12;
        const boldFontSize = 14;

        let yPosition = height - 50;  // Posisi awal Y untuk tabel

        // Menulis Nama Tabel di Tengah
        const tableNameWidth = boldFont.widthOfTextAtSize(tableName, 16);
        const tableNameXPosition = (width - tableNameWidth) / 2;  // Menempatkan nama tabel di tengah
        page.drawText(tableName, {
            x: tableNameXPosition,
            y: yPosition,
            size: 16,
            font: boldFont,
        });

        yPosition -= 30; // Geser posisi setelah nama tabel

        // Menggambar garis horizontal untuk header
        let xPosition = 50;
        const rowHeight = 20;
        const colWidth = (width - 100) / columnNames.length;  // Menghitung lebar kolom agar tabel memenuhi lebar halaman

        // Menulis header kolom dan menggambar garis horizontal
        columnNames.forEach((colName, index) => {
            page.drawText(colName, {
                x: xPosition + 5,  // Sedikit memberi margin agar teks tidak tepat di tepi kolom
                y: yPosition,
                size: boldFontSize,
                font: boldFont,
            });

            // Gambar garis bawah header
            page.drawLine({
                start: { x: xPosition, y: yPosition - 5 },
                end: { x: xPosition + colWidth, y: yPosition - 5 },
                thickness: 1,
                color: rgb(0, 0, 0),
            });

            xPosition += colWidth;
        });

        yPosition -= rowHeight;  // Geser posisi ke bawah setelah header

        // Menambahkan nomor urut jika addNumbering == true
        let rowNumber = 1;

        // Menambahkan data pada setiap baris
        tableData.forEach((row, rowIndex) => {
            xPosition = 50;  // Kembali ke posisi awal X untuk kolom pertama

            // Nomor urut di kolom pertama jika addNumbering true
            if (addNumbering) {
                page.drawText(rowNumber.toString(), {
                    x: xPosition + 5,
                    y: yPosition,
                    size: fontSize,
                    font: font,
                });
                rowNumber++; // Increment nomor urut
                xPosition += colWidth; // Geser posisi untuk kolom berikutnya
            }

            // Menulis data untuk setiap kolom
            row.forEach((cell, index) => {
                page.drawText(cell, {
                    x: xPosition + 5,  // Sedikit memberi margin agar teks tidak bertabrakan dengan garis
                    y: yPosition,
                    size: fontSize,
                    font: font,
                });

                // Gambar garis vertikal setelah setiap kolom
                page.drawLine({
                    start: { x: xPosition + colWidth, y: yPosition },
                    end: { x: xPosition + colWidth, y: yPosition - rowHeight },
                    thickness: 1,
                    color: rgb(0, 0, 0),
                });

                xPosition += colWidth;
            });

            // Gambar garis horizontal untuk setiap baris data
            page.drawLine({
                start: { x: 50, y: yPosition - rowHeight },
                end: { x: xPosition, y: yPosition - rowHeight },
                thickness: 1,
                color: rgb(0, 0, 0),
            });

            yPosition -= rowHeight;  // Geser posisi ke bawah untuk baris berikutnya
        });

        // Gambar garis vertikal setelah kolom terakhir
        page.drawLine({
            start: { x: xPosition, y: height - 50 },
            end: { x: xPosition, y: yPosition },
            thickness: 1,
            color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();

        // Membuat direktori upload jika belum ada
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        // Menyimpan file PDF
        const filename = generateRandomFilename();
        const filePath = path.join(uploadDir, filename);
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
