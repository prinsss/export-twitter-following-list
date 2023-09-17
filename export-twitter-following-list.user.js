// ==UserScript==
// @name         Export Twitter Following List
// @namespace    https://github.com/prinsss/
// @version      1.0.0
// @description  Export your Twitter/X's following/followers list to a CSV/JSON/HTML file.
// @author       prin
// @match        *://twitter.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @grant        unsafeWindow
// @run-at       document-start
// @supportURL   https://github.com/prinsss/export-twitter-following-list/issues
// @updateURL    https://raw.githubusercontent.com/prinsss/export-twitter-following-list/master/dist/export-twitter-following-list.user.js
// @downloadURL  https://raw.githubusercontent.com/prinsss/export-twitter-following-list/master/dist/export-twitter-following-list.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /*
  |--------------------------------------------------------------------------
  | Global Variables
  |--------------------------------------------------------------------------
  */

  const SCRIPT_NAME = 'export-twitter-following-list';

  /** @type {Element} */
  let panelDom = null;

  /** @type {Element} */
  let listContainerDom = null;

  /** @type {IDBDatabase} */
  let db = null;

  let isList = false;
  let savedCount = 0;
  let targetUser = '';
  let currentType = '';
  let previousPathname = '';

  const infoLogs = [];
  const errorLogs = [];

  const buffer = new Set();
  const currentList = new Map();
  const currentListSwapped = new Map();
  const currentListUniqueSet = new Set();

  /*
  |--------------------------------------------------------------------------
  | Script Bootstraper
  |--------------------------------------------------------------------------
  */

  initDatabase();
  hookIntoXHR();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageLoaded);
  } else {
    onPageLoaded();
  }

  // Determine wether the script should be run.
  function bootstrap() {
    const pathname = location.pathname;

    if (pathname === previousPathname) {
      return;
    }

    previousPathname = pathname;

    // Show the script UI on these pages:
    // - User's following list
    // - User's followers list
    // - List's member list
    // - List's followers list

    const listRegex = /^\/i\/lists\/(.+)\/(followers|members)/;
    const userRegex = /^\/(.+)\/(following|followers_you_follow|followers|verified_followers)/;

    isList = listRegex.test(pathname);
    const isUser = userRegex.test(pathname);

    if (!isList && !isUser) {
      destroyControlPanel();
      return;
    }

    const regex = isList ? listRegex : userRegex;
    const parsed = regex.exec(pathname) || [];
    const [match, target, type] = parsed;

    initControlPanel();
    updateControlPanel({ type, username: isList ? `list_${target}` : target });
  }

  // Listen to URL changes.
  function onPageLoaded() {
    new MutationObserver(bootstrap).observe(document.head, {
      childList: true,
    });
    log('Script ready.');
  }

  /*
  |--------------------------------------------------------------------------
  | Page Scroll Listener
  |--------------------------------------------------------------------------
  */

  // When the content of the list changes, we extract some information from the DOM.
  // Note that Twitter is using Virtual List so DOM nodes are always recycled.
  function onListChange() {
    listContainerDom.childNodes.forEach((child) => {
      // NOTE: This may vary as Twitter upgrades.
      const link = child.querySelector(
        'div[role=button] > div:first-child > div:nth-child(2) > div:first-child ' +
          '> div:first-child > div:first-child > div:nth-child(2) a'
      );

      if (!link) {
        debug('No link element found in list child', child);
        return;
      }

      const span = link.querySelector('span');
      const parsed = /@(\w+)/.exec(span.textContent) || [];
      const [match, username] = parsed;

      if (!username) {
        debug('No username found in the link', span.textContent, child);
        return;
      }

      // We use a emoji to mark that a user was added into current exporting list.
      const mark = ' ✅';

      if (currentListUniqueSet.has(username)) {
        // When you scroll back, the DOM was reset so we need to mark it again.
        if (!span.textContent.includes(mark)) {
          const index = currentListSwapped.get(username);
          span.innerHTML += `${mark}😸 (${index})`;
        }
        return;
      }

      savedCount += 1;
      updateControlPanel({ count: savedCount });

      // Add the username extracted to the exporting list.
      const index = savedCount;
      currentListUniqueSet.add(username);
      currentList.set(index, username);
      currentListSwapped.set(username, index);

      span.innerHTML += `${mark} (${index})`;
    });
  }

  function attachToListContainer() {
    // NOTE: This may vary as Twitter upgrades.
    if (isList) {
      listContainerDom = document.querySelector(
        'div[role="group"] div[role="dialog"] section[role="region"] > div > div'
      );
    } else {
      listContainerDom = document.querySelector(
        'main[role="main"] div[data-testid="primaryColumn"] section[role="region"] > div > div'
      );
    }

    if (!listContainerDom) {
      error(
        'No list container found. ' +
          'This may be a problem caused by Twitter updates. Please file an issue on GitHub: ' +
          'https://github.com/prinsss/export-twitter-following-list/issues'
      );
      return;
    }

    // Add a border to the attached list container as an indicator.
    listContainerDom.style.border = '2px dashed #1d9bf0';

    // Listen to the change of the list.
    onListChange();
    new MutationObserver(onListChange).observe(listContainerDom, {
      childList: true,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | User Interfaces
  |--------------------------------------------------------------------------
  */

  // Hide the script UI and clear all the cache.
  function destroyControlPanel() {
    document.getElementById(`${SCRIPT_NAME}-panel`)?.remove();
    document.getElementById(`${SCRIPT_NAME}-panel-style`)?.remove();
    panelDom = null;
    listContainerDom = null;
    currentType = '';
    targetUser = '';
    savedCount = 0;
    currentList.clear();
    currentListUniqueSet.clear();
    currentListSwapped.clear();
  }

  // Update the script UI.
  function updateControlPanel({ type, username, count = 0 }) {
    if (!panelDom) {
      error('Monitor panel is not initialized');
      return;
    }

    if (type) {
      currentType = type;
      panelDom.querySelector('#list-type').textContent = type;
    }

    if (count) {
      panelDom.querySelector('#saved-count').textContent = count;
    }

    if (username) {
      targetUser = username;
      panelDom.querySelector('#target-user').textContent = username;
    }
  }

  // Show the script UI.
  function initControlPanel() {
    destroyControlPanel();

    const panel = document.createElement('div');
    panelDom = panel;
    panel.id = `${SCRIPT_NAME}-panel`;
    panel.innerHTML = `
      <div class="status">
        <p>List type: "<span id="list-type">following</span>"</p>
        <p>Target user/list: @<span id="target-user">???</span></p>
        <p>Saved count: <span id="saved-count">0</span></p>
      </div>
      <div class="btn-group">
        <button id="export-start">START</button>
        <button id="export-preview">PREVIEW</button>
        <button id="export-dismiss">DISMISS</button>
        <button id="export-csv">Export as CSV</button>
        <button id="export-json">Export as JSON</button>
        <button id="export-html">Export as HTML</button>
      </div>
      <pre id="export-logs" class="logs"></pre>
      <pre id="export-errors" class="logs"></pre>
    `;

    const style = document.createElement('style');
    style.id = `${SCRIPT_NAME}-panel-style`;
    style.innerHTML = `
      #${SCRIPT_NAME}-panel {
        position: fixed;
        top: 30px;
        left: 30px;
        padding: 10px;
        background-color: #f7f9f9;
        border: 1px solid #bfbfbf;
        border-radius: 16px;
        box-shadow: rgba(0, 0, 0, 0.08) 0px 8px 28px;
        width: 300px;
        line-height: 2;
      }


      #${SCRIPT_NAME}-panel .logs {
        text-wrap: wrap;
        line-height: 1;
        font-size: 12px;
        max-height: 300px;
        overflow-y: scroll;
      }

      #${SCRIPT_NAME}-panel p { margin: 0; }
      #${SCRIPT_NAME}-panel .btn-group { display: flex; flex-direction: row; flex-wrap: wrap; }
      #${SCRIPT_NAME}-panel button { margin-top: 3px; margin-right: 3px; }
      #${SCRIPT_NAME}-panel #export-errors { color: #f4212e; }
    `;

    document.body.appendChild(panel);
    document.head.appendChild(style);

    panel.querySelector('#export-start').addEventListener('click', onExportStart);
    panel.querySelector('#export-preview').addEventListener('click', onExportPreview);
    panel.querySelector('#export-dismiss').addEventListener('click', onExportDismiss);
    panel.querySelector('#export-csv').addEventListener('click', onExportCSV);
    panel.querySelector('#export-json').addEventListener('click', onExportJSON);
    panel.querySelector('#export-html').addEventListener('click', onExportHTML);
  }

  // The preview modal.
  function openPreviewModal() {
    const modal = document.createElement('div');
    modal.id = `${SCRIPT_NAME}-modal`;
    modal.innerHTML = `
      <div class="modal-content">
        <button id="modal-dismiss">X</button>
        <div id="preview-table-wrapper">
          <p>Loading...</p>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.id = `${SCRIPT_NAME}-modal-style`;
    style.innerHTML = `
      #${SCRIPT_NAME}-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #${SCRIPT_NAME}-modal .modal-content {
        position: relative;
        width: 800px;
        height: 600px;
        background-color: #f7f9f9;
        border-radius: 16px;
        padding: 16px;
      }

      #${SCRIPT_NAME}-modal #modal-dismiss {
        position: absolute;
        top: 10px;
        right: 10px;
      }

      #${SCRIPT_NAME}-modal #preview-table-wrapper {
        width: 100%;
        height: 100%;
        overflow: scroll;
      }

      #${SCRIPT_NAME}-modal table {
        border-collapse: collapse;
        border: 2px solid #c8c8c8;
      }

      #${SCRIPT_NAME}-modal td,
      #${SCRIPT_NAME}-modal th {
        border: 1px solid #bebebe;
        padding: 5px 10px;
      }
    `;

    document.body.appendChild(modal);
    document.head.appendChild(style);

    modal.querySelector('#modal-dismiss').addEventListener('click', () => {
      document.body.removeChild(modal);
      document.head.removeChild(style);
    });

    const wrapper = modal.querySelector('#preview-table-wrapper');
    exportToHTMLFormat().then((html) => {
      wrapper.innerHTML = html;
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Exporters
  |--------------------------------------------------------------------------
  */

  async function exportToCSVFormat() {
    const list = await getDetailedCurrentList();
    const array = [...list.values()];

    const header = 'number,name,screen_name,profile_image,following,followed_by,description,extra';
    const rows = array
      .map((value, key) => [
        String(key),
        value?.legacy?.name,
        value?.legacy?.screen_name,
        value?.legacy?.profile_image_url_https,
        value?.legacy?.following ? 'true' : 'false',
        value?.legacy?.followed_by ? 'true' : 'false',
        sanitizeProfileDescription(
          value?.legacy?.description,
          value?.legacy?.entities?.description?.urls
        ),
        JSON.stringify(value),
      ])
      .map((item) => item.map((cell) => csvEscapeStr(cell)).join(','));
    const body = rows.join('\n');

    return header + '\n' + body;
  }

  async function exportToJSONFormat() {
    const list = await getDetailedCurrentList();
    const array = [...list.values()];
    return JSON.stringify(array, undefined, '  ');
  }

  async function exportToHTMLFormat() {
    const list = await getDetailedCurrentList();

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>name</th>
          <th>screen_name</th>
          <th>profile_image</th>
          <th>following</th>
          <th>followed_by</th>
          <th>description</th>
          <th>extra</th>
        </tr>
      </thead>
    `;

    const tableBody = document.createElement('tbody');
    table.appendChild(tableBody);

    list.forEach((value, key) => {
      const column = document.createElement('tr');
      column.innerHTML = `
        <td>${key}</td>
        <td>${value?.legacy?.name}</td>
        <td>
          <a href="https://twitter.com/${value?.legacy?.screen_name}">
            ${value?.legacy?.screen_name}
          </a>
        </td>
        <td><img src="${value?.legacy?.profile_image_url_https}"></td>
        <td>${value?.legacy?.following ? 'true' : 'false'}</td>
        <td>${value?.legacy?.followed_by ? 'true' : 'false'}</td>
        <td>${sanitizeProfileDescription(
          value?.legacy?.description,
          value?.legacy?.entities?.description?.urls
        )}</td>
        <td>
          <details>
            <summary>Expand</summary>
            <pre>${JSON.stringify(value)}</pre>
          </details>
        </td>
      `;
      tableBody.appendChild(column);
    });

    return table.outerHTML;
  }

  /*
  |--------------------------------------------------------------------------
  | Button Events
  |--------------------------------------------------------------------------
  */

  function onExportStart() {
    info('Start listening on page scroll...');
    attachToListContainer();
    info('Scroll down the page and the list content will be saved automatically as you scroll.');
    info('Tips: Do not scroll too fast since the list is lazy-loaded.');
  }

  function onExportDismiss() {
    destroyControlPanel();
  }

  function onExportPreview() {
    openPreviewModal();
  }

  async function onExportCSV() {
    try {
      const filename = `twitter-${targetUser}-${currentType}-${Date.now()}.csv`;
      info('Exporting to CSV file: ' + filename);
      const content = await exportToCSVFormat();
      saveFile(filename, content);
    } catch (err) {
      error(err.message, err);
    }
  }

  async function onExportJSON() {
    try {
      const filename = `twitter-${targetUser}-${currentType}-${Date.now()}.json`;
      info('Exporting to JSON file: ' + filename);
      const content = await exportToJSONFormat();
      saveFile(filename, content);
    } catch (err) {
      error(err.message, err);
    }
  }

  async function onExportHTML() {
    try {
      const filename = `twitter-${targetUser}-${currentType}-${Date.now()}.html`;
      info('Exporting to HTML file: ' + filename);
      const content = await exportToHTMLFormat();
      saveFile(filename, content);
    } catch (err) {
      error(err.message, err);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Database Management
  |--------------------------------------------------------------------------
  */

  function initDatabase() {
    const request = indexedDB.open(SCRIPT_NAME, 1);

    request.onerror = (event) => {
      error('Failed to open database.', event);
    };

    request.onsuccess = () => {
      db = request.result;
      info('New connection to IndexedDB opened.');

      // Flush buffer if there is any incoming data received before the DB is ready.
      if (buffer.size) {
        insertUserDataIntoDatabase([]);
      }
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      info('New IndexedDB initialized.');

      // Use the numeric user ID as primary key and the username as index for lookup.
      const objectStore = db.createObjectStore('users', { keyPath: 'rest_id' });
      objectStore.createIndex('screen_name', 'legacy.screen_name', { unique: false });

      if (buffer.size) {
        insertUserDataIntoDatabase([]);
      }
    };
  }

  function insertUserDataIntoDatabase(users) {
    // Add incoming data to a buffer queue.
    users.forEach((user) => buffer.add(user));

    // If the DB is not ready yet at this point, queue the data and wait for it.
    if (!db) {
      info(`Added ${users.length} users to buffer`);

      if (buffer.size > 100) {
        error('The database is not initialized.');
        error('Maximum buffer size exceeded. Current: ' + buffer.size);
      }

      return;
    }

    const toBeInserted = [...buffer.values()];
    const insertLength = toBeInserted.length;

    const transaction = db.transaction('users', 'readwrite');
    const objectStore = transaction.objectStore('users');

    transaction.oncomplete = () => {
      info(`Added ${insertLength} users to database.`);
      for (const item of toBeInserted) {
        buffer.delete(item);
      }
    };

    transaction.onerror = (event) => {
      error(`Failed to add ${insertLength} users to database.`, event);
    };

    // Insert or update the user data.
    toBeInserted.forEach((user) => {
      const request = objectStore.put(user);

      request.onerror = function (event) {
        error(`Failed to write database. User ID: ${user.id}`, event, user);
      };
    });
  }

  // Get a user's record from database by his username.
  async function queryDatabaseByUsername(username) {
    if (!db) {
      error('The database is not initialized.');
      return;
    }

    const transaction = db.transaction('users', 'readonly');
    const objectStore = transaction.objectStore('users');

    // Use the defined index to look up.
    const index = objectStore.index('screen_name');
    const request = index.get(username);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        error(`Failed to query user ${username} from database.`, event);
        resolve(null);
      };
    });
  }

  // Takes a list of usernames and returns a list of user data, with original order preserved.
  async function getDetailedCurrentList() {
    const keys = currentList.keys();
    const sortedKeys = [...keys].sort((a, b) => a - b);
    const sortedDetailedList = new Map();

    const promises = sortedKeys.map(async (key) => {
      const username = currentList.get(key);
      const res = await queryDatabaseByUsername(username);
      sortedDetailedList.set(key, res);
    });

    await Promise.all(promises);
    return sortedDetailedList;
  }

  /*
  |--------------------------------------------------------------------------
  | Twitter API Hooks
  |--------------------------------------------------------------------------
  */

  // Here we hooks the browser's XHR method to intercept Twitter's Web API calls.
  // This need to be done before any XHR request is made.
  function hookIntoXHR() {
    const originalOpen = unsafeWindow.XMLHttpRequest.prototype.open;

    unsafeWindow.XMLHttpRequest.prototype.open = function () {
      const url = arguments[1];

      // NOTE: This may vary as Twitter upgrades.
      // https://twitter.com/i/api/graphql/rRXFSG5vR6drKr5M37YOTw/Followers
      if (/api\/graphql\/.+\/Followers/.test(url)) {
        this.addEventListener('load', function () {
          parseTwitterAPIResponse(
            this.responseText,
            (json) => json.data.user.result.timeline.timeline.instructions
          );
        });
      }

      // https://twitter.com/i/api/graphql/kXi37EbqWokFUNypPHhQDQ/BlueVerifiedFollowers
      if (/api\/graphql\/.+\/BlueVerifiedFollowers/.test(url)) {
        this.addEventListener('load', function () {
          parseTwitterAPIResponse(
            this.responseText,
            (json) => json.data.user.result.timeline.timeline.instructions
          );
        });
      }

      // https://twitter.com/i/api/graphql/iSicc7LrzWGBgDPL0tM_TQ/Following
      if (/api\/graphql\/.+\/Following/.test(url)) {
        this.addEventListener('load', function () {
          parseTwitterAPIResponse(
            this.responseText,
            (json) => json.data.user.result.timeline.timeline.instructions
          );
        });
      }

      // https://twitter.com/i/api/graphql/-5VwQkb7axZIxFkFS44iWw/ListMembers
      if (/api\/graphql\/.+\/ListMembers/.test(url)) {
        this.addEventListener('load', function () {
          parseTwitterAPIResponse(
            this.responseText,
            (json) => json.data.list.members_timeline.timeline.instructions
          );
        });
      }

      // https://twitter.com/i/api/graphql/B9F2680qyuI6keStbcgv6w/ListSubscribers
      if (/api\/graphql\/.+\/ListSubscribers/.test(url)) {
        this.addEventListener('load', function () {
          parseTwitterAPIResponse(
            this.responseText,
            (json) => json.data.list.subscribers_timeline.timeline.instructions
          );
        });
      }

      originalOpen.apply(this, arguments);
    };

    info('Hooked into XMLHttpRequest.');
  }

  // We parse the users' information in the API response and write them to the local database.
  // The browser's IndexedDB is used to store the data persistently.
  function parseTwitterAPIResponse(text, extractor) {
    try {
      const json = JSON.parse(text);

      // NOTE: This may vary as Twitter upgrades.
      const instructions = extractor(json);
      const entries = instructions.find((item) => item.type === 'TimelineAddEntries').entries;

      const users = entries
        .filter((item) => item.content.itemContent)
        .map((item) => ({
          ...item.content.itemContent.user_results.result,
          entryId: item.entryId,
          sortIndex: item.sortIndex,
        }));

      insertUserDataIntoDatabase(users);
    } catch (err) {
      error(
        `Failed to parse API response. (Message: ${err.message}) ` +
          'This may be a problem caused by Twitter updates. Please file an issue on GitHub: ' +
          'https://github.com/prinsss/export-twitter-following-list/issues'
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Utility Functions
  |--------------------------------------------------------------------------
  */

  // Escape characters for CSV file.
  function csvEscapeStr(s) {
    return `"${s.replace(/\"/g, '""').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
  }

  // Save a text file to disk.
  function saveFile(filename, content) {
    const link = document.createElement('a');
    link.style = 'display: none';
    document.body.appendChild(link);

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;

    link.click();
    URL.revokeObjectURL(url);
  }

  // Replace any https://t.co/ link in the string with its corresponding real URL.
  function sanitizeProfileDescription(description, urls) {
    let str = description;
    if (urls?.length) {
      for (const { url, expanded_url } of urls) {
        str = str.replace(url, expanded_url);
      }
    }
    return str;
  }

  // Show info logs on both screen and console.
  function info(line, ...args) {
    console.info('[Export Twitter Following List]', line, ...args);
    infoLogs.push(line);

    const dom = panelDom ? panelDom.querySelector('#export-logs') : null;
    if (dom) {
      dom.innerHTML = infoLogs.map((content) => '> ' + String(content)).join('\n');
    }
  }

  // Show error logs on both screen and console.
  function error(line, ...args) {
    console.error('[Export Twitter Following List]', line, ...args);
    errorLogs.push(line);

    const dom = panelDom ? panelDom.querySelector('#export-errors') : null;
    if (dom) {
      dom.innerHTML = errorLogs.map((content) => '> ' + String(content)).join('\n');
    }
  }

  // Show debug logs on console.
  function debug(...args) {
    console.debug('[Export Twitter Following List]', ...args);
  }
})();
