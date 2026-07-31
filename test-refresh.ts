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
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
    if (err.stack) {
      consoleErrors.push(`[STACK]\n${err.stack}`);
    }
  });

  try {
    await page.goto("http://localhost:3001/gold-research", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent?.includes("Refresh Data"));
      btn?.click();
    });

    await new Promise((r) => setTimeout(r, 8000));
  } catch (err) {
    consoleErrors.push(`[NAV ERROR] ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("--- ERRORS AFTER REFRESH ---");
  if (consoleErrors.length === 0) {
    console.log("None");
  } else {
    consoleErrors.forEach((e) => console.log(e));
  }

  await browser.close();
}

main();
