// Main Variables
const SELECTED_WORDS = [];
const MAX_SELECTED = 2;
const GENERATED_IMAGES = {}; // Store generated images by word
const GALLERY_STORAGE_KEY = 'wordBlenderGallery';
const MAX_GALLERY_IMAGES = 10; // Keep only the last 10 images
let galleryImages = []; // Array to store latest gallery images

// DOM Elements
const wordContainer = document.getElementById('word-container');
const refreshWordsBtn = document.getElementById('refresh-words-btn');
const wordSlot1 = document.getElementById('word-slot-1');
const wordSlot2 = document.getElementById('word-slot-2');
const resultContainer = document.getElementById('result-container');
const resultContent = document.getElementById('result-content');
const blendedWordEl = document.getElementById('blended-word');
const imageGallery = document.getElementById('image-gallery');
const currentImageCard = document.getElementById('current-image-card');
const currentImage = document.getElementById('current-image');
const currentImageContainer = document.getElementById('current-image-container');
const imageLoading = document.getElementById('image-loading');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const downloadImageBtn = document.getElementById('download-image-btn');

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
refreshWordsBtn.addEventListener('click', refreshWords);

// Initialize the application
async function initApp() {
    try {
        // Load saved gallery images from local storage
        loadGalleryFromStorage();
        
        // Fetch initial words
        const words = await fetchWords();
        renderWords(words);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        wordContainer.innerHTML = `
            <div class="alert alert-error shadow-lg text-sm">
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Failed to load words. Please refresh.</span>
                </div>
            </div>
        `;
    }
}

// Load gallery images from local storage
function loadGalleryFromStorage() {
    try {
        const savedGallery = localStorage.getItem(GALLERY_STORAGE_KEY);
        if (savedGallery) {
            galleryImages = JSON.parse(savedGallery);
            console.log(`Loaded ${galleryImages.length} images from local storage`);
            
            // Ensure only max 10 are loaded (in case storage had more)
            if (galleryImages.length > MAX_GALLERY_IMAGES) {
                 galleryImages = galleryImages.slice(0, MAX_GALLERY_IMAGES);
            }

            // Display all loaded images
            displayGalleryImages();
            
            // Update generated images object for modal display
            galleryImages.forEach(item => {
                if (item && item.word && item.image_data) {
                    GENERATED_IMAGES[item.word] = item.image_data;
                }
            });
        } else {
            // If no saved data, show empty state
            displayEmptyGalleryMessage();
        }
    } catch (error) {
        console.error('Error loading gallery from storage:', error);
        displayEmptyGalleryMessage(); // Show empty state on error too
    }
}

// Save gallery to local storage
function saveGalleryToStorage() {
    try {
        // Ensure only the latest MAX_GALLERY_IMAGES are saved
        if (galleryImages.length > MAX_GALLERY_IMAGES) {
            galleryImages = galleryImages.slice(0, MAX_GALLERY_IMAGES);
        }
        
        localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(galleryImages));
        console.log(`Saved ${galleryImages.length} images to local storage`);
    } catch (error) {
        console.error('Error saving gallery to storage:', error);
    }
}

// Render all images currently in the galleryImages array
function displayGalleryImages() {
    clearGalleryDisplay(); // Clear current display first

    if (galleryImages.length === 0) {
        displayEmptyGalleryMessage();
        return;
    }

    galleryImages.forEach(imageData => {
        addImageToGalleryDisplay(imageData);
    });
}

