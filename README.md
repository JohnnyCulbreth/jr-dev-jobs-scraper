# Indeed Job Scraper

This repository contains two separate scripts for scraping job data from Indeed.com. Both scripts are designed to find unique job postings and save them to a JSON file for easy access and analysis.

## Scripts Overview
### 1. Indeed-Jr/remoteScraper.js
This script specifically targets remote junior developer positions. It filters through the Indeed job listings to find unique postings that match the criteria, and then saves the relevant data to a JSON file (**indeed-jr-dev-remote-master.json**).

### 2. Indeed-Austin/austinScraper.js
This script is designed to find unique job postings for all software engineer positions in Austin, TX. It scrapes the job listings from Indeed and then saves the relevant data to a JSON file (**indeed-dev-austin-master.json**).

## How to Run the Scripts
### 1. Clone the repository to your local machine.
`git clone https://github.com/JohnnyCulbreth/indeed-job-scraper.git`\
`cd indeed-job-scraper`

### 2. Install the required dependencies.
`npm install`

### 3. Run the desired script.
`// To scrape remote junior developer positions`\
`node Indeed-Jr/remoteScraper.js`

`// To scrape software engineer positions in Austin, TX`\
`node Indeed-Austin/austinScraper.js`

Each script will output the scraped data to the respective JSON file in the same directory.

## Notes
- These scripts rely on the puppeteer library to scrape the data. They are designed to be resistant to Cloudflare's anti-bot measures by detecting Cloudflare checks and waiting for them to complete before proceeding with the scrape.
- The scripts only search for unique job postings. If a job link exists in the master data, it will not be included in the new scrape.
- The scripts are set to only include jobs posted within the last 48 hours. However, this hourly value can be adjusted to fit your preference. Keep in mind that the program is designed to be run frequently to pull the most recent jobs.
- The **goto** URL used in the scripts can be modified to match your job query preference. Note that the parameter '&sort=date' is recommended to ensure the jobs are sorted by the date posted, providing the most recent ones first.
