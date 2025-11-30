// Student Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const userNameElement = document.getElementById('user-name');
    const enrolledCountElement = document.getElementById('enrolled-count');
    const completedCountElement = document.getElementById('completed-count');
    const inProgressCountElement = document.getElementById('in-progress-count');
    const certificatesCountElement = document.getElementById('certificates-count');
    const coursesContainer = document.getElementById('courses-container');
    const logoutBtn = document.getElementById('logout-btn');
    const progressChartContainer = document.getElementById('progress-chart-container');
    const categoryChartContainer = document.getElementById('category-chart-container');
    
    // New analytics elements
    const studyTimeElement = document.getElementById('study-time');
    const lessonsCompletedElement = document.getElementById('lessons-completed');
    const learningStreakElement = document.getElementById('learning-streak');
    const favoriteCategoryElement = document.getElementById('favorite-category');
    const studyTimeChartContainer = document.getElementById('study-time-chart-container');
    const activityChartContainer = document.getElementById('activity-chart-container');
    const streakChartContainer = document.getElementById('streak-chart-container');
    
    // Achievements element
    const achievementsContainer = document.getElementById('achievements-container');
    
    // Bookmarks elements
    const bookmarkedCoursesContainer = document.getElementById('bookmarked-courses-container');
    const bookmarksSection = document.getElementById('bookmarks-section');
    const bookmarksCountElement = document.getElementById('bookmarks-count');
    
    // Store bookmarked courses
    let bookmarkedCourses = [];
    let allCourses = [];
    let categoryMap = {};

    // Initialize streak system
    let streakManager = null;

    // Initialize Learning Challenges system
    function initializeLearningChallenges() {
        if (typeof learningChallenges !== 'undefined') {
            console.log('Learning challenges system initialized');
            
            // Listen for course enrollment events
            document.addEventListener('courseEnrolled', function(event) {
                learningChallenges.recordActivity('course_enroll');
                refreshChallenges();
            });
            
            // Listen for lesson completion events
            document.addEventListener('lessonCompleted', function(event) {
                learningChallenges.recordActivity('lesson_complete');
                refreshChallenges();
            });
            
            // Listen for study session events
            document.addEventListener('studySessionCompleted', function(event) {
                learningChallenges.recordActivity('study_session');
                refreshChallenges();
            });
        }
    }

    // Refresh challenges when user completes actions
    function refreshChallenges() {
        if (typeof learningChallenges !== 'undefined') {
            learningChallenges.refreshDisplay();
        }
    }

    // Enhanced streak initialization in dashboard
    async function initializeStreakSystem() {
        const user = firebaseServices.auth.currentUser;
        if (!user) return;

        try {
            // Initialize streak manager
            streakManager = window.initializeStreakManager();
            
            // Wait for streak data to load
            const checkStreakReady = setInterval(() => {
                if (streakManager && streakManager.isInitialized) {
                    clearInterval(checkStreakReady);
                    displayStreakOnDashboard(streakManager);
                    displayWeeklyLearningPattern(streakManager);
                    updateStreakAnalytics(streakManager);
                }
            }, 500);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkStreakReady);
                if (streakManager) {
                    displayStreakOnDashboard(streakManager);
                }
            }, 5000);

        } catch (error) {
            console.error('Error initializing streak system:', error);
            // Show basic streak section even if initialization fails
            createBasicStreakSection();
        }
    }

    // Display streak counter on dashboard
    function displayStreakOnDashboard(streakManager) {
        // Remove existing streak sections to avoid duplicates
        const existingStreakSections = document.querySelectorAll('[id*="streak"], .streak-section');
        existingStreakSections.forEach(section => section.remove());

        const statsGrid = document.querySelector('.stats-grid') || 
                         document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4.gap-6');
        
        if (!statsGrid) {
            console.log('Stats grid not found, creating dedicated streak section');
            createStreakSection(streakManager);
            return;
        }

        const streakStats = streakManager.getStreakStats();
        const weeklyPattern = streakManager.getWeeklyPattern();
        const learnedThisWeek = weeklyPattern.filter(day => day.learned).length;
        
        const streakHTML = `
            <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 hover-lift streak-card">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center">
                        <div class="p-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 streak-flame">
                            <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-semibold text-gray-900">Learning Streak</h3>
                            <p class="text-2xl font-bold text-orange-600">${streakStats.currentStreak} days</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">Longest</p>
                        <p class="text-lg font-semibold text-gray-700">${streakStats.longestStreak} days</p>
                    </div>
                </div>
                
                <!-- Weekly Progress -->
                <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-2">
                        <span>This Week</span>
                        <span>${learnedThisWeek}/7 days</span>
                    </div>
                    <div class="flex gap-1">
                        ${weeklyPattern.map(day => `
                            <div class="flex-1 text-center">
                                <div class="h-2 rounded-full mb-1 ${day.learned ? 'bg-green-500' : 'bg-gray-200'}"></div>
                                <div class="text-xs text-gray-500">${day.day.charAt(0)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${streakStats.currentStreak > 0 ? `
                <div class="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p class="text-sm text-orange-800 text-center">
                        ${streakManager.getMotivationalMessage()}
                    </p>
                </div>
                ` : `
                <div class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p class="text-sm text-blue-800 text-center">
                        Complete a lesson today to start your learning streak! 🎯
                    </p>
                </div>
                `}
            </div>
        `;

        // Insert streak card at the beginning of stats grid
        statsGrid.insertAdjacentHTML('afterbegin', streakHTML);
    }

    // Create dedicated streak section if stats grid doesn't exist
    function createStreakSection(streakManager) {
        const dashboardContainer = document.querySelector('main') || 
                                  document.getElementById('courses-container')?.parentElement;
        
        if (!dashboardContainer) return;

        const streakStats = streakManager.getStreakStats();
        const weeklyPattern = streakManager.getWeeklyPattern();
        const learnedThisWeek = weeklyPattern.filter(day => day.learned).length;
        const streakProgress = streakManager.getStreakProgress();
        const nextMilestone = streakManager.getNextMilestone();

        const streakSectionHTML = `
            <div class="mb-8 streak-section">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Streak Card -->
                    <div class="bg-white rounded-xl shadow-md p-6 hover-lift">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-xl font-bold text-gray-900">Learning Streak</h2>
                            <div class="flex items-center space-x-2">
                                <div class="p-2 rounded-lg bg-orange-100 streak-flame">
                                    <svg class="h-5 w-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/>
                                    </svg>
                                </div>
                                <span class="text-2xl font-bold text-orange-600">${streakStats.currentStreak}</span>
                            </div>
                        </div>
                        
                        <!-- Progress to next milestone -->
                        ${nextMilestone > streakStats.currentStreak ? `
                        <div class="mb-4">
                            <div class="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progress to ${nextMilestone} days</span>
                                <span>${streakProgress}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-orange-500 h-2 rounded-full transition-all duration-500" style="width: ${streakProgress}%"></div>
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Current Streak</span>
                                <span class="font-semibold">${streakStats.currentStreak} days</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Longest Streak</span>
                                <span class="font-semibold">${streakStats.longestStreak} days</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Total Learning Days</span>
                                <span class="font-semibold">${streakStats.totalLearningDays}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">Learned This Week</span>
                                <span class="font-semibold">${learnedThisWeek}/7 days</span>
                            </div>
                        </div>

                        ${streakStats.currentStreak > 0 ? `
                        <div class="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                            <p class="text-sm text-orange-800 text-center">
                                <strong>🔥 Streak Motivation:</strong><br>
                                ${streakManager.getMotivationalMessage()}
                            </p>
                        </div>
                        ` : `
                        <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p class="text-sm text-blue-800 text-center">
                                <strong>🎯 Start Your Streak!</strong><br>
                                Complete a lesson today to start your learning streak!
                            </p>
                        </div>
                        `}
                    </div>

                    <!-- Weekly Pattern -->
                    <div class="bg-white rounded-xl shadow-md p-6 hover-lift">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">This Week's Learning</h3>
                        <div class="space-y-3">
                            ${weeklyPattern.map(day => `
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-medium text-gray-600 w-8">${day.day}</span>
                                    <div class="flex-1 mx-2">
                                        <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div class="h-full ${day.learned ? 'bg-green-500' : 'bg-gray-300'} rounded-full transition-all duration-500" 
                                                 style="width: ${day.learned ? '100%' : '0%'}"></div>
                                        </div>
                                    </div>
                                    <span class="text-xs text-gray-500 w-16 text-right">
                                        ${day.learned ? 
                                            `${day.lessonsCompleted} lesson${day.lessonsCompleted !== 1 ? 's' : ''}` : 
                                            '—'
                                        }
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="mt-4 pt-4 border-t border-gray-200">
                            <div class="flex justify-between text-sm text-gray-600">
                                <span>Weekly Consistency</span>
                                <span class="font-semibold">${learnedThisWeek}/7 days</span>
                            </div>
                            <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-green-500 h-2 rounded-full transition-all duration-500" style="width: ${(learnedThisWeek / 7) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert at the beginning of dashboard content
        const firstChild = dashboardContainer.firstElementChild;
        if (firstChild) {
            firstChild.insertAdjacentHTML('beforebegin', streakSectionHTML);
        } else {
            dashboardContainer.insertAdjacentHTML('afterbegin', streakSectionHTML);
        }
    }

    // Create basic streak section if initialization fails
    function createBasicStreakSection() {
        const dashboardContainer = document.querySelector('main') || 
                                  document.getElementById('courses-container')?.parentElement;
        
        if (!dashboardContainer) return;

        const basicStreakHTML = `
            <div class="mb-8 streak-section">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-bold text-gray-900">Learning Streak</h2>
                            <p class="text-gray-600">Start learning to build your streak!</p>
                        </div>
                        <div class="p-3 rounded-lg bg-gray-100">
                            <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const firstChild = dashboardContainer.firstElementChild;
        if (firstChild) {
            firstChild.insertAdjacentHTML('beforebegin', basicStreakHTML);
        } else {
            dashboardContainer.insertAdjacentHTML('afterbegin', basicStreakHTML);
        }
    }

    // Update streak analytics in the analytics section
    function updateStreakAnalytics(streakManager) {
        const learningStreakElement = document.getElementById('learning-streak');
        if (learningStreakElement && streakManager) {
            const streakStats = streakManager.getStreakStats();
            learningStreakElement.textContent = streakStats.currentStreak;
        }
    }

    // Display weekly learning pattern in analytics
    function displayWeeklyLearningPattern(streakManager) {
        // This is handled in the streak section creation
    }

    // Load bookmarked courses
    function loadBookmarkedCourses(userId) {
        // Load from localStorage first (for immediate UI update)
        loadBookmarksFromLocalStorage();
        
        // Then load from Firebase for logged-in users
        if (userId && userId !== 'anonymous') {
            firebaseServices.getUserBookmarks(userId)
                .then(bookmarks => {
                    bookmarkedCourses = bookmarks;
                    renderBookmarkedCourses();
                    updateBookmarksCount();
                })
                .catch(error => {
                    console.error('Error loading bookmarks from Firebase:', error);
                    // Fallback to localStorage
                    loadBookmarksFromLocalStorage();
                });
        } else {
            renderBookmarkedCourses();
            updateBookmarksCount();
        }
    }

    // Load bookmarks from localStorage
    function loadBookmarksFromLocalStorage() {
        try {
            const saved = localStorage.getItem('bookmarkedCourses');
            if (saved) {
                const courseIds = JSON.parse(saved);
                // Convert to bookmark objects format
                bookmarkedCourses = courseIds.map(courseId => ({
                    courseId: courseId,
                    savedAt: new Date().toISOString()
                }));
            }
        } catch (error) {
            console.error('Error loading bookmarks from localStorage:', error);
            bookmarkedCourses = [];
        }
    }

    // Render bookmarked courses
    function renderBookmarkedCourses() {
        if (!bookmarkedCoursesContainer) return;

        if (bookmarkedCourses.length === 0) {
            bookmarkedCoursesContainer.innerHTML = `
                <div class="text-center py-12 col-span-full">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">No bookmarked courses</h3>
                    <p class="mt-2 text-gray-500">Save courses you're interested in for later.</p>
                    <div class="mt-6">
                        <a href="../courses.html" class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 inline-flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            Browse Courses
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        // Get course details for bookmarked courses
        const bookmarkedCourseDetails = bookmarkedCourses
            .map(bookmark => {
                const course = allCourses.find(c => c.id === bookmark.courseId);
                return course ? { ...course, savedAt: bookmark.savedAt } : null;
            })
            .filter(course => course !== null);

        if (bookmarkedCourseDetails.length === 0) {
            bookmarkedCoursesContainer.innerHTML = `
                <div class="text-center py-12 col-span-full">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">Bookmarked courses not found</h3>
                    <p class="mt-2 text-gray-500">The courses you bookmarked may have been removed.</p>
                </div>
            `;
            return;
        }

        let bookmarksHTML = '';
        bookmarkedCourseDetails.forEach(course => {
            const categoryName = categoryMap[course.category] || course.category || 'General';
            const savedDate = new Date(course.savedAt).toLocaleDateString();

            bookmarksHTML += `
                <div class="bg-white rounded-xl shadow-md overflow-hidden hover-lift transition-all duration-300 course-card relative">
                    <!-- Bookmark Button -->
                    <button class="bookmark-btn bookmarked absolute top-4 right-4 z-10" 
                            data-course-id="${course.id}"
                            title="Remove from bookmarks">
                        <svg class="h-6 w-6 bookmark-icon" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                    
                    <div class="h-48 overflow-hidden">
                        <img 
                            src="${course.thumbnail}" 
                            alt="${course.title}" 
                            class="w-full h-full object-cover"
                            loading="lazy"
                            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxMyIgcng9IjIiLz48cG9seWxpbmUgcG9pbnRzPSIxIDIwIDggMTMgMTMgMTgiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAyMCAxNi41IDE1LjUgMTQgMTgiLz48bGluZSB4MT0iOSIgeDI9IjkiIHkxPSI5IiB5Mj0iOSIvPjwvc3ZnPg==';"
                        >
                    </div>
                    
                    <div class="p-6">
                        <div class="flex justify-between items-start">
                            <h3 class="text-xl font-bold text-gray-900 line-clamp-2">
                                ${course.title}
                            </h3>
                        </div>
                        
                        <p class="mt-2 text-sm text-gray-500">
                            ${categoryName} • ${course.difficulty || 'Beginner'}
                        </p>
                        
                        <p class="mt-3 text-gray-600 line-clamp-2">
                            ${course.description ? course.description.substring(0, 100) + '...' : 'No description available'}
                        </p>
                        
                        <div class="mt-4 flex flex-wrap gap-2">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                ${course.lessons ? course.lessons.length : 0} lessons
                            </span>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Saved on ${savedDate}
                            </span>
                        </div>
                        
                        <div class="mt-6 flex space-x-3">
                            <a 
                                href="../player.html?courseId=${course.id}" 
                                class="flex-1 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 text-center"
                            >
                                Start Learning
                            </a>
                            <button class="remove-bookmark-btn px-4 py-2 rounded-md border border-red-300 text-red-700 font-medium hover:bg-red-50 transition duration-300 flex items-center justify-center"
                                    data-course-id="${course.id}">
                                <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        bookmarkedCoursesContainer.innerHTML = bookmarksHTML;

        // Add event listeners to bookmark buttons
        document.querySelectorAll('.bookmark-btn, .remove-bookmark-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const courseId = this.getAttribute('data-course-id');
                toggleBookmark(courseId);
            });
        });
    }

    // Toggle bookmark for a course
    function toggleBookmark(courseId) {
        const user = firebaseServices.auth.currentUser;
        const userId = user ? user.uid : 'anonymous';
        
        const isBookmarked = bookmarkedCourses.some(bookmark => bookmark.courseId === courseId);
        
        if (isBookmarked) {
            // Remove bookmark
            bookmarkedCourses = bookmarkedCourses.filter(bookmark => bookmark.courseId !== courseId);
            if (user) {
                firebaseServices.removeBookmark(userId, courseId).catch(error => {
                    console.error('Error removing bookmark from Firebase:', error);
                });
            }
        } else {
            // Add bookmark
            bookmarkedCourses.push({
                courseId: courseId,
                savedAt: new Date().toISOString()
            });
            if (user) {
                firebaseServices.saveBookmark(userId, courseId, new Date().toISOString()).catch(error => {
                    console.error('Error saving bookmark to Firebase:', error);
                });
            }
        }
        
        // Update localStorage
        try {
            const courseIds = bookmarkedCourses.map(bookmark => bookmark.courseId);
            localStorage.setItem('bookmarkedCourses', JSON.stringify(courseIds));
        } catch (error) {
            console.error('Error saving bookmarks to localStorage:', error);
        }
        
        renderBookmarkedCourses();
        updateBookmarksCount();
        
        // Show notification
        const action = isBookmarked ? 'removed from' : 'saved to';
        utils.showNotification(`Course ${action} bookmarks`, 'success');
        
        // Record challenge activity for bookmarking
        if (typeof learningChallenges !== 'undefined') {
            learningChallenges.recordActivity('bookmark_add');
            refreshChallenges();
        }
    }

    // Update bookmarks count
    function updateBookmarksCount() {
        if (bookmarksCountElement) {
            bookmarksCountElement.textContent = bookmarkedCourses.length;
        }
        
        // Show/hide bookmarks section based on whether there are bookmarks
        if (bookmarksSection) {
            if (bookmarkedCourses.length > 0) {
                bookmarksSection.style.display = 'block';
            } else {
                bookmarksSection.style.display = 'none';
            }
        }
    }

    // Function to load and display offline progress
    async function loadOfflineProgress() {
        const user = firebaseServices.auth.currentUser;
        if (!user || !window.offlineSyncManager) return;

        try {
            // Get pending sync items count
            const pendingItems = await window.offlineSyncManager.getPendingSyncItems();
            
            if (pendingItems.length > 0) {
                // Add offline progress section to dashboard
                addOfflineProgressSection(pendingItems.length);
            }
        } catch (error) {
            console.error('Error loading offline progress:', error);
        }
    }

    // Add offline progress section to dashboard
    function addOfflineProgressSection(pendingCount) {
        const dashboardContainer = document.getElementById('courses-container');
        if (!dashboardContainer) return;

        const offlineProgressHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                <div class="flex items-center">
                    <svg class="h-6 w-6 text-yellow-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <h3 class="text-lg font-semibold text-yellow-800">Offline Progress Pending</h3>
                        <p class="text-yellow-700">
                            You have ${pendingCount} progress update(s) waiting to sync. 
                            They will be automatically uploaded when you're back online.
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Insert at the beginning of the courses container
        dashboardContainer.insertAdjacentHTML('afterbegin', offlineProgressHTML);
    }

    // Check auth state
    firebaseServices.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user);
            
            // Update user name in header
            if (userNameElement) {
                userNameElement.textContent = `Welcome, ${user.displayName || user.email}`;
            }
            
            // Load user's enrollments and bookmarks
            loadUserEnrollments(user.uid);
            loadBookmarkedCourses(user.uid);
            
            // Load offline progress
            loadOfflineProgress();
            
            // Initialize streak system
            initializeStreakSystem();
            
            // Initialize Learning Challenges system
            initializeLearningChallenges();
        } else {
            // User is signed out
            console.log('User is signed out');
            window.location.href = '../auth/login.html';
        }
    });
    
    // Load user's enrollments
    function loadUserEnrollments(userId) {
        // Show loading state
        if (coursesContainer) {
            coursesContainer.innerHTML = '<div class="text-center py-12 col-span-full"><svg class="animate-spin mx-auto h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="mt-4 text-gray-600">Loading your courses...</p></div>';
        }
        
        // Fetch real data from Firebase
        Promise.all([
            firebaseServices.getCourses(),
            firebaseServices.getUserEnrollments(userId),
            firebaseServices.getCategories(), // Also fetch categories to map IDs to names
            firebaseServices.getUserAnalytics(userId), // Fetch user analytics
            firebaseServices.getUserRecommendationInteractions(userId), // Fetch recommendation interactions
            firebaseServices.getLearningPatterns(userId), // Fetch learning patterns
            firebaseServices.getUserEngagementScore(userId) // Fetch engagement score
        ])
        .then(([courses, userEnrollments, categories, userAnalytics, recommendationInteractions, learningPatterns, engagementScore]) => {
            // Store all courses and category map for bookmarks
            allCourses = courses;
            
            // Create a map of category IDs to names
            categoryMap = {};
            categories.forEach(category => {
                categoryMap[category.id] = category.name;
            });
            
            // Update stats
            updateStats(userEnrollments);
            
            // Update analytics stats
            updateAnalyticsStats(userAnalytics);
            
            // Render courses
            renderCourses(userEnrollments, courses, categoryMap);
            
            // Render charts
            renderCharts(userEnrollments, courses, categoryMap);
            
            // Render analytics charts
            renderAnalyticsCharts(userAnalytics);
            
            // Render learning patterns analysis
            renderLearningPatterns(learningPatterns, engagementScore);
            
            // Render achievements
            firebaseServices.getUserAchievements(userId).then(achievements => {
                renderAchievements(achievements);
            }).catch(error => {
                console.error('Error loading achievements:', error);
            });
            
            // Render recommendations with interactions data
            renderRecommendations(
                getCourseRecommendations(userEnrollments, courses, userAnalytics, recommendationInteractions), 
                userAnalytics
            );
            
            // Initialize challenges after data is loaded
            setTimeout(() => {
                if (typeof learningChallenges !== 'undefined') {
                    // Record initial activities based on loaded data
                    if (userEnrollments.length > 0) {
                        learningChallenges.recordActivity('course_enroll', userEnrollments.length);
                    }
                    
                    // Check for completed courses
                    const completedCourses = userEnrollments.filter(e => e.progress === 100).length;
                    if (completedCourses > 0) {
                        learningChallenges.recordActivity('course_complete', completedCourses);
                    }
                    
                    refreshChallenges();
                }
            }, 1000);
        })
        .catch((error) => {
            console.error('Error loading dashboard data:', error);
            utils.showNotification('Error loading dashboard data: ' + error.message, 'error');
            
            // Show error state
            if (coursesContainer) {
                coursesContainer.innerHTML = `
                    <div class="text-center py-12 col-span-full">
                        <svg class="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 class="mt-4 text-lg font-medium text-gray-900">Error Loading Courses</h3>
                        <p class="mt-2 text-gray-500">There was an error loading your courses. Please try again later.</p>
                        <div class="mt-6">
                            <button onclick="location.reload()" class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300">
                                Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        });
    }
    
    // Update dashboard stats
    function updateStats(enrollments) {
        if (!enrolledCountElement || !completedCountElement || !inProgressCountElement || !certificatesCountElement) return;
        
        // Total enrolled
        enrolledCountElement.textContent = enrollments.length;
        
        // Completed courses
        const completed = enrollments.filter(e => e.progress === 100).length;
        completedCountElement.textContent = completed;
        
        // In progress courses
        const inProgress = enrollments.filter(e => e.progress > 0 && e.progress < 100).length;
        inProgressCountElement.textContent = inProgress;
        
        // Certificates earned - count all completed courses as eligible for certificates
        // Even if certificateId doesn't exist yet, completed courses are eligible
        const certificates = enrollments.filter(e => e.progress === 100).length;
        certificatesCountElement.textContent = certificates;
    }
    
    // Update analytics stats
    function updateAnalyticsStats(analytics) {
        if (!analytics) {
            // Set default values if no analytics data
            if (studyTimeElement) studyTimeElement.textContent = '0h 0m';
            if (lessonsCompletedElement) lessonsCompletedElement.textContent = '0';
            if (learningStreakElement) learningStreakElement.textContent = '0';
            if (favoriteCategoryElement) favoriteCategoryElement.textContent = 'None';
            return;
        }
        
        // Format study time (convert seconds to hours and minutes)
        if (studyTimeElement) {
            const totalSeconds = analytics.totalStudyTime || 0;
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            studyTimeElement.textContent = `${hours}h ${minutes}m`;
        }
        
        // Lessons completed
        if (lessonsCompletedElement) {
            lessonsCompletedElement.textContent = analytics.lessonsCompleted || 0;
        }
        
        // Learning streak - use streak manager data if available, otherwise use analytics
        if (learningStreakElement) {
            if (streakManager) {
                const streakStats = streakManager.getStreakStats();
                learningStreakElement.textContent = streakStats.currentStreak;
            } else {
                learningStreakElement.textContent = analytics.learningStreak || 0;
            }
        }
        
        // Favorite category
        if (favoriteCategoryElement && analytics.favoriteCategories) {
            // Find the category with the highest count
            let favoriteCategory = 'None';
            let maxCount = 0;
            
            Object.entries(analytics.favoriteCategories).forEach(([category, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    favoriteCategory = category;
                }
            });
            
            favoriteCategoryElement.textContent = favoriteCategory;
        } else if (favoriteCategoryElement) {
            favoriteCategoryElement.textContent = 'None';
        }
    }
    
    // Render achievements
    function renderAchievements(achievements) {
        if (!achievementsContainer) return;
        
        if (!achievements || achievements.length === 0) {
            achievementsContainer.innerHTML = `
                <div class="text-center py-8 col-span-full">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">No achievements yet</h3>
                    <p class="mt-2 text-gray-500">Start learning to earn your first achievement!</p>
                </div>
            `;
            return;
        }
        
        // Generate HTML for achievements
        let achievementsHTML = '';
        
        achievements.forEach(achievement => {
            achievementsHTML += generateAchievementCardHTML(achievement);
        });
        
        achievementsContainer.innerHTML = achievementsHTML;
    }
    
    // Helper function to generate achievement card HTML
    function generateAchievementCardHTML(achievement) {
        // Determine icon based on achievement type
        let iconHTML = '';
        switch (achievement.icon) {
            case 'beginner':
                iconHTML = `
                    <svg class="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                `;
                break;
            case 'enthusiast':
                iconHTML = `
                    <svg class="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                `;
                break;
            case 'seeker':
                iconHTML = `
                    <svg class="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                    </svg>
                `;
                break;
            case 'warrior':
                iconHTML = `
                    <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 107 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"></path>
                    </svg>
                `;
                break;
            case 'master':
                iconHTML = `
                    <svg class="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                    </svg>
                `;
                break;
            case 'dedicated':
                iconHTML = `
                    <svg class="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                `;
                break;
            default:
                iconHTML = `
                    <svg class="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                `;
        }
        
        // Determine card styling based on earned status
        const cardClass = achievement.earned 
            ? 'bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-200 shadow-md' 
            : 'bg-gray-50 border border-gray-200 opacity-75';
            
        const titleClass = achievement.earned 
            ? 'text-gray-900 font-bold' 
            : 'text-gray-500 font-medium';
            
        const descriptionClass = achievement.earned 
            ? 'text-gray-700' 
            : 'text-gray-500';
            
        const statusText = achievement.earned ? 'Earned' : 'Locked';
        const statusClass = achievement.earned 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800';
        
        return `
            <div class="rounded-xl p-6 transition-all duration-300 hover:shadow-lg ${cardClass}">
                <div class="flex justify-between items-start">
                    <div>${iconHTML}</div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <h3 class="mt-4 text-lg ${titleClass}">${achievement.name}</h3>
                <p class="mt-2 text-sm ${descriptionClass}">${achievement.description}</p>
                ${!achievement.earned ? `
                    <div class="mt-4 pt-4 border-t border-gray-200">
                        <p class="text-xs text-gray-500">Unlock by completing: ${achievement.criteria.coursesCompleted || achievement.criteria.learningStreak || Math.floor((achievement.criteria.totalStudyTime || 0) / 3600) + ' hours'} ${achievement.criteria.coursesCompleted ? 'courses' : achievement.criteria.learningStreak ? 'day streak' : 'of study time'}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Render charts
    function renderCharts(enrollments, courses, categoryMap) {
        // Progress distribution chart
        renderProgressChart(enrollments);
        
        // Category distribution chart
        renderCategoryChart(enrollments, courses, categoryMap);
    }
    
    // Render analytics charts
    function renderAnalyticsCharts(analytics) {
        if (!analytics) {
            // Show empty state for analytics charts
            renderEmptyChart('study-time-chart-container', 'Study Time');
            renderEmptyChart('activity-chart-container', 'Activity');
            renderEmptyChart('streak-chart-container', 'Study Streak');
            return;
        }
        
        // Render study time chart (last 7 days)
        renderStudyTimeChart(analytics);
        
        // Render activity chart (lessons completed over time)
        renderActivityChart(analytics);
        
        // Render streak chart
        renderStreakChart(analytics);
    }
    
    // Render empty chart state
    function renderEmptyChart(containerId, chartName) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center text-gray-500">
                <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p class="mt-2">No ${chartName.toLowerCase()} data available</p>
            </div>
        `;
    }
    
    // Render study time chart
    function renderStudyTimeChart(analytics) {
        const container = document.getElementById('study-time-chart-container');
        if (!container) return;
        
        // Get last 7 days of study time data
        const dailyActivity = analytics.dailyActivity || {};
        const dates = Object.keys(dailyActivity).sort().slice(-7);
        
        if (dates.length === 0) {
            renderEmptyChart('study-time-chart-container', 'Study Time');
            return;
        }
        
        // Prepare data for chart
        const studyTimes = dates.map(date => {
            const activity = dailyActivity[date] || {};
            return (activity.studyTime || 0) / 60; // Convert to minutes
        });
        
        const maxValue = Math.max(...studyTimes, 1);
        
        // Generate chart HTML
        let chartHTML = `
            <div class="flex items-end justify-between h-48 px-2">
        `;
        
        dates.forEach((date, index) => {
            const studyTime = studyTimes[index];
            const heightPercent = (studyTime / maxValue) * 80; // Max 80% height
            const displayDate = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            
            chartHTML += `
                <div class="flex flex-col items-center flex-1 px-1">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-3/4 bg-indigo-500 rounded-t" style="height: ${heightPercent}%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${Math.round(studyTime)}m</p>
                        <p class="text-xs text-gray-500">${displayDate}</p>
                    </div>
                </div>
            `;
        });
        
        chartHTML += `
            </div>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Minutes studied per day (last 7 days)</p>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render activity chart
    function renderActivityChart(analytics) {
        const container = document.getElementById('activity-chart-container');
        if (!container) return;
        
        // Get last 7 days of activity data
        const dailyActivity = analytics.dailyActivity || {};
        const dates = Object.keys(dailyActivity).sort().slice(-7);
        
        if (dates.length === 0) {
            renderEmptyChart('activity-chart-container', 'Activity');
            return;
        }
        
        // Prepare data for chart
        const lessonsCompleted = dates.map(date => {
            const activity = dailyActivity[date] || {};
            return activity.lessonsCompleted || 0;
        });
        
        const maxValue = Math.max(...lessonsCompleted, 1);
        
        // Generate chart HTML
        let chartHTML = `
            <div class="flex items-end justify-between h-48 px-2">
        `;
        
        dates.forEach((date, index) => {
            const lessons = lessonsCompleted[index];
            const heightPercent = (lessons / maxValue) * 80; // Max 80% height
            const displayDate = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            
            chartHTML += `
                <div class="flex flex-col items-center flex-1 px-1">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-3/4 bg-green-500 rounded-t" style="height: ${heightPercent}%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${lessons}</p>
                        <p class="text-xs text-gray-500">${displayDate}</p>
                    </div>
                </div>
            `;
        });
        
        chartHTML += `
            </div>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Lessons completed per day (last 7 days)</p>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render streak chart
    function renderStreakChart(analytics) {
        const container = document.getElementById('streak-chart-container');
        if (!container) return;
        
        // Use streak manager data if available, otherwise use analytics data
        let currentStreak, longestStreak;
        
        if (streakManager) {
            const streakStats = streakManager.getStreakStats();
            currentStreak = streakStats.currentStreak;
            longestStreak = streakStats.longestStreak;
        } else {
            currentStreak = analytics.currentStreak || 0;
            longestStreak = analytics.longestStreak || 0;
        }
        
        // Generate chart HTML
        let chartHTML = `
            <div class="flex items-end justify-center h-48 px-2">
                <div class="flex flex-col items-center px-4">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-16 bg-amber-500 rounded-t" style="height: ${Math.min((currentStreak / Math.max(longestStreak, 1)) * 80, 80)}%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${currentStreak}</p>
                        <p class="text-xs text-gray-500">Current</p>
                    </div>
                </div>
                <div class="flex flex-col items-center px-4">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-16 bg-purple-500 rounded-t" style="height: 80%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${longestStreak}</p>
                        <p class="text-xs text-gray-500">Longest</p>
                    </div>
                </div>
            </div>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Learning streaks (days)</p>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render progress distribution chart
    function renderProgressChart(enrollments) {
        const container = document.getElementById('progress-chart-container');
        if (!container) return;
        
        // Calculate progress distribution
        const notStarted = enrollments.filter(e => e.progress === 0).length;
        const inProgress = enrollments.filter(e => e.progress > 0 && e.progress < 100).length;
        const completed = enrollments.filter(e => e.progress === 100).length;
        const total = enrollments.length;
        
        if (total === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p class="mt-2">No progress data available</p>
                </div>
            `;
            return;
        }
        
        // Donut chart implementation for learning progress
        const chartHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center">
                <div class="relative w-48 h-48 mb-6">
                    <!-- Donut chart background -->
                    <div class="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                    
                    <!-- Not Started segment -->
                    <div class="absolute inset-0 rounded-full border-8 border-gray-400 clip-segment" 
                         style="clip-path: ${getClipPath(0, (notStarted / Math.max(1, total)) * 100)};"></div>
                    
                    <!-- In Progress segment -->
                    <div class="absolute inset-0 rounded-full border-8 border-amber-500 clip-segment" 
                         style="clip-path: ${getClipPath((notStarted / Math.max(1, total)) * 100, ((notStarted + inProgress) / Math.max(1, total)) * 100)};"></div>
                    
                    <!-- Completed segment -->
                    <div class="absolute inset-0 rounded-full border-8 border-green-500 clip-segment" 
                         style="clip-path: ${getClipPath(((notStarted + inProgress) / Math.max(1, total)) * 100, 100)};"></div>
                    
                    <!-- Center label -->
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-2xl font-bold text-gray-900">${total}</span>
                        <span class="text-sm text-gray-500">Total Courses</span>
                    </div>
                </div>
                
                <!-- Legend -->
                <div class="flex flex-wrap justify-center gap-4 mt-4">
                    <div class="flex items-center">
                        <div class="w-4 h-4 bg-gray-400 rounded-full mr-2"></div>
                        <span class="text-sm text-gray-600">Not Started (${notStarted})</span>
                    </div>
                    <div class="flex items-center">
                        <div class="w-4 h-4 bg-amber-500 rounded-full mr-2"></div>
                        <span class="text-sm text-gray-600">In Progress (${inProgress})</span>
                    </div>
                    <div class="flex items-center">
                        <div class="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                        <span class="text-sm text-gray-600">Completed (${completed})</span>
                    </div>
                </div>
                <div class="mt-6 text-center">
                    <p class="text-sm text-gray-500">Course progress distribution</p>
                </div>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Helper function to generate clip path for donut chart segments
    function getClipPath(startPercent, endPercent) {
        // Convert percentages to angles (0-360 degrees)
        const startAngle = (startPercent / 100) * 360;
        const endAngle = (endPercent / 100) * 360;
        
        // Handle full circle case
        if (endAngle >= 359.99) {
            return 'inset(0 0 0 0)';
        }
        
        // Calculate coordinates for the clip path
        // For simplicity, we'll use a polygon that approximates the segment
        if (endAngle <= 180) {
            // Simple case: less than half circle
            return `polygon(50% 50%, 100% 50%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 50%, 50% 50%)`;
        } else {
            // More than half circle
            return `polygon(50% 50%, 0% 50%, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 50%, 50% 50%)`;
        }
    }
    
    // Render category distribution chart
    function renderCategoryChart(enrollments, courses, categoryMap) {
        const container = document.getElementById('category-chart-container');
        if (!container) return;
        
        if (enrollments.length === 0 || courses.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="mt-2">No category data available</p>
                </div>
            `;
            return;
        }
        
        // Match enrollments with courses to get categories
        const enrichedEnrollments = enrollments.map(enrollment => {
            const course = courses.find(c => c.id === enrollment.courseId);
            return {
                ...enrollment,
                course: course || null
            };
        });
        
        // Count courses by category
        const categoryCounts = {};
        enrichedEnrollments.forEach(enrollment => {
            if (enrollment.course && enrollment.course.category) {
                // Map category ID to name if it's an ID, otherwise use as is
                const categoryId = enrollment.course.category;
                const categoryName = categoryMap[categoryId] || categoryId;
                categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
            }
        });
        
        // Convert to array and sort by count
        const sortedCategories = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5 categories
        
        if (sortedCategories.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 012-2m0 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p class="mt-2">No category data available</p>
                </div>
            `;
            return;
        }
        
        // Generate enhanced bar chart with animations and interactive elements
        const maxCount = Math.max(...sortedCategories.map(c => c[1]));
        const chartHTML = `
            <div class="w-full h-full flex flex-col">
                <div class="flex items-end flex-1 space-x-2 md:space-x-3 px-2 py-4">
                    ${sortedCategories.map(([category, count], index) => {
                        // Generate different colors for each bar
                        const colors = [
                            'from-indigo-500 to-purple-600',
                            'from-blue-500 to-cyan-600',
                            'from-green-500 to-emerald-600',
                            'from-amber-500 to-orange-600',
                            'from-rose-500 to-pink-600'
                        ];
                        const colorClass = colors[index % colors.length];
                        
                        // Calculate height percentage
                        const heightPercent = Math.max(20, (count / maxCount) * 100);
                        
                        // Calculate width based on text length for better label fit
                        const labelWidth = Math.max(50, category.length * 6);
                        
                        return `
                            <div class="flex flex-col items-center flex-1 group min-w-[50px] md:min-w-[60px]">
                                <div class="text-xs text-gray-500 mb-1 font-bold transition-all duration-300 group-hover:text-gray-900">${count}</div>
                                <div class="w-3/4 md:w-3/4 bg-gradient-to-t ${colorClass} rounded-t-lg transition-all duration-700 ease-out hover:opacity-90 hover:shadow-lg transform hover:-translate-y-1" 
                                     style="height: ${heightPercent}%">
                                </div>
                                <div class="text-xs text-gray-600 mt-2 text-center truncate w-full px-1 font-semibold transition-all duration-300 group-hover:text-gray-900" 
                                     style="max-width: ${labelWidth}px;">${category}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="mt-4 md:mt-6 text-center">
                    <p class="text-sm text-gray-600 font-medium">Course Categories Distribution</p>
                    <div class="mt-2 flex justify-center">
                        <div class="inline-flex items-center text-xs text-gray-500">
                            <span class="flex h-3 w-3">
                                <span class="animate-ping absolute h-3 w-3 rounded-full bg-indigo-400 opacity-75"></span>
                                <span class="relative h-3 w-3 rounded-full bg-indigo-500"></span>
                            </span>
                            <span class="ml-2">Top 5 Categories</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render courses
    function renderCourses(enrollments, courses, categoryMap) {
        console.log('Rendering dashboard courses:', enrollments, courses);
        if (enrollments.length === 0) {
            coursesContainer.innerHTML = `
                <div class="text-center py-12 col-span-full">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">No enrolled courses yet</h3>
                    <p class="mt-2 text-gray-500">Get started by browsing our course catalog</p>
                    <div class="mt-6">
                        <a href="../courses.html" class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 inline-flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            Add Course
                        </a>
                    </div>
                </div>
            `;
            return;
        }
        
        // Match enrollments with courses
        const enrichedEnrollments = enrollments.map(enrollment => {
            const course = courses.find(c => c.id === enrollment.courseId);
            return {
                ...enrollment,
                course: course || null
            };
        }).filter(enrollment => enrollment.course); // Filter out enrollments without matching courses
        
        // Sort by last accessed time (most recent first)
        enrichedEnrollments.sort((a, b) => {
            const dateA = a.lastAccessed ? new Date(a.lastAccessed) : new Date(0);
            const dateB = b.lastAccessed ? new Date(b.lastAccessed) : new Date(0);
            return dateB - dateA;
        });
        
        // Generate HTML for all courses (without separating recently accessed)
        let coursesHTML = '';
        
        enrichedEnrollments.forEach(enrollment => {
            coursesHTML += generateCourseCardHTML(enrollment, categoryMap);
        });
        
        console.log('Generated dashboard courses HTML:', coursesHTML);
        coursesContainer.innerHTML = coursesHTML;
        console.log('Dashboard courses container updated with', enrichedEnrollments.length, 'courses');
    }
    
    // Helper function to generate course card HTML
    function generateCourseCardHTML(enrollment, categoryMap) {
        if (!enrollment.course) return '';
        
        // Map category ID to name if it's an ID, otherwise use as is
        let categoryName = enrollment.course.category || 'General';
        if (categoryMap && categoryMap[enrollment.course.category]) {
            categoryName = categoryMap[enrollment.course.category];
        }
        
        // Determine category tag color based on category name
        let categoryClass = 'bg-indigo-100 text-indigo-800'; // Default indigo color
        
        const categoryLower = categoryName.toLowerCase();
        if (categoryLower.includes('android')) {
            categoryClass = 'bg-green-100 text-green-800'; // Green for Android
        } else if (categoryLower.includes('python')) {
            categoryClass = 'bg-blue-100 text-blue-800'; // Blue for Python
        } else if (categoryLower.includes('web')) {
            categoryClass = 'bg-amber-100 text-amber-800'; // Amber for Web
        } else if (categoryLower.includes('data')) {
            categoryClass = 'bg-purple-100 text-purple-800'; // Purple for Data
        }
        
        const progress = enrollment.progress || 0;
        const isCompleted = progress === 100;
        
        return `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover-lift transition-all duration-300 course-card" data-enrollment-id="${enrollment.id}">
                <!-- Thumbnail -->
                <div class="h-48 overflow-hidden">
                    <img 
                        src="${enrollment.course.thumbnail}" 
                        alt="${enrollment.course.title}" 
                        class="w-full h-full object-cover"
                        loading="lazy"
                        onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxMyIgcng9IjIiLz48cG9seWxpbmUgcG9pbnRzPSIxIDIwIDggMTMgMTMgMTgiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAyMCAxNi41IDE1LjUgMTQgMTgiLz48bGluZSB4MT0iOSIgeDI9IjkiIHkxPSI5IiB5Mj0iOSIvPjwvc3ZnPg==';"
                    >
                </div>
                
                <div class="p-6">
                    <div class="flex justify-between items-start">
                        <h3 class="text-xl font-bold text-gray-900 line-clamp-2">
                            ${enrollment.course.title}
                        </h3>
                        ${isCompleted ? `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Completed
                            </span>
                        ` : `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                In Progress
                            </span>
                        `}
                    </div>
                    
                    <p class="mt-2 text-sm text-gray-500">
                        ${categoryName} • ${enrollment.course.difficulty || 'Beginner'}
                    </p>
                    
                    <p class="mt-3 text-gray-600 line-clamp-2">
                        ${enrollment.course.description ? enrollment.course.description.substring(0, 100) + '...' : 'No description available'}
                    </p>
                    
                    <div class="mt-4">
                        <div class="flex justify-between text-sm text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>${progress}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                class="h-2 rounded-full ${
                                    isCompleted ? 'bg-green-500' : 
                                    progress > 50 ? 'bg-indigo-600' : 'bg-amber-500'
                                } transition-all duration-500" 
                                style="width: ${progress}%"
                            ></div>
                        </div>
                    </div>
                    
                    <div class="mt-6 flex justify-between">
                        <a 
                            href="../player.html?courseId=${enrollment.courseId}" 
                            class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 text-center flex-1 mr-2"
                        >
                            ${isCompleted ? 'Review' : 'Continue'}
                        </a>
                        ${isCompleted ? `
                            <a 
                                href="../certificate.html?courseId=${enrollment.courseId}"
                                class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition duration-300 text-center flex-1 ml-2"
                            >
                                Certificate
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Render learning patterns analysis
    function renderLearningPatterns(patterns, engagementScore) {
        const patternsContainer = document.getElementById('learning-patterns-container');
        if (!patternsContainer) return;
        
        if (!patterns) {
            patternsContainer.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p class="mt-2">No learning pattern data available</p>
                </div>
            `;
            return;
        }
        
        const improvementText = patterns.learningVelocity > 0 ? 
            `You're improving! ${patterns.learningVelocity}% more than when you started.` : 
            patterns.learningVelocity < 0 ? 
            `Keep going! You can improve your learning pace.` : 
            `Consistent progress! Keep up the good work.`;
        
        const engagementLevel = engagementScore >= 80 ? 'Excellent' : 
                              engagementScore >= 60 ? 'Good' : 
                              engagementScore >= 40 ? 'Average' : 'Needs Improvement';
        
        const engagementColor = engagementScore >= 80 ? 'text-green-600' : 
                              engagementScore >= 60 ? 'text-blue-600' : 
                              engagementScore >= 40 ? 'text-amber-600' : 'text-red-600';
        
        const patternsHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                    <div class="flex items-center mb-4">
                        <div class="p-2 rounded-lg bg-indigo-100">
                            <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 class="ml-3 text-lg font-semibold text-gray-900">Learning Consistency</h3>
                    </div>
                    <div class="mt-4">
                        <div class="flex justify-between mb-1">
                            <span class="text-sm font-medium text-gray-700">${patterns.consistency}%</span>
                            <span class="text-sm font-medium text-gray-700">${patterns.activeDays}/${patterns.totalDays} days</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${patterns.consistency}%"></div>
                        </div>
                        <p class="mt-2 text-sm text-gray-600">${patterns.consistency >= 80 ? 'Excellent consistency!' : patterns.consistency >= 60 ? 'Good consistency!' : 'Keep building your learning habit!'}</p>
                    </div>
                </div>
                
                <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                    <div class="flex items-center mb-4">
                        <div class="p-2 rounded-lg bg-amber-100">
                            <svg class="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 class="ml-3 text-lg font-semibold text-gray-900">Study Time</h3>
                    </div>
                    <div class="mt-4">
                        <p class="text-2xl font-bold text-gray-900">${Math.round(patterns.avgStudyTime / 60)} min/day</p>
                        <p class="mt-1 text-sm text-gray-600">Average study time on active days</p>
                        <p class="mt-2 text-sm text-gray-600">Total: ${Math.round(patterns.totalTimeStudied / 3600)} hours</p>
                    </div>
                </div>
                
                <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                    <div class="flex items-center mb-4">
                        <div class="p-2 rounded-lg bg-green-100">
                            <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <h3 class="ml-3 text-lg font-semibold text-gray-900">Learning Progress</h3>
                    </div>
                    <div class="mt-4">
                        <p class="text-lg font-medium text-gray-900">${improvementText}</p>
                        <div class="mt-3 flex items-center">
                            <span class="text-sm text-gray-600 mr-2">Learning Velocity:</span>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patterns.learningVelocity >= 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                                ${patterns.learningVelocity >= 0 ? '+' : ''}${patterns.learningVelocity}%
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-6 border border-purple-100">
                    <div class="flex items-center mb-4">
                        <div class="p-2 rounded-lg bg-purple-100">
                            <svg class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </div>
                        <h3 class="ml-3 text-lg font-semibold text-gray-900">Engagement Score</h3>
                    </div>
                    <div class="mt-4">
                        <p class="text-2xl font-bold ${engagementColor}">${engagementScore}/100</p>
                        <p class="mt-1 text-sm text-gray-600">${engagementLevel} engagement</p>
                        <p class="mt-2 text-sm text-gray-600">Based on consistency, study time, and progress</p>
                    </div>
                </div>
            </div>
        `;
        
        patternsContainer.innerHTML = patternsHTML;
    }
    
    // Render recommendations
    function renderRecommendations(recommendations, userAnalytics) {
        const recommendationsContainer = document.getElementById('recommendations-container');
        if (!recommendationsContainer) return;
        
        if (!recommendations || recommendations.length === 0) {
            recommendationsContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p class="mt-2">No recommendations available at the moment. Complete some courses to get personalized suggestions!</p>
                </div>
            `;
            return;
        }
        
        let recommendationsHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
        
        recommendations.forEach((course, index) => {
            // Determine recommendation reason
            let reason = "Based on popular courses";
            let reasonIcon = "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z";
            
            if (userAnalytics && userAnalytics.favoriteCategories && course.category) {
                const favoriteCategories = userAnalytics.favoriteCategories;
                if (favoriteCategories[course.category]) {
                    reason = `Based on your interest in ${course.category}`;
                    reasonIcon = "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z";
                }
            }
            
            // Check if this is a trending recommendation
            if (course.createdAt) {
                const createdDate = getNormalizedDate(course.createdAt);
                const daysSinceCreation = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
                if (daysSinceCreation < 14) {
                    reason = "New & Trending";
                    reasonIcon = "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z";
                }
            }
            
            // Check if this is a completion suggestion
            if (course.lessons && Array.isArray(course.lessons)) {
                const totalDuration = course.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
                if (totalDuration > 3600 && totalDuration < 21600) { // 1-6 hours
                    reason = "Perfect for completion";
                    reasonIcon = "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
                }
            }
            
            // Add special badge for top recommendations
            const topBadge = index < 2 ? 
                '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200 mb-2">Top Recommendation</span>' : 
                '';
            
            recommendationsHTML += `
                <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div class="h-32 overflow-hidden">
                        <img 
                            src="${course.thumbnail || 'https://placehold.co/400x200/6366f1/white?text=Course'}" 
                            alt="${course.title}" 
                            class="w-full h-full object-cover"
                            onerror="this.src='https://placehold.co/400x200/6366f1/white?text=Course';"
                        >
                    </div>
                    <div class="p-5">
                        ${topBadge}
                        <h3 class="font-bold text-gray-900 line-clamp-2">${course.title}</h3>
                        <p class="mt-2 text-sm text-gray-600 line-clamp-2">${course.description || 'No description available'}</p>
                        <div class="mt-4 flex justify-between items-center">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                ${course.category || 'General'}
                            </span>
                            <a 
                                href="../player.html?courseId=${course.id}"
                                class="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300"
                            >
                                Explore
                            </a>
                        </div>
                        <div class="mt-3 text-xs text-gray-500 flex items-start">
                            <svg class="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${reasonIcon}" />
                            </svg>
                            <span>${reason}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        recommendationsHTML += '</div>';
        recommendationsContainer.innerHTML = recommendationsHTML;
    }
    
    // Helper function to normalize date
    function getNormalizedDate(dateValue) {
        if (!dateValue) return new Date(0);

        // Handle Firebase Timestamp objects
        if (dateValue._seconds !== undefined) {
            return new Date(dateValue._seconds * 1000);
        }

        // Handle Unix timestamps (numbers)
        if (typeof dateValue === 'number') {
            // Check if it's in seconds or milliseconds
            if (dateValue > 10000000000) {
                // Milliseconds
                return new Date(dateValue);
            } else {
                // Seconds
                return new Date(dateValue * 1000);
            }
        }

        // Handle string dates
        if (typeof dateValue === 'string') {
            // Try to parse the string date
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        }

        // Handle Date objects
        if (dateValue instanceof Date) {
            return dateValue;
        }

        // Fallback
        return new Date(0);
    }
    
    // Get course recommendations based on user analytics and enrollments
    function getCourseRecommendations(enrollments, courses, analytics, interactions) {
        if (!courses || !analytics) return [];
        
        // Get user's favorite categories
        const favoriteCategories = analytics.favoriteCategories || {};
        
        // Get completed and in-progress courses
        const completedCourseIds = enrollments
            .filter(e => e.progress === 100)
            .map(e => e.courseId);
        
        const inProgressCourseIds = enrollments
            .filter(e => e.progress > 0 && e.progress < 100)
            .map(e => e.courseId);
        
        // Get all enrolled course IDs
        const enrolledCourseIds = [...completedCourseIds, ...inProgressCourseIds];
        
        // Get user's previous recommendation interactions
        const clickedRecommendations = interactions
            .filter(i => i.action === 'click')
            .map(i => i.courseId) || [];
            
        const ignoredRecommendations = interactions
            .filter(i => i.action === 'view')
            .map(i => i.courseId) || [];
        
        // Score courses based on relevance with enhanced algorithm
        const scoredCourses = courses.map(course => {
            let score = 0;
            const courseId = course.id;
            
            // Skip courses that are already enrolled in
            if (enrolledCourseIds.includes(courseId)) {
                return { ...course, score: -1 }; // Effectively exclude
            }
            
            // Boost score for courses in favorite categories
            if (course.category && favoriteCategories[course.category]) {
                score += favoriteCategories[course.category] * 15;
            }
            
            // Boost score for courses with higher difficulty if user is progressing well
            if (analytics.learningVelocity > 0 && course.difficulty) {
                const difficultyBoost = course.difficulty === 'Advanced' ? 15 : 
                                     course.difficulty === 'Intermediate' ? 10 : 5;
                score += difficultyBoost;
            }
            
            // Boost score for courses with good ratings
            if (course.rating && course.rating >= 4.0) {
                score += course.rating * 3;
            }
            
            // Boost score for popular courses
            if (course.enrollmentCount && course.enrollmentCount > 50) {
                score += Math.log(course.enrollmentCount) * 2; // Logarithmic scaling
            }
            
            // Boost score for courses with completion-friendly durations
            if (course.lessons && Array.isArray(course.lessons)) {
                const totalDuration = course.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
                // Prefer courses with moderate durations (1-6 hours)
                if (totalDuration > 3600 && totalDuration < 21600) { // Between 1-6 hours
                    score += 8;
                } else if (totalDuration > 0) {
                    // Still give some points for shorter courses
                    score += 3;
                }
            }
            
            // Boost score for trending courses (recently popular)
            if (course.createdAt) {
                const createdDate = getNormalizedDate(course.createdAt);
                const daysSinceCreation = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
                // Boost for courses created in the last 30 days
                if (daysSinceCreation < 30) {
                    score += Math.max(0, 10 - (daysSinceCreation / 3));
                }
            }
            
            // Penalize courses that user has seen but not clicked
            if (ignoredRecommendations.includes(courseId) && !clickedRecommendations.includes(courseId)) {
                score -= 5;
            }
            
            // Boost courses that are similar to recently completed courses
            if (completedCourseIds.length > 0) {
                const recentCompleted = completedCourseIds.slice(-3); // Last 3 completed
                const recentCourses = courses.filter(c => recentCompleted.includes(c.id));
                
                // Check for category similarity
                recentCourses.forEach(recentCourse => {
                    if (recentCourse.category === course.category) {
                        score += 7;
                    }
                });
            }
            
            // Boost for courses in categories the user has interacted with
            if (Object.keys(favoriteCategories).length > 0) {
                score += 3;
            }
            
            return {
                ...course,
                score: Math.max(0, score) // Ensure non-negative score
            };
        });
        
        // Filter out courses with negative scores and sort by score
        return scoredCourses
            .filter(course => course.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6); // Return top 6 recommendations
    }
    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebaseServices.signOut()
                .then(() => {
                    window.location.href = '../auth/login.html';
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                    utils.showNotification('Logout failed: ' + error.message, 'error');
                });
        });
    }
});