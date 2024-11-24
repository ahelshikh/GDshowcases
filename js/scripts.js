const gallery = document.getElementById('gallery');
let levels = [];

// Displays levels in the gallery
function displayLevels(levels) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    if (!levels || levels.length === 0) {
        gallery.innerHTML = `
            <div class="no-levels">
                <p>No levels found.</p>
            </div>
        `;
        return;
    }

    gallery.innerHTML = '';
    levels.forEach(level => {
        const levelCard = document.createElement('div');
        levelCard.classList.add('level-card');

        levelCard.onclick = () => openGalleryModal(level);

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'image-wrapper';
        imageWrapper.innerHTML = `
            <img src="${level.images?.[0]?.url || level.thumbnail?.url || '../images/level1.png'}" 
                 alt="${level.title}" 
                 onerror="this.src='../images/level1.png'">
        `;

        imageContainer.appendChild(imageWrapper);
        levelCard.appendChild(imageContainer);

        levelCard.innerHTML += `
            <div class="level-details">
                <h2 class="level-title">${level.title}</h2>
                <p class="level-type">${capitalizeWords(level.type || 'Unknown')}</p>
                <p class="level-meta"><span class="level-meta-title">By:</span> ${level.creator}</p>
                <p class="level-meta"><span class="level-meta-title">Difficulty:</span> ${capitalizeWords(level.difficulty || 'Unknown')}</p>
                <p class="level-meta"><span class="level-meta-title">ID:</span> ${level.id}</p>
            </div>
        `;
        
        gallery.appendChild(levelCard);
    });
}


// Change the displayed image in modal
function navigateModalImage(event, id, direction) {
    event.stopPropagation();

    const modalImageWrapper = document.querySelector('.modal-image-wrapper');
    const img = modalImageWrapper.querySelector('img');
    const indicators = modalImageWrapper.querySelectorAll('.indicator');
    const currentIndex = parseInt(img.dataset.currentIndex, 10);

    const isGallery = levels.some(level => level.id === id);
    const item = isGallery 
        ? levels.find(level => level.id === id) 
        : submissions.find(submission => submission.id === id);

    if (!item) {
        console.error('Item not found for navigation:', id);
        return;
    }

    const images = item.images || [{ url: item.thumbnail?.url || '../images/level1.png' }];
    const totalImages = images.length;

    let newIndex;
    if (direction === 'next') {
        newIndex = (currentIndex + 1) % totalImages;
    } else if (direction === 'prev') {
        newIndex = (currentIndex - 1 + totalImages) % totalImages;
    }

    img.src = images[newIndex]?.url || '../images/level1.png';
    img.dataset.currentIndex = newIndex;

    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === newIndex);
    });
}


window.onclick = function (event) {
    if (event.target == document.getElementById('modal')) {
        closeModal();
    }
}

// Load levels from server
async function loadLevels() {
    try {
        console.log('Starting to load levels...');
        const response = await fetch('/api/levels?status=accepted');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received levels:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        levels = data || [];
        displayLevels(levels);
    } catch (error) {
        console.error('Error loading levels:', error);
        const gallery = document.getElementById('gallery');
        if (gallery) {
            gallery.innerHTML = `
                <div class="error-message">
                    <p>Failed to load levels. Please try again later.</p>
                    <p>Error details: ${error.message}</p>
                    <button onclick="loadLevels()" class="retry-button">Retry</button>
                </div>
            `;
        }
    }
}

// Filter displayed levels by type
function filterGallery(type) {
    const buttons = document.querySelectorAll('header button');
    const activeButton = document.querySelector(`header button.active`);

    if (activeButton && activeButton.getAttribute('onclick') === `filterGallery('${type}')`) {

        activeButton.classList.remove('active');

        displayLevels(levels.filter(level => level.status === 'accepted'));
        return;
    }

    buttons.forEach(button => button.classList.remove('active'));

    if (type === 'level') {
        document.querySelector('button[onclick="filterGallery(\'level\')"]').classList.add('active');
    } else if (type === 'layout') {
        document.querySelector('button[onclick="filterGallery(\'layout\')"]').classList.add('active');
    }

    const filteredLevels = levels.filter(level => level.type === type && level.status === 'accepted');
    displayLevels(filteredLevels);
}


