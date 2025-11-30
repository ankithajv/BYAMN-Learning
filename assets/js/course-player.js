// Course Player JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const userNameElement = document.getElementById('user-name');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const mainContent = document.getElementById('main-content');
    const errorMessage = document.getElementById('error-text');
    const lessonTitle = document.getElementById('lesson-title');
    const videoContainer = document.getElementById('video-container');
    const lessonDescription = document.getElementById('lesson-description');
    const certificateBtn = document.getElementById('certificate-btn');
    const markCompleteBtn = document.getElementById('mark-complete-btn');
    const nextLessonBtn = document.getElementById('next-lesson-btn');
    // Updated element references for new UI
    const progressPercent = document.getElementById('progress-percent-top'); // Changed from progress-percent
    const progressPercentTop = document.getElementById('progress-percent-top'); // This is the same now
    const progressPercentTopMain = document.getElementById('progress-percent-top-main');
    const lessonDuration = document.getElementById('lesson-duration');
    const progressBar = document.getElementById('progress-bar');
    const lessonsList = document.getElementById('lessons-list');
    const lessonsCount = document.getElementById('lessons-count');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Custom certificate name modal elements
    let certificateModal = null;
    let certificateNameInput = null;
    let certificateSaveBtn = null;
    let certificateSkipBtn = null;
    
    // State variables
    let currentUser = null;
    let currentCourse = null;
    let currentEnrollment = null;
    let currentLessonIndex = 0;
    let player = null; // YouTube player instance
    let watchStartTime = null;
    let watchedTime = 0;
    let minWatchTime = 0; // Minimum time required to watch (in seconds)
    let lessonStartTime = null; // For detailed analytics
    let totalLessonTime = 0; // Total time spent on current lesson
    let pauseStartTime = null; // Track when user paused
    let totalPauseTime = 0; // Total time paused
    
    // Video analytics tracking
    let videoEvents = {
        playEvents: 0,
        pauseEvents: 0,
        seekEvents: 0,
        playbackSpeedChanges: 0,
        maxPlaybackSpeed: 1.0,
        minPlaybackSpeed: 1.0
    };
    
    // Get course ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    
    // Check auth state
    firebaseServices.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user);
            currentUser = user;
            
            // Update user name in header
            if (userNameElement) {
                userNameElement.textContent = `Welcome, ${user.displayName || user.email}`;
            }
            
            // Initialize offline sync
            initializeOfflineSync();
            
            // Load course data
            if (courseId) {
                loadCourseData(user, courseId);
            } else {
                showError('Invalid course selected.');
            }
        } else {
            // User is signed out
            console.log('User is signed out');
            window.location.href = '../auth/login.html';
        }
    });
    
    // Initialize offline sync functionality
    function initializeOfflineSync() {
        // Add sync status indicator
        addSyncStatusIndicator();
        
        // Update sync status when connection changes
        if (window.offlineSyncManager) {
            // Listen for sync manager events
            setInterval(updateSyncStatusUI, 5000);
        }
    }
    
    // Add sync status indicator to the UI
    function addSyncStatusIndicator() {
        // Check if sync status already exists
        if (document.getElementById('sync-status')) return;
        
        const syncStatusHTML = `
            <div id="sync-status" class="fixed bottom-4 right-4 z-50">
                <div class="bg-white rounded-lg shadow-lg p-3 border border-gray-200">
                    <div class="flex items-center space-x-2">
                        <div id="sync-icon" class="w-3 h-3 rounded-full bg-green-500"></div>
                        <span id="sync-text" class="text-sm font-medium">Online</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', syncStatusHTML);
        updateSyncStatusUI();
    }
    
    // Update sync status UI based on connection state
    function updateSyncStatusUI() {
        const syncIcon = document.getElementById('sync-icon');
        const syncText = document.getElementById('sync-text');
        
        if (!syncIcon || !syncText) return;
        
        if (window.offlineSyncManager) {
            const status = window.offlineSyncManager.getSyncStatus();
            
            if (status.isOnline) {
                syncIcon.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse';
                syncText.textContent = 'Online';
            } else {
                syncIcon.className = 'w-3 h-3 rounded-full bg-yellow-500';
                syncText.textContent = 'Offline';
            }
        } else {
            // Fallback: check navigator.onLine
            if (navigator.onLine) {
                syncIcon.className = 'w-3 h-3 rounded-full bg-green-500';
                syncText.textContent = 'Online';
            } else {
                syncIcon.className = 'w-3 h-3 rounded-full bg-yellow-500';
                syncText.textContent = 'Offline';
            }
        }
    }
    
    // Load course data
    function loadCourseData(user, courseId) {
        // Show loading state
        showLoadingState();
        
        // Validate courseId
        if (typeof courseId !== 'string' || courseId.trim() === '') {
            showError('Invalid course selected.');
            return;
        }
        
        const trimmedCourseId = courseId.trim();
        
        try {
            // Fetch real course data from Firebase
            Promise.all([
                firebaseServices.getCourses(),
                firebaseServices.getUserEnrollments(user.uid)
            ])
            .then(([courses, enrollments]) => {
                console.log('Courses loaded:', courses);
                console.log('Enrollments loaded:', enrollments);
                
                // Find the course
                const courseData = courses.find(course => course.id === trimmedCourseId);
                
                if (courseData) {
                    console.log('Course found:', courseData);
                    currentCourse = courseData;
                    
                    // Validate course structure
                    if (!currentCourse.lessons || !Array.isArray(currentCourse.lessons)) {
                        showError('Course data is invalid or incomplete.');
                        return;
                    }
                    
                    // Log lesson structure for debugging
                    console.log('Lesson structure:', currentCourse.lessons.map((lesson, index) => ({
                        index,
                        id: lesson.id,
                        title: lesson.title,
                        minWatchTime: lesson.minWatchTime,
                        duration: lesson.duration
                    })));
                    
                    // Find or create enrollment
                    let enrollmentData = enrollments.find(enroll => enroll.courseId === trimmedCourseId);
                    
                    // If no enrollment exists, create one
                    if (!enrollmentData) {
                        console.log('No enrollment found, creating new enrollment');
                        return firebaseServices.enrollUserInCourse(user.uid, trimmedCourseId)
                            .then(newEnrollment => {
                                console.log('New enrollment created:', newEnrollment);
                                currentEnrollment = newEnrollment;
                                renderCourse();
                            })
                            .catch(error => {
                                console.error('Error creating enrollment:', error);
                                showError(`Error enrolling in course: ${error.message || 'Please try again later.'}`);
                            });
                    }
                    
                    console.log('Existing enrollment found:', enrollmentData);
                    currentEnrollment = enrollmentData;
                    
                    // Ensure completedLessons is an array
                    if (!currentEnrollment.completedLessons || !Array.isArray(currentEnrollment.completedLessons)) {
                        currentEnrollment.completedLessons = [];
                    }
                    
                    // Update last accessed time
                    updateLastAccessedTime();
                    
                    // Render the course
                    renderCourse();
                } else {
                    console.error('Course not found for ID:', trimmedCourseId);
                    showError('Course not found. Please check the course ID and try again.');
                }
            })
            .catch((error) => {
                console.error('Error loading course data:', error);
                showError(`Error loading course data: ${error.message || 'Please try again later.'}`);
            });
        } catch (err) {
            console.error('Error loading data:', err);
            showError(`Error loading course data: ${err.message || 'Please try again later.'}`);
        }
    }
    
    // Update last accessed time for the current enrollment
    function updateLastAccessedTime() {
        if (currentEnrollment && currentEnrollment.id) {
            const updatedData = {
                lastAccessed: new Date().toISOString()
            };
            
            // Update in Firebase
            const enrollmentRef = firebaseServices.ref('enrollments/' + currentEnrollment.id);
            enrollmentRef.update(updatedData)
                .then(() => {
                    console.log('Last accessed time updated successfully');
                    // Update local enrollment data
                    currentEnrollment = { ...currentEnrollment, ...updatedData };
                })
                .catch((error) => {
                    console.error('Error updating last accessed time:', error);
                });
        }
    }
    
    // Track lesson progress for analytics
    function trackLessonProgress(timeSpent, completed) {
        if (currentUser && currentCourse && currentEnrollment && currentLessonIndex < currentCourse.lessons.length) {
            const currentLesson = currentCourse.lessons[currentLessonIndex];
            
            // Update lesson analytics
            firebaseServices.updateLessonAnalytics(
                currentUser.uid,
                currentCourse.id,
                currentLesson.id,
                timeSpent,
                completed
            ).catch(error => {
                console.error('Error updating lesson analytics:', error);
            });
            
            // Update video analytics
            firebaseServices.updateVideoAnalytics(
                currentUser.uid,
                currentCourse.id,
                currentLesson.id,
                videoEvents
            ).catch(error => {
                console.error('Error updating video analytics:', error);
            });
        }
    }
    
    // Enhanced trackLearningActivity function
    async function trackLearningActivity(lessonId, courseId, duration = 0) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('No user logged in, skipping streak tracking');
                return;
            }

            // Initialize streak manager if not already done
            const streakManager = window.initializeStreakManager();
            
            // Wait for initialization if needed
            if (!streakManager.isInitialized) {
                await new Promise(resolve => {
                    const checkInit = setInterval(() => {
                        if (streakManager.isInitialized) {
                            clearInterval(checkInit);
                            resolve();
                        }
                    }, 100);
                    
                    // Timeout after 3 seconds
                    setTimeout(() => {
                        clearInterval(checkInit);
                        resolve();
                    }, 3000);
                });
            }
            
            // Record learning activity for streak tracking
            await streakManager.recordLearningActivity(duration);
            
            // Track challenge progress when lesson is completed
            if (typeof learningChallenges !== 'undefined') {
                learningChallenges.recordActivity('lesson_complete');
                
                // Also track daily streak
                const today = new Date().toDateString();
                const lastLessonDate = localStorage.getItem('last_lesson_date');
                
                if (lastLessonDate !== today) {
                    learningChallenges.recordActivity('daily_streak');
                    localStorage.setItem('last_lesson_date', today);
                }
            }
            
            console.log('Learning activity tracked for streak:', {
                lessonId,
                courseId,
                duration,
                streak: streakManager.currentStreak
            });

        } catch (error) {
            console.error('Error tracking learning activity:', error);
        }
    }

    // Mark current lesson as complete
    function markLessonComplete() {
        if (!currentEnrollment || !currentCourse || currentLessonIndex >= currentCourse.lessons.length) {
            return;
        }
        
        const currentLesson = currentCourse.lessons[currentLessonIndex];
        const lessonId = currentLesson.id;
        
        // Calculate progress percentage
        const totalLessons = currentCourse.lessons.length;
        const completedLessons = currentEnrollment.completedLessons || [];
        
        // Add current lesson to completed lessons if not already there
        let updatedCompletedLessons = [...completedLessons];
        if (!updatedCompletedLessons.includes(lessonId)) {
            updatedCompletedLessons.push(lessonId);
        }
        
        // Calculate new progress (0-100)
        const newProgress = Math.round((updatedCompletedLessons.length / totalLessons) * 100);
        
        // Update enrollment in Firebase
        firebaseServices.updateLessonProgress(currentEnrollment.id, lessonId, newProgress)
            .then(updatedEnrollment => {
                console.log('Lesson marked as complete:', updatedEnrollment);
                currentEnrollment = updatedEnrollment;
                
                // Track analytics
                const timeSpent = totalLessonTime;
                trackLessonProgress(timeSpent, true);
                
                // Track learning activity for streak
                trackLearningActivity(lessonId, currentCourse.id, timeSpent);
                
                // Check if course is completed
                if (newProgress === 100) {
                    markCourseComplete();
                }
                
                // Update UI
                updateProgressDisplay(newProgress);
                updateLessonNavigation();
                
                utils.showNotification('Lesson marked as complete!', 'success');
            })
            .catch(error => {
                console.error('Error marking lesson as complete:', error);
                utils.showNotification('Error marking lesson as complete: ' + error.message, 'error');
            });
    }
    
    // Mark course as complete
    function markCourseComplete() {
        if (currentUser && currentCourse) {
            // Update course completion analytics
            firebaseServices.updateCourseCompletionAnalytics(currentUser.uid, currentCourse.id)
                .then(() => {
                    console.log('Course completion analytics updated');
                    
                    // Show completion celebration
                    showCompletionCelebration();
                    
                    // Check for new achievements
                    checkForNewAchievements();
                })
                .catch(error => {
                    console.error('Error updating course completion analytics:', error);
                // Still show celebration even if analytics fail
                    showCompletionCelebration();
                });
        } else {
            // Fallback: show celebration even if user/course data is incomplete
            showCompletionCelebration();
        }
    }
    
    // Check for new achievements
    function checkForNewAchievements() {
        if (currentUser) {
            firebaseServices.getUserAchievements(currentUser.uid)
                .then(achievements => {
                    // Check if any new achievements were earned
                    const newlyEarned = achievements.filter(achievement => 
                        achievement.earned && !localStorage.getItem(`achievement_${achievement.id}_awarded`)
                    );
                    
                    if (newlyEarned.length > 0) {
                        // Award achievements
                        newlyEarned.forEach(achievement => {
                            firebaseServices.awardAchievement(currentUser.uid, achievement.id)
                                .then(() => {
                                    localStorage.setItem(`achievement_${achievement.id}_awarded`, 'true');
                                    utils.showNotification(`Congratulations! You've earned the "${achievement.name}" achievement!`, 'success');
                                })
                                .catch(error => {
                                    console.error('Error awarding achievement:', error);
                                });
                        });
                    }
                })
                .catch(error => {
                    console.error('Error checking for achievements:', error);
                });
        }
    }
    
    // Render the course
    function renderCourse() {
        // Hide loading state and show main content
        hideLoadingState();
        mainContent.classList.remove('hidden');
        
        // Render lessons list
        renderLessonsList();
        
        // Load the first lesson or the current lesson
        loadLesson(currentLessonIndex);
        
        // Check if course is completed and show certificate name modal if needed
        checkForCertificateName();
        
        // Show celebration if course is completed and user hasn't seen it
        if (currentEnrollment && currentEnrollment.progress === 100) {
            const hasSeenCelebration = localStorage.getItem(`celebration_shown_${currentCourse.id}`);
            if (!hasSeenCelebration) {
                setTimeout(() => {
                    showCompletionCelebration();
                    localStorage.setItem(`celebration_shown_${currentCourse.id}`, 'true');
                }, 1000);
            }
        }
    }
    
    // Render lessons list
    function renderLessonsList() {
        if (!currentCourse || !currentCourse.lessons) {
            console.warn('No course data available to render lessons list');
            return;
        }
        
        // Clear the lessons list
        lessonsList.innerHTML = '';
        
        // Update progress
        updateProgress();
        
        // Update lessons count
        lessonsCount.textContent = `${currentCourse.lessons.length} ${currentCourse.lessons.length === 1 ? 'lesson' : 'lessons'}`;
        
        // Add each lesson to the list
        currentCourse.lessons.forEach((lesson, index) => {
            // Use the correct lesson ID for tracking completion
            const lessonId = lesson.id; // Always use the 'id' field for tracking completion
            
            const lessonElement = document.createElement('div');
            lessonElement.className = `lesson-item ${currentLessonIndex === index ? 'active' : ''} ${currentEnrollment && Array.isArray(currentEnrollment.completedLessons) && currentEnrollment.completedLessons.includes(lessonId) ? 'completed' : ''}`;
            
            // Ensure lesson has required properties
            const lessonTitle = lesson.title || `Lesson ${index + 1}`;
            const lessonDuration = formatDuration(lesson.duration || 0);
            
            lessonElement.innerHTML = `
                <div class="lesson-number">${index + 1}</div>
                <div class="lesson-content">
                    <div class="lesson-name">${lessonTitle}</div>
                    <div class="lesson-meta">
                        <span>${lessonDuration}</span>
                    </div>
                </div>
                ${currentEnrollment && Array.isArray(currentEnrollment.completedLessons) && currentEnrollment.completedLessons.includes(lessonId) ? 
                    '<svg class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>' : ''}
            `;
            
            lessonElement.addEventListener('click', () => {
                loadLesson(index);
            });
            
            lessonsList.appendChild(lessonElement);
        });
    }
    
    // Load a specific lesson
    function loadLesson(index) {
        console.log('Loading lesson at index:', index);
        console.log('Current course:', currentCourse);
        console.log('Current enrollment:', currentEnrollment);
        
        // Stop any existing watch time tracking
        stopWatchTimeTracking();
        
        // Save current watched time and analytics before loading new lesson
        if (currentCourse && currentCourse.lessons && currentLessonIndex < currentCourse.lessons.length) {
            const currentLesson = currentCourse.lessons[currentLessonIndex];
            if (currentLesson) {
                saveWatchedTimeToLocalStorage(courseId, currentLesson.id, watchedTime);
                // Save detailed analytics
                if (lessonStartTime) {
                    const currentTime = new Date();
                    totalLessonTime = (currentTime - lessonStartTime) / 1000; // Convert to seconds
                    saveLessonAnalytics(courseId, currentLesson.id, totalLessonTime, watchedTime);
                }
            }
        }
        
        if (!currentCourse || !currentCourse.lessons || index < 0 || index >= currentCourse.lessons.length) {
            console.error('Invalid lesson index or missing course data');
            return;
        }
        
        // Update current lesson index
        currentLessonIndex = index;
        
        // Get the lesson
        const lesson = currentCourse.lessons[index];
        console.log('Loading lesson:', lesson);
        
        // Reset watch time tracking
        watchStartTime = null;
        watchedTime = 0;
        minWatchTime = lesson.minWatchTime || 0; // Get minimum watch time from lesson data
        
        // Reset detailed analytics tracking
        lessonStartTime = new Date(); // Start tracking when lesson loads
        totalLessonTime = 0;
        pauseStartTime = null;
        totalPauseTime = 0;
        
        // Reset video events tracking
        videoEvents = {
            playEvents: 0,
            pauseEvents: 0,
            seekEvents: 0,
            playbackSpeedChanges: 0,
            maxPlaybackSpeed: 1.0,
            minPlaybackSpeed: 1.0
        };
        
        console.log('Setting minWatchTime from lesson:', lesson.minWatchTime, 'Final minWatchTime:', minWatchTime);
        
        // Load saved watched time from localStorage
        const savedWatchedTime = loadWatchedTimeFromLocalStorage(courseId, lesson.id);
        if (savedWatchedTime > watchedTime) {
            watchedTime = savedWatchedTime;
        }
        
        console.log('Initial watched time for lesson:', watchedTime, 'Required:', minWatchTime);
        
        // Immediately update button visibility based on loaded watched time
        updateButtonVisibility(lesson);
        
        // Validate lesson data
        if (!lesson) {
            console.error('Lesson data is missing');
            lessonTitle.textContent = 'Lesson Not Found';
            lessonDescription.textContent = 'The requested lesson could not be found.';
            videoContainer.innerHTML = `
                <div class="video-placeholder">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p class="mt-4 text-gray-500">Lesson data not available</p>
                </div>
            `;
            markCompleteBtn.classList.add('hidden');
            nextLessonBtn.classList.add('hidden');
            return;
        }
        
        // Update UI
        lessonTitle.textContent = lesson.title || 'Untitled Lesson';
        
        // Set lesson description with HTML support
        if (lesson.description) {
            lessonDescription.innerHTML = lesson.description;
            // Ensure all links open in a new tab for better UX
            const links = lessonDescription.querySelectorAll('a');
            links.forEach(link => {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            });
        } else {
            lessonDescription.textContent = 'No description available for this lesson.';
        }
        
        lessonDuration.textContent = `Duration: ${formatDuration(lesson.duration || 0)}`;
        
        // Update progress percentage in the header
        if (progressPercentTopMain) {
            progressPercentTopMain.textContent = `${currentEnrollment.progress || 0}% Complete`;
        }
        
        // Update video container with actual YouTube video
        // Handle both 'id' and 'videoId' fields for compatibility
        const videoId = lesson.videoId || lesson.id;
        if (videoId) {
            // Create container for YouTube player
            videoContainer.innerHTML = `
                <div id="player-${videoId}" class="w-full h-full"></div>
            `;
            
            // Load YouTube iframe API if not already loaded
            if (typeof YT === 'undefined') {
                const tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                
                // Set up callback for when API is ready
                window.onYouTubeIframeAPIReady = function() {
                    createPlayer(videoId, lesson);
                };
            } else {
                createPlayer(videoId, lesson);
            }
        } else {
            videoContainer.innerHTML = `
                <div class="video-placeholder">
                    <div class="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-4"></div>
                    <p class="text-gray-500">No video available for ${lesson.title}</p>
                </div>
            `;
            // Update button visibility for lessons without video
            updateButtonVisibility(lesson);
        }
        
        // Set initial button state based on watched time
        // (already called above after loading saved time)
        
        // If the lesson already meets the time requirement, make sure the button is enabled
        if (minWatchTime > 0 && watchedTime >= minWatchTime) {
            markCompleteBtn.classList.remove('hidden');
            markCompleteBtn.disabled = false;
            markCompleteBtn.title = "Requirement met! Click to mark as complete";
            markCompleteBtn.onclick = () => markLessonCompleteWithOfflineSync(lesson.id);
            console.log('Button enabled on lesson load - time requirement already met');
        }
        
        // Re-render lessons list to update active lesson
        renderLessonsList();
        
        // Show certificate button and celebration if course is completed
        if (currentEnrollment && currentEnrollment.progress === 100) {
            certificateBtn.classList.remove('hidden');
            certificateBtn.href = `certificate.html?courseId=${currentCourse.id}`;
            
            // Optional: Show celebration when navigating to a completed course
            const hasSeenCelebration = localStorage.getItem(`celebration_shown_${currentCourse.id}`);
            if (!hasSeenCelebration) {
                setTimeout(() => {
                    showCompletionCelebration();
                    localStorage.setItem(`celebration_shown_${currentCourse.id}`, 'true');
                }, 1000);
            }
        }
    }
    
    // Create YouTube player
    function createPlayer(videoId, lesson) {
        // Destroy existing player if it exists
        if (player) {
            player.destroy();
        }
        
        player = new YT.Player(`player-${videoId}`, {
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'rel': 0,
                'modestbranding': 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
        
        // Add event listener for seek events
        let lastCurrentTime = 0;
        const seekCheckInterval = setInterval(() => {
            if (player && typeof player.getCurrentTime === 'function') {
                const currentTime = player.getCurrentTime();
                // Check if there's a significant jump in time (seek)
                if (Math.abs(currentTime - lastCurrentTime) > 5) { // More than 5 seconds difference
                    videoEvents.seekEvents++;
                    console.log('Seek detected. Total seeks:', videoEvents.seekEvents);
                }
                lastCurrentTime = currentTime;
            }
        }, 1000); // Check every second
        
        // Store interval ID to clear later if needed
        player.seekCheckInterval = seekCheckInterval;
    }
    
    // YouTube player ready event
    function onPlayerReady(event) {
        console.log('YouTube player is ready');
        // Update button visibility now that player is ready
        const lesson = currentCourse.lessons[currentLessonIndex];
        updateButtonVisibility(lesson);
        
        // Also check if we need to enable the button based on previously saved watch time
        if (minWatchTime > 0 && watchedTime >= minWatchTime) {
            markCompleteBtn.classList.remove('hidden');
            markCompleteBtn.disabled = false;
            markCompleteBtn.title = "Requirement met! Click to mark as complete";
            markCompleteBtn.onclick = () => markLessonCompleteWithOfflineSync(lesson.id);
            console.log('Button enabled on player ready - time requirement already met');
        }
        
        // Add event listener for playback rate changes
        if (player && typeof player.getPlaybackRate === 'function') {
            let lastPlaybackRate = player.getPlaybackRate();
            const rateCheckInterval = setInterval(() => {
                if (player && typeof player.getPlaybackRate === 'function') {
                    const currentRate = player.getPlaybackRate();
                    if (currentRate !== lastPlaybackRate) {
                        videoEvents.playbackSpeedChanges++;
                        videoEvents.maxPlaybackSpeed = Math.max(videoEvents.maxPlaybackSpeed, currentRate);
                        videoEvents.minPlaybackSpeed = Math.min(videoEvents.minPlaybackSpeed, currentRate);
                        lastPlaybackRate = currentRate;
                        console.log('Playback speed changed. Total changes:', videoEvents.playbackSpeedChanges, 
                                   'Min speed:', videoEvents.minPlaybackSpeed, 'Max speed:', videoEvents.maxPlaybackSpeed);
                    }
                }
            }, 1000); // Check every second
            
            // Store interval ID to clear later if needed
            player.rateCheckInterval = rateCheckInterval;
        }
    }
    
    // YouTube player state change event
    function onPlayerStateChange(event) {
        const lesson = currentCourse.lessons[currentLessonIndex];
        
        console.log('Player state changed:', event.data);
        console.log('Player states - UNSTARTED:', YT.PlayerState.UNSTARTED, 'ENDED:', YT.PlayerState.ENDED, 
                    'PLAYING:', YT.PlayerState.PLAYING, 'PAUSED:', YT.PlayerState.PAUSED, 
                    'BUFFERING:', YT.PlayerState.BUFFERING, 'CUED:', YT.PlayerState.CUED);
        
        if (event.data == YT.PlayerState.PLAYING) {
            // Video started playing
            watchStartTime = new Date();
            
            // Track when lesson started if not already tracked
            if (!lessonStartTime) {
                lessonStartTime = new Date();
            }
            
            // Track play event
            videoEvents.playEvents++;
            
            console.log('Video started playing at:', watchStartTime);
            
            // Start continuous tracking of watched time
            startWatchTimeTracking();
        } else if (event.data == YT.PlayerState.PAUSED) {
            // Video paused
            stopWatchTimeTracking();
            
            if (watchStartTime) {
                const endTime = new Date();
                const timeDiff = (endTime - watchStartTime) / 1000; // Convert to seconds
                watchedTime += timeDiff;
                watchStartTime = null;
                
                // Track pause time
                pauseStartTime = new Date();
                
                // Track pause event
                videoEvents.pauseEvents++;
                
                console.log('Video paused. Watched time so far:', watchedTime, 'seconds');
                
                // Save watched time to localStorage
                saveWatchedTimeToLocalStorage(courseId, lesson.id, watchedTime);
                
                // Update button visibility based on watched time
                updateButtonVisibility(lesson);
            }
        } else if (event.data == YT.PlayerState.ENDED) {
            // Video ended
            stopWatchTimeTracking();
            
            if (watchStartTime) {
                const endTime = new Date();
                const timeDiff = (endTime - watchStartTime) / 1000; // Convert to seconds
                watchedTime += timeDiff;
                watchStartTime = null;
                
                // Calculate total lesson time
                if (lessonStartTime) {
                    totalLessonTime = (endTime - lessonStartTime) / 1000; // Convert to seconds
                }
                
                console.log('Video ended. Total lesson time:', totalLessonTime, 'seconds. Watched time:', watchedTime, 'seconds');
                
                // Save watched time to localStorage
                saveWatchedTimeToLocalStorage(courseId, lesson.id, watchedTime);
                
                // Save detailed analytics
                saveLessonAnalytics(courseId, lesson.id, totalLessonTime, watchedTime);
                
                // Update button visibility based on watched time
                updateButtonVisibility(lesson);
            }
        } else {
            // For other states, just update the button visibility
            updateButtonVisibility(lesson);
        }
    }
    
    // Continuous watch time tracking
    let watchTimeInterval = null;
    
    function startWatchTimeTracking() {
        // Clear any existing interval
        if (watchTimeInterval) {
            clearInterval(watchTimeInterval);
        }
        
        // Update watched time every second while playing
        watchTimeInterval = setInterval(() => {
            if (watchStartTime && player && player.getPlayerState() === YT.PlayerState.PLAYING) {
                const currentTime = new Date();
                const timeDiff = (currentTime - watchStartTime) / 1000; // Convert to seconds
                const totalWatchedTime = watchedTime + timeDiff;
                
                // Update total lesson time
                if (lessonStartTime) {
                    totalLessonTime = (currentTime - lessonStartTime) / 1000; // Convert to seconds
                }
                
                // Update UI with current progress if needed
                const lesson = currentCourse.lessons[currentLessonIndex];
                if (minWatchTime > 0) {
                    // Update button visibility based on watched time
                    updateButtonVisibility(lesson);
                }
                
                // Save periodically to localStorage (every 10 seconds)
                if (Math.floor(totalWatchedTime) % 10 === 0) {
                    saveWatchedTimeToLocalStorage(courseId, lesson.id, totalWatchedTime);
                }
            }
        }, 1000); // Check every second
        
        console.log('Started watch time tracking');
    }
    
    function stopWatchTimeTracking() {
        if (watchTimeInterval) {
            clearInterval(watchTimeInterval);
            watchTimeInterval = null;
            console.log('Stopped watch time tracking');
        }
    }
    
    // Save watched time to localStorage
    function saveWatchedTimeToLocalStorage(courseId, lessonId, watchedTime) {
        try {
            const key = `course_${courseId}_lesson_${lessonId}_watchedTime`;
            localStorage.setItem(key, watchedTime.toString());
            console.log(`Saved watched time to localStorage: ${watchedTime} seconds for course ${courseId}, lesson ${lessonId}`);
        } catch (error) {
            console.error('Error saving watched time to localStorage:', error);
        }
    }
    
    // Load watched time from localStorage
    function loadWatchedTimeFromLocalStorage(courseId, lessonId) {
        try {
            const key = `course_${courseId}_lesson_${lessonId}_watchedTime`;
            const savedTime = localStorage.getItem(key);
            if (savedTime) {
                const parsedTime = parseFloat(savedTime);
                console.log(`Loaded watched time from localStorage: ${parsedTime} seconds for course ${courseId}, lesson ${lessonId}`);
                return isNaN(parsedTime) ? 0 : parsedTime;
            }
            return 0;
        } catch (error) {
            console.error('Error loading watched time from localStorage:', error);
            return 0;
        }
    }
    
    // Update button visibility based on lesson completion status and watch time
    function updateButtonVisibility(lesson) {
        // Hide all buttons initially
        certificateBtn.classList.add('hidden');
        markCompleteBtn.classList.add('hidden');
        nextLessonBtn.classList.add('hidden');
        
        console.log('Updating button visibility - watchedTime:', watchedTime, 'minWatchTime:', minWatchTime);
        
        if (currentEnrollment && currentEnrollment.progress === 100) {
            // Course completed - show certificate button
            certificateBtn.classList.remove('hidden');
            certificateBtn.href = `certificate.html?courseId=${currentCourse.id}`;
        } else if (currentEnrollment && Array.isArray(currentEnrollment.completedLessons) && !currentEnrollment.completedLessons.includes(lesson.id)) {
            // Lesson not completed - check if minimum watch time is required
            if (minWatchTime > 0) {
                // Calculate current total watched time (including currently playing time)
                let currentWatchedTime = watchedTime;
                if (watchStartTime) {
                    const currentTime = new Date();
                    const timeDiff = (currentTime - watchStartTime) / 1000; // Convert to seconds
                    currentWatchedTime += timeDiff;
                }
                
                console.log('Current watched time (seconds):', currentWatchedTime, 'Required (seconds):', minWatchTime);
                
                // Check if user has watched enough
                if (currentWatchedTime >= minWatchTime) {
                    // Minimum time requirement met - show mark as complete button
                    markCompleteBtn.classList.remove('hidden');
                    markCompleteBtn.disabled = false;
                    markCompleteBtn.title = "Requirement met! Click to mark as complete"; // Update tooltip
                    markCompleteBtn.onclick = () => markLessonCompleteWithOfflineSync(lesson.id);
                    console.log('Button enabled - time requirement met');
                } else {
                    // Minimum time requirement not met - disable button
                    markCompleteBtn.classList.remove('hidden');
                    markCompleteBtn.disabled = true;
                    const remainingTime = Math.ceil((minWatchTime - currentWatchedTime) / 60);
                    markCompleteBtn.title = remainingTime > 0 ? `Watch ${remainingTime} more minute${remainingTime !== 1 ? 's' : ''} to unlock` : "Almost there...";
                    markCompleteBtn.onclick = null;
                    console.log('Button disabled - time requirement not met yet. Need', Math.ceil(minWatchTime - currentWatchedTime), 'more seconds');
                }
            } else {
                // No minimum time requirement - show mark as complete button
                markCompleteBtn.classList.remove('hidden');
                markCompleteBtn.disabled = false;
                markCompleteBtn.title = "Click to mark as complete"; // Update tooltip
                markCompleteBtn.onclick = () => markLessonCompleteWithOfflineSync(lesson.id);
            }
            
            // Show next lesson button if not the last lesson
            if (currentLessonIndex < currentCourse.lessons.length - 1) {
                nextLessonBtn.classList.remove('hidden');
                nextLessonBtn.onclick = () => loadLesson(currentLessonIndex + 1);
            }
        } else {
            // Lesson already completed - show next lesson button if not the last lesson
            if (currentLessonIndex < currentCourse.lessons.length - 1) {
                nextLessonBtn.classList.remove('hidden');
                nextLessonBtn.onclick = () => loadLesson(currentLessonIndex + 1);
            }
            
            // If it's the last lesson and course is completed, show certificate button
            if (currentLessonIndex === currentCourse.lessons.length - 1 && currentEnrollment.progress === 100) {
                certificateBtn.classList.remove('hidden');
                certificateBtn.href = `certificate.html?courseId=${currentCourse.id}`;
            }
        }
    }
    
    // Mark lesson as complete with offline sync support
    async function markLessonCompleteWithOfflineSync(lessonId) {
        // Check if enrollment and completedLessons exist before using includes
        if (!currentEnrollment || !currentEnrollment.completedLessons || currentEnrollment.completedLessons.includes(lessonId)) return;
        
        // Get current lesson
        const lesson = currentCourse.lessons[currentLessonIndex];
        
        // Check if minimum watch time requirement is met
        if (minWatchTime > 0) {
            // Calculate current total watched time (including currently playing time)
            let currentWatchedTime = watchedTime;
            if (watchStartTime) {
                const currentTime = new Date();
                const timeDiff = (currentTime - watchStartTime) / 1000; // Convert to seconds
                currentWatchedTime += timeDiff;
            }
            
            if (currentWatchedTime < minWatchTime) {
                const remainingMinutes = Math.ceil((minWatchTime - currentWatchedTime) / 60);
                window.utils.showNotification(`You need to watch at least ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} to mark this lesson as complete. Please continue watching to unlock the completion button.`, 'error');
                return;
            }
        }
        
        // Stop watch time tracking
        stopWatchTimeTracking();
        
        // Show loading state on button
        const originalText = markCompleteBtn.innerHTML;
        markCompleteBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...';
        markCompleteBtn.disabled = true;
        
        try {
            // Use offline sync if available
            if (window.offlineSyncManager && currentUser) {
                await markLessonCompleteOffline(lessonId, totalLessonTime);
            } else {
                // Fallback to original method
                await markLessonCompleteOriginal(lessonId);
            }
            
        } catch (err) {
            console.error('Error marking lesson complete:', err);
            window.utils.showNotification(`Error marking lesson as complete: ${err.message || 'Please try again later.'} If this issue persists, please refresh the page.`, 'error');
            
            // Reset button
            markCompleteBtn.innerHTML = originalText;
            markCompleteBtn.disabled = false;
        }
    }
    
    // Mark lesson complete with offline sync support
    async function markLessonCompleteOffline(lessonId, timeSpent = 0) {
        try {
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            const progressData = {
                userId: currentUser.uid,
                courseId: courseId,
                lessonId: lessonId,
                progress: 100,
                timeSpent: timeSpent,
                timestamp: new Date().toISOString()
            };

            // Store progress locally immediately
            if (window.offlineSyncManager) {
                await window.offlineSyncManager.storeLocalProgress(
                    currentUser.uid, 
                    courseId, 
                    lessonId, 
                    100, 
                    timeSpent
                );
                
                // Queue for sync
                await window.offlineSyncManager.queueProgressUpdate(progressData);
            }

            // Track learning activity for streak with enhanced error handling
            await trackLearningActivity(lessonId, courseId, timeSpent);

            // Update UI immediately
            updateLessonUI(lessonId, true);
            
            // Clear saved watched time since lesson is now complete
            clearWatchedTimeFromLocalStorage(courseId, lessonId);
            
            // Update progress UI
            updateProgress();
            
            // Re-render lessons list
            renderLessonsList();
            
            // Load next lesson if available
            if (currentLessonIndex < (currentCourse?.lessons?.length || 0) - 1) {
                loadLesson(currentLessonIndex + 1);
            } else {
                // Last lesson - show certificate button if course is now complete
                if (currentEnrollment.progress === 100) {
                    certificateBtn.classList.remove('hidden');
                    certificateBtn.href = `certificate.html?courseId=${currentCourse.id}`;
                    markCompleteBtn.classList.add('hidden');
                    
                    // Check if we need to ask for certificate name
                    checkForCertificateName();
                    
                    // Show completion celebration
                    showCompletionCelebration();
                }
            }
            
            // Show success message with streak info
            if (window.utils && window.utils.showNotification) {
                const streakManager = window.streakManager;
                if (streakManager && streakManager.currentStreak > 1) {
                    window.utils.showNotification(
                        `Lesson completed! 🔥 ${streakManager.currentStreak}-day streak!`, 
                        'success'
                    );
                } else {
                    window.utils.showNotification('Lesson completed! Progress saved.', 'success');
                }
            }

        } catch (error) {
            console.error('Error marking lesson complete offline:', error);
            throw error;
        }
    }
    
    // Original mark lesson complete function (fallback)
    async function markLessonCompleteOriginal(lessonId) {
        const updatedCompletedLessons = [...(currentEnrollment.completedLessons || []), lessonId];
        const progress = Math.round((updatedCompletedLessons.length / (currentCourse?.lessons?.length || 1)) * 100);
        
        // Update enrollment in Firebase
        await firebaseServices.updateLessonProgress(currentEnrollment.id, lessonId, progress)
        .then((updatedEnrollment) => {
            // Update enrollment in state
            currentEnrollment = updatedEnrollment;
            
            // Track learning activity for streak with enhanced error handling
            trackLearningActivity(lessonId, currentCourse.id, totalLessonTime);
            
            // Clear saved watched time since lesson is now complete
            clearWatchedTimeFromLocalStorage(courseId, lessonId);
            
            // Update progress UI
            updateProgress();
            
            // Re-render lessons list
            renderLessonsList();
            
            // Load next lesson if available
            if (currentLessonIndex < (currentCourse?.lessons?.length || 0) - 1) {
                loadLesson(currentLessonIndex + 1);
            } else {
                // Last lesson - show certificate button if course is now complete
                if (progress === 100) {
                    certificateBtn.classList.remove('hidden');
                    certificateBtn.href = `certificate.html?courseId=${currentCourse.id}`;
                    markCompleteBtn.classList.add('hidden');
                                    
                    // Check if we need to ask for certificate name
                    checkForCertificateName();
                    
                    // Show completion celebration
                    showCompletionCelebration();
                }
            }
            
            // Show success notification with streak info
            if (window.utils && window.utils.showNotification) {
                const streakManager = window.streakManager;
                if (streakManager && streakManager.currentStreak > 1) {
                    window.utils.showNotification(
                        `Lesson completed! 🔥 ${streakManager.currentStreak}-day streak!`, 
                        'success'
                    );
                } else {
                    window.utils.showNotification('Lesson marked as complete! Great job on finishing this lesson.', 'success');
                }
            }
        })
        .catch((error) => {
            console.error('Error updating lesson progress:', error);
            throw error;
        });
    }
    
    // Update lesson UI after completion
    function updateLessonUI(lessonId, isCompleted) {
        // Update the lessons list to show completion status
        const lessonItems = document.querySelectorAll('.lesson-item');
        lessonItems.forEach(item => {
            if (item.querySelector('.lesson-name')?.textContent === currentCourse.lessons.find(l => l.id === lessonId)?.title) {
                if (isCompleted) {
                    item.classList.add('completed');
                } else {
                    item.classList.remove('completed');
                }
            }
        });
        
        // Update button states
        const lesson = currentCourse.lessons[currentLessonIndex];
        updateButtonVisibility(lesson);
    }
    
    // Clear watched time from localStorage when lesson is completed
    function clearWatchedTimeFromLocalStorage(courseId, lessonId) {
        try {
            const key = `course_${courseId}_lesson_${lessonId}_watchedTime`;
            localStorage.removeItem(key);
            console.log(`Cleared watched time from localStorage for course ${courseId}, lesson ${lessonId}`);
        } catch (error) {
            console.error('Error clearing watched time from localStorage:', error);
        }
    }

    // Save detailed lesson analytics to Firebase
    function saveLessonAnalytics(courseId, lessonId, totalTime, watchedTime) {
        if (currentUser && courseId && lessonId) {
            // Save to Firebase analytics
            firebaseServices.updateLessonAnalytics(
                currentUser.uid,
                courseId,
                lessonId,
                totalTime,
                watchedTime >= minWatchTime // completion status
            ).catch(error => {
                console.error('Error saving lesson analytics:', error);
            });
            
            // Save video analytics
            firebaseServices.updateVideoAnalytics(
                currentUser.uid,
                courseId,
                lessonId,
                videoEvents
            ).catch(error => {
                console.error('Error saving video analytics:', error);
            });
            
            // Also update user's overall analytics
            updateUserOverallAnalytics(courseId, lessonId, totalTime, watchedTime >= minWatchTime);
        }
    }
    
    // Update user's overall analytics
    function updateUserOverallAnalytics(courseId, lessonId, totalTime, isCompleted) {
        if (!currentUser || !courseId || !lessonId) return;
        
        // Get course data to determine category
        firebaseServices.getCourses()
            .then(courses => {
                const course = courses.find(c => c.id === courseId);
                if (!course) return;
                
                // Update user analytics with category information
                const { ref, get, update } = firebaseServices;
                const analyticsRef = ref(rtdb, `userAnalytics/${currentUser.uid}`);
                
                get(analyticsRef)
                    .then(snapshot => {
                        const analyticsData = snapshot.val() || {};
                        
                        // Update favorite categories
                        const category = course.category || 'General';
                        const favoriteCategories = analyticsData.favoriteCategories || {};
                        favoriteCategories[category] = (favoriteCategories[category] || 0) + 1;
                        
                        // Update learning streak
                        const today = new Date().toISOString().split('T')[0];
                        const lastActiveDate = analyticsData.lastActiveDate ? 
                            new Date(analyticsData.lastActiveDate).toISOString().split('T')[0] : null;
                        
                        let learningStreak = analyticsData.learningStreak || 0;
                        
                        // If this is the first activity of the day, update streak
                        if (lastActiveDate !== today) {
                            // Check if it's a consecutive day
                            if (lastActiveDate) {
                                const yesterday = new Date(today);
                                yesterday.setDate(yesterday.getDate() - 1);
                                const yesterdayStr = yesterday.toISOString().split('T')[0];
                                
                                if (lastActiveDate === yesterdayStr) {
                                    learningStreak += 1;
                                } else {
                                    // Reset streak if not consecutive
                                    learningStreak = 1;
                                }
                            } else {
                                // First time user is active
                                learningStreak = 1;
                            }
                        }
                        
                        // Prepare update data
                        const updateData = {
                            favoriteCategories: favoriteCategories,
                            learningStreak: learningStreak,
                            lastActiveDate: new Date().toISOString()
                        };
                        
                        // Update analytics in Firebase
                        update(analyticsRef, updateData)
                            .catch(error => {
                                console.error('Error updating user overall analytics:', error);
                            });
                    })
                    .catch(error => {
                        console.error('Error fetching user analytics:', error);
                    });
            })
            .catch(error => {
                console.error('Error fetching courses for analytics:', error);
            });
    }
    
    // Update progress tracking to include offline capability
    function updateLessonProgress(lessonId, progress, timeSpent = 0) {
        if (currentUser && courseId) {
            const progressData = {
                userId: currentUser.uid,
                courseId: courseId,
                lessonId: lessonId,
                progress: progress,
                timeSpent: timeSpent,
                timestamp: new Date().toISOString()
            };

            // Use offline sync manager if available
            if (window.offlineSyncManager) {
                window.offlineSyncManager.queueProgressUpdate(progressData);
            }
        }
    }
    
    // Get current course ID
    function getCurrentCourseId() {
        return courseId;
    }
    
    // Update progress UI
    function updateProgress() {
        if (!currentEnrollment) {
            console.warn('No enrollment data available to update progress');
            if (progressPercent) progressPercent.textContent = '0%';
            if (progressPercentTop) progressPercentTop.textContent = '0%';
            if (progressPercentTopMain) progressPercentTopMain.textContent = '0% Complete';
            if (progressBar) progressBar.style.width = '0%';
            return;
        }
        
        const progress = currentEnrollment.progress !== undefined && !isNaN(currentEnrollment.progress) ? currentEnrollment.progress : 0;
        if (progressPercent) progressPercent.textContent = `${progress}%`;
        if (progressPercentTop) progressPercentTop.textContent = `${progress}%`;
        if (progressPercentTopMain) progressPercentTopMain.textContent = `${progress}% Complete`;
        if (progressBar) progressBar.style.width = `${progress}%`;
    }
    
    // Format duration from seconds to HH:MM:SS or MM:SS format
    function formatDuration(seconds) {
        if (!seconds) return 'Duration';
        
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}h ${mins}m ${secs}s`;
        } else {
            return `${mins}m ${secs}s`;
        }
    }
    
    // Show loading state
    function showLoadingState() {
        if (loadingState) loadingState.classList.remove('hidden');
        if (errorState) errorState.classList.add('hidden');
        if (mainContent) mainContent.classList.add('hidden');
    }
    
    // Hide loading state
    function hideLoadingState() {
        if (loadingState) loadingState.classList.add('hidden');
    }
    
    // Show error state
    function showError(message) {
        hideLoadingState();
        if (errorMessage) errorMessage.textContent = message;
        if (errorState) errorState.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('hidden');
    }
    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebaseServices.signOut()
                .then(() => {
                    window.location.href = '../index.html';
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                    utils.showNotification('Logout failed: ' + error.message + '. Please try again.', 'error');
                });
        });
    }
    
    // Check if we need to ask for certificate name
    function checkForCertificateName() {
        // Only proceed if course is completed (100% progress)
        if (currentEnrollment && currentEnrollment.progress === 100) {
            // Check if we've already asked for certificate name
            const hasAskedForName = localStorage.getItem(`certificateNameAsked_${currentEnrollment.id}`);
            
            if (!hasAskedForName) {
                // Show the certificate name modal
                showCertificateNameModal();
                
                // Mark that we've asked for the name
                localStorage.setItem(`certificateNameAsked_${currentEnrollment.id}`, 'true');
            }
        }
    }
    
    // Show certificate name modal
    function showCertificateNameModal() {
        // Create modal if it doesn't exist
        if (!certificateModal) {
            createCertificateNameModal();
        }
        
        // Show the modal
        if (certificateModal) certificateModal.classList.remove('hidden');
        
        // Pre-fill with current display name if available
        if (currentUser && currentUser.displayName && certificateNameInput) {
            certificateNameInput.value = currentUser.displayName;
        } else if (currentUser && currentUser.email && certificateNameInput) {
            // Use email username as fallback
            certificateNameInput.value = currentUser.email.split('@')[0];
        }
    }
    
    // Create certificate name modal
    function createCertificateNameModal() {
        // Check if modal already exists in DOM
        const existingModal = document.getElementById('certificate-name-modal');
        if (existingModal) {
            // Remove existing modal to avoid duplicates
            existingModal.remove();
        }
        
        // Create modal HTML
        const modalHTML = `
            <div id="certificate-name-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Certificate Name</h3>
                    <p class="text-gray-600 mb-4">Please enter the name you want to appear on your certificate:</p>
                    
                    <input 
                        type="text" 
                        id="certificate-name-input" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter your name"
                        required
                    >
                    
                    <div class="mt-6 flex justify-end space-x-3">
                        <button 
                            id="certificate-skip-btn"
                            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            type="button"
                        >
                            Skip
                        </button>
                        <button 
                            id="certificate-save-btn"
                            class="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            type="button"
                        >
                            Save Name
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get modal elements
        certificateModal = document.getElementById('certificate-name-modal');
        certificateNameInput = document.getElementById('certificate-name-input');
        certificateSaveBtn = document.getElementById('certificate-save-btn');
        certificateSkipBtn = document.getElementById('certificate-skip-btn');
        
        // Add event listeners with proper error handling
        if (certificateSaveBtn) {
            certificateSaveBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                saveCertificateName();
            });
        }
        
        if (certificateSkipBtn) {
            certificateSkipBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeCertificateNameModal();
            });
        }
        
        // Close modal when clicking outside
        if (certificateModal) {
            certificateModal.addEventListener('click', function(e) {
                if (e.target === certificateModal) {
                    closeCertificateNameModal();
                }
            });
        }
        
        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && certificateModal && !certificateModal.classList.contains('hidden')) {
                closeCertificateNameModal();
            }
        });
    }
    
    // Save certificate name
    function saveCertificateName() {
        const name = certificateNameInput ? certificateNameInput.value.trim() : '';
        
        if (!name) {
            utils.showNotification('Please enter a name for your certificate. This name will appear on your completion certificate.', 'error');
            return;
        }
        
        // Update enrollment with custom certificate name
        if (currentEnrollment && currentEnrollment.id) {
            const enrollmentRef = firebaseServices.ref('enrollments/' + currentEnrollment.id);
            enrollmentRef.update({
                customCertificateName: name
            })
            .then(() => {
                utils.showNotification('Certificate name saved successfully! Your name will appear on your completion certificate.', 'success');
                // Update current enrollment data
                currentEnrollment.customCertificateName = name;
                closeCertificateNameModal();
            })
            .catch((error) => {
                console.error('Error saving certificate name:', error);
                utils.showNotification('Error saving certificate name: ' + error.message + '. Please try again.', 'error');
            });
        }
    }
    
    // Close certificate name modal
    function closeCertificateNameModal() {
        if (certificateModal) {
            certificateModal.classList.add('hidden');
        }
    }
    
    // Clean up when page is unloaded
    window.addEventListener('beforeunload', function() {
        stopWatchTimeTracking();
        
        // Clear intervals
        if (player && player.seekCheckInterval) {
            clearInterval(player.seekCheckInterval);
        }
        if (player && player.rateCheckInterval) {
            clearInterval(player.rateCheckInterval);
        }
        
        // Save current watched time
        if (currentCourse && currentCourse.lessons && currentLessonIndex < currentCourse.lessons.length) {
            const currentLesson = currentCourse.lessons[currentLessonIndex];
            if (currentLesson) {
                saveWatchedTimeToLocalStorage(courseId, currentLesson.id, watchedTime);
                // Save detailed analytics
                if (lessonStartTime) {
                    const currentTime = new Date();
                    totalLessonTime = (currentTime - lessonStartTime) / 1000; // Convert to seconds
                    saveLessonAnalytics(courseId, currentLesson.id, totalLessonTime, watchedTime);
                }
            }
        }
    });
});

