// The `if statement` on line 24 determines how many pages of 'search' results you intend to scrape.

const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const moment = require('moment');

async function scrapeLinks(page) {
  let jobLinks = [];
  let counter = 1;

  while (true) {
    const links = await page.$$eval('a[data-jk]', (links) =>
      links.map(
        (link) => `https://www.indeed.com/viewjob?jk=${link.dataset.jk}`
      )
    );

    jobLinks = jobLinks.concat(links);
    console.log(`Scraped ${links.length} links from page ${counter}`);

    // Break the loop if the counter has reached X
    if (counter >= 5) {
      break;
    }

    const nextPageButton = await page.$(
      'a[data-testid="pagination-page-next"]'
    );

    if (nextPageButton) {
      await page.waitForTimeout(5000);

      await Promise.all([
        nextPageButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);

      counter++;
    } else {
      break;
    }
  }

  return jobLinks;
}

async function scrapeJobData(page, jobLink) {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // sleep for 1 second before navigation
  await page.goto(jobLink);
  await new Promise((resolve) => setTimeout(resolve, 3000)); // sleep for 2 seconds after navigation

  const jobData = await page.evaluate(() => {
    let title, company, location, postedAt, remote;

    try {
      const jobInfoHeaderModel =
        window._initialData?.jobInfoWrapperModel?.jobInfoModel
          ?.jobInfoHeaderModel;

      if (!jobInfoHeaderModel)
        throw new Error('Job Info Header Model not found');

      title = jobInfoHeaderModel.jobTitle || 'N/A';
      company = jobInfoHeaderModel.companyName || 'N/A';
      location = jobInfoHeaderModel.formattedLocation || 'N/A';
      remote = jobInfoHeaderModel.remoteLocation || 'N/A';
    } catch (error) {
      title = 'N/A';
      company = 'N/A';
      location = 'N/A';
      remote = 'N/A';
    }

    try {
      const scripts = Array.from(document.getElementsByTagName('script'));
      postedAt = '';
      for (const script of scripts) {
        if (script.innerText.includes('JobPosting')) {
          const jobPostingData = JSON.parse(script.innerText);
          postedAt = jobPostingData.datePosted;
          break;
        }
      }
      if (!postedAt) throw new Error('Date not found');
    } catch (error) {
      postedAt = 'N/A';
    }

    return {
      title,
      link: window.location.href,
      company,
      location,
      postedAt,
      remote,
    };
  });

  console.log(jobData);

  return jobData;
}

async function main() {
  // Load indeed-jr-dev-remote-master.json
  let masterData;
  try {
    masterData = JSON.parse(
      fs.readFileSync('indeed-jr-dev-remote-master.json', 'utf8')
    );
  } catch (error) {
    console.error('Failed to load master data:', error);
    masterData = [];
  }

  const browser = await puppeteer.launch({
    headless: 'new',
  });
  const page = await browser.newPage();

  let isCloudflareChecking = false;

  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();

    // If the URL or status code indicates a Cloudflare check, wait before continuing
    if (
      (url.includes('cf-chl-bypass') || status === 503) &&
      !isCloudflareChecking
    ) {
      console.log('Cloudflare check detected, waiting...');
      isCloudflareChecking = true;

      // Instead of waiting for a fixed amount of time, keep checking the page until the check is complete.
      while (isCloudflareChecking) {
        await page.waitForTimeout(1000); // Wait 1 second

        // Check if the Cloudflare check is still being performed
        isCloudflareChecking = await page.evaluate(
          () => document.querySelector('#cf-content') !== null
        );
      }
    }
  });

  await page.goto('https://www.indeed.com/jobs?q=junior+developer&sort=date');

  const jobLinks = await scrapeLinks(page);
  let newScrapeData = [];
  let uniqueJobLinks = [];

  for (const link of jobLinks) {
    // Only add link to uniqueJobLinks if it's not in the masterData
    if (!masterData.some((masterJob) => masterJob.link === link)) {
      uniqueJobLinks.push(link);
    }
  }

  for (const link of uniqueJobLinks) {
    const jobData = await scrapeJobData(page, link);
    const keywords = ['junior', 'jr', 'jr.', 'entry level', 'intern'];
    const title = jobData.title.toLowerCase();
    const isRemote = jobData.remote === true;
    const postedAt = moment(jobData.postedAt); // Parse postedAt into a Moment object

    // Calculate the difference between the current date and the date the job was posted in hours
    const hoursAgo = moment().diff(postedAt, 'hours');

    if (
      keywords.some((keyword) => title.includes(keyword)) &&
      isRemote &&
      hoursAgo <= 48 // Check if the job was posted within the last 48 hours
    ) {
      newScrapeData.push(jobData);
    }
  }

  let newJobs = [];

  // Compare newScrapeData to masterData
  for (const newData of newScrapeData) {
    if (!masterData.some((masterJob) => masterJob.link === newData.link)) {
      // If a job from the new scrape doesn't exist in masterData, add it to the start of masterData
      masterData.unshift(newData);
      // Also add it to the newJobs array
      newJobs.unshift(newData);
    }
  }

  // Save the updated masterData to indeed-jr-dev-remote-master.json
  fs.writeFileSync(
    'indeed-jr-dev-remote-master.json',
    JSON.stringify(masterData)
  );

  console.log(
    'Finished scraping. Data saved to indeed-jr-dev-remote-master.json'
  );

  await browser.close();
  process.exit();
}

main();
