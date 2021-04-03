## Washington Coronavirus Tracking

This is a small collection of scripts to scrape the [Washington State DoH website](https://www.doh.wa.gov/Emergencies/COVID19/DataDashboard) and the CDC. It also contains my historical scrapes of the WA DoH, which is useful as there is no publicly kept historical data.

These scripts were quickly written for convenience, and it's likely that things like `package.json` are woefully incorrect. PRs are always welcome, and I'm always interested in looking for new sources of data. 


## Collecting the Data

The DoH scrape uses `puppeteer` - set `WS_ENDPOINT` to the `puppeteer` endpoint that you're using. I use the `browserless` docker container like so:

```
docker run -p -d 3000:3000 browserless/chrome
export WS_ENDPOINT="ws://127.0.0.1:3000"
```

This should calculate the diff compared to the last scrape, and output it. If there is nothing new, it will not output anything, nor save anything to the file.

## The Data

There are two JSON files that contain the historical data from these scrapes, which is used to find the difference between the previous and current update, and may be useful for understanding the progress that Washington has been making.

### databycounty.json

This contains the current totals from the state's "Vaccinations By County". It is a JSON dictionary, with a key for each timestamp that a scrape was done that resulted in a change from the previous most recent timestamp.

Each item in the top-level dictionary is another dictionary with the per-county numbers, as well as the total sum for that scrape. 

This data has has fidelity issues in the past - for about a week, the state did not update this data at all (but did publish new numbers elsewhere), so the update-by-update counts may not always be accurate.

### aggregate.json

This follows a similar pattern - the top level of this file is a dictionary with the unix timestamp of the scrape being the key. Inside of it, however, is just a few pieces of information:

- `given` represents the "Vaccine Doses Given and Reported in Washington" metric on the state's dashboard
- `delivered` represents "Doses Delivered to Washington Providers"
- `cdclongterm` represents "Doses Delivered for CDC long-term care vaccination program
- `percentage` represents "Percentage of Delivered Doses Given"


### Disclaimer

Both of these historical reports use the date the data was _collected_. In my experience, the DoH reports data three times per week: Monday, Wednesday and Friday. On Wednesday and Friday, the data is generally two days old, and accounts for two days of updates. Monday's update is generally for three days.

This means that care should be taken to not match the timestamps of the scrape with the day the data was collected. I would recommend assuming that T-2 days is the "effective" date for the data contained in this repository. 

### CDC Data

The CDC scripts are much more simple - the CDC releases data Tuesday for the following week's shipment information, but also keeps a historical record of the doses that have been shipped to a state or territory. Because of this, the script contained here is merely for my benefit, as it is easier than looking at three CSV files every week


## Disclaimer

All of this is provided as-is. I use these to understand what is happening personally, and nothing more.