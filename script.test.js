const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const html = readFileSync(join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function createPage(fetch) {
  function element() {
    return {
      textContent: "",
      children: [],
      disabled: false,
      appendChild(child) {
        this.children.push(child);
      },
      replaceChildren(...children) {
        this.children = children;
      },
      addEventListener(event, callback) {
        this[event] = callback;
      },
    };
  }

  const users = element();
  const status = element();
  const button = element();
  const elements = { users, status, reload: button };
  const document = {
    getElementById: (id) => elements[id],
    createElement: element,
  };
  vm.runInNewContext(script, {
    document,
    fetch,
    console: { error() {} },
  });
  return { users, status, button };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("renders users as text and allows reloading", async () => {
  let calls = 0;
  const page = createPage(async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => [{ name: "<Example>", email: "example@example.com" }],
    };
  });
  assert.equal(page.button.disabled, true);
  assert.equal(page.status.textContent, "Loading users...");
  await tick();
  assert.equal(page.users.children.length, 1);
  assert.equal(page.users.children[0].textContent, "<Example> — example@example.com");
  assert.equal(page.status.textContent, "Showing 1 users.");
  assert.equal(page.button.disabled, false);
  await page.button.click();
  assert.equal(calls, 2);
});

test("shows an error and allows retry for failed or invalid responses", async (t) => {
  const cases = [
    ["network failure", async () => { throw new Error("offline"); }],
    ["HTTP error", async () => ({ ok: false, status: 500 })],
    ["invalid JSON", async () => ({ ok: true, json: async () => { throw new SyntaxError(); } })],
    ["invalid data", async () => ({ ok: true, json: async () => [{ name: "Missing email" }] })],
    ["empty data", async () => ({ ok: true, json: async () => [] })],
  ];

  for (const [label, fetch] of cases) {
    await t.test(label, async () => {
      const page = createPage(fetch);
      await tick();
      assert.equal(page.status.textContent, "Sorry, we couldn't load users. Please try again.");
      assert.equal(page.users.children.length, 0);
      assert.equal(page.button.disabled, false);
    });
  }
});