// Add modal elements to global scope
let certificateModal = null;
let certificateNameInput = null;
let certificateSaveBtn = null;
let certificateSkipBtn = null;

// Completion Celebration Functions

// Add this function to your course-player.js file
function showCompletionCelebration() {
    // Create celebration container
    const celebrationContainer = document.createElement('div');
    celebrationContainer.className = 'completion-celebration';
    document.body.appendChild(celebrationContainer);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    document.body.appendChild(overlay);

    // Create confetti
    createConfetti(celebrationContainer);
    
    // Create fireworks
    createFireworks(celebrationContainer);
    
    // Create floating emojis
    createFloatingEmojis(celebrationContainer);
    
    // Show celebration message after a short delay
    setTimeout(() => {
        showCelebrationMessage();
    }, 1000);
    
    // Add progress bar celebration effect
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.classList.add('progress-celebration');
        setTimeout(() => {
            progressBar.classList.remove('progress-celebration');
        }, 2000);
    }
    
    // Show achievement badge if any new achievements
    setTimeout(() => {
        showAchievementBadge();
    }, 3000);
    
    // Auto-remove celebration after 8 seconds
    setTimeout(() => {
        cleanupCelebration(celebrationContainer, overlay);
    }, 8000);
}

// Confetti creation function
function createConfetti(container) {
    const confettiCount = 150;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Random positioning and animation delays
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        
        confetti.style.left = `${left}vw`;
        confetti.style.animationDelay = `${delay}s`;
        confetti.style.animationDuration = `${duration}s`;
        
        container.appendChild(confetti);
    }
}

