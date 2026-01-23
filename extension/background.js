// Background script to handle template downloads
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'downloadTemplate') {
    downloadTemplate(request.itemId)
      .then(function(result) {
        sendResponse({success: true, data: result});
      })
      .catch(function(error) {
        sendResponse({success: false, error: error.message});
      });
    // Return true to indicate we'll send a response asynchronously
    return true;
  }

  if (request.action === 'downloadMultipleTemplates') {
    // accept optional options (communityId, pageNumber)
    const opts = { communityId: request.communityId, pageNumber: request.pageNumber };
    // capture originating tab id if available so we can send progress updates directly
    const tabId = sender && sender.tab && sender.tab.id ? sender.tab.id : null;
    downloadMultipleTemplates(request.itemIds || [], opts, tabId)
      .then(res => sendResponse({ success: true, filename: res.filename }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Handle premium check for content script
  if (request.action === 'checkPremiumStatus') {
    checkPremium().then(isPremium => {
      sendResponse({ premium: !!isPremium });
    }).catch(() => {
      sendResponse({ premium: false });
    });
    return true;
  }
});

async function downloadTemplate(itemId) {
  try {
  // Directly fetch template image from the new download endpoint
  const templateUrl = `https://rbxthread.vercel.app/download/${itemId}`;
    const templateResp = await fetch(templateUrl, { method: 'GET', mode: 'cors' });
    if (!templateResp.ok) throw new Error(`Failed to fetch template image: ${templateResp.status} ${templateResp.statusText}`);
    const templateBlob = await templateResp.blob();

    // Create template bitmap and check dimensions
    const templateBitmap = await createImageBitmap(templateBlob);
    const isPremium = await checkPremium();
    
    // If dimensions don't match 585x559, return the original template without watermark
    if (templateBitmap.width !== 585 || templateBitmap.height !== 559) {
      // Return original template without any modifications
      const finalUrl = await blobToDataUrl(templateBlob);
      const filename = `${itemId}_threadline.png`;
      const downloadId = await chrome.downloads.download({
        url: finalUrl,
        filename: filename,
        saveAs: false
      });
      return { downloadId, filename, url: finalUrl };
    }

    // Only 585x559 templates continue past this point
    const canvas = new OffscreenCanvas(585, 559);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(templateBitmap, 0, 0);

    if (isPremium) {
      const maskedImageUrl = await getMaskedPremiumImage();
      if (maskedImageUrl) {
        const maskedBlob = await fetch(maskedImageUrl).then(r => r.blob());
        const maskedBitmap = await createImageBitmap(maskedBlob);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(maskedBitmap, 0, 0);
      }
    } else {
      // Add watermark only for non-premium 585x559 templates
      const watermarkUrl = chrome.runtime.getURL('watermark.png');
      const watermarkResp = await fetch(watermarkUrl);
      const watermarkBlob = await watermarkResp.blob();
      const watermarkBitmap = await createImageBitmap(watermarkBlob);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(watermarkBitmap, 0, 0);
    }

    ctx.globalCompositeOperation = 'source-over';
    const finalBlob = await canvas.convertToBlob();
    const finalUrl = await blobToDataUrl(finalBlob);
    const filename = `${itemId}_threadline.png`;
    const downloadId = await chrome.downloads.download({
      url: finalUrl,
      filename: filename,
      saveAs: false
    });

    return { downloadId, filename, url: finalUrl };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// Helper to check premium status
async function checkPremium() {
  return new Promise((resolve) => {
    chrome.storage.local.get('myIdentifier', async (result) => {
      const identifier = result.myIdentifier;
      if (!identifier) return resolve(false);
      try {
        // Update to use new Stripe checkout link ID
        const endpoint = `https://spotted-resting-position-api-mo9h.vercel.app/api/check-premium?code=${encodeURIComponent(identifier)}&checkout=bJe6oHfYh0tCcnuaPr73G01`;
        const response = await fetch(endpoint);
        const data = await response.json();
        resolve(data.premium === true);
      } catch {
        resolve(false);
      }
    });
  });
}

// Helper to get masked premium image
async function getMaskedPremiumImage() {
  return new Promise((resolve) => {
    chrome.storage.local.get('premiumTemplateImageMasked', (result) => {
      resolve(result.premiumTemplateImageMasked || null);
    });
  });
}

// Helper to get uploaded premium image (not masked)
async function getPremiumUploadedImage() {
  return new Promise((resolve) => {
    chrome.storage.local.get('premiumTemplateImage', (result) => {
      resolve(result.premiumTemplateImage || null);
    });
  });
}

// Update helper function for blob to data URL
async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Handle download completion
chrome.downloads.onChanged.addListener(function(downloadDelta) {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    console.log('Download completed:', downloadDelta.id);
  } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
    console.error('Download interrupted:', downloadDelta.id);
  }
});

// Generate and store identifier on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('myIdentifier', (result) => {
    if (!result.myIdentifier) {
      const id = generateIdentifier();
      chrome.storage.local.set({ myIdentifier: id });
    }
  });
});

