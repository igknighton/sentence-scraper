const { convertArrayToCSV } = require('convert-array-to-csv');
const converter = require('convert-array-to-csv');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
// sentences source: http://www.manythings.org/sentences/words/

const removeJunkText = str => {
    const tabIndex = str.indexOf('\t');
    const preSentence = str.slice(tabIndex+1);
    return preSentence.slice(0,preSentence.indexOf('\t'));
}

const extractLinks = $ => [
    ...new Set(
        $('.b a')
            .map((_, a) => $(a).attr('href'))
            .toArray()
    )
]

const extractContent = $ =>
    $('.container')
        .map((_, element) => {
            const $controls = $(element);
            return $controls.find('pre').text().split(/\n/);
        }).toArray();

const mapAsync = (arr, fn) =>
    Promise.allSettled(arr.map(fn)).then((x) => x.map((y) => y.value));

const wordArgument = process.argv.slice(2)[0] ?? '';
const wordFamily = wordArgument.toLowerCase();
const link = `http://www.manythings.org/sentences/words/${wordFamily}/`;

const loadSentences = async () => {
    if (wordFamily == null) {
        console.error('Must provide a word family argument');
        return [];
    } else {
        console.log("Gathering pages...")
        // get the number of pages of chosen word family
        const pages = await axios.get(link).then(({data}) => {
            const $ = cheerio.load(data)
            return extractLinks($);
        }).catch(err => {
            if (err.response.status === 404)
                console.error(`The word ${wordFamily} does not exist as an option. Visit http://www.manythings.org/sentences/words/ for available words to use.`)
            else console.error(err.response.status)
        });
        console.log(`Gathering sentences for word family ${wordFamily}...`);
        return pages ? await mapAsync(pages,async page =>
            await axios.get(link + page)
                .then(res => {
                    const $ = cheerio.load(res.data);
                    return extractContent($)
                        .map(sentence => removeJunkText(sentence))
                        .filter(sentence => sentence !== '');
                })) : []
    }
}

const saveSentences = sentences => {
    const header = ['wordFamily','sentence'];
    fs.writeFile(`sentences/${wordFamily}.csv`,convertArrayToCSV(sentences.map(s => [wordFamily,s]),{
        header,
        separator: ','
    }),err => {
        console.error(err);
    });
    console.log('File saved!');
}

loadSentences().then(data => {
    let sentences = [];
    data.map(d => {
        sentences = [...sentences, ...d]
    });
    console.log("Total Number of Sentences: ",sentences.length);

    if (sentences.length > 0) {
        saveSentences(sentences)
    }
}).catch(e =>console.error(e));