// Add an image to the gallery display
function addImageToGalleryDisplay(imageData) {
    if (!imageData || !imageData.word || !imageData.image_data) {
        console.error('Invalid image data for gallery display');
        return;
    }
    
    const imgContainer = document.createElement('div');
    imgContainer.classList.add('image-item', 'card', 'shadow-xl', 'overflow-hidden');
    imgContainer.style.opacity = 0; // For animation
    
    // Create image and caption
    imgContainer.innerHTML = `
        <img src="data:image/jpeg;base64,${imageData.image_data}" 
             alt="Generated image for ${imageData.word}">
        <div class="caption">${imageData.word}</div>
    `;
    
    // Add click event for modal view
    imgContainer.addEventListener('click', () => {
        openModal(imageData.image_data, imageData.word);
    });
    
    // Add to gallery (append, since we display all at once)
    imageGallery.appendChild(imgContainer);
    
    // Animate the image appearing
    anime({
        targets: imgContainer,
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.9, 1],
        duration: 600,
        easing: 'easeOutExpo'
    });
}

// Clear the gallery display (not the data)
function clearGalleryDisplay() {
    // Remove all child elements (images)
    imageGallery.innerHTML = '';
}

// Display a message when the gallery is empty
function displayEmptyGalleryMessage() {
     const emptyState = document.createElement('div');
    emptyState.className = 'col-span-full py-8 text-center text-gray-500';
    emptyState.innerHTML = `
        <p>Your gallery is empty. Create new blends to add images!</p>
    `;
    imageGallery.appendChild(emptyState);
}

// Fetch initial words from the server
async function fetchWords() {
    const response = await fetch('/words');
    const data = await response.json();
    return data.words;
}

// Render the words on the screen
function renderWords(words) {
    // Clear loading indicator
    wordContainer.innerHTML = '';
    
    // Create and append word elements with staggered animations
    words.forEach((word, index) => {
        const wordEl = document.createElement('div');
        
        // Get a color class based on first letter
        const colorIndex = getColorClassForWord(word);
        
        wordEl.classList.add(
            'word-item',
            `word-color-${colorIndex}`,
            'shadow'
        );
        wordEl.textContent = word;
        wordEl.style.opacity = 0;
        wordEl.dataset.word = word;
        wordEl.addEventListener('click', () => selectWord(wordEl));
        
        wordContainer.appendChild(wordEl);
        
        // Animated appearance with anime.js
        anime({
            targets: wordEl,
            opacity: 1,
            translateY: [10, 0],
            scale: [0.9, 1],
            delay: index * 40,
            easing: 'easeOutExpo'
        });
        
        // Add floating animation to some words randomly
        if (Math.random() > 0.7) {
            setTimeout(() => {
                wordEl.classList.add('floating');
            }, 1000 + Math.random() * 1000);
        }
    });
}

// Function to assign a consistent color class based on word
function getColorClassForWord(word) {
    // Use first letter to determine color class (1-8)
    const firstChar = word.charAt(0).toLowerCase();
    const charCode = firstChar.charCodeAt(0);
    return ((charCode % 8) + 1);
}

// Handle word selection
function selectWord(wordEl) {
    const word = wordEl.dataset.word;
    
    // If already selected, deselect it and reset
    if (wordEl.classList.contains('selected')) {
        resetApp();
        setTimeout(() => {
            // After reset, select the clicked word
            wordEl.classList.add('selected');
            SELECTED_WORDS.push({
                word: word,
                element: wordEl
            });
            updateSlots();
        }, 50);
        return;
    }
    
    // If max words already selected, handle replacement
    if (SELECTED_WORDS.length >= MAX_SELECTED) {
        // Remove the first selected word visually and from the array
        const firstSelected = SELECTED_WORDS[0];
        if (firstSelected && firstSelected.element) {
            firstSelected.element.classList.remove('selected');
        }
        SELECTED_WORDS.splice(0, 1);
    }
    
    // Add to selected
    wordEl.classList.add('selected');
    SELECTED_WORDS.push({
        word: word,
        element: wordEl
    });
    
    // Update selection slots
    updateSlots();
    
    // Animate selection
    anime({
        targets: wordEl,
        scale: [1, 1.2, 1.1],
        duration: 400,
        easing: 'easeOutElastic(1, .5)'
    });
    
    // Enable/disable blend button and trigger blend if ready
    if (SELECTED_WORDS.length === MAX_SELECTED) {
        handleBlend(); // Auto-trigger blend
    }
}