// Fireworks creation function
function createFireworks(container) {
    const fireworkCount = 10;
    
    for (let i = 0; i < fireworkCount; i++) {
        setTimeout(() => {
            createFirework(container);
        }, i * 300);
    }
}

function createFirework(container) {
    const particles = 12;
    const centerX = 25 + Math.random() * 50;
    const centerY = 25 + Math.random() * 50;
    
    for (let i = 0; i < particles; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        
        const angle = (i / particles) * Math.PI * 2;
        const distance = 50 + Math.random() * 100;
        const xEnd = Math.cos(angle) * distance;
        const yEnd = Math.sin(angle) * distance;
        
        firework.style.setProperty('--x', `${centerX}vw`);
        firework.style.setProperty('--y', `${centerY}vh`);
        firework.style.setProperty('--x-end', `${xEnd}px`);
        firework.style.setProperty('--y-end', `${yEnd}px`);
        firework.style.background = getRandomColor();
        
        container.appendChild(firework);
        
        // Remove firework after animation
        setTimeout(() => {
            if (firework.parentNode) {
                firework.parentNode.removeChild(firework);
            }
        }, 1500);
    }
}

// Floating emojis creation function
function createFloatingEmojis(container) {
    const emojis = ['🎉', '🎊', '🥳', '🎓', '🏆', '⭐', '🚀', '💫', '👏', '🔥'];
    const emojiCount = 20;
    
    for (let i = 0; i < emojiCount; i++) {
        const emoji = document.createElement('div');
        emoji.className = 'floating-emoji';
        emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        
        emoji.style.left = `${left}vw`;
        emoji.style.animationDelay = `${delay}s`;
        emoji.style.animationDuration = `${duration}s`;
        emoji.style.fontSize = `${1 + Math.random() * 2}rem`;
        
        container.appendChild(emoji);
    }
}

