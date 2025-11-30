// Learning Challenges System for BYAMN Platform
class LearningChallenges {
    constructor() {
        this.currentChallenges = [];
        this.userProgress = {};
        this.initializeChallenges();
    }

    initializeChallenges() {
        // Weekly Challenges (reset every week)
        this.currentChallenges = [
            {
                id: 'weekly_lesson_streak',
                title: '7-Day Learning Streak',
                description: 'Complete at least one lesson every day for 7 consecutive days',
                type: 'weekly',
                goal: 7,
                unit: 'days',
                reward: '🔥 Streak Master Badge',
                icon: '🔥',
                progress: 0,
                expires: this.getNextWeekDate(),
                category: 'consistency'
            },
            {
                id: 'weekly_course_completion',
                title: 'Course Completion Champion',
                description: 'Complete 2 courses this week',
                type: 'weekly', 
                goal: 2,
                unit: 'courses',
                reward: '🏆 Completion Expert Badge',
                icon: '🏆',
                progress: 0,
                expires: this.getNextWeekDate(),
                category: 'achievement'
            },
            {
                id: 'weekly_study_time',
                title: 'Study Marathon',
                description: 'Spend 5 hours learning this week',
                type: 'weekly',
                goal: 5,
                unit: 'hours',
                reward: '⏰ Dedicated Learner Badge',
                icon: '⏰',
                progress: 0,
                expires: this.getNextWeekDate(),
                category: 'dedication'
            },
            {
                id: 'monthly_community',
                title: 'Community Contributor',
                description: 'Share 3 certificates or achievements this month',
                type: 'monthly',
                goal: 3,
                unit: 'shares',
                reward: '🌟 Community Star Badge',
                icon: '🌟',
                progress: 0,
                expires: this.getNextMonthDate(),
                category: 'community'
            },
            {
                id: 'weekly_explorer',
                title: 'Course Explorer',
                description: 'Enroll in 3 new courses this week',
                type: 'weekly',
                goal: 3,
                unit: 'courses',
                reward: '🧭 Explorer Badge',
                icon: '🧭',
                progress: 0,
                expires: this.getNextWeekDate(),
                category: 'exploration'
            }
        ];

        this.loadUserProgress();
    }

    getNextWeekDate() {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString();
    }

    getNextMonthDate() {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
    }

    loadUserProgress() {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) return;