function generateIdentifier() {
  function randChar() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return chars[Math.floor(Math.random() * chars.length)];
  }
  function randNum() {
    return Math.floor(Math.random() * 10).toString();
  }
  function randCharOrNum() {
    return Math.random() < 0.5 ? randChar() : randNum();
  }
  function rand6Digits() {
    return Array.from({length: 6}, () => randNum()).join('');
  }
  // Format: X0-0X-X0-X0-0X-000000
  return [
    randChar() + randNum(),
    randNum() + randChar(),
    randChar() + randNum(),
    randChar() + randNum(),
    randNum() + randChar(),
    rand6Digits()
  ].join('-');
}

// Download multiple templates, package into a zip and download
async function downloadMultipleTemplates(itemIds, options = {}, tabId = null) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) throw new Error('No item IDs provided');

  // Use a simple in-memory zip generator (JSZip-like minimal implementation)
  // Since we can't add external libs, build a basic ZIP using uncompressed DEFLATE store (method 0).
  const files = [];
  let processed = 0;
  // Attempt to get a sender tab to post progress (best-effort)
  // We'll broadcast progress via runtime messages (content script listens for them)
  for (let id of itemIds) {
    try {
      const single = await downloadTemplateToBlob(id);
      files.push({ name: `${id}_threadline.png`, blob: single });
    } catch (e) {
      console.warn('Failed to fetch template for', id, e);
      try { chrome.runtime.sendMessage({ action: 'downloadError', error: `Failed to fetch template for ${id}` }); } catch(e){}
    }
    processed++;
    // send progress update to originating tab when possible
    try {
      if (tabId !== null && chrome.tabs && chrome.tabs.sendMessage) {
        chrome.tabs.sendMessage(tabId, { action: 'downloadProgress', current: processed, total: itemIds.length });
      } else {
        chrome.runtime.sendMessage({ action: 'downloadProgress', current: processed, total: itemIds.length });
      }
    } catch(e) {}
  }

  if (files.length === 0) throw new Error('No templates could be fetched');

  // Build a zip file (uncompressed store)
  const zipBlob = await buildZipFromFiles(files);
  const zipUrl = await blobToDataUrl(zipBlob);
  // Prefer options' communityId/pageNumber over stored values
  let filename = `threadline_templates_${Date.now()}.zip`;
  let communityId = options.communityId || null;
  let pageNumber = options.pageNumber || null;
  if (!communityId) {
    try {
      const stored = await new Promise((res) => chrome.storage.local.get(['__tl_lastCommunityId','__tl_lastPageNumber'], res));
      if (stored && stored.__tl_lastCommunityId) communityId = stored.__tl_lastCommunityId;
      if (stored && stored.__tl_lastPageNumber) pageNumber = stored.__tl_lastPageNumber;
    } catch (e) {}
  }

  if (communityId) {
    filename = `threadline_${String(communityId).padStart(8,'0')}_page${pageNumber || 1}.zip`;
  }

  try {
    await chrome.downloads.download({ url: zipUrl, filename, saveAs: false });
    // notify originating tab of completion
    try {
      if (tabId !== null && chrome.tabs && chrome.tabs.sendMessage) {
        chrome.tabs.sendMessage(tabId, { action: 'downloadComplete', filename });
      } else {
        chrome.runtime.sendMessage({ action: 'downloadComplete', filename });
      }
    } catch(e){}
    return { filename };
  } catch (err) {
    try {
      if (tabId !== null && chrome.tabs && chrome.tabs.sendMessage) {
        chrome.tabs.sendMessage(tabId, { action: 'downloadError', error: err && err.message ? err.message : 'Download failed' });
      } else {
        chrome.runtime.sendMessage({ action: 'downloadError', error: err && err.message ? err.message : 'Download failed' });
      }
    } catch(e){}
    throw err;
  }
}

// Helper to fetch template and return processed PNG blob (same processing as downloadTemplate)
async function downloadTemplateToBlob(itemId) {
  // Reuse most of downloadTemplate but return blob instead of triggering download
  try {
  // Directly fetch template image from the new download endpoint
  const templateUrl = `https://rbxthread.vercel.app/download/${itemId}`;
    const templateResp = await fetch(templateUrl, { method: 'GET', mode: 'cors' });
    if (!templateResp.ok) throw new Error(`Failed to fetch template image: ${templateResp.status} ${templateResp.statusText}`);
    const templateBlob = await templateResp.blob();
    const templateBitmap = await createImageBitmap(templateBlob);

    if (templateBitmap.width !== 585 || templateBitmap.height !== 559) {
      // Return original blob as PNG
      return templateBlob;
    }

    const canvas = new OffscreenCanvas(585, 559);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(templateBitmap, 0, 0);

    const isPremium = await checkPremium();
    if (isPremium) {
      const maskedImageUrl = await getMaskedPremiumImage();
      if (maskedImageUrl) {
        const maskedBlob = await fetch(maskedImageUrl).then(r => r.blob());
        const maskedBitmap = await createImageBitmap(maskedBlob);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(maskedBitmap, 0, 0);
      }
    } else {
      const watermarkUrl = chrome.runtime.getURL('watermark.png');
      const watermarkResp = await fetch(watermarkUrl);
      const watermarkBlob = await watermarkResp.blob();
      const watermarkBitmap = await createImageBitmap(watermarkBlob);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(watermarkBitmap, 0, 0);
    }

    ctx.globalCompositeOperation = 'source-over';
    const finalBlob = await canvas.convertToBlob();
    return finalBlob;
  } catch (err) {
    throw err;
  }
}

