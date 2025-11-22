// assets/js/streak.js

class LearningStreakManager {
    constructor() {
        this.currentStreak = 0;
        this.longestStreak = 0;
        this.lastLearningDate = null;
        this.streakData = null;
        this.init();
    }

    async init() {
        await this.loadStreakData();
        await this.checkAndUpdateStreak();
    }

    // Load streak data from Firebase or localStorage
    async loadStreakData() {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('No user logged in, skipping streak initialization');
            return;
        }

        try {
            // Try to load from Firebase first
            if (window.firebaseServices && window.firebaseServices.getUserAnalytics) {
                const analytics = await window.firebaseServices.getUserAnalytics(user.uid);
                if (analytics && analytics.streakData) {
                    this.streakData = analytics.streakData;
                    this.updateLocalStreakData();
                    return;
                }
            }

            // Fallback to localStorage
            const localData = localStorage.getItem(`streak_${user.uid}`);
            if (localData) {
                this.streakData = JSON.parse(localData);
                this.updateLocalStreakData();
            } else {
                // Initialize new streak data
                this.streakData = this.initializeStreakData();
            }
        } catch (error) {
            console.error('Error loading streak data:', error);
            this.initializeDefaultStreak();
        }
    }

    // Initialize new streak data structure
    initializeStreakData() {
        return {
            currentStreak: 0,
            longestStreak: 0,
            lastLearningDate: null,
            learningHistory: [],
            totalLearningDays: 0,
            streakStartDate: null
        };
    }

    // Update local variables from streak data
    updateLocalStreakData() {
        if (!this.streakData) return;
        
        this.currentStreak = this.streakData.currentStreak || 0;
        this.longestStreak = this.streakData.longestStreak || 0;
        this.lastLearningDate = this.streakData.lastLearningDate;
    }

    // Check and update streak based on today's activity
    async checkAndUpdateStreak() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Check if user already learned today
        if (this.lastLearningDate === today) {
            return; // Already updated today
        }

        const yesterday = this.getPreviousDay(today);
        
        if (this.lastLearningDate === yesterday) {
            // Continue streak
            this.currentStreak++;
        } else if (this.lastLearningDate && this.lastLearningDate !== today) {
            // Broken streak
            if (this.currentStreak > this.longestStreak) {
                this.longestStreak = this.currentStreak;
            }
            this.currentStreak = 1; // Start new streak
            this.streakData.streakStartDate = today;
        } else {
            // First time or no previous activity
            this.currentStreak = this.currentStreak > 0 ? this.currentStreak : 1;
            if (!this.streakData.streakStartDate) {
                this.streakData.streakStartDate = today;
            }
        }

        // Update streak data
        this.lastLearningDate = today;
        this.streakData.currentStreak = this.currentStreak;
        this.streakData.longestStreak = Math.max(this.longestStreak, this.currentStreak);
        this.streakData.lastLearningDate = today;

        // Add to learning history
        this.addToLearningHistory(today);

        // Save updated data
        await this.saveStreakData();

        // Show streak motivation if streak increased
        if (this.currentStreak > 1) {
            this.showStreakMotivation();
        }
    }

    // Record learning activity
    async recordLearningActivity(duration = 0) {
        await this.checkAndUpdateStreak();
        
        // Update today's learning duration
        const today = new Date().toISOString().split('T')[0];
        const todayIndex = this.streakData.learningHistory.findIndex(day => day.date === today);
        
        if (todayIndex !== -1) {
            this.streakData.learningHistory[todayIndex].duration += duration;
        } else {
            this.streakData.learningHistory.push({
                date: today,
                duration: duration,
                lessonsCompleted: 1
            });
        }

        await this.saveStreakData();
    }

    // Add day to learning history
    addToLearningHistory(date) {
        const existingDay = this.streakData.learningHistory.find(day => day.date === date);
        
        if (!existingDay) {
            this.streakData.learningHistory.push({
                date: date,
                duration: 0,
                lessonsCompleted: 0
            });
            
            // Keep only last 90 days of history
            if (this.streakData.learningHistory.length > 90) {
                this.streakData.learningHistory = this.streakData.learningHistory.slice(-90);
            }
            
            this.streakData.totalLearningDays = this.streakData.learningHistory.length;
        }
    }

    // Get previous day
    getPreviousDay(dateString) {
        const date = new Date(dateString);
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    }

    // Save streak data to Firebase and localStorage
    async saveStreakData() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        try {
            // Save to localStorage
            localStorage.setItem(`streak_${user.uid}`, JSON.stringify(this.streakData));

            // Save to Firebase if available
            if (window.firebaseServices && window.firebaseServices.updateDoc) {
                const userAnalyticsRef = window.firebaseServices.doc(
                    window.firebaseServices.db, 
                    'userAnalytics', 
                    user.uid
                );
                
                await window.firebaseServices.updateDoc(userAnalyticsRef, {
                    streakData: this.streakData,
                    lastUpdated: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error saving streak data:', error);
        }
    }

    // Get streak statistics
    getStreakStats() {
        return {
            currentStreak: this.currentStreak,
            longestStreak: this.longestStreak,
            totalLearningDays: this.streakData?.totalLearningDays || 0,
            streakStartDate: this.streakData?.streakStartDate,
            learningHistory: this.streakData?.learningHistory || []
        };
    }

    // Get motivational message based on streak
    getMotivationalMessage() {
        const messages = {
            1: "Great start! Learning something new every day builds powerful habits. 🚀",
            2: "Two days in a row! You're building momentum. Keep going! 💪",
            3: "3-day streak! You're forming a solid learning routine. 🌟",
            5: "5 days! You're becoming a consistent learner. Amazing work! 🎯",
            7: "One week streak! You've built a strong learning habit. 🏆",
            14: "Two weeks! Your dedication is inspiring. Keep crushing it! 🔥",
            21: "21 days! You've officially formed a learning habit. Legend! ⚡",
            30: "30 DAY STREAK! You're a learning machine! Incredible! 🎉",
            50: "50 days! You're in the top 1% of consistent learners! 🌈",
            100: "100 DAY STREAK! You're a learning superstar! Unstoppable! 💎"
        };

        // Exact match
        if (messages[this.currentStreak]) {
            return messages[this.currentStreak];
        }

        // Milestone approaching
        const milestones = [7, 14, 21, 30, 50, 100];
        const nextMilestone = milestones.find(m => m > this.currentStreak);
        
        if (nextMilestone) {
            const daysToGo = nextMilestone - this.currentStreak;
            return `Only ${daysToGo} day${daysToGo > 1 ? 's' : ''} until your ${nextMilestone}-day streak! Keep going! 🎯`;
        }

        // Generic encouragement
        const genericMessages = [
            "Keep the streak alive! Every day counts. 🌟",
            "Your consistency is paying off! 🚀",
            "Learning every day is the secret to mastery. 💪",
            "You're building an incredible skill - consistency! 🔥",
            "The compound effect of daily learning is powerful! ⚡"
        ];

        return genericMessages[Math.floor(Math.random() * genericMessages.length)];
    }

    // Show streak motivation notification
    showStreakMotivation() {
        if (window.utils && window.utils.showNotification) {
            const message = this.getMotivationalMessage();
            window.utils.showNotification(message, 'success');
        }
    }

    // Get weekly learning pattern
    getWeeklyPattern() {
        const history = this.streakData?.learningHistory || [];
        const last7Days = this.getLastNDays(7);
        
        const weeklyData = last7Days.map(day => {
            const dayData = history.find(d => d.date === day.date);
            return {
                day: day.dayName,
                learned: !!dayData,
                duration: dayData?.duration || 0
            };
        });

        return weeklyData;
    }

    // Get last N days with day names
    getLastNDays(n) {
        const days = [];
        for (let i = n - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en', { weekday: 'short' });
            days.push({ date: dateString, dayName });
        }
        return days;
    }

    // Initialize default streak when no data exists
    initializeDefaultStreak() {
        this.streakData = this.initializeStreakData();
        this.updateLocalStreakData();
    }

    // Reset streak (for testing purposes)
    resetStreak() {
        this.streakData = this.initializeStreakData();
        this.updateLocalStreakData();
        this.saveStreakData();
    }
}

// Initialize streak manager
let streakManager = null;

function initializeStreakManager() {
    if (!streakManager) {
        streakManager = new LearningStreakManager();
        window.streakManager = streakManager;
    }
    return streakManager;
}

// Export for use in other files
window.initializeStreakManager = initializeStreakManager;