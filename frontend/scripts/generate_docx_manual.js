const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Header, Footer, PageNumber, PageBreak } = docx;

const MANUAL_PATH = path.join(__dirname, '../src/assets/UserManual.md');
const OUTPUT_PATH = path.join(__dirname, '../src/assets/UserManual.docx');
const ASSETS_DIR = path.join(__dirname, '../src/assets');

async function generateDocx() {
    console.log(`Reading User Manual from: ${MANUAL_PATH}`);
    if (!fs.existsSync(MANUAL_PATH)) {
        console.error('UserManual.md not found!');
        return;
    }

    const markdown = fs.readFileSync(MANUAL_PATH, 'utf-8');
    const lines = markdown.split('\n');

    const children = [];

    // Title Page
    children.push(
        new Paragraph({
            text: "GPTK Library Management System",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 5000, after: 300 },
        }),
        new Paragraph({
            text: "User Manual v1.0",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 5000 },
        }),
        new Paragraph({
            children: [new PageBreak()],
        })
    );

    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Skip horizontal rules
        if (line === '---') {
            children.push(new Paragraph({
                children: [new PageBreak()],
            }));
            continue;
        }

        // Headings
        if (line.startsWith('# ')) {
            children.push(new Paragraph({
                text: line.replace('# ', ''),
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
            }));
        } else if (line.startsWith('## ')) {
            children.push(new Paragraph({
                text: line.replace('## ', ''),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 },
            }));
        } else if (line.startsWith('### ')) {
            children.push(new Paragraph({
                text: line.replace('### ', ''),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
            }));
        } else if (line.startsWith('#### ')) {
            children.push(new Paragraph({
                text: line.replace('#### ', ''),
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 200, after: 100 },
            }));
        } else if (line.startsWith('##### ')) {
            children.push(new Paragraph({
                text: line.replace('##### ', ''),
                heading: HeadingLevel.HEADING_5,
                spacing: { before: 200, after: 100 },
            }));

            // Images: ![Alt](url)
        } else if (line.match(/!\[(.*?)\]\((.*?)\)/)) {
            const match = line.match(/!\[(.*?)\]\((.*?)\)/);
            const altText = match[1];
            const imgPath = match[2];
            const fullImgPath = path.join(ASSETS_DIR, imgPath); // manual/Image.png -> src/assets/manual/Image.png

            if (fs.existsSync(fullImgPath)) {
                try {
                    const imageBuffer = fs.readFileSync(fullImgPath);
                    children.push(new Paragraph({
                        children: [
                            new ImageRun({
                                data: imageBuffer,
                                transformation: {
                                    width: 500,
                                    height: 300, // Approximate, maintain aspect ratio ideally
                                },
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 100 },
                    }));
                    // Caption
                    if (altText) {
                        children.push(new Paragraph({
                            text: altText,
                            style: "Caption",
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 },
                        }));
                    }
                } catch (e) {
                    console.error(`Error embedding image ${fullImgPath}:`, e);
                }
            } else {
                console.warn(`Image not found: ${fullImgPath}`);
            }

            // Blockquotes
        } else if (line.startsWith('> ')) {
            children.push(new Paragraph({
                text: line.replace('> ', ''),
                style: "Quote", // Needs simpler handling if style missing
                border: {
                    left: {
                        color: "2563eb",
                        space: 10,
                        style: "single",
                        size: 6,
                    },
                },
                indent: { left: 400 },
                spacing: { before: 200, after: 200 },
            }));

            // Lists
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            // Check formatted bold
            const textRun = parseFormattedText(line.substring(2));
            children.push(new Paragraph({
                children: textRun,
                bullet: {
                    level: 0
                }
            }));

            // Numbered Lists (Simple detection)
        } else if (line.match(/^\d+\.\s/)) {
            const content = line.replace(/^\d+\.\s/, '');
            const textRun = parseFormattedText(content);
            children.push(new Paragraph({
                children: textRun,
                numbering: {
                    reference: "default-numbering",
                    level: 0
                }
            }));

            // Standard Paragraphs (ignore empty)
        } else if (line.length > 0) {
            const textRuns = parseFormattedText(line);
            children.push(new Paragraph({
                children: textRuns,
                spacing: { after: 120 },
            }));
        }
    }

    // Docs setup
    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            text: "GPTK Library Management System",
                            alignment: AlignmentType.RIGHT,
                        }),
                    ],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun("Page "),
                                PageNumber.CURRENT,
                                new TextRun(" of "),
                                PageNumber.TOTAL_PAGES,
                            ],
                        }),
                    ],
                }),
            }
        }],
        numbering: {
            config: [
                {
                    reference: "default-numbering",
                    levels: [
                        {
                            level: 0,
                            format: "decimal",
                            text: "%1.",
                            alignment: AlignmentType.START,
                            style: {
                                paragraph: {
                                    indent: { left: 720, hanging: 260 },
                                },
                            },
                        },
                    ],
                },
            ],
        },
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(OUTPUT_PATH, buffer);
    console.log(`User Manual generated at: ${OUTPUT_PATH}`);
}

// Simple helper to handle **bold** and *italic*
function parseFormattedText(text) {
    const runs = [];
    // Basic split by bold markers for now. Robust parsing is hard.
    // Let's do a simple regex for **bold**

    // Very naive splitter for bold only for this task
    // "Title, **Author**, Publisher" -> ["Title, ", "**Author**", ", Publisher"]
    const parts = text.split(/(\*\*.*?\*\*)/g);

    parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({
                text: part.slice(2, -2),
                bold: true,
            }));
        } else if (part.startsWith('`') && part.endsWith('`')) {
            runs.push(new TextRun({
                text: part.slice(1, -1),
                font: "Consolas",
                color: "be185d",
            }));
        } else {
            runs.push(new TextRun({
                text: part,
            }));
        }
    });

    return runs;
}

generateDocx().catch(console.error);