            const savedProgress = localStorage.getItem(`byamn_challenges_progress_${userId}`);
            if (savedProgress) {
                this.userProgress = JSON.parse(savedProgress);
                this.updateChallengesProgress();
            }
        } catch (error) {
            console.error('Error loading challenge progress:', error);
            this.userProgress = {};
        }
    }

    saveUserProgress() {
        try {
            const userId = this.getCurrentUserId();
            if (userId) {
                localStorage.setItem(`byamn_challenges_progress_${userId}`, JSON.stringify(this.userProgress));
            }
        } catch (error) {
            console.error('Error saving challenge progress:', error);
        }
    }

    getCurrentUserId() {
        try {
            // Check if user is authenticated with Firebase
            if (typeof firebase !== 'undefined' && firebase.auth) {
                const user = firebase.auth().currentUser;
                return user ? user.uid : 'guest';
            }
            return 'guest';
        } catch (error) {
            return 'guest';
        }
    }

    updateChallengesProgress() {
        this.currentChallenges.forEach(challenge => {
            const userId = this.getCurrentUserId();
            if (this.userProgress[userId] && this.userProgress[userId][challenge.id]) {
                challenge.progress = this.userProgress[userId][challenge.id].progress || 0;
            } else {
                challenge.progress = 0;
            }
        });
    }

    recordActivity(activityType, value = 1) {
        const userId = this.getCurrentUserId();
        if (!userId || userId === 'guest') return;

        // Initialize user progress if not exists
        if (!this.userProgress[userId]) {
            this.userProgress[userId] = {};
        }

        let updated = false;

        // Update relevant challenges based on activity type
        this.currentChallenges.forEach(challenge => {
            if (this.shouldUpdateChallenge(challenge, activityType)) {
                this.updateChallengeProgress(challenge.id, value, userId);
                updated = true;
            }
        });

        if (updated) {
            this.saveUserProgress();
            this.checkChallengeCompletion();
            this.updateChallengesDisplay();
        }
    }

    shouldUpdateChallenge(challenge, activityType) {
        const activityMap = {
            'weekly_lesson_streak': ['lesson_complete', 'daily_streak'],
            'weekly_course_completion': ['course_complete'],
            'weekly_study_time': ['study_time'],
            'monthly_community': ['certificate_share', 'achievement_share'],
            'weekly_explorer': ['course_enroll']
        };

        return activityMap[challenge.id]?.includes(activityType);
    }

    updateChallengeProgress(challengeId, value, userId) {
        if (!this.userProgress[userId][challengeId]) {
            this.userProgress[userId][challengeId] = {
                progress: 0,
                completed: false,
                completedAt: null,
                startedAt: new Date().toISOString()
            };
        }

        if (!this.userProgress[userId][challengeId].completed) {
            this.userProgress[userId][challengeId].progress += value;
            
            // Update the current challenges array
            const challenge = this.currentChallenges.find(c => c.id === challengeId);
            if (challenge) {
                challenge.progress = this.userProgress[userId][challengeId].progress;
            }
        }
    }

    checkChallengeCompletion() {
        const userId = this.getCurrentUserId();
        if (!userId || !this.userProgress[userId]) return;

        this.currentChallenges.forEach(challenge => {
            const progress = this.userProgress[userId][challenge.id];
            if (progress && !progress.completed && progress.progress >= challenge.goal) {
                this.completeChallenge(challenge.id);
            }
        });
    }

    completeChallenge(challengeId) {
        const userId = this.getCurrentUserId();
        if (!userId) return;

        this.userProgress[userId][challengeId].completed = true;
        this.userProgress[userId][challengeId].completedAt = new Date().toISOString();

        // Show celebration
        this.showChallengeCompletion(challengeId);
        
        this.saveUserProgress();
        
        // Update analytics
        this.trackChallengeCompletion(challengeId);
    }

    showChallengeCompletion(challengeId) {
        const challenge = this.currentChallenges.find(c => c.id === challengeId);
        if (!challenge) return;

        // Create celebration notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm challenge-completion-notification animate-fade-in';
        notification.innerHTML = `
            <div class="flex items-center">
                <div class="text-2xl mr-3">🎉</div>
                <div>
                    <h3 class="font-bold text-lg mb-1">Challenge Completed!</h3>
                    <p class="text-sm opacity-90 mb-1">${challenge.title}</p>
                    <p class="text-xs font-medium">Reward: ${challenge.reward}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Add confetti effect
        this.createConfetti();

        // Auto-remove after 6 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 6000);
    }

    createConfetti() {
        // Simple confetti effect
        const confettiCount = 30;
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'fixed w-3 h-3 rounded-full z-40 confetti-particle';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.top = '-20px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.opacity = '0.9';
                confetti.style.transform = 'rotate(0deg)';
                
                document.body.appendChild(confetti);
                
                // Animate
                const animation = confetti.animate([
                    { 
                        transform: 'translateY(0) rotate(0deg)', 
                        opacity: 1 
                    },
                    { 
                        transform: `translateY(${window.innerHeight}px) rotate(${360 + Math.random() * 360}deg)`, 
                        opacity: 0 
                    }
                ], {
                    duration: 2000 + Math.random() * 2000,
                    easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
                });

                animation.onfinish = () => {
                    if (confetti.parentElement) {
                        confetti.remove();
                    }
                };
            }, i * 100);
        }
    }

    trackChallengeCompletion(challengeId) {
        // Track challenge completion
        console.log(`Challenge completed: ${challengeId}`);
        
        // You can integrate with your analytics service here
        if (typeof gtag !== 'undefined') {
            gtag('event', 'challenge_complete', {
                'challenge_id': challengeId,
                'user_id': this.getCurrentUserId()
            });
        }
    }

    getProgressPercentage(challenge) {
        return Math.min(100, (challenge.progress / challenge.goal) * 100);
    }

    formatExpiryDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return 'Soon';
        }
    }

    isChallengeExpired(challenge) {
        try {
            return new Date() > new Date(challenge.expires);
        } catch (error) {
            return false;
        }
    }

    getDaysUntilExpiry(challenge) {
        try {
            const expiry = new Date(challenge.expires);
            const now = new Date();
            const diffTime = expiry - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(0, diffDays);
        } catch (error) {
            return 7;
        }
    }

    getActiveChallenges() {
        return this.currentChallenges.filter(challenge => !this.isChallengeExpired(challenge));
    }

    getUserStats() {
        const userId = this.getCurrentUserId();
        if (!userId || !this.userProgress[userId]) {
            return { completed: 0, inProgress: 0, total: 0 };
        }

        const userChallenges = Object.values(this.userProgress[userId]);
        const completed = userChallenges.filter(c => c.completed).length;
        const inProgress = userChallenges.filter(c => !c.completed && c.progress > 0).length;

        return {
            completed,
            inProgress,
            total: this.getActiveChallenges().length
        };
    }

    // Public method to refresh display
    refreshDisplay() {
        this.updateChallengesDisplay();
    }

    updateChallengesDisplay() {
        const container = document.getElementById('challenges-container');
        if (!container) return;

        this.renderChallenges(container);
    }

    renderChallenges(container) {
        const stats = this.getUserStats();
        const activeChallenges = this.getActiveChallenges();

        container.innerHTML = `
            <div class="challenges-header mb-6">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Learning Challenges</h2>
                        <p class="text-gray-600 mt-1">Complete challenges to earn badges and track your progress</p>
                    </div>
                    <div class="flex items-center space-x-4 mt-3 sm:mt-0">
                        <div class="flex items-center space-x-2 text-sm text-gray-600">
                            <span class="flex items-center">
                                <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                ${stats.completed} Completed
                            </span>
                            <span class="flex items-center">
                                <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                ${stats.inProgress} In Progress
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            ${activeChallenges.length === 0 ? `
                <div class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div class="text-5xl mb-4">🎯</div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">No Active Challenges</h3>
                    <p class="text-gray-600 max-w-md mx-auto">New challenges will be available soon. Check back later!</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    ${activeChallenges.map(challenge => {
                        const progressPercent = this.getProgressPercentage(challenge);
                        const daysLeft = this.getDaysUntilExpiry(challenge);
                        const isCompleted = challenge.progress >= challenge.goal;
                        
                        return `
                            <div class="challenge-card bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 ${isCompleted ? 'ring-2 ring-green-200 bg-green-50' : ''}">
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center space-x-3">
                                        <span class="text-3xl">${challenge.icon}</span>
                                        <div>
                                            <h3 class="font-bold text-gray-900 text-lg">${challenge.title}</h3>
                                            <p class="text-sm text-gray-600 mt-1">${challenge.description}</p>
                                        </div>
                                    </div>
                                    ${isCompleted ? `
                                        <span class="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center">
                                            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                            </svg>
                                            Completed
                                        </span>
                                    ` : `
                                        <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                                            ${daysLeft}d left
                                        </span>
                                    `}
                                </div>
                                
                                <div class="mb-4">
                                    <div class="flex justify-between text-sm text-gray-700 mb-2">
                                        <span class="font-medium">Progress</span>
                                        <span class="font-semibold">${challenge.progress}/${challenge.goal} ${challenge.unit}</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-700 ease-out progress-bar-fill" 
                                             style="width: ${progressPercent}%"></div>
                                    </div>
                                </div>
                                
                                <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <span class="text-sm text-gray-600 font-medium">${challenge.reward}</span>
                                    ${isCompleted ? `
                                        <span class="text-green-600 text-sm font-semibold flex items-center">
                                            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                            </svg>
                                            Reward Claimed!
                                        </span>
                                    ` : `
                                        <span class="text-blue-600 text-sm font-semibold">
                                            ${Math.max(0, challenge.goal - challenge.progress)} ${challenge.unit} to go
                                        </span>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}

            <div class="mt-8 pt-6 border-t border-gray-200">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                    <p>Complete challenges to earn exclusive badges and track your learning journey!</p>
                    <button onclick="learningChallenges.showMotivationMessage()" class="mt-2 sm:mt-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                        Need Motivation?
                    </button>
                </div>
            </div>
        `;
    }

    showMotivationMessage() {
        const messages = [
            "Every lesson completed brings you closer to your goals! 🚀",
            "Consistency is key - you're doing great! 💪",
            "Learning is a journey, enjoy every step! 🌟",
            "Your future self will thank you for this! 📚",
            "Keep going - you're building valuable skills! 🎯"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // Show motivation message
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification(randomMessage, 'success');
        } else {
            alert(randomMessage);
        }
    }
}

// Initialize challenges system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create global instance
    window.learningChallenges = new LearningChallenges();
    
    // Initialize challenges UI if on a page with challenges
    if (document.getElementById('challenges-container')) {
        learningChallenges.updateChallengesDisplay();
    }
    
    // Demo: Simulate some progress for testing (remove in production)
    setTimeout(() => {
        if (window.learningChallenges && Math.random() > 0.7) {
            window.learningChallenges.recordActivity('lesson_complete');
            window.learningChallenges.recordActivity('course_enroll');
        }
    }, 3000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LearningChallenges;
}