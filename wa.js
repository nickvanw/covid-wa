const puppeteer = require('puppeteer-core');
var fs = require('fs');
 
async function collectCounty()  {
  const rawdata = fs.readFileSync('databycounty.json');
  const countyData = JSON.parse(rawdata);
  var latest = (Object.keys(countyData).sort(function(a, b) {
    return parseInt(b)-parseInt(a)
  }))[0]

  var lastData = countyData[latest];

  const browser = await puppeteer.connect({ browserWSEndpoint: process.env.WS_ENDPOINT });
  const page = await browser.newPage();
  await page.goto('https://www.doh.wa.gov/Emergencies/COVID19/DataDashboard', { waitUntil: 'networkidle0' });

  const vaccineTable = '#togVaccinationsTbl'
  await page.waitForSelector(vaccineTable);
  await page.click(vaccineTable);

  const data = await page.evaluate(() => {
      const rows = document.querySelectorAll('#accVaccinationsTbl tr');
      return Array.from(rows, row => {
          const columns = row.querySelectorAll('td');
          return Array.from(columns, column => column.innerText);
      });
  });

  var dataByCounty = {};
  data.filter(x => x.length > 3).forEach(d => {
    dataByCounty[d[0]] = {
      given: parseInt(d[1].replace(/,/g, '')),
      initiated: parseInt(d[2].replace(/,/g, '')),
      vaccinated: parseInt(d[3].replace(/,/g, ''))
    }
  })

  var totals = data.pop()
  dataByCounty['totals'] = {
    given: parseInt(totals[0].replace(/,/g, '')),
    initiated: parseInt(totals[1].replace(/,/g, '')),
    vaccinated: parseInt(totals[2].replace(/,/g, ''))
  }

  var updated = false;

  var deltas = {}
  Object.keys(dataByCounty).map(c => {
    var oldData = lastData[c]
    var newData = dataByCounty[c]
    var diff = {
      given: newData['given'] - oldData['given'],
      initiated: newData['initiated'] - oldData['initiated'],
      vaccinated: newData['vaccinated'] - oldData['vaccinated']
    }

    const delta = Object.values(diff).reduce((data, add) => data + add)
    if (delta != 0) {
      updated = true
    }

    deltas[c] = diff
  })

  if (updated) {
    console.log('writing updated county-by-county data')
    var ts = Math.round((new Date()).getTime() / 1000);
    countyData[ts] = dataByCounty
    fs.writeFileSync('databycounty.json', JSON.stringify(countyData))
    console.log(`
WA County Update:
- Vaccine Doses Given: ${prettyDiff(lastData['totals']['given'], dataByCounty['totals']['given'])}
- People Initiating Vaccination: ${prettyDiff(lastData['totals']['initiated'], dataByCounty['totals']['initiated'])}
- People Fully Vaccinated: ${prettyDiff(lastData['totals']['vaccinated'], dataByCounty['totals']['vaccinated'])}
    `)
  }
  await browser.close();
}

async function collectAggregate() {
  const rawdata = fs.readFileSync('aggregate.json');
  const aggregateData = JSON.parse(rawdata);
  var latest = (Object.keys(aggregateData).sort(function(a, b) {
    return parseInt(b)-parseInt(a)
  }))[0]

  var latestData = aggregateData[latest];

  const browser = await puppeteer.connect({ browserWSEndpoint: process.env.WS_ENDPOINT });
  const page = await browser.newPage();
  await page.goto('https://www.doh.wa.gov/Emergencies/COVID19/DataDashboard', { waitUntil: 'networkidle0' });
  const frame = await page.evaluate(() => {
    return document.querySelectorAll('iframe')[0].src;
  })

  await page.goto(frame, { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const spans = document.querySelectorAll('span');
    const buttons = Array.from(spans).filter(elem => elem.textContent == "Vaccinations")
    buttons[0].click();
  })

  await delay(2500)

  const stats = await page.evaluate(() => {
      statewideMeasures = document.getElementsByClassName('bodyCells')[1].firstElementChild.firstElementChild.firstElementChild.children
      const stats = Array.from(statewideMeasures).map(s => s.title)
      return stats
  })
  
  parsedStats = {
    given: parseInt(stats[0].replace(/,/g, '')),
    delivered: parseInt(stats[1].replace(/,/g, '')),
    cdclongterm: parseInt(stats[2].replace(/,/g, '')),
    percentage: stats[3],
  }

  if (!shallowEqual(parsedStats, latestData)) {
    console.log('writing updated aggregate data')
    var ts = Math.round((new Date()).getTime() / 1000);
    aggregateData[ts] = parsedStats
    fs.writeFileSync('aggregate.json', JSON.stringify(aggregateData))

    console.log(`
Aggregate Update:
- Given Vaccines: ${prettyDiff(latestData['given'], parsedStats['given'])}
- WA Delivered Vaccines: ${prettyDiff(latestData['delivered'], parsedStats['delivered'])}
- CDC Long Term Care deliveries: ${prettyDiff(latestData['cdclongterm'], parsedStats['cdclongterm'])}
- Vaccine Usage Rate: ${latestData['percentage']} -> ${parsedStats['percentage']}
    `)
  }

  await browser.close();
}

function delay(time) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time)
  });
}

function shallowEqual(object1, object2) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (object1[key] !== object2[key]) {
      return false;
    }
  }

  return true;
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

function prettyDiff(old, newData) {
  var delta = newData-old
  return `${numberWithCommas(old)} -> ${numberWithCommas(newData)} (${(delta<0?"":"+")}${numberWithCommas(delta)} difference)`
}

(async () => {
  await collectCounty();
  await collectAggregate();
})();