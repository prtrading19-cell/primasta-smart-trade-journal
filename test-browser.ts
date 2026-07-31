import puppeteer from "puppeteer-core";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();

  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") {
      consoleErrors.push(`[CONSOLE ERROR] ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
    if (err.stack) {
      consoleErrors.push(`[STACK]\n${err.stack}`);
    }
  });

  page.on("requestfailed", (req) => {
    const failure = req.failure();
    if (failure) {
      failedRequests.push(`${req.url()} | ${failure.errorText}`);
    }
  });

  page.on("response", async (res) => {
    if (res.status() >= 400) {
      failedRequests.push(`${res.url()} | HTTP ${res.status}`);
    }
  });

  try {
    await page.goto("http://localhost:3001/gold-research", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 5000));
  } catch (err) {
    consoleErrors.push(`[NAV ERROR] ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("--- FAILED REQUESTS / 4XX ---");
  if (failedRequests.length === 0) {
    console.log("None");
  } else {
    failedRequests.forEach((r) => console.log(r));
  }

  console.log("\n--- PAGE CONSOLE ERRORS ---");
  if (consoleErrors.length === 0) {
    console.log("None");
  } else {
    consoleErrors.forEach((e) => console.log(e));
  }

  await browser.close();
}

main();