// Minimal ZIP builder for storing files without compression (store - method 0)
async function buildZipFromFiles(files) {
  // Helper to get uint8 array for string
  function strToU8(s) { return new TextEncoder().encode(s); }

  // CRC32 implementation (table-based)
  function makeCrcTable() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[n] = c >>> 0;
    }
    return table;
  }
  const crcTable = makeCrcTable();
  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
    }
    return (crc ^ (-1)) >>> 0;
  }

  const fileEntries = [];
  let localFilesSize = 0;
  for (let f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer());
    const nameBuf = strToU8(f.name);
    const localHeader = new Uint8Array(30 + nameBuf.length);
    const view = new DataView(localHeader.buffer);
  // local file header signature
  view.setUint32(0, 0x04034b50, true);
    // version needed to extract
    view.setUint16(4, 20, true);
    // general purpose bit flag
    view.setUint16(6, 0, true);
    // compression method (0 = store)
    view.setUint16(8, 0, true);
    // last mod time & date
    view.setUint32(10, 0, true);
  // crc32 (will compute below)
  // placeholder for now; will set actual CRC after calculation
  view.setUint32(14, 0, true);
    // compressed size
    view.setUint32(18, data.length, true);
    // uncompressed size
    view.setUint32(22, data.length, true);
    // filename length
    view.setUint16(26, nameBuf.length, true);
    // extra field length
    view.setUint16(28, 0, true);

    localHeader.set(nameBuf, 30);

    // compute CRC32 for the file data and write into local header
    const crc = crc32(data);
    view.setUint32(14, crc, true);

    fileEntries.push({ localHeader, data, name: f.name, crc });
    localFilesSize += localHeader.length + data.length;
  }

  // central directory
  const centralParts = [];
  let offset = 0;
  for (let e of fileEntries) {
    const nameBuf = new TextEncoder().encode(e.name);
    const cent = new Uint8Array(46 + nameBuf.length);
    const dv = new DataView(cent.buffer);
    dv.setUint32(0, 0x02014b50, true); // central file header signature
    dv.setUint16(4, 0x14, true); // version made by
    dv.setUint16(6, 20, true); // version needed to extract
    dv.setUint16(8, 0, true); // gp bit flag
    dv.setUint16(10, 0, true); // compression method
    dv.setUint32(12, 0, true); // last mod time/date
  dv.setUint32(16, e.crc, true); // crc32
  dv.setUint32(20, e.data.length, true); // compressed size
  dv.setUint32(24, e.data.length, true); // uncompressed size
    dv.setUint16(28, nameBuf.length, true); // filename length
    dv.setUint16(30, 0, true); // extra len
    dv.setUint16(32, 0, true); // file comment
    dv.setUint16(34, 0, true); // disk number start
    dv.setUint16(36, 0, true); // internal attrs
    dv.setUint32(38, 0, true); // external attrs
    dv.setUint32(42, offset, true); // relative offset of local header
    cent.set(nameBuf, 46);
    centralParts.push(cent);
    offset += e.localHeader.length + e.data.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const localTotalSize = fileEntries.reduce((s, f) => s + f.localHeader.length + f.data.length, 0);

  // End of central directory record
  const eocd = new Uint8Array(22);
  const dvE = new DataView(eocd.buffer);
  dvE.setUint32(0, 0x06054b50, true); // EOCD signature
  dvE.setUint16(4, 0, true); // disk number
  dvE.setUint16(6, 0, true); // disk with central dir
  dvE.setUint16(8, centralParts.length, true); // total entries this disk
  dvE.setUint16(10, centralParts.length, true); // total entries
  dvE.setUint32(12, centralSize, true); // central dir size
  dvE.setUint32(16, localTotalSize, true); // central dir offset
  dvE.setUint16(20, 0, true); // comment length

  // Concatenate all parts: locals -> central -> eocd
  const blobParts = [];
  for (let e of fileEntries) {
    blobParts.push(e.localHeader);
    blobParts.push(e.data);
  }
  for (let c of centralParts) blobParts.push(c);
  blobParts.push(eocd);

  return new Blob(blobParts, { type: 'application/zip' });
}