// Update the selection slots with selected words
function updateSlots() {
    // Reset slots
    wordSlot1.innerHTML = '<span class="text-gray-500 text-sm md:text-base">Select a word</span>';
    wordSlot1.classList.remove('filled');
    wordSlot2.innerHTML = '<span class="text-gray-500 text-sm md:text-base">Select a word</span>';
    wordSlot2.classList.remove('filled');
    
    // Fill slots with selected words
    SELECTED_WORDS.forEach((item, index) => {
        const slot = index === 0 ? wordSlot1 : wordSlot2;
        slot.innerHTML = `<span>${item.word}</span>`;
        slot.classList.add('filled');
    });
}

// Handle the blend button click (now triggered automatically)
async function handleBlend() {
    if (SELECTED_WORDS.length !== MAX_SELECTED) return;
    
    // If the image card is not visible yet, show it
    if (currentImageCard.classList.contains('hidden')) {
        currentImageCard.classList.remove('hidden');
        currentImageContainer.classList.remove('hidden');
        currentImageContainer.style.minHeight = '200px';
    }
    
    // Show loading overlay on top of the current image
    imageLoading.classList.remove('hidden');
    
    // Show loading state for blend result
    resultContainer.classList.remove('hidden');
    resultContent.classList.add('hidden');
    resultContainer.querySelector('.animate-pulse').classList.remove('hidden');

    // Disable word selection during blending
    wordContainer.style.pointerEvents = 'none';
    wordContainer.style.opacity = '0.7';
    
    try {
        const word1 = SELECTED_WORDS[0].word;
        const word2 = SELECTED_WORDS[1].word;
        
        // Call the API to blend words
        const blendResponse = await fetch('/blend', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({word1: word1, word2: word2})
        });
        
        if (!blendResponse.ok) {
            const errorDetail = await blendResponse.text();
            throw new Error(`Failed to blend words: ${errorDetail}`);
        }
        
        const blendResult = await blendResponse.json();
        
        // Show the blended word result
        displayResult(blendResult);

        // If blend was successful, trigger image generation immediately
        if (blendResult.blended_word) {
            // No need to hide current image, just show the loading animation
            // which is already visible at this point
            
            // Slight delay to ensure UI updates first
            setTimeout(() => {
                triggerImageGeneration(blendResult.blended_word);
            }, 50);
            
            // Clear the selected words after successful blend
            clearSelectedWords();
        }
        
    } catch (error) {
        console.error('Error in blending process:', error);
        // Ensure loading is hidden on error
        resultContainer.querySelector('.animate-pulse').classList.add('hidden'); 
        resultContent.classList.remove('hidden');
        // Display a user-friendly error message
        resultContent.innerHTML = ` 
            <div class="alert alert-error shadow-lg">
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Error: ${error.message || 'Failed to blend words. Please try again.'}</span>
                </div>
            </div>
            <p class="text-xs mt-2 text-gray-400">Click any word to try again</p>
        `;
        
        // Hide loading overlay on error
        imageLoading.classList.add('hidden');
    } finally {
        // Re-enable word selection
        wordContainer.style.pointerEvents = 'auto';
        wordContainer.style.opacity = '1';
    }
}

