document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const exerciseType = document.getElementById('exerciseType');
    const currentExercise = document.getElementById('currentExercise');
    const currentReps = document.getElementById('currentReps');
    const currentCalories = document.getElementById('currentCalories');
    const formScore = document.getElementById('formScore');
    const duration = document.getElementById('duration');
    const workoutHistory = document.getElementById('workoutHistory');
    const goalsForm = document.getElementById('goalsForm');
    const dailyCaloriesGoal = document.getElementById('dailyCaloriesGoal');
    const weeklyWorkoutsGoal = document.getElementById('weeklyWorkoutsGoal');

    let statsInterval;

    // Check if all required elements exist
    const requiredElements = {
        startBtn,
        stopBtn,
        exerciseType,
        currentExercise,
        currentReps,
        currentCalories,
        formScore,
        duration,
        workoutHistory,
        goalsForm,
        dailyCaloriesGoal,
        weeklyWorkoutsGoal
    };

    // Check for missing elements
    const missingElements = Object.entries(requiredElements)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements);
        alert('Some required page elements are missing. Please refresh the page or contact support.');
        return;
    }

    // Check camera access on page load
    async function checkCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Camera access error:', error);
            alert('Please allow camera access to use this application.');
            return false;
        }
    }

    // Initial camera check
    checkCamera();

    // Handle page unload
    window.addEventListener('beforeunload', async function(e) {
        await fetch('/cleanup');
    });

    // Start tracking with selected exercise
    startBtn.addEventListener('click', async function() {
        try {
            startBtn.disabled = true;
            const response = await fetch(`/start_tracking?exercise_type=${exerciseType.value}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                stopBtn.disabled = false;
                exerciseType.disabled = true;
                
                // Start updating stats
                statsInterval = setInterval(updateStats, 1000);
            } else {
                throw new Error(data.message || 'Failed to start tracking');
            }
        } catch (error) {
            console.error('Error starting tracking:', error);
            alert(error.message || 'Failed to start exercise tracking. Please try again.');
            startBtn.disabled = false;
        }
    });

    // Stop tracking
    stopBtn.addEventListener('click', async function() {
        try {
            stopBtn.disabled = true;
            const response = await fetch('/stop_tracking');
            const data = await response.json();
            
            if (data.status === 'success') {
                startBtn.disabled = false;
                exerciseType.disabled = false;
                
                // Stop updating stats
                if (statsInterval) {
                    clearInterval(statsInterval);
                }
                
                // Update workout history
                await updateWorkoutHistory();
            } else {
                throw new Error(data.message || 'Failed to stop tracking');
            }
        } catch (error) {
            console.error('Error stopping tracking:', error);
            alert(error.message || 'Failed to stop exercise tracking. Please try again.');
            stopBtn.disabled = false;
        }
    });

    // Update stats periodically
    async function updateStats() {
        try {
            const response = await fetch('/get_stats');
            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }
            
            const stats = await response.json();
            if (stats.error) {
                throw new Error(stats.error);
            }
            
            if (stats) {
                currentExercise.textContent = stats.exercise_type || '-';
                currentReps.textContent = stats.reps || '0';
                currentCalories.textContent = stats.calories ? stats.calories.toFixed(1) : '0';
                formScore.textContent = stats.form_score || '100';
                
                // Format duration
                const durationValue = stats.duration || 0;
                const minutes = Math.floor(durationValue / 60);
                const seconds = Math.floor(durationValue % 60);
                duration.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('Error updating stats:', error);
            // Don't show alert for stats updates to avoid spamming
            if (statsInterval) {
                clearInterval(statsInterval);
            }
        }
    }

    // Update workout history
    async function updateWorkoutHistory() {
        try {
            const response = await fetch('/get_workout_history');
            if (!response.ok) {
                throw new Error('Failed to fetch workout history');
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            workoutHistory.innerHTML = '';
            
            if (data.history && data.history.length > 0) {
                data.history.reverse().forEach(session => {
                    const sessionDiv = document.createElement('div');
                    sessionDiv.className = 'history-item mb-3 p-2 border rounded';
                    
                    const startTime = new Date(session.start_time);
                    const duration = session.duration;
                    const minutes = Math.floor(duration / 60);
                    const seconds = Math.floor(duration % 60);
                    
                    sessionDiv.innerHTML = `
                        <div class="fw-bold">${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString()}</div>
                        <div>Duration: ${minutes}:${seconds.toString().padStart(2, '0')}</div>
                        <div>Total Calories: ${session.total_calories.toFixed(1)}</div>
                        ${session.exercises.map(ex => `
                            <div class="mt-1">
                                <small>
                                    ${ex.type}: ${ex.reps} reps
                                    (Form: ${ex.form_score}%)
                                </small>
                            </div>
                        `).join('')}
                    `;
                    
                    workoutHistory.appendChild(sessionDiv);
                });
            } else {
                workoutHistory.innerHTML = '<p class="text-muted">No workout history available</p>';
            }
        } catch (error) {
            console.error('Error updating workout history:', error);
            workoutHistory.innerHTML = '<p class="text-danger">Failed to load workout history</p>';
        }
    }

    // Handle goals form submission
    if (goalsForm) {
        goalsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const goals = {
                daily_calories: parseInt(dailyCaloriesGoal.value) || 300,
                weekly_workouts: parseInt(weeklyWorkoutsGoal.value) || 5
            };
            
            try {
                const response = await fetch('/set_goals', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(goals)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to set goals');
                }
                
                const data = await response.json();
                if (data.status === 'success') {
                    alert('Goals updated successfully!');
                } else {
                    throw new Error(data.message || 'Failed to update goals');
                }
            } catch (error) {
                console.error('Error setting goals:', error);
                alert(error.message || 'Failed to update goals. Please try again.');
            }
        });
    }

    // Initial setup
    stopBtn.disabled = true;
    updateWorkoutHistory();
});
