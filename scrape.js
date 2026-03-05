/* I COULD NOT GET THE ATHLETICS OR CALENDAR SCRAPES TO WORK.
THE BULLETIN SCRAPE WORKS FINE. */



const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");

const RESULTS_DIR = "./results";

function saveJSON(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 4));
}

async function scrapeBulletin() {

    const url = "https://bulletin.du.edu/undergraduate/coursedescriptions/comp/";

    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const courses = [];

    $("p").each((i, el) => {

        const text = $(el).text().trim();

        const match = text.match(/COMP\s?(\d{4})\s(.+?)\(/);
        if (!match) return;

        const number = parseInt(match[1]);
        const title = match[2].trim();

        if (number < 3000) return;

        const hasPrereq = text.toLowerCase().includes("prerequisite");

        if (!hasPrereq) {
            courses.push({
                course: `COMP-${number}`,
                title
            });
        }
    });

    saveJSON(`${RESULTS_DIR}/bulletin.json`, { courses });
    console.log("bulletin.json created");
}

async function scrapeAthletics() {
    const url = "https://denverpioneers.com/index.aspx";

    const res = await axios.get(url);
    const data = res.data;

    const items = data.items || [];
    const events = [];

    items.forEach(item => {
        const duTeam = item.sport;
        const opponent = item.opponent;
        const date = item.startDate;

        if (!duTeam || !opponent || !date) return;

        events.push({
            duTeam,
            opponent,
            date
        });
    });

    saveJSON(`${RESULTS_DIR}/athletic_events.json`, { events });
    console.log("athletic_events.json created");
}

async function scrapeCalendar() {

    const base = "https://www.du.edu";
    const api = "https://www.du.edu/calendar";

    const res = await axios.get(api);
    const data = res.data;

    const events = [];

    for (const ev of data.events || []) {
        const title = ev.title;
        const date = ev.start;
        const link = base + ev.url;

        let time, description;

        try {
            const page = await axios.get(link);
            const $ = cheerio.load(page.data);

            time = $(".event-time").text().trim() || undefined;
            description = $(".event-description").text().trim() || undefined;

        } catch (err) {
            console.log("Skipping:", link);
        }

        const event = { title, date };
        if (time) event.time = time;
        if (description) event.description = description;

        events.push(event);
    }

    saveJSON(`${RESULTS_DIR}/calendar_events.json`, { events });
    console.log("calendar_events.json created");
}

async function main() {
    await fs.ensureDir(RESULTS_DIR);

    await scrapeBulletin();
    await scrapeAthletics();
    await scrapeCalendar();
}

main();
