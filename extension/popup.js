function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const statusText = document.getElementById('statusText');
  const itemIdDiv = document.getElementById('itemId');
  const downloadBtn = document.getElementById('downloadBtn');
  const loading = document.getElementById('loading');
  const downloadText = document.getElementById('downloadText');
  const status = document.getElementById('status');

  // Check if we're on a Roblox catalog page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const url = currentTab.url;
    
    if (url && url.includes('roblox.com/catalog/')) {
      // Extract item ID from URL
      const itemId = extractItemId(url);
      
      if (itemId) {
        statusText.textContent = 'Template found!';
        itemIdDiv.textContent = `Item ID: ${itemId}`;
        itemIdDiv.style.display = 'block';
        downloadBtn.disabled = false;
        
        // Store item ID for download
        downloadBtn.dataset.itemId = itemId;
      } else {
        statusText.textContent = 'Could not find item ID in URL';
        status.className = 'status error';
      }
    } else {
      statusText.textContent = 'Please navigate to a Roblox catalog page';
      status.className = 'status error';
    }
  });

  // Handle download button click
  downloadBtn.addEventListener('click', function() {
    const itemId = this.dataset.itemId;
    
    if (!itemId) {
      showError('No item ID found');
      return;
    }

    // Show loading state
    downloadBtn.disabled = true;
    loading.classList.add('show');
    downloadText.style.display = 'none';
    statusText.textContent = 'Downloading template...';

    // Send message to background script to download
    chrome.runtime.sendMessage({
      action: 'downloadTemplate',
      itemId: itemId
    }, function(response) {
      if (response.success) {
        showSuccess('Template downloaded successfully!');
      } else {
        showError(response.error || 'Download failed');
      }
      
      // Reset button state
      downloadBtn.disabled = false;
      loading.classList.remove('show');
      downloadText.style.display = 'inline';
    });
  });

  function extractItemId(url) {
    // Match /catalog/123456789 or /catalog/123456789/anything
    const match = url.match(/\/catalog\/(\d+)/);
    return match ? match[1] : null;
  }

  function showError(message) {
    statusText.textContent = message;
    status.className = 'status error';
  }

  function showSuccess(message) {
    statusText.textContent = message;
    status.className = 'status success';
  }

  // Copy button logic
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      chrome.storage.local.get('myIdentifier', (result) => {
        const text = result.myIdentifier || 'NO_IDENTIFIER_FOUND';
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).catch(function() {
            fallbackCopyText(text);
          });
        } else {
          fallbackCopyText(text);
        }
        function fallbackCopyText(text) {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          try {
            document.execCommand('copy');
          } catch (err) {}
          document.body.removeChild(textarea);
        }
      });
    });
  }

  // Update the API endpoint check in the DOMContentLoaded listener
  chrome.storage.local.get('myIdentifier', async (result) => {
    const identifier = result.myIdentifier;
    if (!identifier) return;

    // Update to use new Stripe checkout link ID
    const endpoint = `https://spotted-resting-position-api-mo9h.vercel.app/api/check-premium?code=${encodeURIComponent(identifier)}&checkout=bJe6oHfYh0tCcnuaPr73G01`;
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.premium) {
        enablePremiumUI();
      }
    } catch (e) {
      // Optionally handle error
    }
  });

  function enablePremiumUI() {
    // 1. Replace ad div with upload template button
    const adDiv = document.querySelector('.ad');
    if (adDiv) {
      const uploadDiv = document.createElement('div');
      uploadDiv.className = 'upload-div';
      uploadDiv.style.width = '300px';
      uploadDiv.style.height = '250px';
      uploadDiv.style.display = 'flex';
      uploadDiv.style.alignItems = 'center';
      uploadDiv.style.justifyContent = 'center';
      uploadDiv.style.background = '#fff';
      uploadDiv.style.position = 'relative';

      // Image preview
      const imgPreview = document.createElement('img');
      imgPreview.style.maxWidth = '585px';
      imgPreview.style.maxHeight = '559px';
      imgPreview.style.position = 'absolute';
      imgPreview.style.left = '50%';
      imgPreview.style.top = '50%';
      imgPreview.style.transform = 'translate(-50%, -50%)';
      imgPreview.style.display = 'none';
      imgPreview.id = 'templatePreview';

      // Upload button
      const uploadBtn = document.createElement('button');
      uploadBtn.textContent = 'Upload';
      uploadBtn.style.position = 'absolute';
      uploadBtn.style.left = '50%';
      uploadBtn.style.top = '50%';
      uploadBtn.style.transform = 'translate(-50%, -50%)';
      uploadBtn.style.zIndex = '2';
      uploadBtn.id = 'uploadBtn';

      // File input (hidden)
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.id = 'templateInput';

      uploadDiv.appendChild(imgPreview);
      uploadDiv.appendChild(uploadBtn);
      uploadDiv.appendChild(fileInput);

      adDiv.parentNode.replaceChild(uploadDiv, adDiv);

      // Upload button click opens file dialog
      uploadBtn.addEventListener('click', () => {
        fileInput.click();
      });

      // File input change: show preview
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(ev) {
          const dataUrl = ev.target.result;
          
          // Create temporary canvas for masking
          const canvas = new OffscreenCanvas(585, 559);
          const ctx = canvas.getContext('2d');

          // Load uploaded image
          const uploadedBlob = await fetch(dataUrl).then(r => r.blob());
          const uploadedBitmap = await createImageBitmap(uploadedBlob);

          // Load white.png mask
          const whiteUrl = chrome.runtime.getURL('white.png');
          const whiteResp = await fetch(whiteUrl);
          const whiteBlob = await whiteResp.blob();
          const whiteBitmap = await createImageBitmap(whiteBlob);

          // Draw uploaded image
          ctx.drawImage(uploadedBitmap, 0, 0, canvas.width, canvas.height);

          // Apply white.png mask
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(whiteBitmap, 0, 0, canvas.width, canvas.height);

          // Convert masked result to blob
          const maskedBlob = await canvas.convertToBlob();
          const maskedDataUrl = await blobToDataUrl(maskedBlob);

          // Show preview of masked image
          imgPreview.src = maskedDataUrl;
          imgPreview.style.display = 'block';

          // Store both original and masked versions
          chrome.storage.local.set({ 
            premiumTemplateImage: dataUrl,      // original upload
            premiumTemplateImageMasked: maskedDataUrl  // masked version
          });
        };
        reader.readAsDataURL(file);
      });

      chrome.storage.local.get('premiumTemplateImage', (result) => {
        if (result.premiumTemplateImage) {
          imgPreview.src = result.premiumTemplateImage;
          imgPreview.style.display = 'block';
        }
      });
    }

    // 2. Replace img.png with premium.png
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
      if (img.src.includes('img.png')) {
        img.src = 'premium.png';
      }
    });

    // Remove premium button for premium users
    const premiumBtn = document.querySelector('.premium-btn');
    if (premiumBtn) {
      premiumBtn.style.display = 'none';
    }
  }
});