// Celebration message function
function showCelebrationMessage() {
    const message = document.createElement('div');
    message.className = 'celebration-message';
    message.innerHTML = `
        <button class="close-celebration" onclick="this.parentElement.remove()">×</button>
        <h2>🎓 Course Completed! 🎓</h2>
        <p>Congratulations! You've successfully completed the course!</p>
        <div class="celebration-actions">
            <button class="celebration-btn primary" onclick="viewCertificate()">View Certificate</button>
            <button class="celebration-btn secondary" onclick="this.closest('.celebration-message').remove()">Continue Learning</button>
        </div>
    `;
    
    document.body.appendChild(message);
    
    // Add click outside to close
    message.addEventListener('click', (e) => {
        if (e.target === message) {
            message.remove();
        }
    });
}

// Achievement badge function
function showAchievementBadge() {
    const achievements = [
        { icon: '🏆', title: 'Course Master', description: 'Completed your first course!' },
        { icon: '⚡', title: 'Fast Learner', description: 'Finished course ahead of time' },
        { icon: '💪', title: 'Dedicated Learner', description: 'Perfect attendance streak' }
    ];
    
    const randomAchievement = achievements[Math.floor(Math.random() * achievements.length)];
    
    const badge = document.createElement('div');
    badge.className = 'achievement-badge';
    badge.innerHTML = `
        <div class="badge-icon">${randomAchievement.icon}</div>
        <div class="badge-content">
            <h4>${randomAchievement.title}</h4>
            <p>${randomAchievement.description}</p>
        </div>
    `;
    
    document.body.appendChild(badge);
    
    // Auto-remove badge after 5 seconds
    setTimeout(() => {
        if (badge.parentNode) {
            badge.remove();
        }
    }, 5000);
}

