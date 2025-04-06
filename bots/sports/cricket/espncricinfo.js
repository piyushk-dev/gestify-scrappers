import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
const parseHTMLInfo = async (filePath) => {
    const html = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // Extract title
    const title = $('head title').text();

    // Extract all meta tags
    const metaTags = [];
    $('head meta').each((i, el) => {
        metaTags.push(el.attribs);
    });

    // Extract all link tags
    const linkTags = [];
    $('head link').each((i, el) => {
        linkTags.push(el.attribs);
    });

    // Extract all script tags (attributes and content)
    const scriptTags = [];
    $('head script').each((i, el) => {
        const attribs = el.attribs;
        const content = $(el).html()?.trim() || '';
        scriptTags.push({ attribs, content });
    });

    // You can add extra extraction logic as needed for the body, comments, etc.
    return { title, metaTags, linkTags, scriptTags };
};

const main = async () => {
    const filePath = './espncricinfo.html';
    try {
        const info = await parseHTMLInfo(filePath);
        console.log(JSON.stringify(info, null, 2));
        await fs.writeFile("op.json",JSON.stringify(info, null, 2));
    } catch (error) {
        console.error('Error parsing HTML:', error);
    }
};

main();