// Trigger image generation for a blended word
async function triggerImageGeneration(word) {
    try {
        // Show loading state first
        currentImageCard.classList.remove('hidden');
        currentImage.classList.add('hidden');
        imageLoading.classList.remove('hidden');
        
        // Scroll to make image area visible
        currentImageContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        console.log(`Generating image for: ${word}`);
        
        // Check if we already have this image in our storage
        if (GENERATED_IMAGES[word]) {
            console.log(`Image for "${word}" already exists, using cached version`);
            
            // Short delay to show loading effect
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Display the cached image
            displayCurrentImage(GENERATED_IMAGES[word]);
            
            // Also add to gallery storage if not already there
            const isInGallery = galleryImages.some(item => item.word === word);
            if (!isInGallery) {
                addToGalleryStorage({
                    word: word,
                    image_data: GENERATED_IMAGES[word]
                });
            }
            
            return;
        }
        
        // Request a new image
        const response = await fetch('/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ word: word })
        });
        
        if (!response.ok) {
            throw new Error('Image generation failed');
        }
        
        const data = await response.json();
        
        // Store in our cache
        GENERATED_IMAGES[word] = data.image_data;
        
        // Display the image
        displayCurrentImage(data.image_data);
        
        // Add to gallery
        addToGalleryStorage({
            word: word,
            image_data: data.image_data
        });
        
    } catch (error) {
        console.error('Error generating image:', error);
        
        // Display error message
        imageLoading.classList.add('hidden');
        currentImage.innerHTML = `
            <div class="alert alert-error shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Failed to generate image. Please try again.</span>
            </div>
        `;
        currentImage.classList.remove('hidden');
    }
}