// Helper function for random colors
function getRandomColor() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Cleanup function
function cleanupCelebration(container, overlay) {
    if (container && container.parentNode) {
        container.parentNode.removeChild(container);
    }
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
    
    // Remove any remaining celebration messages
    const messages = document.querySelectorAll('.celebration-message, .achievement-badge');
    messages.forEach(element => {
        if (element.parentNode) {
            element.remove();
        }
    });
}

// View certificate function
function viewCertificate() {
    const courseId = new URLSearchParams(window.location.search).get('courseId');
    if (courseId) {
        window.location.href = `certificate.html?courseId=${courseId}`;
    }
}

// Global function for closing celebration
window.closeCelebration = function() {
    const elements = document.querySelectorAll('.completion-celebration, .celebration-overlay, .celebration-message, .achievement-badge');
    elements.forEach(element => {
        if (element.parentNode) {
            element.remove();
        }
    });
};

// Update the markLessonComplete function to include streak tracking
async function markLessonComplete(lessonId, courseId, timeSpent = 0) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Track learning activity for streak with enhanced error handling
        await trackLearningActivity(lessonId, courseId, timeSpent);

        // Rest of existing markLessonComplete code...
        const progressData = {
            userId: user.uid,
            courseId: courseId,
            lessonId: lessonId,
            progress: 100,
            timeSpent: timeSpent,
            timestamp: new Date().toISOString()
        };

        // Store progress locally immediately
        if (window.offlineSyncManager) {
            await window.offlineSyncManager.storeLocalProgress(
                user.uid, 
                courseId, 
                lessonId, 
                100, 
                timeSpent
            );
            
            // Queue for sync
            await window.offlineSyncManager.queueProgressUpdate(progressData);
        }

        // Update UI immediately
        updateLessonUI(lessonId, true);
        
        // Show success message with streak info
        if (window.utils && window.utils.showNotification) {
            const streakManager = window.streakManager;
            if (streakManager && streakManager.currentStreak > 1) {
                window.utils.showNotification(
                    `Lesson completed! 🔥 ${streakManager.currentStreak}-day streak!`, 
                    'success'
                );
            } else {
                window.utils.showNotification('Lesson completed! Progress saved.', 'success');
            }
        }

    } catch (error) {
        console.error('Error marking lesson complete:', error);
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('Error saving progress. Please check your connection.', 'error');
        }
    }
}