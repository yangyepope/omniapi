import { chromium } from "playwright"

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded" })
await p.evaluate(() => localStorage.setItem("access_token", "dev"))
await p.goto("http://localhost:5173/security-dashboard", {
  waitUntil: "networkidle",
})
await p.waitForTimeout(1200)
const info = await p.evaluate(() => {
  const root = document.documentElement
  const cards = Array.from(document.querySelectorAll('[data-slot="card"]'))
  const sample = cards.slice(0, 8).map((c) => {
    const cs = getComputedStyle(c)
    return { bg: cs.backgroundColor, cls: c.className.slice(0, 60) }
  })
  return {
    htmlClass: root.className,
    colorScheme: getComputedStyle(root).colorScheme,
    cardVar: getComputedStyle(root).getPropertyValue("--card"),
    surfaceVar: getComputedStyle(root).getPropertyValue("--color-surface"),
    cardCount: cards.length,
    sample,
  }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