// Function to display the current generated image
function displayCurrentImage(imageData) {
    // Show the image card if hidden
    if (currentImageCard.classList.contains('hidden')) {
        currentImageCard.classList.remove('hidden');
    }

    // Hide loading indicator if visible
    if (!imageLoading.classList.contains('hidden')) {
        imageLoading.classList.add('hidden');
    }

    // Create and display the image
    currentImage.innerHTML = `<img src="data:image/jpeg;base64,${imageData}" 
                                  alt="Generated image" 
                                  class="shadow-lg">`;
    currentImage.classList.remove('hidden');

    // Scroll to make sure the image is in view (with a slight delay for smooth UX)
    setTimeout(() => {
        currentImage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);

    // Add click functionality to open modal
    const imgElement = currentImage.querySelector('img');
    if (imgElement) {
        imgElement.addEventListener('click', () => {
            // Open modal with this image
            const currentWord = blendedWordEl.textContent;
            openModal(imageData, currentWord);
        });
        
        // Add cursor pointer style
        imgElement.style.cursor = 'pointer';
    }
}

// Open the image modal with the given image data
function openModal(imageData, word) {
    // Set the image source in the modal
    modalImage.src = `data:image/jpeg;base64,${imageData}`;
    modalImage.alt = `Full size image of ${word}`;
    
    // Setup download button
    if (downloadImageBtn) {
        downloadImageBtn.onclick = function() {
            const link = document.createElement('a');
            link.href = `data:image/jpeg;base64,${imageData}`;
            link.download = `${word.replace(/\s+/g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
    
    // Show the modal
    imageModal.classList.remove('hidden');
    
    // Use anime.js for a nice opening animation
    anime({
        targets: modalImage,
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutCubic'
    });
}

// Display the blended word result
function displayResult(result) {
    // Hide loading and show content
    resultContainer.querySelector('.animate-pulse').classList.add('hidden');
    resultContent.classList.remove('hidden');
    
    // Set the blended word display
    const newWord = result.blended_word;
    blendedWordEl.textContent = newWord || 'Error: No word generated';
    
    // Add appear animation for the result card
    resultContent.classList.add('appear-animation');
    
    // Animate the blended word text with anime.js
    anime({
        targets: blendedWordEl,
        scale: [0.5, 1.2, 1],
        opacity: [0, 1],
        duration: 1200,
        easing: 'easeOutElastic(1, .5)'
    });

    // Add the new word to the word container if it's valid and doesn't exist
    if (newWord && !document.querySelector(`.word-item[data-word="${newWord}"]`)) {
        addNewWordToContainer(newWord);
    }
}

// Function to add a new word element to the container
function addNewWordToContainer(word) {
    console.log(`Adding new word: ${word}`);
    const wordEl = document.createElement('div');
    wordEl.classList.add(
        'word-item',
        'badge-primary',
        'shadow'
    );
    wordEl.textContent = word;
    wordEl.style.opacity = 0; // Start hidden for animation
    wordEl.dataset.word = word;
    wordEl.addEventListener('click', () => selectWord(wordEl));
    
    wordContainer.appendChild(wordEl);
    
    // Animated appearance with anime.js
    anime({
        targets: wordEl,
        opacity: 1,
        translateY: [20, 0],
        scale: [0.8, 1],
        delay: 100, // Small delay after result appears
        duration: 800,
        easing: 'easeOutExpo'
    });

    // Optionally add floating animation
    if (Math.random() > 0.7) { // Higher chance not to float for less movement
        setTimeout(() => {
            wordEl.classList.add('floating');
        }, 1000 + Math.random() * 1000);
    }
}

// Reset the application
function resetApp() {
    // Clear selected words
    SELECTED_WORDS.forEach(item => {
        if (item && item.element) {
            item.element.classList.remove('selected');
        }
    });
    SELECTED_WORDS.length = 0;
    
    // Reset slots
    updateSlots();
    
    // Hide result area cleanly
    resultContainer.classList.add('hidden');
    // Ensure internal parts are also reset/hidden
    resultContent.classList.add('hidden');
    const resultPulse = resultContainer.querySelector('.animate-pulse');
    if (resultPulse) resultPulse.classList.remove('hidden'); // Show loading state again

    // Clear current image area
    currentImageCard.classList.add('hidden');
    currentImage.classList.add('hidden');
    
    // Clear potential error messages
    const errorContent = resultContent.querySelector('.alert-error');
    if(errorContent){
        resultContent.innerHTML = ''; // Clear it
    }
    
    // Re-enable word selection if it was disabled
    wordContainer.style.pointerEvents = 'auto';
    wordContainer.style.opacity = '1';
}

// Function to refresh words
async function refreshWords() {
    // Only allow refresh if not currently blending
    if (wordContainer.style.pointerEvents === 'none') {
        return;
    }
    
    // Visual feedback - add spinning animation to button
    refreshWordsBtn.classList.add('animate-spin');
    refreshWordsBtn.disabled = true;
    
    try {
        // Clear selections first
        resetApp();
        
        // Show loading indicator
        wordContainer.innerHTML = `
            <div class="word-loading flex justify-center items-center w-full">
                <span class="loading loading-dots loading-md text-primary"></span>
            </div>
        `;
        
        // Fetch new words
        const words = await fetchWords();
        renderWords(words);
        
    } catch (error) {
        console.error('Failed to refresh words:', error);
        wordContainer.innerHTML = `
            <div class="alert alert-error shadow-lg text-sm">
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Failed to load new words.</span>
                </div>
            </div>
        `;
    } finally {
        // Remove spinning animation
        refreshWordsBtn.classList.remove('animate-spin');
        refreshWordsBtn.disabled = false;
    }
}

// Function to clear only the word selections without resetting the results
function clearSelectedWords() {
    // Clear selected words visually
    SELECTED_WORDS.forEach(item => {
        if (item && item.element) {
            item.element.classList.remove('selected');
        }
    });
    
    // Clear the array
    SELECTED_WORDS.length = 0;
    
    // Reset selection slots
    updateSlots();
}

// Add an image to gallery storage and update display
function addToGalleryStorage(imageData) {
    try {
        // Add to the beginning of the array (newest first)
        galleryImages.unshift(imageData);
        
        // Make sure we don't exceed the max
        if (galleryImages.length > MAX_GALLERY_IMAGES) {
            galleryImages = galleryImages.slice(0, MAX_GALLERY_IMAGES);
        }
        
        // Save to local storage
        saveGalleryToStorage();
        
        // Refresh the gallery display
        displayGalleryImages();
    } catch (error) {
        console.error('Error adding to gallery storage:', error);
    }
}

if (downloadImageBtn) {
    downloadImageBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const img = document.getElementById('modal-image');
        if (!img || !img.src) return;
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'word-blender-image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
} 