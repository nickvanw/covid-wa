const got = require('got');
const parse = require('csv-parse/lib/sync')

const moderna = "https://data.cdc.gov/api/views/b7pe-5nws/rows.csv?accessType=DOWNLOAD";
const pfizer = "https://data.cdc.gov/api/views/saz5-9hgg/rows.csv?accessType=DOWNLOAD";
const janssen = "https://data.cdc.gov/api/views/w9zu-fywh/rows.csv?accessType=DOWNLOAD"

const waJurisdiction = "Washington";

(async () => {
    await parseCDC("Moderna", moderna, true)
    await parseCDC("Pfizer", pfizer)
    await parseCDC("J&J", janssen)
})();

async function parseCDC(type, url, printDate = false) {
    const data = await got(url);
    const records = parse(data.body, {
        columns: true,
        skip_empty_lines: true
    })
    var waInfo = records.filter(d => {
        return (d['Jurisdiction'] == waJurisdiction)
    }).sort(function(a, b) {
        return new Date(a['Week of Allocations']) - new Date(b['Week of Allocations'])
    })

    var last = waInfo[waInfo.length - 1]
    var beforeLast = waInfo[waInfo.length - 2]
    var diff = numberWithCommas(last['1st Dose Allocations'] - beforeLast['1st Dose Allocations'])

    if (printDate) {
        console.log(`**Delivery Data for the week of ${last['Week of Allocations']}:**\n`)
    }
    console.log(`- ${type}: ${numberWithCommas(last['1st Dose Allocations'])} first doses (${diff} diff)`)
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}