function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Search levels by title or creator
function searchLevels() {
    const query = document.getElementById('searchBox').value.toLowerCase();
    const filtered = levels.filter(level =>
        level.status === 'accepted' && (
            level.title.toLowerCase().includes(query) ||
            level.creator.toLowerCase().includes(query)
        )
    );
    displayLevels(filtered);
}

// Open modal with level details
function openGalleryModal(level) {
    const modal = document.getElementById('modal');
    const images = level.images || [{ url: level.thumbnail?.url || '../images/level1.png' }];
    const hasMultipleImages = images.length > 1;

    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <span class="close" onclick="closeModal()">×</span>
        <h2 id="modal-title">${level.title || 'No title available'}</h2>
        <p class="level-type">${capitalizeWords(level.type || 'Unknown')}</p>
        
        <p id="modal-creator"><span class="level-meta-title">Created by:</span> ${level.creator || 'Unknown'}</p>
        <p id="modal-difficulty"><span class="level-meta-title">Difficulty:</span> ${capitalizeWords(level.difficulty || 'Unknown')}</p>
        <p id="modal-id"><span class="level-meta-title">Level ID:</span> ${level.id || 'Unknown'}</p>
        
        <div class="divider"></div>
        
        <div class="modal-image-container">
            ${hasMultipleImages ? `
                <button class="nav-arrow left" onclick="navigateModalImage(event, '${level.id}', 'prev')">←</button>
                <button class="nav-arrow right" onclick="navigateModalImage(event, '${level.id}', 'next')">→</button>
            ` : ''}
            <div class="modal-image-wrapper">
                <img id="modal-image" 
                     src="${images[0].url || '../images/level1.png'}" 
                     alt="${level.title || 'No title available'}"
                     data-current-index="0"
                     data-level-id="${level.id}">
                ${hasMultipleImages ? `
                    <div class="image-indicators">
                        ${images.map((_, index) => `
                            <span class="indicator ${index === 0 ? 'active' : ''}" 
                                  data-index="${index}"></span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="divider"></div>
        
        <p id="modal-video">
            ${level.videoLink
                ? `Video link: <a href="${level.videoLink}" target="_blank" rel="noopener noreferrer">${level.videoLink}</a>`
                : 'Video link: None'
            }
        </p>
    `;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}


const submissionList = document.getElementById('submission-list');
let submissions = [];
let filteredSubmissions = [];
let activeFilter = null;

loadSubmissions();

async function loadSubmissions() {
    const submissionList = document.getElementById('submission-list');
    if (!submissionList) return; 

    try {
        console.log('Fetching submissions...');
        const response = await fetch('/api/levels');

        if (!response.ok) {
            throw new Error(`Failed to fetch submissions. HTTP status: ${response.status}`);
        }

        submissions = await response.json();
        console.log('Received submissions:', submissions);

        activeFilter = 'pending';
        filteredSubmissions = submissions.filter(submission => submission.status === 'pending');
        displaySubmissions(filteredSubmissions);
    } catch (error) {
        console.error('Error loading submissions:', error);
        submissionList.innerHTML = `
            <div class="error-message">
                <p>Failed to load submissions. Please try again later.</p>
                <p>Error details: ${error.message}</p>
            </div>
        `;
    }
}


function displaySubmissions(submissions) {
    const submissionList = document.getElementById('submission-list');
    if (!submissionList) return;

    submissionList.innerHTML = '';
    submissions.forEach(submission => {
        const submissionElement = document.createElement('div');
        submissionElement.classList.add('submission-card');
        submissionElement.onclick = () => openDashboardModal(submission);

        submissionElement.innerHTML = `
            <h3>${submission.title}</h3>
            <p>Creator: ${submission.creator}</p>
            <p>Difficulty: ${submission.difficulty || 'Unknown'}</p>
            <p>Level ID: ${submission.id}</p>
            <p>Status: ${submission.status}</p>
        `;
        submissionList.appendChild(submissionElement);
    });
}

// Gallery filters
function filterPending() {
    if (!document.getElementById('submission-list')) return;
    activeFilter = 'pending';
    filteredSubmissions = submissions.filter(submission => submission.status === 'pending');
    displaySubmissions(filteredSubmissions);
}

function filterAccepted() {
    if (!document.getElementById('submission-list')) return;
    activeFilter = 'accepted';
    filteredSubmissions = submissions.filter(submission => submission.status === 'accepted');
    displaySubmissions(filteredSubmissions);
}

function filterRejected() {
    if (!document.getElementById('submission-list')) return;
    activeFilter = 'denied';
    filteredSubmissions = submissions.filter(submission => submission.status === 'denied');
    displaySubmissions(filteredSubmissions);
}

document.addEventListener('DOMContentLoaded', () => {
    const galleryElement = document.getElementById('gallery');
    const submissionListElement = document.getElementById('submission-list');
    
    if (galleryElement) {
        loadLevels();
    }
    else if (submissionListElement) {
        loadSubmissions();
    }
});

function openDashboardModal(submission) {
    const modal = document.getElementById('modal');

    const images = submission.images || [{ url: submission.thumbnail?.url || '../images/level1.png' }];
    const hasMultipleImages = images.length > 1;

    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <span class="close" onclick="closeModal()">×</span>
        <h2 id="modal-title">${submission.title || 'No title available'}</h2>
        <p class="level-type">${capitalizeWords(submission.type || 'Unknown')}</p>
        
        <p id="modal-creator"><span class="level-meta-title">Created by:</span> ${submission.creator || 'Unknown'}</p>
        <p id="modal-difficulty"><span class="level-meta-title">Difficulty:</span> ${capitalizeWords(submission.difficulty || 'Unknown')}</p>
        <p id="modal-id"><span class="level-meta-title">Level ID:</span> ${submission.id || 'Unknown'}</p>
        
        <div class="divider"></div>
        
        <div class="modal-image-container">
            ${hasMultipleImages ? `
                <button class="nav-arrow left" onclick="navigateModalImage(event, '${submission.id}', 'prev')">←</button>
                <button class="nav-arrow right" onclick="navigateModalImage(event, '${submission.id}', 'next')">→</button>
            ` : ''}
            <div class="modal-image-wrapper">
                <img id="modal-image" 
                     src="${images[0].url || '../images/level1.png'}" 
                     alt="${submission.title || 'No title available'}"
                     data-current-index="0"
                     data-level-id="${submission.id}">
                ${hasMultipleImages ? `
                    <div class="image-indicators">
                        ${images.map((_, index) => `
                            <span class="indicator ${index === 0 ? 'active' : ''}" 
                                  data-index="${index}"></span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="divider"></div>
        
        <p id="modal-video">
            ${submission.videoLink
                ? `Video link: <a href="${submission.videoLink}" target="_blank" rel="noopener noreferrer">${submission.videoLink}</a>`
                : 'Video link: None'
            }
        </p>

        <div class="modal-actions">
            <p class="status-message">Current Status: ${capitalizeWords(submission.status)}</p>
            <button onclick="acceptSubmission('${submission.id}')" class="action-button accept">Accept</button>
            <button onclick="rejectSubmission('${submission.id}')" class="action-button reject">Reject</button>
            <button onclick="markAsPending('${submission.id}')" class="action-button pending">Mark as Pending</button>
            <button onclick="deleteSubmission('${submission.id}')" class="action-button delete">Delete</button>
        </div>
    `;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}



async function deleteSubmission(levelId) {
    if (!confirm("Are you sure you want to delete this submission? This action cannot be undone.")) {
        return;
    }

    try {
        const response = await fetch(`/api/levels/${levelId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            alert('Submission deleted successfully.');
 
            loadSubmissions();
        } else {
            const error = await response.json();
            alert(`Failed to delete submission: ${error.error}`);
        }
    } catch (error) {
        console.error('Error deleting submission:', error);
        alert('An error occurred while deleting the submission.');
    }
}

function capitalizeDifficulty(difficulty) {
    return difficulty.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}


function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

function acceptSubmission(levelId) {
    if (levelId) {
        updateSubmissionStatus(levelId, 'accepted');
    }
}

function rejectSubmission(levelId) {
    if (levelId) {
        updateSubmissionStatus(levelId, 'denied');
    }
}

function markAsPending(levelId) {
    if (levelId) {
        updateSubmissionStatus(levelId, 'pending');
    }
}

async function updateSubmissionStatus(levelId, newStatus) {
    try {
        const response = await fetch(`/api/levels/${levelId}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error('Failed to update level status');
        }

        const result = await response.json();
        console.log('Updated submission:', result);

        const submissionIndex = submissions.findIndex(s => s.id === levelId);
        if (submissionIndex !== -1) {
            submissions[submissionIndex] = result.level;
        }

        displaySubmissions(submissions.filter(sub => sub.status === activeFilter));

        closeModal();

        alert(`Submission successfully ${newStatus}`);
    } catch (error) {
        console.error('Error updating submission:', error);
        alert('Failed to update submission. Please try again.');
    }
}


let selectedFiles = new Set();
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function initializeImageUpload() {
    const imageInput = document.getElementById('level-images');
    const imagePreviewContainer = document.getElementById('image-previews');

    imageInput.addEventListener('change', handleImageSelection);

    function handleImageSelection(event) {
        const newFiles = Array.from(event.target.files);

        if (selectedFiles.size + newFiles.length > MAX_IMAGES) {
            alert(`You can only upload up to ${MAX_IMAGES} images. Remove some to add more.`);

            const remainingSlots = MAX_IMAGES - selectedFiles.size;
            newFiles.slice(0, remainingSlots).forEach(file => validateAndAddFile(file));
        } else {
            newFiles.forEach(file => validateAndAddFile(file));
        }

        updateFileInput(); 
        updatePreviews(); 
    }

    function validateAndAddFile(file) {
        const isValidSize = file.size <= MAX_FILE_SIZE;
        const isValidType = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);

        if (isValidSize && isValidType) {
            selectedFiles.add(file);
        } else {
            alert(`"${file.name}" is invalid. Ensure it's an image file under 5MB.`);
        }
    }

    function updateFileInput() {
        const dt = new DataTransfer();
        selectedFiles.forEach(file => dt.items.add(file));
        imageInput.files = dt.files; 
    }

    function updatePreviews() {
        imagePreviewContainer.innerHTML = '';
        Array.from(selectedFiles).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = function (e) {
                const preview = document.createElement('div');
                preview.className = 'image-preview';
                preview.dataset.filename = file.name; 
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" class="remove-image" aria-label="Remove image">×</button>
                    <span class="file-name">${file.name}</span>
                `;

                preview.querySelector('.remove-image').onclick = function () {
                    selectedFiles.delete(file);
                    updateFileInput();
                    preview.remove();
                };

                imagePreviewContainer.appendChild(preview);
            };

            reader.readAsDataURL(file);
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeImageUpload);

async function validateForm() {
  const form = document.getElementById('uploadForm');
  const formData = new FormData(form);

  if (selectedFiles.size === 0) {
    alert('Please select at least one image');
    return false;
  }

  const isLayout = document.getElementById('layout').checked;
  const videoLink = document.getElementById('video').value;
  if (isLayout && !videoLink) {
    alert('YouTube video link is required for layouts');
    return false;
  }

  try {
    const response = await fetch('/api/levels', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit level');
    }

    const result = await response.json();
    
    if (result.success) {
      alert('Level submitted successfully!');
      form.reset();
      selectedFiles.clear();
      document.getElementById('image-previews').innerHTML = '';
      return false; 
    } else {
      throw new Error(result.error || 'Failed to submit level');
    }
  } catch (error) {
    console.error('Error submitting level:', error);
    alert(`Failed to submit level: ${error.message}`);
    return false;
  }
  
  return false; 
}

function toggleVideoRequirement() {
  const videoInput = document.getElementById('video');
  const videoLabel = document.getElementById('videoLabel');
  const isLayout = document.getElementById('layout').checked;

  if (isLayout) {
    videoInput.required = true;
    videoLabel.textContent = 'YouTube Video Link (required for layouts):';
  } else {
    videoInput.required = false;
    videoLabel.textContent = 'YouTube Video Link (optional):';
  }
}